# aws-fidgetology-demo-app

## Overview

TODO

## Components

TODO

### Web Dashboard App

#### Uploading Videos

### Kinesis Video Stream

### Rekognition Stream Processor

## Deploying

Pre-requesites:
 * [AWS-CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) installed. Ensure you have required permissions on your account (most notably: S3 bucket creation/deletion, full access to Rekognition and Kinesis Video Stream. Other resources launched in this project include: Lambda, API Gateway, Kinesis Data Stream)
 * (For local development) [Node.js (>= 6)](https://nodejs.org/en/download/) installed.
 
This project can be deployed using [AWS
CloudFormation](https://aws.amazon.com/cloudformation/).

The CloudFormation stack defined in `template.yaml` is expressed using the [AWS Serverless Application Model](https://github.com/awslabs/serverless-application-model).

You can deploy the required AWS resources and demo web app all in one go using the master deploy command:

```shell
./deploy_example.sh
```
**Note**: Currently deployment is supported only in regions where AWS Rekognition and Kinesis Video Stream services are both available (as of now, these are: **us-east-1** or **us-west-2**). If your default AWS region is not supported, you must [change your default region](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) before executing the deploy command.

This command will:
 * Package code artifacts (Lambda function source files) and upload to a bootstrapping S3 bucket.
 * Generate a `master-template.yaml` CloudFormation stack that is then deployed to your AWS account.
 * Configure the dashboard web app with required API routes, and upload static website files to be hosted from an S3 bucket.
 * Output the public URL of the demo web app hosted in the S3 bucket. 
 
## Usage

### Running locally

After deploying the CloudFormation stack, the web app can be tested locally.

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

This will tear down all AWS resources that were provisioned with the CloudFormation stack, delete all videos that were uploaded/streamed using the web app, and delete the bucket hosting the web app.
