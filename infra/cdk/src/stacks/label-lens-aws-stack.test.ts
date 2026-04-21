import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createLabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensAwsStack } from "./label-lens-aws-stack.js";

type CloudFormationResource = {
  Type?: string;
  Properties?: Record<string, unknown>;
};

type ScheduleTarget = {
  Input?: unknown;
};

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

function findResourceByName(template: Template, type: string, name: string): CloudFormationResource {
  const resources = template.findResources(type) as Record<string, CloudFormationResource>;
  const resource = Object.values(resources).find((candidate) => candidate.Properties?.Name === name);

  expect(resource).toBeDefined();

  return resource as CloudFormationResource;
}

function getScheduleTargetInputText(resource: CloudFormationResource): string {
  const target = resource.Properties?.Target as ScheduleTarget | undefined;

  expect(target?.Input).toBeDefined();

  return JSON.stringify(target?.Input);
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

  it("creates EventBridge Scheduler refresh schedules that publish sealed events to SQS", () => {
    const template = synthesizeTemplate();

    template.hasResourceProperties("AWS::Scheduler::ScheduleGroup", {
      Name: "labellens-test-schedules",
    });

    template.resourceCountIs("AWS::Scheduler::Schedule", 2);

    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      GroupName: "labellens-test-schedules",
      Name: "labellens-test-food-cache-refresh-daily",
      ScheduleExpression: "cron(0 3 * * ? *)",
      ScheduleExpressionTimezone: "UTC",
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      State: "ENABLED",
      Target: Match.objectLike({
        Arn: {
          "Fn::Join": Match.arrayWith([
            Match.arrayWith(["arn:", { Ref: "AWS::Partition" }, ":scheduler:::aws-sdk:sqs:sendMessage"]),
          ]),
        },
        DeadLetterConfig: {
          Arn: {
            "Fn::GetAtt": Match.arrayWith(["MessagingFoodCacheRefreshDeadLetterQueue5503A79A", "Arn"]),
          },
        },
        RoleArn: {
          "Fn::GetAtt": Match.arrayWith(["SchedulesSchedulerSqsPublisherRoleC128D49D", "Arn"]),
        },
        Input: Match.anyValue(),
      }),
    });

    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      GroupName: "labellens-test-schedules",
      Name: "labellens-test-product-cache-refresh-daily",
      ScheduleExpression: "cron(15 3 * * ? *)",
      ScheduleExpressionTimezone: "UTC",
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      State: "ENABLED",
      Target: Match.objectLike({
        DeadLetterConfig: {
          Arn: {
            "Fn::GetAtt": Match.arrayWith(["MessagingProductCacheRefreshDeadLetterQueue66550FFE", "Arn"]),
          },
        },
        RoleArn: {
          "Fn::GetAtt": Match.arrayWith(["SchedulesSchedulerSqsPublisherRoleC128D49D", "Arn"]),
        },
        Input: Match.anyValue(),
      }),
    });

    const foodSchedule = findResourceByName(
      template,
      "AWS::Scheduler::Schedule",
      "labellens-test-food-cache-refresh-daily",
    );
    const productSchedule = findResourceByName(
      template,
      "AWS::Scheduler::Schedule",
      "labellens-test-product-cache-refresh-daily",
    );

    const foodInput = getScheduleTargetInputText(foodSchedule);
    const productInput = getScheduleTargetInputText(productSchedule);

    expect(foodInput).toContain("cache.refresh.food.requested.v1");
    expect(foodInput).toContain("eventVersion");
    expect(foodInput).toContain("eventbridge-scheduler");
    expect(foodInput).toContain("scheduler-<aws.scheduler.execution-id>");
    expect(foodInput).toContain("MessageAttributes");

    expect(productInput).toContain("cache.refresh.product.requested.v1");
    expect(productInput).toContain("eventVersion");
    expect(productInput).toContain("eventbridge-scheduler");
    expect(productInput).toContain("scheduler-<aws.scheduler.execution-id>");
    expect(productInput).toContain("MessageAttributes");

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: {
              Service: "scheduler.amazonaws.com",
            },
          }),
        ]),
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "sqs:SendMessage",
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  it("creates one ECR repository per deployable service and worker", () => {
    const template = synthesizeTemplate();

    template.resourceCountIs("AWS::ECR::Repository", 11);

    for (const repositoryName of [
      "labellens-test/gateway",
      "labellens-test/auth-service",
      "labellens-test/food-service",
      "labellens-test/product-service",
      "labellens-test/menu-service",
      "labellens-test/favorites-service",
      "labellens-test/product-not-found-worker",
      "labellens-test/analytics-worker",
      "labellens-test/food-cache-refresh-worker",
      "labellens-test/product-cache-refresh-worker",
      "labellens-test/dlq-handler",
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

    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/labellens-test/scheduler/group-name",
      Type: "String",
      Value: "labellens-test-schedules",
    });

    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/labellens-test/scheduler/food-cache-refresh/name",
      Type: "String",
      Value: "labellens-test-food-cache-refresh-daily",
    });

    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/labellens-test/scheduler/product-cache-refresh/name",
      Type: "String",
      Value: "labellens-test-product-cache-refresh-daily",
    });

    template.resourceCountIs("AWS::SSM::Parameter", 46);
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