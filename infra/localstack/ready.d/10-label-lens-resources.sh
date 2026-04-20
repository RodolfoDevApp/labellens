#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="${LABEL_LENS_TABLE:-LabelLensTable}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if ! awslocal dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" >/dev/null 2>&1; then
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

ensure_queue() {
  local queue_name="$1"

  if ! awslocal sqs get-queue-url --queue-name "$queue_name" --region "$REGION" >/dev/null 2>&1; then
    awslocal sqs create-queue --queue-name "$queue_name" --region "$REGION" >/dev/null
  fi
}

queue_url() {
  local queue_name="$1"
  awslocal sqs get-queue-url \
    --queue-name "$queue_name" \
    --query QueueUrl \
    --output text \
    --region "$REGION"
}

queue_arn() {
  local queue_url_value="$1"
  awslocal sqs get-queue-attributes \
    --queue-url "$queue_url_value" \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text \
    --region "$REGION"
}

ensure_queue_with_dlq() {
  local queue_name="$1"
  local dlq_name="$2"
  local max_receive_count="$3"

  ensure_queue "$dlq_name"
  ensure_queue "$queue_name"

  local dlq_url
  dlq_url="$(queue_url "$dlq_name")"

  local queue_url_value
  queue_url_value="$(queue_url "$queue_name")"

  local dlq_arn
  dlq_arn="$(queue_arn "$dlq_url")"

  awslocal sqs set-queue-attributes \
    --queue-url "$queue_url_value" \
    --attributes "RedrivePolicy={\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"$max_receive_count\"}" \
    --region "$REGION" >/dev/null
}

ensure_queue_with_dlq "labellens-product-not-found-queue" "labellens-product-not-found-dlq" "3"
ensure_queue_with_dlq "labellens-analytics-queue" "labellens-analytics-dlq" "5"
