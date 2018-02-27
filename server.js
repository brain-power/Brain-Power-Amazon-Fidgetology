var fs = require('fs'),
    express = require('express'),
    http = require('http'),
    path = require('path'),
    morgan = require('morgan'),
    compress = require('compression'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    helmet = require('helmet');

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
app.use(bodyParser.json());
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

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Express HTTP server listening on port " + app.get('port'));
});