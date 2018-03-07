
## Automatically Analyze Body Language to Gauge Attention and Engagement, Using Kinesis Video Streams and AWS Rekognition 
 
Ned T. Sahin, PhD, Runpeng Liu, Joseph Salisbury, PhD, Lillian Bu 
 
## Introduction 
 
![Teaser Graphic](attachments/FidgetologyTeaser.png?raw=true "Teaser Graphic") 
 
Producers of content (ads, TV, movies, political campaigns; as well as classroom teaching) 
usually judge the success of their content by surveys or by user actions such as clicks. These are 
often subjective, informal, post-hoc, and/or binary proxies for perceived value. They may miss 
continuous and rich data about viewers’ attention, engagement, and enjoyment over time -- 
which are hidden within their ongoing body language. However, there is no systematic way to  
quantify body language, nor to summarize patterns or key gestures within the often- 
overwhelming dataset of video in a single metric. 
 
We invented a method to quantitatively summarize fidgeting and the body signs of attention, 
originally to analyze clinical videos of children with autism and ADHD. Here, we provide a 
more generalized architecture and example code that you can immediately try, which uses 
AWS’s AI products to automatically analyze video of people while they view your media 
content or classroom teaching. Namely, it allows you to stream or upload video and immediately 
get a mathematical plot and single-image summary of your audience’s level and patterns of 
fidgeting, which can be a proxy for attention, engagement, or enjoyment. We also make 
suggestions for how to add complex Lambda functions or machine-learning models for more 
nuanced analysis suited to your unique needs. 
 
## How it Works 
 
![System Architecture Diagram](attachments/SystemArchitectureDiagram.png?raw=true "System Architecture Diagram") 
 
### Kinesis Video Streams Ingestion 
 
A client video stream-producing web app allows users to 1) upload pre-recorded video and/or 2) live stream their webcam feed to [Kinesis Video Streams](https://console.aws.amazon.com/kinesisvideo). This webcam streaming functionality is backed by the [WebRTC](https://webrtc.github.io/samples/) `getUserMedia` API, and is supported on all major browsers and platforms, with the exception iOS mobile. 
 
Why a browser app? Of course, it's also possible to stream video from IoT devices like [Amazon DeepLens](https://aws.amazon.com/deeplens/), or build a custom mobile app using the [Kinesis Video Streams Producer SDK for Android](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/producer-sdk-android.html), but a simple cross-platform web app that can be launched in any browser is much more accessible! 
 
When static video (via [Amazon S3](https://aws.amazon.com/s3/) upload) or buffered webcam frames (via [Amazon API Gateway](https://aws.amazon.com/api-gateway/) request) are uploaded by the web app, an [AWS Lambda](https://aws.amazon.com/lambda/) function (serving as a cloud proxy layer to Kinesis Video Streams) converts them to [streamable media fragments](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/how-data.html#how-data-frame). These media fragments are then put into a Kinesis Video Stream.  
 
#### Uploading a pre-recorded video 
 
![Upload a Video](attachments/screenshots/UploadVideoExampleBlur.jpg?raw=true "Upload a Video") 
 
#### Streaming from browser webcam 
 
Below is a side-by-side illustration of webcam streaming to the Kinesis Video Streams (KVS) online console. The lag between the live webcam app feed (left) and the time these frames are played back on the KVS console (right) is about 5 seconds. 
 
![Streaming Latency Demo](attachments/screenshots/KVSConsoleDemoCrop.gif?raw=true "Streaming Latency Demo") 
 
### Rekognition Stream Processor 
 
The Kinesis Video Stream is used as input to a [Rekognition Stream Processor](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html), which detects the positions of and recognizes faces in the video stream, and publishes these raw records to a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). 
 
### Motion Analytics 
 
When new records appear in this raw data stream, a Motion Analytics Lambda function is triggered that computes interesting derived metrics on faces in successive video frames, such as rotational/translational motion velocities, that can be used as features to gauge attention and engagement. These processed metrics are then published to another Kinesis Data Stream, for consumption by downstream applications and web dashboards. 
 
### Visualizing the Metrics 
 
For this project, we provide a dashboard app (in the same interface as the video streaming app) that consumes body motion metrics directly from the processed Kinesis Data Stream and renders them in near real-time as streaming chart visualizations. Of course, one should consider fronting the processed data stream with an API Gateway endpoint (as illustrated in the system architecture diagram) to allow multiple clients and downstream applications to consume the processed metrics scalably. 
 
## Try it Yourself 
 
### Deploy using CloudFormation 
 
This entire project can be deployed using [AWS 
CloudFormation](https://aws.amazon.com/cloudformation/) as a *Change Set for a New Stack* (a Serverless Application Transform must first be applied to the template definition). Explore the [Github repository for this project](https://github.com/brain-power/aws-fidgetology-demo-app) for a description of configuration options and AWS resource components, as well custom command-line deployment options.  
 
Click the button to begin the stack creation process: 
 
<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fmaster-template.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a> 
 
1. Click **Next**, and specify **bp-fidgetology-demo** as both the **Stack name** and **Change set name**. Accept all default parameters and click **Next**. 
 
![Create change set -- details](attachments/screenshots/CreateChangeSetDetails.png?raw=true "Create change set -- details") 
 
2. Click **Next** again to get to the final Review page. Under *Capabilities*, confirm acknowledgement that new IAM resources will be created. Then click **Create change set**. 
 
![Create change set -- IAM](attachments/screenshots/CreateChangeSetIAM.png?raw=true "Create change set -- IAM") 
 
3. On the next page, wait for the stack to finish 'Computing changes'. Then click **Execute** (top-right corner of page) to start the stack deployment. Confirm, and refresh the CloudFormation page to find your newly created stack. Click on it to monitor the deployment process, which should take no more than 3 minutes. 
 
![Create change set -- Execute](attachments/screenshots/CreateChangeSetExecute.png?raw=true "Create change set -- Execute") 
 
![Create Stack -- In Progress](attachments/screenshots/CreateStackInProgress.png?raw=true "Create Stack -- In Progress") 
 
4. Once deployment is complete, launch the demo web app by visiting the **WebAppSecureURL** link listed under *Outputs*. 
 
![Stack Completed Output](attachments/screenshots/WebAppURLOutput.png?raw=true "Stack Completed Output") 
 
By default, the CloudFormation template 
creates all necessary AWS resources for this project (Kinesis Video Stream, Rekognition Stream Processor, Kinesis Data Streams, Serverless Lambda functions, and an API Gateway endpoint). It copies the dashboard web application to an 
S3 bucket and outputs a secure URL (fronted by API Gateway) for accessing the web app. 
 
### Test the Live Webcam Stream 
 
Once you've opened the web app, click to the **Stream Webcam** button, and give the app permission to access your camera. Then follow the externally linked button to open the [Kinesis Video Stream web console](https://console.aws.amazon.com/kinesisvideo) in a separate browser window. 
 
![Webcam Stream Interface](attachments/screenshots/WebcamStreamButtonsCensored.png?raw=true "Webcam Stream Interface") 
 
To ensure proper syncing on the KVS console, select **Producer time stamps**. Within a few seconds delay, you should see your live webcam feed played back on the KVS console. 
 
![Using Producer Timestamps](attachments/screenshots/ProducerTimestampExample.png?raw=true "Using Producer Timestamps") 
 
We would love to hear how well the live-streaming works for you! Refer to the [project Github repository](../README.md#misc-kvs-notes) for suggestions on how one might improve the playback latency. 
 
### Customize the Motion Analytics Lambda Function 
 
For simplicity, we include a basic motion analytics function that estimates the rotational and translational velocities of faces in successive frames. One imagines these metrics would be principal components in any feature set aimed at gauging attention and engagement based on body motion. 
 
**StreamAnalyzer.js** 
```javascript 
const aws = require('aws-sdk'); 
aws.config.update({ region: process.env.AWS_REGION }); 
const kinesis = new aws.Kinesis(); 
 
// This function is triggered when new raw records are available 
// from the output of Rekognition stream processor. 
// For data specification, see: https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video-kinesis-output.html 
exports.handler = (event, context, callback) => { 
    var records = event.Records; 
    records.forEach((record) => { 
        // Kinesis data is base64 encoded so decode here 
        const payload = new Buffer(record.kinesis.data, 'base64').toString('ascii'); 
        var data = JSON.parse(payload); 
        record.data = data; 
    }); 
    // Filter for records that contain a detected face. 
    var faceRecords = records.filter((record) => { 
        return record.data.FaceSearchResponse && record.data.FaceSearchResponse.length; 
    }); 
    if (faceRecords.length < 2) { 
        return callback(null, `Not enough records to process.`); 
    } 
    // Do post-processing on detected faces. 
    faceRecords.forEach((record, index) => { 
        var detectedFace = record.data.FaceSearchResponse[0]; 
        detectedFace.RecordIndex = index; 
        processDetectedFace(detectedFace, record.data.InputInformation.KinesisVideo); 
    }); 
 
    // Estimate rotational and translational velocities 
    // of faces in successive frames using basic first-order derivative approximation. 
    var previousFace = faceRecords[0].data.FaceSearchResponse[0].DetectedFace; 
    faceRecords.forEach((faceRecord, index) => { 
      var currentFace = faceRecord.data.FaceSearchResponse[0].DetectedFace; 
      var deltaTime = currentFace.Timestamp - previousFace.Timestamp; 
      if (deltaTime === 0) return; 
      var deltaPosition = Math.sqrt( 
        Math.pow(currentFace.BoundingBox.Center[0] - previousFace.BoundingBox[0], 2) +  
        Math.pow(currentFace.BoundingBox.Center[1] - previousFace.BoundingBox[1], 2) 
      ); 
      currentFace.TranslationalVelocity = deltaPosition / deltaTime; 
      var deltaRotation = Math.sqrt( 
        Math.pow(currentFace.Pose.Pitch - previousFace.Pose.Pitch, 2) +  
        Math.pow(currentFace.Pose.Roll  - previousFace.Pose.Roll,  2) + 
        Math.pow(currentFace.Pose.Yaw   - previousFace.Pose.Yaw,   2) 
      ); 
      currentFace.RotationalVelocity = deltaRotation / deltaTime; 
      previousFace = currentFace; 
    }); 
     
    putRecordsIntoProcessedStream(faceRecords).then(function() { 
        var firstFace = faceRecords[0]; 
        var lastFace = faceRecords[faceRecords.length - 1]; 
        console.log(`Processed ${faceRecords.length} face records. Start: ${firstFace.data.FaceSearchResponse[0].DetectedFace.Timestamp}; End: ${lastFace.data.FaceSearchResponse[0].DetectedFace.Timestamp}`); 
        callback(null, `Processing complete.`); 
    }).catch(callback); 
}; 
 
// Computes the position of face center based on BoundingBox data. 
// Modify for custom use case. 
function processDetectedFace(face, inputInfo) { 
    var centerX = face.BoundingBox.Left + face.BoundingBox.Width / 2; 
    var centerY = face.BoundingBox.Top + face.BoundingBox.Height / 2; 
    face.BoundingBox.Center = [centerX, centerY]; 
    face.Timestamp = Math.min(inputInfo.ProducerTimestamp + inputInfo.FrameOffsetInSeconds); 
} 
 
// Put processed body motion metrics into downstream KDS 
function putRecordsIntoProcessedStream(records) { 
    var packagedRecords = records.map((record) => { 
        return { 
            Data: JSON.stringify(record.data), 
            PartitionKey: 'shard-0' 
        }; 
    }); 
    return new Promise(function(resolve, reject) { 
        kinesis.putRecords({ 
            Records: packagedRecords, 
            StreamName: process.env.KDS_PROCESSED_STREAM_NAME 
        }, function(err, data) { 
            return err ? reject(err) : resolve(data); 
        }); 
    }); 
} 
 
``` 
 
To customize this stream processing function for your own use case, go to the [AWS Lambda Console](https://console.aws.amazon.com/lambda/home), and find the **StreamAnalyzer** function associated with this project stack. 
 
![Customize Lambda Function Example](attachments/screenshots/CustomizeLambdaFunctionExample.png?raw=true, "Customize Lambda Function") 
 
The function can also be modified before deploy-time by cloning the [project Github repository](../README.md#command-line-deployment) and following the instructions to re-package the CloudFormation template and update the stack. 
 
## Areas to Expand or Improve this Architecture 
 
Our ideas for expanding this architecture are [described in full in the accompanying Github repository](../README.md#potential-improvements). 
 
### Kinesis Analytics or Sagemaker integration 
 
Of potential interest is the possibility of building a [Kinesis Data Analytics](https://aws.amazon.com/kinesis/data-analytics/) application that consumes the raw output of the Rekognition video stream processor, with unsupervised anomaly detection capabilities. 
 
*@Ned/Joey might elaborate.* 
 
### Tracking multiple bodies 
 
One might also consider modifying the `StreamAnalyzer` function to allow for tracking of multiple faces/bodies in a feed. 
 
*@Ned/Joey might expand on use cases where multiple bodies would need to be tracked e.g. in a classroom.* 
 
## Results / Brain Power's Use Case 
 
The following results were obtained by streaming a pre-recorded video of one of our product trials.  
 
*@Ned/Joey to provide insight on these results to a suitable level of interest, and philosophy of our use case.* 
 
![Headset Off Results Animation](attachments/results/GlassOffRTAnimation.gif?raw=true "Headset Off Results Animation") 
 
![Headset On Results Animation](attachments/results/GlassOnRTAnimation.gif?raw=true "Headset On Results Animation") 
 
![Results Montage](attachments/results/Glass_ON_OFF_SideBySide_Montage.png?raw=true "Results Montage") 
 
## Summary 
 
We've provided a web application and accompanying Serverless architecture for streaming webcam feed from browser to Kinesis Video Streams and Rekognition Video. Body motion metrics can be then be visualized in web app with minimal delay. 
 
*@Ned/Joey can you close this?* 
 
## Acknowledgements 
 
## Authors Bios
 
