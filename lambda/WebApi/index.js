/* 
 * Authored by Runpeng Liu,
 * Brain Power (2018) 
 */

const aws = require('aws-sdk');
aws.config.update({ region: process.env.AWS_REGION });
const s3 = new aws.S3();
const ffmpeg = require('./ffmpeg');
const fs = require("fs");
const path = require("path");
const cp = require("./child-process-promise");
const mime = require("./mime");
const frameConverter = require("./frame-converter");

// Helper for creating JSON response.
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

// Helper for sending static files.
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
const getConfig = (event, context, callback) => {
    callback(null, createResponse(200, {
        UPLOADS_BUCKET_NAME: process.env.UPLOADS_BUCKET_NAME,
        KDS_RAW_STREAM_NAME: process.env.KDS_RAW_STREAM_NAME,
        KDS_PROCESSED_STREAM_NAME: process.env.KDS_PROCESSED_STREAM_NAME,
        KVS_STREAM_NAME: process.env.KVS_STREAM_NAME,
        AWS_REGION: process.env.AWS_REGION,
        PRODUCER_START_TIMESTAMP_KEY: process.env.PRODUCER_START_TIMESTAMP_KEY,
        TARGET_FRAME_RATE: process.env.TARGET_FRAME_RATE,
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
const renderStatic = (event, context, callback) => {
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
// @param event.body
// {
//   "frames": [ frameData_1, frameData_2, ..., frameData_N ], // where frameData_i is base64-encoded string of the ith frame of image sequence.
//      e.g. "data:image(jpeg|png);base64,----"; a web browser client can generate this frame data by calling 
//     `canvas.toDataURL('image/jpeg')` on a canvas element that a webcam video feed (or any video source) is being streamed to.
//   
//   "framerate": Integer, // estimated framerate of image sequence computed by client.
//
//   "timestamps": [ timestamp_1, timestamp_2, ..., timestamp_N ], // producer timestamps that image frames were generated at in UTC milliseconds,
//      i.e. timestamp_i is the time that frameData_i was generated in client browser. The first timestamp will be used as the
//      ProducerTimestamp parameter in /putMedia request when converted stream fragment is published to Kinesis Video Stream.
// }
const processFrameData = (event, context, callback) => {
    var payload = event.body;
    if (!payload.framerate) {
        return callback(null, createResponse(400, "Unknown framerate."));
    }
    if (!payload.frames || !payload.frames.length) {
        return callback(null, createResponse(400, "Frame data does not exist."));
    }
    if (payload.frames.length <= 2) {
        return callback(null, createResponse(400, "Not enough frame data."));
    }
    console.log(`Received ${payload.frames.length} frames at ${payload.framerate} FPS`);

    // (infer timestamps from framerate if none provided)
    var timestamps = payload.timestamps || [new Date().getTime(), new Date().getTime() + Math.round(1000 * (payload.frames.length - 1) / payload.framerate)]; 

    frameConverter.convertFramesToMKVFragment(payload.frames, { framerate: payload.framerate })
        .then(function(mkvData) {
            function uploadToS3() {
                // Uploads and archives MKV fragment to S3
                var s3Params = {
                    Bucket: process.env.UPLOADS_BUCKET_NAME,
                    Body: fs.createReadStream(mkvData.outputFileLocation),
                    Key: "mkv_uploads/" + mkvData.outputFilename,
                    ContentType: "video/x-matroska",
                    Metadata: {
                        
                    }
                };
                s3Params.Metadata[process.env.PRODUCER_START_TIMESTAMP_KEY] = timestamps[0].toString();
                s3.putObject(s3Params, function(err, data) {
                    try {
                        // Deletes all temp files created by this process once S3 upload completes.
                        fs.unlink(mkvData.outputFileLocation);
                        mkvData.persistedFrames.forEach((file) => {
                            fs.unlink(file);
                        });
                    } catch (e) {}
                    if (err) {
                        console.log(err);
                        return callback(null, createResponse(500, err));
                    }
                    callback(null, createResponse(200, mkvData.persistedFrames));
                });
            }
            uploadToS3();
        }).catch(function(err) {
            callback(null, createResponse(500, err));
        });
};

// Local mirror for testing.
exports.processFrameData = (req, res) => {
    var event = {
        body: req.body
    };
    processFrameData(event, null, function(err, resp) {
        if (err) return res.status(500).send(err);
        res.status(resp.statusCode).json(JSON.parse(resp.body));
    });
};

// Handler for all API Gateway requests.
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