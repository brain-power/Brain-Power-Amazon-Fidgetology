const aws = require('aws-sdk');
aws.config.update({ region: process.env.AWS_REGION });
const kinesis = new AWS.Kinesis();

const createResponse = (statusCode, body) => {
    body = (typeof body === "string") ? body : JSON.stringify(body);
    return {
        statusCode: statusCode,
        body: body,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    }
};

var getConfig = (event, context, callback) => {
    callback(null, createResponse(200, {
        UPLOADS_BUCKET_NAME: process.env.UPLOADS_BUCKET_NAME,
        KDS_RAW_STREAM_NAME: process.env.KDS_RAW_STREAM_NAME,
        KDS_PROCESSED_STREAM_NAME: process.env.KDS_PROCESSED_STREAM_NAME,
        KVS_STREAM_NAME: process.env.KVS_STREAM_NAME,
        IdentityPoolId: process.env.IdentityPoolId
    }));
};

var readProcessedStream = (event, context, callback) => {
    kinesis.getShardIterator({

    }, function(err, data) {
        if (err) return callback(null, createResponse(400, err));
        callback(null, createResponse(200, {

        }));
    });
}

exports.handler = (event, context, callback) => {
    event.body = JSON.parse(event.body);
    if (/Config/.test(event.path)) {
        return getConfig(event, context, callback);
    }
    if (/ProcessedStream/.test(event.path)) {
        return readProcessedStream(event, context, callback);
    }
    callback(null, createResponse(404, "Resource not found."));
}