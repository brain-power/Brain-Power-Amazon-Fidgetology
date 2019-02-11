/*
 * Authored by Runpeng Liu,
 * Brain Power (2018)
 */

const TMP_DIR = process.env.local ? "./tmp" : "/tmp"; // The temp directory to write the image frames to before video conversion. On AWS Lambda, this must be `/tmp`
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
                // For padding filenames of image frames
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
