import { Aws, Stack } from "aws-cdk-lib";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnSchedule, CfnScheduleGroup } from "aws-cdk-lib/aws-scheduler";
import type { Queue } from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { ScheduleConfig } from "../config/label-lens-aws-config.js";

export type LabelLensSchedulesConstructProps = {
  resourcePrefix: string;
  scheduleGroupName: string;
  foodCacheRefreshSchedule: ScheduleConfig;
  productCacheRefreshSchedule: ScheduleConfig;
  foodCacheRefreshQueue: Queue;
  foodCacheRefreshDeadLetterQueue: Queue;
  productCacheRefreshQueue: Queue;
  productCacheRefreshDeadLetterQueue: Queue;
};

export class LabelLensSchedulesConstruct extends Construct {
  readonly scheduleGroup: CfnScheduleGroup;
  readonly schedulerRole: Role;
  readonly foodCacheRefreshSchedule: CfnSchedule;
  readonly productCacheRefreshSchedule: CfnSchedule;

  constructor(scope: Construct, id: string, props: LabelLensSchedulesConstructProps) {
    super(scope, id);

    this.scheduleGroup = new CfnScheduleGroup(this, "ScheduleGroup", {
      name: props.scheduleGroupName,
    });

    this.schedulerRole = new Role(this, "SchedulerSqsPublisherRole", {
      assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
      description: "Allows EventBridge Scheduler to publish LabelLens cache refresh events to SQS.",
    });

    this.schedulerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sqs:SendMessage"],
        resources: [props.foodCacheRefreshQueue.queueArn, props.productCacheRefreshQueue.queueArn],
      }),
    );

    this.foodCacheRefreshSchedule = this.createSqsSchedule({
      id: "FoodCacheRefreshDailySchedule",
      scheduleGroupName: props.scheduleGroupName,
      scheduleName: props.foodCacheRefreshSchedule.scheduleName,
      scheduleExpression: props.foodCacheRefreshSchedule.scheduleExpression,
      queue: props.foodCacheRefreshQueue,
      deadLetterQueue: props.foodCacheRefreshDeadLetterQueue,
      eventType: "cache.refresh.food.requested.v1",
      target: "food",
      limit: props.foodCacheRefreshSchedule.limit,
    });

    this.productCacheRefreshSchedule = this.createSqsSchedule({
      id: "ProductCacheRefreshDailySchedule",
      scheduleGroupName: props.scheduleGroupName,
      scheduleName: props.productCacheRefreshSchedule.scheduleName,
      scheduleExpression: props.productCacheRefreshSchedule.scheduleExpression,
      queue: props.productCacheRefreshQueue,
      deadLetterQueue: props.productCacheRefreshDeadLetterQueue,
      eventType: "cache.refresh.product.requested.v1",
      target: "product",
      limit: props.productCacheRefreshSchedule.limit,
    });

    new StringParameter(this, "ScheduleGroupNameParameter", {
      parameterName: `/${props.resourcePrefix}/scheduler/group-name`,
      stringValue: props.scheduleGroupName,
    });

    new StringParameter(this, "FoodCacheRefreshScheduleNameParameter", {
      parameterName: `/${props.resourcePrefix}/scheduler/food-cache-refresh/name`,
      stringValue: props.foodCacheRefreshSchedule.scheduleName,
    });

    new StringParameter(this, "ProductCacheRefreshScheduleNameParameter", {
      parameterName: `/${props.resourcePrefix}/scheduler/product-cache-refresh/name`,
      stringValue: props.productCacheRefreshSchedule.scheduleName,
    });
  }

  private createSqsSchedule(input: {
    id: string;
    scheduleGroupName: string;
    scheduleName: string;
    scheduleExpression: string;
    queue: Queue;
    deadLetterQueue: Queue;
    eventType: "cache.refresh.food.requested.v1" | "cache.refresh.product.requested.v1";
    target: "food" | "product";
    limit: number;
  }): CfnSchedule {
    const messageBody = JSON.stringify({
      eventId: "<aws.scheduler.execution-id>",
      eventType: input.eventType,
      eventVersion: 1,
      occurredAt: "<aws.scheduler.scheduled-time>",
      correlationId: "scheduler-<aws.scheduler.execution-id>",
      producer: "eventbridge-scheduler",
      payload: {
        target: input.target,
        scheduledFor: "<aws.scheduler.scheduled-time>",
        limit: input.limit,
      },
    });

    const schedule = new CfnSchedule(this, input.id, {
      name: input.scheduleName,
      groupName: input.scheduleGroupName,
      scheduleExpression: input.scheduleExpression,
      scheduleExpressionTimezone: "UTC",
      state: "ENABLED",
      flexibleTimeWindow: {
        mode: "OFF",
      },
      target: {
        arn: `arn:${Aws.PARTITION}:scheduler:::aws-sdk:sqs:sendMessage`,
        roleArn: this.schedulerRole.roleArn,
        deadLetterConfig: {
          arn: input.deadLetterQueue.queueArn,
        },
        input: Stack.of(this).toJsonString({
          QueueUrl: input.queue.queueUrl,
          MessageBody: messageBody,
          MessageAttributes: {
            eventType: {
              DataType: "String",
              StringValue: input.eventType,
            },
            eventVersion: {
              DataType: "Number",
              StringValue: "1",
            },
            producer: {
              DataType: "String",
              StringValue: "eventbridge-scheduler",
            },
            correlationId: {
              DataType: "String",
              StringValue: "scheduler-<aws.scheduler.execution-id>",
            },
          },
        }),
      },
    });

    schedule.node.addDependency(this.scheduleGroup);
    schedule.node.addDependency(this.schedulerRole);

    return schedule;
  }
}