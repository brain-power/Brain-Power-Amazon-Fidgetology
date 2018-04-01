This directory contains source code for serverless Lambda functions expressed in the stack CloudFormation template ([`template.yaml`](../template.yaml)).

The following is a summary of each function and its event trigger.

### [MKVConverter](MKVConvert/index.js)

**Description:** Uses FFMpeg to convert static video uploads to streamable .MKV format for ingestion by Kinesis Video Streams

**Runtime:** `nodejs6.10`

**Event Trigger:** A new video file is created in the video uploads S3 Bucket.

```yaml
VideoUploadEvent:
  Type: S3
  Properties:
    Bucket: !Ref UploadsBucket
    Events: s3:ObjectCreated:*
    Filter:
      S3Key:
        Rules:
          - Name: prefix
            Value: raw_uploads/
```

### [S3ToKVS](S3ToKVS/LambdaFunctionHandler.java)

**Description:** Uses `putMedia` operation of Kinesis Video Streams Producer SDK for Java to artificially stream .MKV video chunks in S3 to Kinesis Video Streams

**Runtime:** `java8`

**Event Trigger:** A new `.mkv` video chunk is available in the video uploads S3 Bucket.

```yaml
VideoConvertedEvent:
  Type: S3
  Properties:
    Bucket: !Ref UploadsBucket
    Events: s3:ObjectCreated:*
    Filter:
       S3Key:
          Rules:
            - Name: suffix
              Value: .mkv
            - Name: prefix
              Value: mkv_uploads/
```

**Notes:** We do not include the entire Java project associated with this `S3ToKVS` function. 
We only include the compiled, deploy-ready `.jar` package, and the main [`LambdaFunctionHandler.java`](S3ToKVS/LambdaFunctionHandler.java)
file to demonstrate usage of the `putMedia` operation with the [Java KVS Producer SDK](). 
If you want modify the Lambda function handler for your own use, 
you must follow instructions to [create a Lambda deployment package for Java](https://docs.aws.amazon.com/lambda/latest/dg/lambda-java-how-to-create-deployment-package.html).

### [StreamAnalyzer](StreamAnalyzer/index.js)

**Description:** Analyzes raw output of Rekognition Stream Processor to estimate of degree of motion for faces/bodies in video stream. 
Publishes processed motion metrics to another Kinesis Data Stream.

**Runtime:** `nodejs6.10`

**Event Trigger**: New data records are published to Kinesis Data Stream by Rekognition Stream Processor.

```yaml
 StreamEvent:
  Type: Kinesis
  Properties:
    Stream: !GetAtt RawDataStream.Arn
    StartingPosition: TRIM_HORIZON
```

### [StreamResourceProvisioner](StreamResourceProvisioner/index.js)

**Description:**  Uses AWS SDK to provision a Kinesis Video Stream and Rekognition Stream Processor when stack is created. 
Deletes these stream resources when stack is deleted.
            
**Runtime:** `nodejs6.10`

**Event Trigger:** A custom CloudFormation resource triggers execution of this function during stack creation and deletion. 
This is a temporary workaround until Kinesis Video Stream and Rekognition Stream Processor become available as resource types in CloudFormation.
