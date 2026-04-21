#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="${LABEL_LENS_TABLE:-LabelLensTable}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

PYTHON_BIN="python3"
if ! command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

echo "Initializing LabelLens LocalStack resources..."

if ! awslocal dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Creating DynamoDB table $TABLE_NAME..."

  awslocal dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" >/dev/null
fi

awslocal dynamodb wait table-exists \
  --table-name "$TABLE_NAME" \
  --region "$REGION"

awslocal dynamodb update-time-to-live \
  --table-name "$TABLE_NAME" \
  --time-to-live-specification Enabled=true,AttributeName=expiresAt \
  --region "$REGION" >/dev/null || true

ensure_queue() {
  local queue_name="$1"

  if ! awslocal sqs get-queue-url --queue-name "$queue_name" --region "$REGION" >/dev/null 2>&1; then
    echo "Creating SQS queue $queue_name..."

    awslocal sqs create-queue \
      --queue-name "$queue_name" \
      --region "$REGION" >/dev/null
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

set_redrive_policy() {
  local queue_url_value="$1"
  local dlq_arn="$2"
  local max_receive_count="$3"

  local cli_input_file
  cli_input_file="$(mktemp /tmp/labellens-redrive-XXXXXX.json)"

  QUEUE_URL_VALUE="$queue_url_value" \
  DLQ_ARN="$dlq_arn" \
  MAX_RECEIVE_COUNT="$max_receive_count" \
  "$PYTHON_BIN" - <<'PY' > "$cli_input_file"
import json
import os

redrive_policy = {
    "deadLetterTargetArn": os.environ["DLQ_ARN"],
    "maxReceiveCount": os.environ["MAX_RECEIVE_COUNT"],
}

payload = {
    "QueueUrl": os.environ["QUEUE_URL_VALUE"],
    "Attributes": {
        "RedrivePolicy": json.dumps(redrive_policy, separators=(",", ":")),
    },
}

print(json.dumps(payload, separators=(",", ":")))
PY

  awslocal sqs set-queue-attributes \
    --cli-input-json "file://$cli_input_file" \
    --region "$REGION" >/dev/null

  rm -f "$cli_input_file"
}

ensure_queue_with_dlq() {
  local queue_name="$1"
  local dlq_name="$2"
  local max_receive_count="$3"

  echo "Ensuring SQS queue $queue_name with DLQ $dlq_name..."

  ensure_queue "$dlq_name"
  ensure_queue "$queue_name"

  local dlq_url
  dlq_url="$(queue_url "$dlq_name")"

  local queue_url_value
  queue_url_value="$(queue_url "$queue_name")"

  local dlq_arn
  dlq_arn="$(queue_arn "$dlq_url")"

  set_redrive_policy "$queue_url_value" "$dlq_arn" "$max_receive_count"
}

ensure_queue_with_dlq "labellens-product-not-found-queue" "labellens-product-not-found-dlq" "3"
ensure_queue_with_dlq "labellens-analytics-queue" "labellens-analytics-dlq" "3"
ensure_queue_with_dlq "labellens-food-cache-refresh-queue" "labellens-food-cache-refresh-dlq" "3"
ensure_queue_with_dlq "labellens-product-cache-refresh-queue" "labellens-product-cache-refresh-dlq" "3"

echo "LabelLens LocalStack resources ready."