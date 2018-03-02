# aws-fidgetology-demo-app

## Overview

TODO

## Components

TODO

### Web Dashboard App

#### Uploading Videos

#### Streaming Video from Webcam

### Browser Support

The webcam streaming functionality has been tested on the following combinations of browsers and platforms. 
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


### Kinesis Video Stream

### Rekognition Stream Processor

## Deploying

**Prerequisites**:
 * (For customized deployment) [AWS-CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) installed. Ensure you have required permissions on your account (most notably: S3 bucket creation/deletion, full access to Rekognition and Kinesis Video Stream. Other resources launched in this project include: Lambda, API Gateway, Kinesis Data Stream)

 * (For local development only) [Node.js (>= 6)](https://nodejs.org/en/download/) installed.
 * (For local testing only) [FFmpeg](https://github.com/adaptlearning/adapt_authoring/wiki/Installing-FFmpeg) command line installed. 

### CloudFormation Deployment

This project can be deployed using [AWS
CloudFormation](https://aws.amazon.com/cloudformation/) as a *Change Set for a New Stack* (a Serverless Application Transform must first be applied to the `template.yaml` definition).

Click this button to begin the stack creation process:

<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stack/changeset/new?templateURL=https:%2F%2Fs3.amazonaws.com%2Fbrainpower-aws-blogs%2Fartifacts%2Ffidgetology-demo-app%2Fmaster-template.yaml"><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a>

1. Click **Next**, and specify **bp-fidgetology-demo** as both the **Stack name** and **Change set name**. Accept all default parameters and click **Next**.
2. Click **Next** again to get to the final Review page. Under *Capabilities*, confirm acknowledgement that new IAM resources will be created. Click **Create change set**.
3. On the next page, wait for the stack 'finish computing'. Then click **Execute** (top-right corner of page) to start the stack deployment. Refresh the CloudFormation page to find your newly created stack, and click on it. You can now monitor the deployment process, which should take no more than 3 minutes.
4. Once deployment is complete, launch the demo web app by visiting the **WebAppSecureURL** link listed under *Outputs*.

By default, the CloudFormation template
creates all necessary backend resources for this project (Kinesis Video Stream, Rekognition Stream Processor, Kinesis Data Streams, Serverless Lambda functions, and API Gateway). It copies the dashboard web application to an
[Amazon S3](https://aws.amazon.com/s3/) bucket and outputs a secure URL (fronted by API Gateway) for accessing the web app.

### Command Line Deployment

The CloudFormation stack defined in `template.yaml` is expressed using the [AWS Serverless Application Model](https://github.com/awslabs/serverless-application-model). Review it for a description
of the configuration options and AWS resource components. The template can be modified for a custom deployment.

From the command line, you can deploy all required AWS resources and demo web app in one go using the master deploy command:

```shell
./deploy_example.sh
```
**Note**: Currently deployment is supported only in regions where AWS Rekognition and Kinesis Video Stream services are both available (as of now, these are: **us-east-1** or **us-west-2**). If your default AWS region is not supported, you must [change your default region](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) before executing the deploy command.

This command will:
 * Package code artifacts (Lambda function source files in the `lambda/` directory) and upload to a bootstrapping S3 bucket.
 * Generate a `master-template.yaml` CloudFormation stack that is then deployed to your AWS account.
 * Configure the dashboard web app with required API routes, and upload static website files in the `dashboard/` directory to be hosted from an S3 bucket.
 * Output the public URL of the demo web app hosted in the S3 bucket. 
 
## Usage

### Running locally

If you deployed the CloudFormation stack using the CLI, the web app can be tested locally.

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

To avoid incurring charges on your AWS account after testing out the web app, run the master tear down command:

```shell 
./delete_stack.sh
```

This will tear down all AWS resources that were provisioned with the CloudFormation stack, delete all videos fragments that were uploaded/streamed using the web app, and delete the bucket hosting the web app.
