This directory contains static files for the client dashboard app that allows user to stream webcam feed and upload videos for ingestion by Amazon Kinesis Video Streams and Rekognition Video.
Raw and analyzed face motion metrics from Rekognition Video are then rendered back to the dashboard in near real-time.

## Tools used

Built using:

* [AngularJS (1.5.5)](https://angularjs.org/)
* [AngularJS Material Design](https://material.angularjs.org/1.1.6/)

Front-end libraries used (found in `js/lib` directory):
* [AWS SDK for Browser](https://aws.amazon.com/sdk-for-browser/)
* [Echarts (charting library)](https://github.com/ecomfe/echarts)
* [WebcamJS](https://github.com/jhuckaby/webcamjs/blob/master/DOCS.md)
* [FontAwesome Icons](https://fontawesome.com/)

## Components

Single-page, responsive app -- `index.html` is the root view.

* `views/` contains client-side partials.
* `css/` contains custom styling.
* `js/app` contains AngularJS controllers and configuration.
* `js/lib` contains locally-hosted 3rd-party libraries.

### Bootstrapper

[`bootstrapper.js`](bootstrapper.js) is an AWS Lambda function provisioned by a [CloudFormation Custom Resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html).
It is responsible for syncing files in this directory with the S3 bucket hosting the web app when stack is deployed. 
When the stack is destroyed, the script is responsible for deleting the web app bucket and deleting all video uploads/fragments that were streamed using the web app.

### Using WebcamJS to Stream Video

[WebcamJS](https://github.com/jhuckaby/webcamjs/blob/master/DOCS.md) library is used to provide cross-browser, cross-platform support for accessing user's webcam via [WebRTC](https://webrtc.github.io/samples/) `getUserMedia` API.
For this project, we include a demo `FrameBuffer` class ([`js/custom/frame-buffer.js`](js/custom/frame-buffer.js)) that handles buffering image frames acquired from webcam.
Here is basic sample code for acquiring webcam feed, buffering frames at regular interval, and posting to data endpoint. 
For a full example that is used in the demo app, see [`js/app/webcam-stream-controller.js`](js/app/webcam-stream-controller.js).

#### Client sample code

**HTML**
```html
<head>
...
<!-- Import required dependencies !-->
<script "js/lib/webcamjs/webcam.js"></script>
<script "js/custom/frame-buffer.js"></script>
...
</head>

<body>
  <div id="webcam-feed-container"></div>
</body>
 ...
```
**Javascript**
```javascript

var frameBuffer;

function startStreaming() {
  // Inititialize frame buffer.
  frameBuffer = new FrameBuffer({ size: 40 });
  // Attempt to stream webcam feed to canvas element.
  Webcam.attach("#webcam-feed-container");
  // When webcam feed acquired, executes callback.
  Webcam.on('live', startStreamLoop);
}

var looperPromise;
function startSteamLoop() {
  var TARGET_FPS = 10;
  var looper = function() {
    // Pass current frame image data to handler.
    Webcam.snap(frameCallback);
    looperPromise = setTimeout(looper, 1000 / TARGET_FPS);
  }
  looper();
}

function frameCallback(imgData) {
  // imgData is base64-encoded string of current frame
  // e.g. "data:image(jpeg|png);base64,----"; this is generated in WebcamJS library by calling 
  // canvas.toDataURL('image/jpeg')
  frameBuffer.add(imgData);
  if (frameBuffer.getSize() >= frameBuffer.bufferSize) {
    // Clear buffer, and post frames to data endpoint.
    var data = frameBuffer.getData();
    frameBuffer.clear();
    // DATA_ENDPOINT is API endpoint that handles conversion of image frame sequence to streamable MKV fragment.
    postFrameData(data, DATA_ENDPOINT, ...);
  }
}

function postFrameData(data, endpoint, callback) {
  var $http = new XMLHttpRequest();
  $http.open("POST", endpoint);
  $http.setRequestHeader("Content-Type", "application/json");
  $http.send(JSON.stringify(data));
}

function stopStreaming() {
  try {
    Webcam.reset();
    Webcam.off('live');
    clearTimeout(looperPromise);
    frameBuffer.clear();
  } catch(e) {
    console.error(e);
  }
}

```

#### Server-side integration

For details on how frame sequence data sent by client should be processed on server-side, refer to documentation in [lambda/WebApi](../lambda/WebApi/README.md#post-framedata)
