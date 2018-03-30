#!/bin/bash

STACK_NAME="bp-fidgetology-demo"

ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account')
BOOTSTRAP_BUCKET_NAME="${STACK_NAME}-bootstrap-${ACCOUNT_ID}"

aws cloudformation delete-stack --stack-name ${STACK_NAME}
aws s3 rb s3://${STACK_NAME}-uploads-${ACCOUNT_ID} --force
aws s3 rb s3://${STACK_NAME}-webapp-${ACCOUNT_ID} --force