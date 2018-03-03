const aws = require('aws-sdk');
aws.config.update({ region: process.env.AWS_REGION });
const s3 = new aws.S3();
const ffmpeg = require('./ffmpeg');
const fs = require("fs");
const path = require("path");
const cp = require("./child-process-promise");
const mime = require("./mime");

const createResponse = (statusCode, body) => {
    body = (typeof body === "string") ? body : JSON.stringify(body);
    return {
        statusCode: statusCode,
        body: body,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        }
    };
};

const sendFile = (body, contentType) => {
    return {
        statusCode: 200,
        body: body.toString(),
        headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        }
    };
};

// GET /Config
var getConfig = (event, context, callback) => {
    callback(null, createResponse(200, {
        UPLOADS_BUCKET_NAME: process.env.UPLOADS_BUCKET_NAME,
        KDS_RAW_STREAM_NAME: process.env.KDS_RAW_STREAM_NAME,
        KDS_PROCESSED_STREAM_NAME: process.env.KDS_PROCESSED_STREAM_NAME,
        KVS_STREAM_NAME: process.env.KVS_STREAM_NAME,
        AWS_REGION: process.env.AWS_REGION,
        IdentityPoolId: process.env.IdentityPoolId
    }));
};

// GET /ProcessedStream
var readProcessedStream = (event, context, callback) => {
    // TODO
    callback(null, createResponse(200, {

    }));
};

// GET /App/path/to/resource
var renderStatic = (event, context, callback) => {
    var resourcePath = event.path.replace(/\/App\/?/, "");
    if (resourcePath.indexOf(".") === -1) {
        resourcePath += "index.html";
    }
    s3.getObject({
        Bucket: process.env.WEBAPP_BUCKET_NAME,
        Key: resourcePath
    }, function(err, data) {
        if (err) {
            callback(null, createResponse(400, err));
        } else {
            callback(null, sendFile(data.Body, require('./mime').getType(data.Key)));
        }
    });
};

// POST /FrameData
var processFrameData = (event, context, callback) => {
    var payload = event.body;
    if (!payload.framerate) {
        return callback(null, createResponse(400, "Unknown framerate."));
    }
    console.log(`Received ${payload.frames.length} frames at ${payload.framerate} FPS`);
    var frames = payload.frames;
    var timestamps = payload.timestamps || [new Date().getTime(), new Date().getTime() + (payload.frames.length - 1) * payload.framerate];
    var pad = function(number, size) {
        var s = String(number);
        while (s.length < (size || 2)) { s = "0" + s; }
        return s;
    };
    const TMP_DIR = process.env.local ? "./tmp" : "/tmp";
    const RANDOM_KEY = Math.floor(Math.pow(10, 8) * Math.random()).toString();
    const FRAME_PREFIX = RANDOM_KEY + "-frame-";
    const PAD_LENGTH = 3;
    const MKV_MIME_TYPE = "video/x-matroska";
    const MKV_FILE_EXT = ".mkv";

    // Write all image frames to temp filestore.
    var promises = frames.filter((frame) => {
        // Get rid of empty frames.
        return !!frame;
    }).map((frame, index) => {
        // Strip off the data:url prefix to get just the base64-encoded bytes.
        var data = frame.replace(/^data:image\/\w+;base64,/, "");
        var buf = new Buffer(data, 'base64');
        return new Promise(function(resolve, reject) {
            var filename = path.join(TMP_DIR, FRAME_PREFIX + pad(index, PAD_LENGTH) + ".jpg");
            fs.writeFile(filename, buf, function(err) {
                if (err) reject(err);
                else resolve(filename);
            });
        });
    });
    Promise.all(promises).then(function(persistedFrames) {
        var outputFilename = "_" + new Date().getTime() + MKV_FILE_EXT;
        var outputLocation = path.resolve(path.join(TMP_DIR, outputFilename));
        var uploadToS3 = function() {
            var s3Params = {
                Bucket: process.env.UPLOADS_BUCKET_NAME,
                Body: fs.createReadStream(outputLocation),
                Key: "mkv_uploads/" + outputFilename,
                ContentType: MKV_MIME_TYPE,
                Metadata: {
                    'PRODUCER_START_TIMESTAMP': timestamps[0].toString(),
                    'PRODUCER_END_TIMESTAMP': timestamps[timestamps.length - 1].toString()
                }
            };
            s3.putObject(s3Params, function(err, data) {
                try {
                    fs.unlink(outputLocation);
                    persistedFrames.forEach((file) => {
                        fs.unlink(file);
                    });
                } catch (e) {}
                if (err) {
                    console.log(err);
                    return callback(null, createResponse(500, err));
                }
                callback(null, createResponse(200, persistedFrames));
            });
        };
        var ffmpegCmd = (process.env.FFMPEG_CMD)
            .replace("%o", outputLocation)
            .replace("%r", process.env.FFMPEG_FRAME_RATE || 15)
            .replace("%i", path.resolve(path.join(TMP_DIR, FRAME_PREFIX + "%0" + PAD_LENGTH.toString() + "d.jpg")));
        if (process.env.local) {
            ffmpegCmd = "ffmpeg " + ffmpegCmd;
            cp.exec(ffmpegCmd).then(uploadToS3)
                .catch(function(err) {
                    console.log(err);
                    return callback(null, createResponse(500, err));
                });
        } else {
            ffmpeg(ffmpegCmd).then(uploadToS3);
        }
    }).catch(function(err) {
        console.log(err);
        callback(null, createResponse(500, err));
    });
};

// Local mirror for testing.
exports.processFrameData = function(req, res) {
    var event = {
        body: req.body
    };
    processFrameData(event, null, function(err, resp) {
        if (err) return res.status(500).send(err);
        res.status(resp.statusCode).json(JSON.parse(resp.body));
    });
};

exports.handler = (event, context, callback) => {
    event.body = JSON.parse(event.body);
    if (/Config/.test(event.path)) {
        return getConfig(event, context, callback);
    }
    if (/ProcessedStream/.test(event.path)) {
        return readProcessedStream(event, context, callback);
    }
    if (/App/.test(event.path)) {
        return renderStatic(event, context, callback);
    }
    if (/FrameData/.test(event.path)) {
        return processFrameData(event, context, callback);
    }
    callback(null, createResponse(404, "Resource not found."));
};