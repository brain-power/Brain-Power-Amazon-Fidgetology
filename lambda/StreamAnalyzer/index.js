'use strict';

const aws = require('aws-sdk');
aws.config.update({ region: process.env.AWS_REGION });
const kinesis = new aws.Kinesis();

// For data specification, see: https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video-kinesis-output.html
function processDetectedFace(face, time) {
    var centerX = face.BoundingBox.Left + face.BoundingBox.Width/2;
    var centerY = face.BoundingBox.Top + face.BoundingBox.Height/2;
    face.BoundingBox.Center = [centerX, centerY];
    face.Timestamp = time.FrameOffsetInSeconds + time.ProducerTimestamp;
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
        //console.log(record.kinesis.data);
        // Kinesis data is base64 encoded so decode here
        const payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        //console.log('Decoded payload:', payload);
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
        processDetectedFace(faceSearchResponse.DetectedFace, record.data.InputInformation.KinesisVideo);
        record.data.processsed = true;
        console.log('processed', record.data.FaceSearchResponse[0].DetectedFace);
    });
    
    for (var i = 1; i < faceRecords.length; i++){
        var currentFace = faceRecords[i].data.FaceSearchResponse[0].DetectedFace;
        var currentFaceCenterX = currentFace.BoundingBox.Center[0];
        var currentFaceCenterY = currentFace.BoundingBox.Center[1];
       
        var previousFace = faceRecords[i-1].data.FaceSearchResponse[0].DetectedFace;
        var previousFaceCenterX = previousFace.BoundingBox.Center[0];
        var previousFaceCenterY = previousFace.BoundingBox.Center[1];
        
        var deltaPosition = Math.sqrt(Math.pow((currentFaceCenterX - previousFaceCenterX), 2) + Math.pow((currentFaceCenterY - previousFaceCenterY), 2));
        var deltaTime = currentFace.Timestamp - previousFace.Timestamp;
        currentFace.tVelocity = (deltaPosition / deltaTime);
        
        
        var currentFacePitch = currentFace.Pose.Pitch;
        var currentFaceYaw = currentFace.Pose.Yaw;
        var currentFaceRoll = currentFace.Pose.Roll;
        
        var previousFacePitch = previousFace.Pose.Pitch;
        var previousFaceYaw = previousFace.Pose.Yaw;
        var previousFaceRoll = previousFace.Pose.Roll;
        
        var deltaRotation = Math.sqrt((Math.pow((currentFacePitch - previousFacePitch), 2) + Math.pow((currentFaceYaw - previousFaceYaw), 2) + Math.pow((currentFaceRoll - previousFaceRoll), 2))/3);
        currentFace.rVelocity = (deltaRotation / deltaTime);
        
        console.log('analyzed', currentFace);
    }
    
    faceRecords[0].data.FaceSearchResponse[0].DetectedFace.tVelocity = faceRecords[1].data.FaceSearchResponse[0].DetectedFace.tVelocity;
    faceRecords[0].data.FaceSearchResponse[0].DetectedFace.rVelocity = faceRecords[1].data.FaceSearchResponse[0].DetectedFace.rVelocity;
    
    putProcessedRecordsIntoStream(faceRecords);
    callback(null, `Successfully processed ${event.Records.length} records.`);
};