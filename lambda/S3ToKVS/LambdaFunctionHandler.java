package com.brainpower.fidgetology.demo;

import java.io.BufferedOutputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.CountDownLatch;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.S3Event;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.S3Object;

import com.amazonaws.services.kinesisvideo.AmazonKinesisVideo;
import com.amazonaws.services.kinesisvideo.AmazonKinesisVideoAsyncClient;
import com.amazonaws.services.kinesisvideo.AmazonKinesisVideoClient;
import com.amazonaws.services.kinesisvideo.AmazonKinesisVideoPutMedia;
import com.amazonaws.services.kinesisvideo.AmazonKinesisVideoPutMediaClient;
import com.amazonaws.services.kinesisvideo.PutMediaAckResponseHandler;
import com.amazonaws.services.kinesisvideo.model.AckEvent;
import com.amazonaws.services.kinesisvideo.model.FragmentTimecodeType;
import com.amazonaws.services.kinesisvideo.model.GetDataEndpointRequest;
import com.amazonaws.services.kinesisvideo.model.PutMediaRequest;

/* 
 * Authored by Runpeng Liu,
 * Brain Power (2018) 
 */
 
public class LambdaFunctionHandler implements RequestHandler<S3Event, String> {

    private AmazonS3 s3 = AmazonS3ClientBuilder.standard().build();
    private Context context;

    public LambdaFunctionHandler() {}

    // Test purpose only.
    LambdaFunctionHandler(AmazonS3 s3) {
        this.s3 = s3;
    }

    @Override
    public String handleRequest(S3Event event, Context context) {
        context.getLogger().log("Received event: " + event);
        this.context = context;

        // Get the object from the event and show its content type
        String bucket = event.getRecords().get(0).getS3().getBucket().getName();
        String key = event.getRecords().get(0).getS3().getObject().getKey();
        
        String streamName = System.getenv("KVS_STREAM_NAME");
        
        try {
            S3Object videoObject = s3.getObject(new GetObjectRequest(bucket, key));
            String contentType = videoObject.getObjectMetadata().getContentType();
            String producerTimestamp = videoObject.getObjectMetadata().getUserMetaDataOf(System.getenv("PRODUCER_START_TIMESTAMP_KEY"));
            context.getLogger().log("Producer timestamp: " + producerTimestamp);
            Date producerStartTimestamp;
            try {
            	producerStartTimestamp = new Date(Long.parseLong(producerTimestamp));
            } catch(Exception e) {
            	System.out.println(e.getMessage());
            	producerStartTimestamp = Date.from(Instant.now());
            }
            context.getLogger().log("Producer timestamp (date): " + producerStartTimestamp + "\n");
            context.getLogger().log("Content type: " + contentType + "\n");
            context.getLogger().log("Object key: " + key + "\n");
            
            String fileName = key.substring(key.lastIndexOf('/')+1, key.length());
            String tempWriteLocation = "/tmp/" + fileName;
            
            InputStream is = videoObject.getObjectContent();
            BufferedOutputStream outputStream = new BufferedOutputStream(new FileOutputStream(tempWriteLocation));
            int totalSize = 0;
            int bytesRead;
            byte[] content = new byte[1024 * 1014];
            while ((bytesRead = is.read(content)) != -1) {
            	//context.getLogger().log(String.format("%d bytes read from S3 input stream\n", bytesRead));
            	outputStream.write(content, 0, bytesRead);
            	totalSize += bytesRead;
            }
            context.getLogger().log("Total size of file in bytes: " + totalSize + "\n");
            outputStream.close();
            
            try {
                streamToKVS(tempWriteLocation, streamName, producerStartTimestamp);	
                return key;
            } catch (Exception e) {
            	e.printStackTrace();
            	context.getLogger().log(e.getMessage());
            	return key;
            }

        } catch (Exception e) {
            e.printStackTrace();
            context.getLogger().log(String.format(
                "Error getting object %s from bucket %s. Make sure they exist and"
                + " your bucket is in the same region as this function.", key, bucket));
            try {
				throw e;
			} catch (Exception e1) {
				e1.printStackTrace();
			}
            return key;
        }
        
    }
    
    private static final int CONNECTION_TIMEOUT_IN_MILLIS = 10000;
    
    private void streamToKVS(String filename, String streamName, Date producerStartTimestamp) throws InterruptedException, FileNotFoundException {
    	
    	final AmazonKinesisVideo frontendClient = AmazonKinesisVideoClient.builder()
                 .withRegion(System.getenv("AWS_REGION"))
                 .build();
    	
    	/* this is the endpoint returned by GetDataEndpoint API */
        final String dataEndpoint = frontendClient.getDataEndpoint(
                new GetDataEndpointRequest()
                        .withStreamName(streamName)
                        .withAPIName("PUT_MEDIA")).getDataEndpoint();
        
        context.getLogger().log("Streaming to KVS endpoint: " + dataEndpoint + "\n");

        /* input stream for MKV file */
        final InputStream inputStream = new FileInputStream(filename);

        /* use a latch for main thread to wait for response to complete */
        final CountDownLatch latch = new CountDownLatch(1);

        /* PutMedia client */
        final AmazonKinesisVideoPutMedia dataClient = AmazonKinesisVideoPutMediaClient.builder()
                    .withRegion(System.getenv("AWS_REGION"))
                    .withEndpoint(URI.create(dataEndpoint))
                    .withConnectionTimeoutInMillis(CONNECTION_TIMEOUT_IN_MILLIS)
                    .build();

        final PutMediaAckResponseHandler responseHandler = new PutMediaAckResponseHandler() {
        		@Override
                public void onAckEvent(AckEvent event) {
        			context.getLogger().log("onAckEvent " + event + "\n");
                }

                @Override
                public void onFailure(Throwable t) {
                    latch.countDown();
                    throw new RuntimeException(t);
                }

                @Override
                public void onComplete() {
                    context.getLogger().log("Stream completed\n");
                    latch.countDown();
                }
       };
       
       

       /* start streaming video in a background thread */
       dataClient.putMedia(new PutMediaRequest()
    		   .withStreamName(streamName)
    		   .withFragmentTimecodeType(FragmentTimecodeType.RELATIVE)
    		   .withPayload(inputStream)
    		   .withProducerStartTimestamp(producerStartTimestamp),
    		   responseHandler);

      /* wait for request/response to complete */
      latch.await();

      /* close the client */
      dataClient.close();
    }
}