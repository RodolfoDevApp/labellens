import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createLabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensAwsStack } from "./label-lens-aws-stack.js";

function synthesizeTemplate() {
  const app = new App();
  const config = createLabelLensAwsConfig("test");
  const stack = new LabelLensAwsStack(app, "LabelLensTest", {
    config,
    env: {
      account: "111111111111",
      region: "us-east-1",
    },
  });

  return Template.fromStack(stack);
}

describe("LabelLensAwsStack", () => {
  it("creates the DynamoDB single table with PK/SK, on-demand billing, PITR and TTL", () => {
    const template = synthesizeTemplate();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "labellens-test-table",
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        {
          AttributeName: "PK",
          KeyType: "HASH",
        },
        {
          AttributeName: "SK",
          KeyType: "RANGE",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "PK",
          AttributeType: "S",
        },
        {
          AttributeName: "SK",
          AttributeType: "S",
        },
      ],
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      TimeToLiveSpecification: {
        AttributeName: "expiresAt",
        Enabled: true,
      },
      DeletionProtectionEnabled: true,
    });
  });

  it("creates all sealed messaging queues with DLQs and closed retry counts", () => {
    const template = synthesizeTemplate();

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-product-not-found-dlq",
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-product-not-found-queue",
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-analytics-dlq",
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-analytics-queue",
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-food-cache-refresh-dlq",
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-food-cache-refresh-queue",
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-product-cache-refresh-dlq",
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "labellens-test-product-cache-refresh-queue",
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });
  });

  it("creates one ECR repository per deployable service and worker", () => {
    const template = synthesizeTemplate();

    template.resourceCountIs("AWS::ECR::Repository", 8);

    for (const repositoryName of [
      "labellens-test/gateway",
      "labellens-test/auth-service",
      "labellens-test/food-service",
      "labellens-test/product-service",
      "labellens-test/menu-service",
      "labellens-test/favorites-service",
      "labellens-test/product-not-found-worker",
      "labellens-test/analytics-worker",
    ]) {
      template.hasResourceProperties("AWS::ECR::Repository", {
        RepositoryName: repositoryName,
        ImageScanningConfiguration: {
          ScanOnPush: true,
        },
      });
    }
  });

  it("exports operational SSM parameters for services and deployment automation", () => {
    const template = synthesizeTemplate();

    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/labellens-test/runtime/storage-driver",
      Type: "String",
      Value: "dynamodb",
    });

    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/labellens-test/runtime/public-boundary",
      Type: "String",
      Value: "gateway-only",
    });

    template.resourceCountIs("AWS::SSM::Parameter", 37);
  });

  it("alarms on DLQ messages and queue age", () => {
    const template = synthesizeTemplate();

    expect(Object.keys(template.findResources("AWS::CloudWatch::Alarm"))).toHaveLength(8);

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-product-not-found-dlq-visible-messages",
      Threshold: 1,
      TreatMissingData: "notBreaching",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-analytics-queue-oldest-message-age",
      Threshold: 300,
      EvaluationPeriods: 2,
      TreatMissingData: "notBreaching",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-food-cache-refresh-dlq-visible-messages",
      Threshold: 1,
      TreatMissingData: "notBreaching",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-product-cache-refresh-queue-oldest-message-age",
      Threshold: 300,
      EvaluationPeriods: 2,
      TreatMissingData: "notBreaching",
    });
  });
});
