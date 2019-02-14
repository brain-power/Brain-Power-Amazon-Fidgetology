/*
 * Authored by Runpeng Liu,
 * Brain Power (2018)
 */

var fs = require('fs'),
    express = require('express'),
    http = require('http'),
    path = require('path'),
    morgan = require('morgan'),
    compress = require('compression'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    helmet = require('helmet'),
    aws = require('aws-sdk'),
    config = require('./local_config')

process.env.local = true;
process.env.AWS_REGION = config.AWS_REGION || "us-east-1";
process.env.FFMPEG_CMD = config.FFMPEG_CMD;
process.env.PRODUCER_START_TIMESTAMP_KEY = config.PRODUCER_START_TIMESTAMP_KEY || "producer_start_timestamp";

var app = express();

app.use(compress({
    filter: function(req, res) {
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
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});
app.disable('x-powered-by');
app.set('port', 3000);
app.use(express.static(path.join(__dirname, 'dashboard')));

var APIGatewayProxy = require("./lambda/WebApi");

var tmpDir = "./tmp";
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}

app.post("/FrameData", APIGatewayProxy.processFrameData);

var sts = new aws.STS();
sts.getCallerIdentity({}, function(err, data) {
    if (err) {
        console.log(err);
        process.exit(1);
    } else {
        process.env.UPLOADS_BUCKET_NAME = config.STACK_NAME + "-uploads-" + data.Account;
        console.log("Uploads bucket: ", process.env.UPLOADS_BUCKET_NAME);
    }
});

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Express HTTP server listening on port " + app.get('port'));
});
