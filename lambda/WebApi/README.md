This is the Lambda proxy backing the API Gateway definition for the Serverless stack. Refer to the `WebApi` Resource definition in [`template.yaml`](../../template.yaml) for how API routes are expressed under the [Serverless Application Model](https://github.com/awslabs/serverless-application-model).

## Routes

Of particular interest is the `POST /FrameData` method, which uses FFMpeg to convert a sequence of webcam frames to a streamable MKV fragment.

### POST /FrameData
```javascript
   /**
    * @param {Object}  event.body - The request payload { "frames": [Array], "framerate": Integer, "timestamps": [Array] }.
    * @param {Array}   event.body.frames - Array of frame data: [ frameData_1, ..., frameData_N ], 
    *                                     where frameData_i is base64-encoded string of the ith frame in image sequence
    *                                     e.g. "data:image(jpeg|png);base64,---".
    *                                     A web browser client can generate this frame data by calling 
    *                                     `canvas.toDataURL('image/jpeg')` on a canvas element 
    *                                     that a webcam video feed (or any video source) is being streamed to.
    *      
    * @param {Integer} event.body.framerate - Estimated framerate (in FPS) of image sequence computed by client.
    * 
    * @param {Array}   event.body.timestamps - Producer timestamps that image frames were generated at in UTC milliseconds
    *                                          i.e. timestamp_i is the time that frameData_i was generated in client browser.
    *                                          If not included, timestamps will be inferred using `framerate`.
    *                                          The first timestamp will be used as the ProducerTimestamp parameter 
    *                                          in /putMedia API request when converted stream fragment 
    *                                          is published to Kinesis Video Streams.
    */
    
const processFrameData = (event, context, callback) => {
    var payload = event.body;
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
```

#### **frame-converter.js**
```javascript
// The temp directory to write the image frames to before video conversion. 
// On AWS Lambda containers, this must be `/tmp`
const TMP_DIR = process.env.local ? "./tmp" : "/tmp"; 
const PAD_LENGTH = 3;
const MKV_FILE_EXT = ".mkv";
const ffmpeg = require("./ffmpeg");
const cp = require("./child-process-promise");
const path = require("path");
const fs = require("fs");

exports.convertFramesToMKVFragment = function(frameDataArray, params) {
    const RANDOM_KEY = Math.floor(Math.pow(10, 8) * Math.random()).toString();
    const FRAME_PREFIX = RANDOM_KEY + "-frame-";
    return new Promise(function(resolve, reject) {
        var fileWritePromises = frameDataArray.filter((frameData) => {
            // Get rid of empty frames.
            return !!frameData;
        }).map((frameData, index) => {
            // Strip off the data:url prefix to get just the base64-encoded bytes.
            var data = frameData.replace(/^data:image\/\w+;base64,/, "");
            var buf = new Buffer(data, 'base64');
            return new Promise(function(resolve, reject) {
                // For padding temp filenames of image frames
                var pad = function(number, size) {
                    var s = String(number);
                    while (s.length < (size || 2)) { s = "0" + s; }
                    return s;
                };
                var filename = path.join(TMP_DIR, FRAME_PREFIX + pad(index, PAD_LENGTH) + ".jpg");
                // e.g. frames will be written to /tmp/XXXXX-frame-000.jpg, /tmp/XXXXX-frame-001.jpg, ...
                fs.writeFile(filename, buf, function(err) {
                    if (err) reject(err);
                    else resolve(filename);
                });
            });
        });
        Promise.all(fileWritePromises).then(function(persistedFrames) {
            // Output filename of streamable MKV fragment.
            var outputFilename = "_" + new Date().getTime() + MKV_FILE_EXT;
            // Temp write location of MKV fragment.
            var outputFileLocation = path.resolve(path.join(TMP_DIR, outputFilename));
            var success = function() {
                resolve({
                    outputFileLocation: outputFileLocation,
                    outputFilename: outputFilename,
                    persistedFrames: persistedFrames
                });
            };
            // FFMPEG_CMD for converting sequence of image frames to streamable video fragment
            // Can be modified at deploy-time by editing the CloudFormation stack parameters or at run-time by changing Lambda function environment variable.
            // Currently, this is the command being used: `ffmpeg -r %r -f image2 -s 640x480 -i %i -vcodec libx264 -crf 25 -pix_fmt yuv420p %o`
            // -r specifies the frame rate
            // -s specifies the output resolution
            // -i specifies the sequence of input frames using wildcard filepath notation 
            //    e.g. 'XXXXX-frame-%03d.jpg' searches for filenames padded to 3 digits: 'XXXXX-frame-000.jpg', 'XXXXX-frame-001.jpg', etc.
            // -o specifies the output filepath
            // -vcodec specifies the video encoding; must be libx264 to compatible with Kinesis Video Stream
            // -crf specifies the compression quality - 0 is perfectly lossless (unrecommended; very slow); 100 is very lossy.
            var ffmpegCmd = (process.env.FFMPEG_CMD)
                .replace("%o", outputFileLocation)
                .replace("%r", process.env.TARGET_FRAME_RATE || 10)
                .replace("%i", path.resolve(path.join(TMP_DIR, FRAME_PREFIX + "%0" + PAD_LENGTH.toString() + "d.jpg")));
            if (process.env.local) {
                // Assume ffmpeg has been installed to path in local environment..
                ffmpegCmd = "ffmpeg " + ffmpegCmd;
                cp.exec(ffmpegCmd).then(success)
	                .catch(function(err) {
	                    console.log(err);
	                    reject(err);
	                });
            } else {
                ffmpeg(ffmpegCmd).then(success)
	                .catch(function(err) {
	                    console.log(err);
	                    reject(err);
	                });
            }
        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });
}
```
