/* 
 * Authored by Runpeng Liu,
 * Brain Power (2018) 
 */

'use strict';

const aws = require('aws-sdk');
const path = require('path');
const https = require('https');
const url = require('url');
const fs = require("fs");

aws.config.update({ region: process.env.AWS_REGION });
const s3 = new aws.S3();

// Helper for syncing dashboard app files to web app bucket when stack is created.
function uploadWebAppFiles(cb) {
    var ignoreFiles = ["js/app/config.js"];
    var walkSync = function(dir, filelist) {
        var fs = fs || require('fs'),
            files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function(file) {
            if (fs.statSync(dir + file).isDirectory()) {
                filelist = walkSync(dir + file + '/', filelist);
            } else {
                filelist.push(path.join(dir, file));
            }
        });
        return filelist;
    };
    var dashboardFiles = walkSync("./").filter((file) => { return ignoreFiles.indexOf(file) === -1 });
    var uploadPromises = dashboardFiles.map((file) => {
        return new Promise(function(resolve, reject) {
            s3.putObject({
                Bucket: process.env.WEBAPP_BUCKET_NAME,
                Key: file,
                Body: fs.createReadStream(file)
            }, function(err, data) {
                return err ? reject(err) : resolve(data);
            });
        });
    });
    Promise.all(uploadPromises).then(function() {
        cb(null, dashboardFiles);
    }).catch(cb);
}

// Helper for deleting web app and uploads buckets when stack is deleted.
function deleteBucket(bucket) {
    return new Promise(function(resolve, reject) {
        s3.listObjects({ Bucket: bucket }, function(err, data) {
            if (err) return resolve(err);
            var objects = data.Contents.map((obj) => { return { Key: obj.Key } });
            s3.deleteObjects({
                Bucket: bucket,
                Delete: {
                    Objects: objects
                }
            }, function(err, data) {
                if (err && objects.length > 0) return resolve(err);
                console.log(`Deleted ${bucket} bucket objects.`);
                s3.deleteBucket({
                    Bucket: bucket
                }, function(err, data) {
                    if (err) return resolve(err);
                    console.log(`Deleted ${bucket} bucket.`);
                    resolve(data);
                });
            });
        });
    });
}

// Sends a response to the pre-signed S3 URL
function sendResponse(event, callback, logStreamName, responseStatus, responseData) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log('RESPONSE BODY:\n', responseBody);

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length,
        },
    };

    const req = https.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', JSON.stringify(res.headers));
        callback(null, 'Successfully sent stack response!');
    });

    req.on('error', (err) => {
        console.log('sendResponse Error:\n', err);
        callback(err);
    });

    req.write(responseBody);
    req.end();
}

// Called when stack is Created, Updated, or Deleted.
exports.handler = (event, context, callback) => {
    try {
        var responseData;
        if (event.RequestType === 'Delete') {
            // Stack is being deleted, delete web app bucket and video stream fragments.
            return deleteBucket(process.env.WEBAPP_BUCKET_NAME)
                .then(function(data) {
                    deleteBucket(process.env.UPLOADS_BUCKET_NAME)
                        .then(function(data) {
                            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
                        });
                });
        }
        // Otherwise, stack is being created or updated. Sync dashboard files.
        uploadWebAppFiles(function(err, resources) {
            if (err) {
                console.log(err);
                responseData = { Error: err };
            } else {
                console.log('Synced files', resources);
                responseData = { Id: process.env.WEBAPP_BUCKET_NAME };
            }
            sendResponse(event, callback, context.logStreamName, err ? 'FAILED' : 'SUCCESS', responseData);
        });
    } catch (e) {
        console.log(e);
        sendResponse(event, callback, context.logStreamName, 'FAILED', { Error: e });
    }
};