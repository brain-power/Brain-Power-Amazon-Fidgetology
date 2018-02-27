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

This project can be deployed using [AWS
CloudFormation](https://aws.amazon.com/cloudformation/).

The CloudFormation stack defined in `template.yaml` is expressed using the [AWS Serverless Application Model](https://github.com/awslabs/serverless-application-model).

You can deploy the required AWS resources and demo web app all in one go using the master deploy command:

```shell
./deploy_example.sh
```

This command will:
 * Package code artifacts (Lambda function source files) and upload to a bootstrapping S3 bucket.
 * Generate a `template-master.yaml` CloudFormation stack that is then deployed to your AWS account.
 * Configure the dashboard web app with required API routes, and upload static website files to be hosted from an S3 bucket.
 * Output the public URL to the demo web app hosted in the S3 bucket. 
 
## Usage

### Running locally

After deploying the CloudFormation stack, the web app can be tested locally.

Before you run the local development server, you need to install the
development dependencies with the command:
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

This will tear down all AWS resources that were provisioned with the CloudFormation stack, delete all videos that were uploaded using the web app, and delete the bucket hosting the web app.
