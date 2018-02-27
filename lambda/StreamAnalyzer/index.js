'use strict';

const aws = require('aws-sdk');
aws.config.update({ region: process.env.AWS_REGION });
const kinesis = new aws.Kinesis();

// For data specification, see: https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video-kinesis-output.html
function processDetectedFace(face) {
    // TODO
}

function putProcessedRecordsIntoStream(records) {
    var _records = records.map((record) => {
        return {
            Data: JSON.stringify(record.data),
            PartitionKey: 'shard-0'
        };
    });
    kinesis.putRecords({
        Records: _records,
        StreamName: process.env.KDS_PROCESSED_STREAM_NAME
    }, function(err, data) {
        if (err) console.log(err);
    });
}

exports.handler = (event, context, callback) => {
    var records = event.Records;
    records.forEach((record) => {
        console.log(record.kinesis.data);
        // Kinesis data is base64 encoded so decode here
        const payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        console.log('Decoded payload:', payload);
        var data = JSON.parse(payload);
        record.data = data;
    });
    // Filter for records that have FaceSearch data.
    var faceRecords = records.filter((record) => {
        return record.data && record.data.FaceSearchResponse && record.data.FaceSearchResponse.length;
    });
    // Do post-processing on detected faces.
    faceRecords.forEach((record, index) => {
        var faceSearchResponse = record.data.FaceSearchResponse[0];
        processDetectedFace(faceSearchResponse.DetectedFace);
        record.data.processsed = true;
    });
    putProcessedRecordsIntoStream(faceRecords);
    callback(null, `Successfully processed ${event.Records.length} records.`);
};