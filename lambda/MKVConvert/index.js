/* 
 * Authored by Runpeng Liu,
 * Brain Power (2018) 
 */

const aws = require('aws-sdk');
const fs = require('fs');
const ffmpeg = require('./ffmpeg');

const s3 = new aws.S3();

const MKV_FILE_EXT = ".mkv";
const MKV_MIME_TYPE = "video/x-matroska";
const MKV_UPLOADS_PREFIX = "mkv_uploads/";

exports.handler = (event, context, callback) => {
    // Get the object from the S3 upload event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key
    };
    console.log(bucket, key);
    var filename = key.substring(key.lastIndexOf("/") + 1);
    var filetype = key.split(".").pop();
    s3.getObject(params, function(err, data) {
        if (err) {
            return callback(err);
        }
        data.Key = params.Key;
        data.Bucket = params.Bucket;
        var outputFilename = filename.replace("." + filetype, MKV_FILE_EXT);
        var outputKey = MKV_UPLOADS_PREFIX + outputFilename;
        params.Key = outputKey;

        if (data.ContentType !== MKV_MIME_TYPE) {
            var stream;
            var tempWriteLocation;
            try {
                tempWriteLocation = "/tmp/" + filename;
                stream = fs.createWriteStream(tempWriteLocation);
            } catch (e) {
                console.log(e);
                return callback(e);
            }
            // Download object to temp location
            stream.write(data.Body);
            stream.end();
            stream.on("finish", function() {
                console.log("Download complete.");
                var outputLocation = "/tmp/" + outputFilename;
                // Convert to .MKV file for ingestion by KVS
                var convertJob = ffmpeg(
                    (process.env.FFMPEG_CMD)
                    .replace("%i", tempWriteLocation)
                    .replace("%o", outputLocation)
                ).then(function() {
                   console.log("File conversion complete.")
                   params.Body = fs.createReadStream(outputLocation);
                   params.ContentType = MKV_MIME_TYPE;
                   s3.putObject(params, function(err, data) {
                    try {
                        fs.unlink(outputLocation);
                    } catch(e) {}
                    if (err) return callback(err);
                    console.log("Upload complete.");
                    callback(null, "Success.");
                   });
                });
            });
        } else {
            params.Body = data.Body;
            params.ContentType = data.ContentType;
            s3.putObject(params, function(err, data) {
                if (err) return callback(err);
                callback(null, "Success.");
            });
        }

    });
};