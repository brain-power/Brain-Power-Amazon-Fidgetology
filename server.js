/*
 * Authored by Runpeng Liu,
 * Brain Power (2018)
 */

const fs = require('fs');

const express = require('express');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const compress = require('compression');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const aws = require('aws-sdk');
const config = require('./local_config');

process.env.local = true;
process.env.AWS_REGION = config.AWS_REGION || "us-east-1";
process.env.FFMPEG_CMD = config.FFMPEG_CMD;
process.env.PRODUCER_START_TIMESTAMP_KEY = config.PRODUCER_START_TIMESTAMP_KEY || "producer_start_timestamp";

const app = express();

app.use(compress({
    filter(req, res) {
        return (/json|text|javascript|css|font|svg/).test(res.getHeader('Content-Type'));
    },
    level: 9
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json({
    limit: '6mb'
}));
app.use(methodOverride());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(helmet.frameguard());
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.hsts({
    includeSubdomains: true,
    force: true
}));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});
app.disable('x-powered-by');
app.set('port', 3000);
app.use(express.static(path.join(__dirname, 'dashboard')));

const APIGatewayProxy = require("./lambda/WebApi");

const tmpDir = "./tmp";
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}

app.post("/FrameData", APIGatewayProxy.processFrameData);

const sts = new aws.STS();
sts.getCallerIdentity({}, (err, data) => {
    if (err) {
        console.log(err);
        process.exit(1);
    } else {
        process.env.UPLOADS_BUCKET_NAME = `${config.STACK_NAME}-uploads-${data.Account}`;
        console.log("Uploads bucket: ", process.env.UPLOADS_BUCKET_NAME);
    }
});

const server = http.createServer(app).listen(app.get('port'), () => {
    console.log(`Express HTTP server listening on port ${app.get('port')}`);
});
