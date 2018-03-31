# Brain-Power-Amazon-Fidgetology

Repository for demo app + code artifacts associated with [Brain Power fidgetology post](https://aws.amazon.com/blogs/machine-learning/building-automatic-analysis-of-body-language-to-gauge-attention-and-engagement-using-amazon-kinesis-video-streams-and-amazon-ai-services/) on AWS Machine Learning Blog.

## Overview

This is a serverless web application for streaming webcam feed from a browser to [Amazon Kinesis Video Streams](https://console.aws.amazon.com/kinesisvideo) and [Amazon Rekognition Video](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html). Body motion metrics can be then be visualized in web app with minimal delay.

AWS Technologies used:
* Kinesis Video Streams
* Rekognition Video
* Kinesis Data Streams
* API Gateway
* Lambda
* S3
* CloudFormation

## Components

<kbd>
 <img src="attachments/Brain_Power_fidgetology_02__SystemArchitectureDiagram_trans.png?raw=true">
</kbd>

### Web Dashboard App

The client dashboard app allows users to 1) upload pre-recorded video and 2) stream a webcam feed to [Amazon Kinesis Video Streams](https://console.aws.amazon.com/kinesisvideo), and visualize the resulting face motion metrics computed by [Amazon Rekognition Video](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html) in near real-time. For details on how client-side streaming works and tools used to build the web app, see the [dashboard app-specific documentation](dashboard).

#### Uploading a Video

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_03__UploadVideoExampleBlur.jpg?raw=true">
</kbd>

#### Streaming Video from a Webcam

<kbd>
 <img src="attachments/screenshots/WebcamStreamExampleCensored.jpg?raw=true">
</kbd>

(*Faces censored)

#### Browser Support

The webcam streaming functionality (backed by [WebRTC](https://webrtc.github.io/samples/) `getUserMedia` API) has been tested on the following combinations of browsers and platforms. 
Most notably, it currently works on the latest version of all major browsers and platforms, with the exception of iOS mobile browsers.

| Platform | Browser | Notes |
|----|---------|-------|
| Windows | Chrome 30+ | Works |
| Windows | Firefox 20+ | Works |
| Windows | Edge (latest) | Works |
| Windows | IE 9+ | **Requires Adobe Flash Player** |
| Mac OS X | Chrome 30+ | Works |
| Mac OS X | Firefox 20+ | Works |
| Mac OS X | Safari 6+ | **Requires Adobe Flash Player** |
| Android | Chrome (latest) | Works |
| Android | Native browser | Doesn't Work |
| iOS | Safari/Chrome | Doesn't Work |

### Stream Conversion

When static video or buffered webcam frames are uploaded in the web app, a Lambda function converts them to streamable MKV files (currently, [MKV is the only file container supported by Kinesis Video Stream](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/how-data.html#how-data-frame)).

* If the source is a *static video upload*, then the [`lambda/MKVConverter`](lambda/MKVConvert/index.js) function is triggered directly by an S3 upload event. An FFmpeg subprocess is used for file conversion. 

* If the source is a sequence of buffered *webcam frames*, the browser client posts frame data to an [API Gateway - Lambda Proxy](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html) endpoint, triggering the [`lambda/WebApi/frame-converter`](lambda/WebApi/frame-converter.js) function. This function uses FFmpeg to construct a short MKV fragment out of the image frame sequence. For details on how this API request is executed, see the [function-specific documentation](lambda/WebApi/README.md).

In both cases, converted MKV files are archived in an S3 bucket, triggering the next step in the pipeline.

### Kinesis Video Stream

An MKV file upload event triggers the [`lambda/S3ToKVS`](lambda/S3ToKVS/LambdaFunctionHandler.java) function, which uses the [Kinesis Video Stream Producer SDK for Java](https://github.com/awslabs/amazon-kinesis-video-streams-producer-sdk-java) to put the media fragments into a Kinesis Video Stream.

Below is a side-by-side illustration of webcam streaming to the Kinesis Video Streams online console. The lag between the live webcam app feed (left) and the time these frames are played back on the KVS console (right) is about 5 seconds (though this may vary depending on browser/platform/specs of your machine).

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_04__KVSConsoleDemoCrop.gif?raw=true">
</kbd><br/>

To decrease the lag, you can experiment with adjusting the **No. Frames to Buffer** parameter using the form input below the live webcam feed. Beware that specifying too low of a buffer size may cause KVS to receive frames out-of-order.

#### Misc KVS Notes

**Note 1**: Currently, Kinesis Video Stream Producer SDK is only available in Java/C++, so this step could not be merged with the previous stream conversion step, which runs in a Node.js container for consistently fast startup time. If a KVS Producer SDK becomes available in Node.js/Python, then this step should just be merged with the previous step (as a single Lambda execution) to avoid the needless latency of using S3 as a file transfer proxy between different Lambda containers. While a viable alternative is to do the previous stream conversion step in Java as well, the faster startup times and smaller deployment packages associated with Node.js make it more suitable for this demo. One could definitely explore re-factoring all the serverless Lambda functions in Java to see if it improves performance.

**Note 2**: To simplify the build process, we do not include the entire Java project associated with this `S3ToKVS` function. We only include the compiled, deploy-ready `.jar` package, and the main [`LambdaFunctionHandler.java`](lambda/S3ToKVS/LambdaFunctionHandler.java) file to demonstrate usage of the `putMedia` operation with the Java KVS Producer SDK. However, if you want modify the Lambda function handler for your own use, you must follow instructions to [create a Lambda deployment package for Java](https://docs.aws.amazon.com/lambda/latest/dg/lambda-java-how-to-create-deployment-package.html), which involves using Maven/Eclipse, greatly complicating the build process. All in all, until a KVS Producer SDK becomes available in Node.js/Python, there is not an easy workaround.

 **Note 3**: Another route is to abandon Serverless/Lambda and provision a custom AMI as a webRTC server that also handles stream conversion. This solution will probably yield the best performance and lowest latency, but is not in the spirit of this Serverless demo.

### Rekognition Stream Processor

The Kinesis Video Stream is used as input to a [Rekognition Stream Processor](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html), that detects and recognizes faces in the video stream, and publishes raw records to a [Kinesis Data Stream](). See [`lambda/StreamResourceProvisioner`](lambda/StreamResourceProvisioner) for how these resources are provisioned.

### Body Motion Analytics

The [raw output](https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video-kinesis-output-reference.html) of Rekognition Stream Processor is published to a Kinesis Data Stream. When new records appear in this raw stream, a Lambda function is triggered that computes interesting derived metrics on faces in successive video frames, such as the rotational/translational motion velocities. These processed metrics are then published to another Kinesis Data Stream, for consumption by downstream applications and web dashboards. See [`lambda/StreamAnalyzer`](lambda/StreamAnalyzer/index.js) for an example of how one might analyze the raw output of Rekognition Video.

### Visualizing the Metrics

For this demo, the web app consumes body motion metrics directly from the processed Kinesis Data Stream and renders them as real-time updating chart visualizations. 

## Deploying

### CloudFormation Deployment

There are two flavors of this project that can be deployed:

* **'Full'** version - expressed in [`template.yaml`](template.yaml). Includes all components described in previous section.
* **'Lite'** version - expressed in [`template_lite.yaml`](template_lite.yaml). Only includes browser Webcam to Kinesis Video Streams component. Rekognition Video, Kinesis Data Streams, and demo analytics + visualizations are excluded for simplicity.

This project can be deployed using [AWS
CloudFormation](https://aws.amazon.com/cloudformation/) as a *Change Set for a New Stack* (a serverless application transform must first be applied to the `template.yaml` definition).

Click the button to begin the stack creation process:

**Full** Version:  <a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fmaster-template.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a>

**Lite** Version:  <a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fpackaged-template_lite.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a>

**Step 1.** Click **Next**, and specify **brain-power-fidgetology-demo** as both the **Stack name** and **Change set name**. Accept all default parameters and click **Next**.

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_05__CreateChangeSetDetails.png?raw=true">
</kbd><br/>

**Step 2.** Click **Next** again to get to the final Review page. Under *Capabilities*, confirm acknowledgement that new IAM resources will be created. Then click **Create change set**.

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_06__CreateChangeSetIAM.png?raw=true">
</kbd><br/>

**Step 3.** On the next page, wait for the stack to finish 'Computing changes'. Then click **Execute** (top-right corner of page) to start the stack deployment. Confirm, and refresh the CloudFormation page to find your newly created stack. Click on it to monitor the deployment process, which should take no more than 3 minutes.

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_07__CreateChangeSetExecute.png?raw=true">
</kbd><br/>

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_08__CreateStackInProgress.png?raw=true">
</kbd><br/>

**Step 4.** After deployment is complete, launch the demo web app by visiting the **WebAppSecureURL** link listed under *Outputs*.

<kbd>
 <img src="attachments/screenshots/Brain_Power_fidgetology_09__WebAppURLOutput.png?raw=true">
</kbd><br/>

By default, the CloudFormation template
creates all necessary AWS resources for this project (Kinesis Video Stream, Rekognition Stream Processor, Kinesis Data Streams, serverless Lambda functions, and an API Gateway endpoint). It copies the dashboard web application to an
[Amazon S3](https://aws.amazon.com/s3/) bucket and outputs a secure URL (fronted by API Gateway) for accessing the web app.

### Command Line Deployment

**Prerequisites**:
 * (For customized deployment) [AWS-CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) installed. Ensure you have required permissions on your account (most notably: S3 bucket creation/deletion, full access to Rekognition and Kinesis Video Stream. Other resources launched in this project include: Lambda, API Gateway, Kinesis Data Stream)
 * (For local development only) [Node.js (>= 6)](https://nodejs.org/en/download/) installed.
 * (For local testing only) [FFmpeg](https://github.com/adaptlearning/adapt_authoring/wiki/Installing-FFmpeg) command line installed. 

The CloudFormation stack defined in `template.yaml` is expressed using the [AWS Serverless Application Model](https://github.com/awslabs/serverless-application-model). Review it for a description
of the configuration options and AWS resource components. The template can be modified for a custom deployment.

From the command line, you can deploy all required AWS resources and demo web app in one go using the master deploy command:

```shell
./deploy_example.sh
```
**Note**: Currently deployment is supported only in regions where AWS Rekognition and Kinesis Video Stream services are both available (as of now, these are: **us-east-1** or **us-west-2**). If your default AWS region is not supported, you must [change your default region](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) before executing the deploy command.

This command will:
 * Package code artifacts (Lambda function source files in the `lambda/` directory and `dashboard/` static files) and upload to a bootstrapping S3 bucket.
 * Generate a `master-template.yaml` CloudFormation template that is then deployed to your AWS account using AWS-CLI.
 * Configure the dashboard web app with required API routes, and upload static website files in the `dashboard/` directory to be hosted from an S3 bucket.
 * Output the public URL of the demo web app hosted in the S3 bucket. 
 
## Usage

### Running locally

If you deployed the stack using the command line, the web app can be tested locally. Please ensure you have [Node.JS/NPM](https://nodejs.org/en/download/) and [FFmpeg](https://github.com/adaptlearning/adapt_authoring/wiki/Installing-FFmpeg) installed and available in your path.

Before you run the local development server, you need to install the
Node.js development dependencies with the command:
```shell
npm install
```
To start the HTTP server web on port `3000`, issue the command:
```shell
# serves http://localhost:3000
npm start
```

Then navigate to http://localhost:3000 in your browser.

## Tear down

If you launched the stack from the CloudFormation online console, simply delete the stack online.

<kbd>
 <img src="attachments/screenshots/DeleteStack.png?raw=true">
</kbd><br/>

If you deployed from the command line, run the master tear down command:

```shell 
./delete_stack.sh
```

In both cases, this will tear down all AWS resources that were provisioned with the CloudFormation stack, delete all videos fragments that were uploaded/streamed using the web app, and delete the bucket hosting the web app.

## Potential Improvements

* See [Misc KVS Notes](#misc-kvs-notes) for potential improvements to stream conversion-to-KVS flow.
* Explore [Kinesis Analytics](https://console.aws.amazon.com/kinesisanalytics/home) for analyzing raw output of Rekognition stream processor, with unsupervised anomaly detection capabilities.
* Expose an API Gateway endpoint for reading from the KDS of processed motion metrics, allowing web app to avoid consuming directly from the processed stream.
* Modify [`StreamAnalyzer`](lambda/StreamAnalyzer/index.js) to allow for tracking of multiple faces/bodies in a feed.
* Once Kinesis Video Stream and Rekognition Stream Processor become available as [CloudFormation Resource Types](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html), add them to the template definitions, removing the need for [`StreamResourceProvisioner`](lambda/StreamResourceProvisioner/index.js) Custom resource.

