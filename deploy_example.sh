#!/bin/bash

STACK_NAME="bp-fidgetology-demo"

###### Do not modify below ######

ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account')
BOOTSTRAP_BUCKET_NAME="${STACK_NAME}-bootstrap-${ACCOUNT_ID}"

aws s3 mb s3://${BOOTSTRAP_BUCKET_NAME}

aws cloudformation package --template-file template.yaml --s3-bucket ${BOOTSTRAP_BUCKET_NAME} --output-template-file master-template.yaml

aws cloudformation deploy --template-file master-template.yaml --stack-name ${STACK_NAME} --capabilities CAPABILITY_IAM

API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --output text --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue')
WEBAPP_BUCKET=$(aws cloudformation describe-stack-resources --stack-name ${STACK_NAME} --logical-resource-id WebAppBucket --output text --query 'StackResources[0].PhysicalResourceId') 
WEBAPP_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --output text --query 'Stacks[0].Outputs[?OutputKey==`WebAppSecureURL`].OutputValue')

echo "var API_ENDPOINT = '${API_ENDPOINT}'" > "dashboard/js/app/config.js"

aws s3 sync dashboard/ s3://${WEBAPP_BUCKET}

printf "\n===================================================================\n"
printf "Deployment completed. Visit the following link to demo the web app:\n${WEBAPP_URL}"