#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="${LABEL_LENS_TABLE:-LabelLensTable}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if ! awslocal dynamodb describe-table --table-name "$TABLE_NAME" >/dev/null 2>&1; then
  awslocal dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" >/dev/null
fi

awslocal dynamodb update-time-to-live \
  --table-name "$TABLE_NAME" \
  --time-to-live-specification Enabled=true,AttributeName=expiresAt \
  --region "$REGION" >/dev/null || true

create_queue_if_missing() {
  local queue_name="$1"
  awslocal sqs get-queue-url --queue-name "$queue_name" --region "$REGION" >/dev/null 2>&1 || \
    awslocal sqs create-queue --queue-name "$queue_name" --region "$REGION" >/dev/null
}

create_queue_if_missing "labellens-product-not-found-dlq"
create_queue_if_missing "labellens-analytics-dlq"
create_queue_if_missing "labellens-product-not-found-queue"
create_queue_if_missing "labellens-analytics-queue"
