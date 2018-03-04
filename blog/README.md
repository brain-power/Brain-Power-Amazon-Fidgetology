## Automatically Analyze Body Language to Gauge Attention and Engagement, Using Kinesis Video Streams and AWS Rekognition

Ned T. Sahin, PhD, Runpeng Liu, Joseph Salisbury, PhD, Lillian Bu

## Introduction

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
suggestions for how to add complex lambda functions or machine-learning models for more
nuanced analysis suited to your unique needs.

## How it Works
 
### Kinesis Video Streams Ingestion

#### Uploading a pre-recorded video

#### Streaming from browser webcam

### Rekognition Stream Processor

### Motion Analytics

### Visualizing the Metrics

## Try it Yourself

### Deploy using CloudFormation

## Areas to Expand this Architecture

### Kinesis Analytics/Sagemaker

## Results / Brain Power's Use Case

## Summary

## Acknowledgements

## Authors Bios
