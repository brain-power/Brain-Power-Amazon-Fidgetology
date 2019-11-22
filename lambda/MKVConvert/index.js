/*
 * Authored by Runpeng Liu,
 * Brain Power (2018)
 */

const aws = require('aws-sdk');
const fs = require('fs');
const ffmpeg = require('./lib/ffmpeg');

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
    const filename = key.substring(key.lastIndexOf("/") + 1);
    const filetype = key.split(".").pop();
    s3.getObject(params, (err, data) => {
        if (err) {
            return callback(err);
        }
        data.Key = params.Key;
        data.Bucket = params.Bucket;
        const outputFilename = filename.replace(`.${filetype}`, MKV_FILE_EXT);
        const outputKey = MKV_UPLOADS_PREFIX + outputFilename;
        params.Key = outputKey;

        if (data.ContentType !== MKV_MIME_TYPE) {
            let stream;
            let tempWriteLocation;
            try {
                tempWriteLocation = `/tmp/${filename}`;
                stream = fs.createWriteStream(tempWriteLocation);
            } catch (e) {
                console.log(e);
                return callback(e);
            }
            // Download object to temp location
            stream.write(data.Body);
            stream.end();
            stream.on("finish", () => {
                console.log("Download complete.");
                const outputLocation = `/tmp/${outputFilename}`;
                // Convert to .MKV file for ingestion by KVS
                const convertJob = ffmpeg(
                    (process.env.FFMPEG_CMD)
                    .replace("%i", tempWriteLocation)
                    .replace("%o", outputLocation)
                ).then(() => {
                   console.log("File conversion complete.")
                   params.Body = fs.createReadStream(outputLocation);
                   params.ContentType = MKV_MIME_TYPE;
                   s3.putObject(params, (err, data) => {
                    try {
                        fs.unlinkSync(tempWriteLocation);
                        fs.unlinkSync(outputLocation);
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
            s3.putObject(params, (err, data) => {
                if (err) return callback(err);
                callback(null, "Success.");
            });
        }

    });
};
