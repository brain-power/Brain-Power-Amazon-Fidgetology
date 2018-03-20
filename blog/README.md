
## Automatic Analysis of Body Language to Gauge Attention and Engagement, Using Kinesis Video Streams and AWS Rekognition
 
Ned T. Sahin, PhD<sup>1,2</sup>, Runpeng Liu<sup>1,3</sup>, Joseph Salisbury, PhD<sup>1</sup>, Lillian Bu<sup>1,3</sup> 

<sup>1</sup>Brain Empowerment Lab, Brain Power LLC, Cambridge, MA, United States <br />
<sup>2</sup>Department of Psychology, Harvard University, Cambridge, MA, United States <br />
<sup>3</sup>Department of Electrical Engineering and Computer Science, Massachusetts Institute of Technology, Cambridge, MA, United States 

 
## Introduction 
 
![Teaser Graphic](attachments/FidgetologyTeaser_V3.png?raw=true "Teaser Graphic") 
 
Producers of content (ads, TV shows, movies, video games, political campaigns, speeches, online courses; as well as classroom teaching) usually judge the success of their content by surveys or tests after the fact; or by user actions such as click-throughs or bounces. These are often subjective, delayed, informal, post-hoc, and/or binary proxies for what content producers may wish to measure: the perceived value of their content. Such metrics miss continuous and rich data about viewers' attention, engagement, and enjoyment over time -- which can be contained within their ongoing body language. However, there is no systematic way to quantify body language, nor to summarize patterns or key gestures within the often-overwhelming dataset of video in a single metric. 
 
We invented a method, affectionately called "Fidgetology", to quantitatively summarize fidgeting and other body motions as a behavioral biomarker. We originally invented fidgetology to analyze tens of terabytes of clinical videos of children with autism and/or ADHD, as a new clinical outcome measure of their improvement in symptoms after using our augmented-reality apps. Here, we provide a more generalized architecture, and example code, that you can immediately try for your purposes. It uses newly-released artificial intelligence products from Amazon Inc. to automatically analyze body motions, for instance in video of people viewing your media content or classroom teaching. 

Namely, it allows you to stream or upload video of your audience and immediately get a mathematical plot and single-image summary of their level and patterns of motions, which can be a proxy for attention, focus, engagement, anxiety, or enjoyment. The resulting single image is a small-filesize, digestible 2D summary of potentially a very large 4D+ data set. We also make suggestions for how to add advanced Lambda functions or machine-learning models to rapidly classify more nuanced states, and customize to your unique use-case and/or individual users. 

## How it Works 
 
![System Architecture Diagram](attachments/SystemArchitectureDiagram.png?raw=true "System Architecture Diagram") 
 
### Kinesis Video Streams Ingestion 
 
A client video stream-producing web app allows users to 1) upload pre-recorded video and/or 2) live stream their webcam feed to [Amazon Kinesis Video Streams](https://console.aws.amazon.com/kinesisvideo). This webcam streaming functionality is backed by the [WebRTC](https://webrtc.github.io/samples/) `getUserMedia` API, and is supported on all major browsers and platforms, with the exception of iOS mobile. 
 
Why a browser app? Of course, it is also possible to stream video from IoT devices such as [Amazon DeepLens](https://aws.amazon.com/deeplens/), or build a custom mobile app using the [Kinesis Video Streams Producer SDK for Android](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/producer-sdk-android.html), but a simple cross-platform web app that can be launched in any browser is much more universally accessible! 
 
When static video (via [Amazon S3](https://aws.amazon.com/s3/) upload) or buffered webcam frames (via [Amazon API Gateway](https://aws.amazon.com/api-gateway/) request) are uploaded by the web app, an [AWS Lambda](https://aws.amazon.com/lambda/) function, serving as a cloud proxy layer to Kinesis Video Streams, converts them to [streamable media fragments](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/how-data.html#how-data-frame). These media fragments are then put into a Kinesis Video Stream. Note that since a Kinesis Video Streams Producer SDK is currently not available for Javascript/web browser, we explored several workarounds aimed at mimicing streaming functionality in the AWS cloud layer, and ultimately opted to pursue a fully serverless (albeit, yet-to-be optimized) solution. One might also consider provisioning a custom [AMI](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) as a WebRTC server that handles stream conversion. This alternative will probably yield the best performance and lowest latency, but is not in the spirit of the serverless architecture we present here.
 
#### Uploading a pre-recorded video: 
 
![Upload a Video](attachments/screenshots/UploadVideoExampleBlur.jpg?raw=true "Upload a Video") 
 
#### Streaming from browser webcam 
 
Below is a side-by-side illustration of webcam streaming to the Kinesis Video Streams (KVS) online console. The lag between the live webcam app feed (left) and the time these frames are played back on the KVS console (right) is about 5 seconds. 
 
![Streaming Latency Demo](attachments/screenshots/KVSConsoleDemoCrop.gif?raw=true "Streaming Latency Demo") 
 
### Rekognition Video - Stream Processor 
 
The next step is to automatically detect people in the full-speed video, and track their motions in real time. We feed the Kinesis Video Stream as input to [Rekognition Video](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html) (Amazon’s new video-capable version of the Rekognition deep-learning toolset to track objects and people in images), using a [Rekognition Stream Processor](https://docs.aws.amazon.com/rekognition/latest/dg/API_CreateStreamProcessor.html).

The goal is to analyze body motion of several kinds, but for now Rekognition Video focuses on faces. It does provide extensive face data from the video stream, including the position over time of face landmarks such as eye, nose, and mouth corners, and face polygon, plus face rotation. These raw records are published to a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). 
 
### Motion Analytics 
 
When new records appear in this raw data stream, our Motion Analytics algorithm (implemented as an AWS Lambda function) is triggered. It computes interesting derived metrics on faces in successive video frames, such as rotational/translational motion velocities, which can be used as features to gauge attention and engagement. These processed metrics are then published to another Kinesis Data Stream, for consumption by downstream applications and web dashboards. 
 
### Visualizing the Metrics 
 
For this project, we provide a dashboard app (in the same interface as the video streaming app) that consumes body motion metrics directly from the processed Kinesis Data Stream and renders them in near real-time as streaming chart visualizations. Of course, one should consider fronting the processed data stream with an API Gateway endpoint (as illustrated in the system architecture diagram) to allow multiple clients and downstream applications to consume the processed metrics scalably. 
 
## Try it Yourself 
 
### Deploy using CloudFormation 
 
This entire project can be deployed using [AWS 
CloudFormation](https://aws.amazon.com/cloudformation/) as a *Change Set for a New Stack* (a Serverless Application Transform must first be applied to the template definition). Explore the [Github repository for this project](https://github.com/brain-power/aws-fidgetology-demo-app) for a description of configuration options and AWS resource components, as well as custom command-line deployment options.  
 
Click the button to begin the stack creation process: 
 
<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fmaster-template.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a> 
 
1. Click **Next**, and specify **brain-power-fidgetology-demo** as both the **Stack name** and **Change set name**. Accept all default parameters and click **Next**. 

 
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
 
We offer for your use a basic motion analytics function. This function estimates the rotational and translational velocities of faces in successive frames. You can use such metrics to build a feature set aimed at gauging attention and engagement based on body motion patterns. 

We have experimented with additional and advanced metrics for specific use cases surrounding autism and ADHD, and as a service to support external clinical trials, and these will be published in medical research journals. 
 
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
        var detectedFace = record.data.FaceSearchResponse[0].DetectedFace; 
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
        Math.pow(currentFace.BoundingBox.Center[0] - previousFace.BoundingBox.Center[0], 2) +  
        Math.pow(currentFace.BoundingBox.Center[1] - previousFace.BoundingBox.Center[1], 2) 
      ); 
      var faceLength = Math.sqrt(Math.pow(currentFace.BoundingBox.Height, 2) + Math.pow(currentFace.BoundingBox.Width, 2));
      currentFace.TranslationalVelocity = (deltaPosition / faceLength) / deltaTime; 
      var deltaRotation = Math.sqrt( 
        Math.pow(currentFace.Pose.Pitch - previousFace.Pose.Pitch, 2) +  
        Math.pow(currentFace.Pose.Roll  - previousFace.Pose.Roll,  2) + 
        Math.pow(currentFace.Pose.Yaw   - previousFace.Pose.Yaw,   2) 
      ); 
      currentFace.RotationalVelocity = deltaRotation / deltaTime; 
      previousFace = currentFace;
    }); 
    
    faceRecords.shift();
     
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
    face.Timestamp = Math.min(inputInfo.ProducerTimestamp + inputInfo.FrameOffsetInSeconds, inputInfo.ProducerTimestamp + face.RecordIndex);
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
 
### Integration Kinesis Analytics (AI) or Sagemaker (ML)  
 
Of potential interest is the possibility of building a [Kinesis Data Analytics](https://aws.amazon.com/kinesis/data-analytics/) application that consumes the raw output of the Rekognition video stream processor, with unsupervised anomaly detection and other machine learning (ML) capabilities. 
 
*@Ned/Joey might elaborate.* 
 
### Tracking multiple bodies 
 
One might also consider modifying the `StreamAnalyzer` function to allow for tracking of multiple faces/bodies in a feed. 
 
Reasons and use cases for summarizing the body motions of multiple individuals simultaneously, or the aggregate/average motion of a crowd, are many and wide-ranging. Taking the examples of a classroom or the audience for a speech, 

Additionally, unlike analyses based on the detailed facial expressions of each crowd member, the present fidgetology analysis can be carried out based on a camera feed that lacks the extremely fine-grain detail and good lighting required to analyze each face in a crowd. This makes it much more tractable given plausible constraints of camera hardware and storage/streaming bandwidth. 

### Privacy

Also, as with the single-person analysis, there is no need to uncover the identity of any face, nor even to survey the crowd at the camera resolution required to do the same, in order to successfully perform the present analysis. This allows one to preserve personal privacy of your audience, while nonetheless determining their level of attention, focus, and enjoyment of your content. 
 
## Results / Brain Power's Use Case 

The following results were obtained by streaming a pre-recorded video of one of our product trials. 

*@Ned/Joey to provide insight on these results to a suitable level of interest, and philosophy of our use case.* 
 
### Real-Time Fidgetology Analysis: Child Not Using Brain Power's AR System for Autism
![Headset Off Results Animation](attachments/results/GlassOffAnimation_V2.gif?raw=true "Headset Off Results Animation") 

### Real-Time Fidgetology Analysis: Child Using Brain Power's AR System for Autism
![Headset On Results Animation](attachments/results/GlassOnAnimation_V2.gif?raw=true "Headset On Results Animation") 


 
![Results Montage](attachments/results/Glass_ON_OFF_SideBySide_Montage_V3.png?raw=true "Results Montage") 
 
## Summary 
 
We've provided a web application and accompanying Serverless architecture for streaming webcam feed from browser to Kinesis Video Streams and Rekognition Video. Body motion metrics can be then be visualized in web app with minimal delay. 
 
*@Ned/Joey can you close this?*  (coming soon!)
 
## Acknowledgements 
 
## Authors Bios
 
