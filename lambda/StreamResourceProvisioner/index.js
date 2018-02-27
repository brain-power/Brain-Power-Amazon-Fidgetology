'use strict';

const aws = require('aws-sdk');
const https = require('https');
const url = require('url');

var rekognition,
    kinesisdata,
    kinesisvideo;

function initServices() {
    aws.config.update({ region: process.env.AWS_REGION });
    rekognition = new aws.Rekognition();
    kinesisdata = new aws.Kinesis();
    kinesisvideo = new aws.KinesisVideo();
}
initServices();

function createStreamResources(cb) {
    var streamResources = {};

    function getOrCreateKDS(callback) {
        const KDS_STREAM_NAME = process.env.KDS_RAW_STREAM_NAME;
        // Check if KDS exists
        kinesisdata.describeStream({
            StreamName: KDS_STREAM_NAME
        }, function(err, data) {
            if (err) {
                // Stream does not exist
                console.log("Creating Kinesis Data Stream: " + KDS_STREAM_NAME);
                return kinesisdata.createStream({
                    StreamName: KDS_STREAM_NAME,
                    ShardCount: 1
                }, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        kinesisdata.describeStream({
                            StreamName: KDS_STREAM_NAME
                        }, callback);
                    }
                });
            } else {
                callback(null, data);
            }
        });
    }

    function getOrCreateKVS(callback) {
        const KVS_STREAM_NAME = process.env.KVS_STREAM_NAME;
        // Check if KVS exists
        kinesisvideo.describeStream({
            StreamName: KVS_STREAM_NAME
        }, function(err, data) {
            if (err) {
                console.log("Creating Kinesis Video Stream: " + KVS_STREAM_NAME);
                return kinesisvideo.createStream({
                    StreamName: KVS_STREAM_NAME,
                    DataRetentionInHours: 24,
                    MediaType: 'video/h264'
                }, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        kinesisvideo.describeStream({
                            StreamName: KVS_STREAM_NAME
                        }, callback);
                    }
                });
            } else {
                callback(null, data);
            }
        });
    }

    function getOrCreateRekStreamProcessor(callback) {
        const STREAM_PROCESSOR_NAME = process.env.REK_STREAM_PROCESSOR_NAME;
        rekognition.describeStreamProcessor({
            Name: STREAM_PROCESSOR_NAME
        }, function(err, data) {
            if (err) {
                console.log("Creating Rekognition stream processor: " + STREAM_PROCESSOR_NAME);
                return rekognition.createStreamProcessor({
                    Input: { KinesisVideoStream: { Arn: streamResources.KVS.StreamARN } },
                    Output: { KinesisDataStream: { Arn: streamResources.KDS.StreamARN } },
                    Name: STREAM_PROCESSOR_NAME,
                    RoleArn: process.env.REK_ROLE_ARN,
                    Settings: { FaceSearch: { FaceMatchThreshold: process.env.REK_FACE_MATCH_THRESHOLD || 90, CollectionId: process.env.REK_FACE_COLLECTION } }
                }, function(err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        rekognition.describeStreamProcessor({
                            Name: STREAM_PROCESSOR_NAME
                        }, callback);
                    }
                });
            } else {
                callback(null, data);
            }
        });
    }

    getOrCreateKVS(function(err, data) {
        if (err) return cb(err, streamResources);
        streamResources.KVS = data.StreamInfo;
        getOrCreateKDS(function(err, data) {
            if (err) return cb(err, streamResources);
            streamResources.KDS = data.StreamDescription;
            // Create empty face collection for Rekognition stream processor
            rekognition.createCollection({
                CollectionId: process.env.REK_FACE_COLLECTION
            }, function() {
                getOrCreateRekStreamProcessor(function(err, data) {
                    if (err) {
                        return cb(err, streamResources);
                    }
                    streamResources.RekStreamProcessor = data;
                    rekognition.startStreamProcessor({
                        Name: data.Name
                    }, function(err, data) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    cb(null, streamResources);
                });
            });
        });
    });
}

function deleteStreamResources(cb) {

    function deleteStreamProcessor(_cb) {
        rekognition.stopStreamProcessor({
            Name: process.env.REK_STREAM_PROCESSOR_NAME
        }, function(err, data) {
            if (data) {
                console.log("Stopped Rekognition stream processor");
            }
            rekognition.deleteStreamProcessor({
                Name: process.env.REK_STREAM_PROCESSOR_NAME
            }, function(err, data) {
                if (data) {
                    console.log("Deleted Rekognition stream processor");
                }
                rekognition.deleteCollection({
                    CollectionId: process.env.REK_FACE_COLLECTION
                }, function(err, data) {
                    if (data) {
                        console.log("Deleted Face Collection");
                    }
                    _cb();
                });
            });
        });
    }

    function deleteKVS(_cb) {
        kinesisvideo.describeStream({
            StreamName: process.env.KVS_STREAM_NAME
        }, function(err, data) {
            if (data && data.StreamInfo) {
                kinesisvideo.deleteStream({
                    StreamARN: data.StreamInfo.StreamARN
                }, function(err, _data) {
                    if (_data) {
                        console.log("Deleted KVS: " + data.StreamInfo.StreamARN);
                    }
                    _cb();
                });
            } else {
                _cb();
            }
        });
    }

    deleteStreamProcessor(function() {
        deleteKVS(cb);
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

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    try {
        var responseData;
        if (event.RequestType === 'Delete') {
            deleteStreamResources(function(err) {
                if (err) {
                    console.log(err);
                }
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            });
            return;
        }

        createStreamResources(function(err, resources) {
            if (err) {
                console.log(err);
                responseData = { Error: err };
            } else {
                responseData = { Id: resources.KVS.StreamARN };
            }
            sendResponse(event, callback, context.logStreamName, err ? 'FAILED' : 'SUCCESS', responseData);
        });
    } catch (e) {
        sendResponse(event, callback, context.logStreamName, 'FAILED', { Error: e });
    }

};