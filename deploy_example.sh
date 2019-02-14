#!/bin/bash

# Authored by Runpeng Liu,
# Brain Power (2018)

# Default stack name
STACK_NAME="brain-power-fidgetology-demo"

# Only regions with both Kinesis Video Stream and Rekognition service are supported
SUPPORTED_REGIONS=("us-west-2" "us-east-1" "eu-west-1" "ap-northeast-1")

###### Do not modify below ######

containsElement () {
	local e match="$1"
	shift
	for e; do [[ "$e" == "$match" ]] && IS_VALID_REGION='y' && return; done
	return
}

REGION=$(aws configure get region)
containsElement "${REGION}" "${SUPPORTED_REGIONS[@]}"

if [ -z "$IS_VALID_REGION" ]; then
	echo "Deployment in region ${REGION} is not supported. Supported regions are: [ ${SUPPORTED_REGIONS[*]} ]. Please re-configure your default region using the AWS CLI before deploying."
	exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account')
if [ -z "$ACCOUNT_ID" ]; then
	echo "Error getting account ID. Please confirm your AWS CLI is configured correctly."
	exit 1
fi

BOOTSTRAP_BUCKET_NAME="${STACK_NAME}-bootstrap-${ACCOUNT_ID}"

set -e

aws s3 mb s3://${BOOTSTRAP_BUCKET_NAME}

# These two lines deploy the 'Full' version of the web app (with Webcam, KVS, Rekognition Video + Analytics features)
aws cloudformation package --template-file template.yaml --s3-bucket ${BOOTSTRAP_BUCKET_NAME} --output-template-file master-template.yaml
aws cloudformation deploy --template-file master-template.yaml --stack-name ${STACK_NAME} --capabilities CAPABILITY_IAM

# If wishing to deploy the 'Lite' version of the web app (which only includes Webcam and KVS),
# then comment out the two commands above and uncomment the two commands below.

# aws cloudformation package --template-file template_lite.yaml --s3-bucket ${BOOTSTRAP_BUCKET_NAME} --output-template-file packaged-template_lite.yaml
# aws cloudformation deploy --template-file packaged-template_lite.yaml --stack-name ${STACK_NAME} --capabilities CAPABILITY_IAM

API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --output text --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue')
WEBAPP_BUCKET=$(aws cloudformation describe-stack-resources --stack-name ${STACK_NAME} --logical-resource-id WebAppBucket --output text --query 'StackResources[0].PhysicalResourceId')
WEBAPP_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --output text --query 'Stacks[0].Outputs[?OutputKey==`WebAppSecureURL`].OutputValue')

echo "var API_ENDPOINT = '${API_ENDPOINT}'" > "dashboard/js/app/config.js"

aws s3 cp dashboard/js/app/config.js s3://${WEBAPP_BUCKET}/js/app/config.js

printf "\n===================================================================\n"
printf "Deployment completed. Visit the following link to demo the web app:\n${WEBAPP_URL}\n"
