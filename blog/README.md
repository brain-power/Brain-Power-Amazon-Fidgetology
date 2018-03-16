
## Automatic Clinical-Grade Analysis of Body Language to Gauge Attention and Engagement, Using Cloud-Based Video Streaming, Artificial Intelligence, and Machine Learning 
 
Ned T. Sahin, PhD<sup>1,2</sup>, Runpeng Liu<sup>1,3</sup>, Joseph Salisbury, PhD<sup>1</sup>, Lillian Bu<sup>1,3</sup> 

<sup>1</sup>Brain Empowerment Lab, Brain Power LLC, Cambridge, MA, United States <br />
<sup>2</sup>Department of Psychology, Harvard University, Cambridge, MA, United States <br />
<sup>3</sup>Department of Electrical Engineering and Computer Science, Massachusetts Institute of Technology, Cambridge, MA, United States 

 
## Introduction 
 
![Teaser Graphic](attachments/FidgetologyTeaser.png?raw=true "Teaser Graphic") 
 
Producers of content (ads, TV shows, movies, video games, political campaigns; as well as classroom teaching) usually judge the success of their content by surveys or tests after the fact; or by user actions such as click-throughs or bounces. These are often subjective, delayed, informal, post-hoc, and/or binary proxies for what content producers may wish to measure: the perceived value of their content. Such metrics miss continuous and rich data about viewers' attention, engagement, and enjoyment over time -- which can be contained within their ongoing body language. However, there is no systematic way to quantify body language, nor to summarize patterns or key gestures within the often-overwhelming dataset of video in a single metric. 
 
We invented a method, affectionately called "Fidgetology", to quantitatively summarize fidgeting and other body motions. We originally invented fidgetology to analyze tens of terabytes of clinical videos of children with autism and/or ADHD, as a new clinical outcome measure of their improvement based on our augmented-reality interventions. Here, we provide a more generalized architecture, and example code, that you can immediately try for your purposes. It uses artificial intelligence (AI) products from Amazon Inc. to automatically analyze body motions, for instance in video of people viewing your media content or classroom teaching. 

Namely, it allows you to stream or upload video of your audience and immediately get a mathematical plot and single-image summary of their level and patterns of motions, which can be a proxy for attention, focus, engagement, anxiety, or enjoyment. The resulting single image is a small-filesize, digestible 2D summary of a very large 4D+ data set. We also make suggestions for how to add advanced Lambda functions or machine-learning (ML) models to rapidly classify more nuanced states, and customize to your unique use-case and/or individual users. 


In summary, Brain Power LLC has invented a novel behavioral biomarker of mental health and mental states -- originally to assess the efficacy of our products, and more generally as a new outcome measure for clinical trials of drugs, devices, or therapies that affect the mind. In partnership with Amazon, and using their newly-released AI and ML products, we here offer a step-by-step guide to applying this clinical-grade method to a much broader range of business use cases. Namely, to assess your clinical offerings; or to rapidly summarize how much an audience values your ads, TV, movies, campaigns, speeches, games, online courses, or classroom teaching. 
 
## How it Works 
 
![System Architecture Diagram](attachments/SystemArchitectureDiagram.png?raw=true "System Architecture Diagram") 
 
### Kinesis Video Streams Ingestion 
 
A client video stream-producing web app allows users to 1) upload pre-recorded video and/or 2) live stream their webcam feed to [Kinesis Video Streams](https://console.aws.amazon.com/kinesisvideo). This webcam streaming functionality is backed by the [WebRTC](https://webrtc.github.io/samples/) `getUserMedia` API, and is supported on all major browsers and platforms, with the exception of iOS mobile. 
 
Why a browser app? Of course, it is also possible to stream video from IoT devices such as [Amazon DeepLens](https://aws.amazon.com/deeplens/), or build a custom mobile app using the [Kinesis Video Streams Producer SDK for Android](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/producer-sdk-android.html), but a simple cross-platform web app that can be launched in any browser is much more universally accessible! 
 
When static video (via [Amazon S3](https://aws.amazon.com/s3/) upload) or buffered webcam frames (via [Amazon API Gateway](https://aws.amazon.com/api-gateway/) request) are uploaded by the web app, an [AWS Lambda](https://aws.amazon.com/lambda/) function (serving as a cloud proxy layer to Kinesis Video Streams) converts them to [streamable media fragments](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/how-data.html#how-data-frame). These media fragments are then put into a Kinesis Video Stream.  

**@Runpeng: Please insert a sentence explaining what limitation you needed to overcome or work around. I don't remember the details. E.g. that to get the functionality we wanted, you needed to use streams and yet there were technical constraints, and this was your clever way to operate within those constraints. This will make for a good story and demonstrate the creativity of your approach. The reader will therefore see it as more valuable; it will explain itself better in the future when new ways to achieve the goals here are released; it will secure our place on the forefront where we are figuring out the very newest tools; and it will also be a reminder that other features are desired now.**
 
#### Uploading a pre-recorded video: 
 
![Upload a Video](attachments/screenshots/UploadVideoExampleBlur.jpg?raw=true "Upload a Video") 
 
#### Streaming from browser webcam 
 
Below is a side-by-side illustration of webcam streaming to the Kinesis Video Streams (KVS) online console. The lag between the live webcam app feed (left) and the time these frames are played back on the KVS console (right) is about 5 seconds. 
 
![Streaming Latency Demo](attachments/screenshots/KVSConsoleDemoCrop.gif?raw=true "Streaming Latency Demo") 
 
### Rekognition Video - Stream Processor 
 
The next step is to use advanced AI to automatically detect people in full-speed video, and track their motions in real time. We feed the Kinesis Video Stream as input to [Rekognition Video](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html) (Amazon’s new video-capable version of the Rekognition deep-learning toolset to track objects and people in images), using a [Stream Processor](https://docs.aws.amazon.com/rekognition/latest/dg/API_CreateStreamProcessor.html).

The goal is to analyze body motion of several kinds, but for now Rekognition Video focuses on faces. It does provide extensive face data from the video stream, including the position over time of face landmarks such as eye, nose, and mouth corners, and face polygon, plus face rotation. These raw records to a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). 
 
### Motion Analytics 
 
When new records appear in this raw data stream, our Motion Analytics algorithm (implemented as a Lambda function) is triggered. It computes interesting derived metrics on faces in successive video frames, such as rotational/translational motion velocities, which can be used as features to gauge attention and engagement. These processed metrics are then published to another Kinesis Data Stream, for consumption by downstream applications and web dashboards. 
 
### Visualizing the Metrics 
 
For this project, we provide a dashboard app (in the same interface as the video streaming app) that consumes body motion metrics directly from the processed Kinesis Data Stream and renders them in near real-time as streaming chart visualizations. Of course, one should consider fronting the processed data stream with an API Gateway endpoint (as illustrated in the system architecture diagram) to allow multiple clients and downstream applications to consume the processed metrics scalably. 
 
## Try it Yourself 
 
### Deploy using CloudFormation 
 
This entire project can be deployed using [AWS 
CloudFormation](https://aws.amazon.com/cloudformation/) as a *Change Set for a New Stack* (a Serverless Application Transform must first be applied to the template definition). Explore the [Github repository for this project](https://github.com/brain-power/aws-fidgetology-demo-app) for a description of configuration options and AWS resource components, as well as custom command-line deployment options.  
 
Click the button to begin the stack creation process: 
 
<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fmaster-template.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a> 
 
1. Click **Next**, and specify **bp-fidgetology-demo** as both the **Stack name** and **Change set name**. Accept all default parameters and click **Next**. 

**@Runpeng, change the name everywhere to "brain-power-fidgetology-demo" to get more of our branding in there.** 
 
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
    console.log(face.Timestamp);
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
 
![Headset Off Results Animation](attachments/results/GlassOffRTAnimation.gif?raw=true "Headset Off Results Animation") 

**@Runpeng, for the next draft, can you surface the face markers (eye, nose, mouth corners) for one of the GIFs? If it is distracting to the image, we can do a separate figure showing just that. It will impress viewers. Also, in the current GIFs you use circular disks. It would show off more features if they were ovals, so we could show that the system detects tilt of the head; and it would be great if the rotation of the head would result in a squishing of the oval, thus demonstrating that the system picks of rotation angle as well.**  
 
![Headset On Results Animation](attachments/results/GlassOnRTAnimation.gif?raw=true "Headset On Results Animation") 

**@Runpeng The animated GIFs of real-time stats seem to plot similar but not the same data as the lower single-snapshot graphs. If they were totally different, that would be fine. But since they are similar enough, I think viewers may doubt us a bit. Best if they are identical windows of the data. Would this take a long time to re-create? Is it simply a matter of letting the GIF go longer (is it the same data just not all of it) or was it a different window altogether)?**

**@Runpeng, Please title these animations. I can help you decide title, but please take a crack at it when you can. For instance they could be titled: "Real-Time Fidgetology Analysis: // Child Not Using Brain Power's AR System for Autism" and "Real-Time Fidgetology Analysis: // Child Using Brain Power's AR System for Autism" or something like that.**

**@Runpeng. For These plots, and for the plots below and the teaser at the top:  a.) Please make all the axis labels much bigger and easier to read, b.) either remove the 4 little icons in the upper left of the Index view, or if those are required because this is a real-time view of the actual interface you built, then brag about that! A real-time display that looks like that is very impressive. Please label it as such. c.) Please indicate that there are multiple possbile fidget indices but labeling the current one as "Fidget/Motion Index 1" or even better "Fidget/Motion Index 3" - to make it clear that there are multiple alternatives and we chose one that was best for the current video. Then a subtitle to the label (directly beneath, and in italics), such as "angular velocity" or "rotational speed" or whatever it actually was. Therefore the whole title for each would be something like "Fidget/Motion Index 3: // Rotational Speed of Face". Thanks!**  
 
![Results Montage](attachments/results/Glass_ON_OFF_SideBySide_Montage.png?raw=true "Results Montage") 
 
## Summary 
 
We've provided a web application and accompanying Serverless architecture for streaming webcam feed from browser to Kinesis Video Streams and Rekognition Video. Body motion metrics can be then be visualized in web app with minimal delay. 
 
*@Ned/Joey can you close this?*  (coming soon!)
 
## Acknowledgements 
 
## Authors Bios
 
