const aws = require('aws-sdk');
aws.config.update({region: process.env.AWS_REGION});
const s3 = new aws.S3();

const createResponse = (statusCode, body) => {
    body = (typeof body === "string") ? body : JSON.stringify(body);
    return { 
        statusCode: statusCode,
        body: body,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    };
};

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

var getConfig = (event, context, callback) => {
  callback(null, createResponse(200, {
    UPLOADS_BUCKET_NAME: process.env.UPLOADS_BUCKET_NAME,
    KDS_RAW_STREAM_NAME: process.env.KDS_RAW_STREAM_NAME,
    KDS_PROCESSED_STREAM_NAME: process.env.KDS_PROCESSED_STREAM_NAME,
    KVS_STREAM_NAME: process.env.KVS_STREAM_NAME,
    AWS_REGION: process.env.AWS_REGION,
    IdentityPoolId: process.env.IdentityPoolId
  }));
};

var readProcessedStream = (event, context, callback) => {
    // TODO
    callback(null, createResponse(200, {

    }));
};

var renderStatic = (event, context, callback) => {
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
           callback(null, sendFile(data.Body, data.ContentType));
       }
   });
   
};

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
    callback(null, createResponse(404, "Resource not found."));
};