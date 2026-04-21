import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { QueueConfig } from "../config/label-lens-aws-config.js";

export type LabelLensMessagingConstructProps = {
  resourcePrefix: string;
  productNotFoundQueue: QueueConfig;
  analyticsQueue: QueueConfig;
};

export class LabelLensMessagingConstruct extends Construct {
  readonly productNotFoundQueue: Queue;
  readonly productNotFoundDeadLetterQueue: Queue;
  readonly analyticsQueue: Queue;
  readonly analyticsDeadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: LabelLensMessagingConstructProps) {
    super(scope, id);

    const productNotFoundQueues = this.createQueueWithDlq("ProductNotFound", props.productNotFoundQueue);
    this.productNotFoundQueue = productNotFoundQueues.queue;
    this.productNotFoundDeadLetterQueue = productNotFoundQueues.deadLetterQueue;

    const analyticsQueues = this.createQueueWithDlq("Analytics", props.analyticsQueue);
    this.analyticsQueue = analyticsQueues.queue;
    this.analyticsDeadLetterQueue = analyticsQueues.deadLetterQueue;

    this.exportQueueParameters(props.resourcePrefix, "product-not-found", this.productNotFoundQueue, this.productNotFoundDeadLetterQueue);
    this.exportQueueParameters(props.resourcePrefix, "analytics", this.analyticsQueue, this.analyticsDeadLetterQueue);
  }

  private createQueueWithDlq(idPrefix: string, config: QueueConfig): { queue: Queue; deadLetterQueue: Queue } {
    const deadLetterQueue = new Queue(this, `${idPrefix}DeadLetterQueue`, {
      queueName: config.deadLetterQueueName,
      retentionPeriod: Duration.days(14),
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
    });

    const queue = new Queue(this, `${idPrefix}Queue`, {
      queueName: config.queueName,
      visibilityTimeout: Duration.seconds(60),
      retentionPeriod: Duration.days(4),
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
      deadLetterQueue: {
        maxReceiveCount: config.maxReceiveCount,
        queue: deadLetterQueue,
      },
    });

    new Alarm(this, `${idPrefix}DeadLetterQueueMessagesAlarm`, {
      alarmName: `${config.deadLetterQueueName}-visible-messages`,
      metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    new Alarm(this, `${idPrefix}QueueAgeAlarm`, {
      alarmName: `${config.queueName}-oldest-message-age`,
      metric: queue.metricApproximateAgeOfOldestMessage({ period: Duration.minutes(5) }),
      threshold: 300,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    return { queue, deadLetterQueue };
  }

  private exportQueueParameters(resourcePrefix: string, parameterPrefix: string, queue: Queue, deadLetterQueue: Queue): void {
    new StringParameter(this, `${parameterPrefix}QueueUrlParameter`, {
      parameterName: `/${resourcePrefix}/sqs/${parameterPrefix}/queue-url`,
      stringValue: queue.queueUrl,
    });

    new StringParameter(this, `${parameterPrefix}QueueArnParameter`, {
      parameterName: `/${resourcePrefix}/sqs/${parameterPrefix}/queue-arn`,
      stringValue: queue.queueArn,
    });

    new StringParameter(this, `${parameterPrefix}DeadLetterQueueUrlParameter`, {
      parameterName: `/${resourcePrefix}/sqs/${parameterPrefix}/dlq-url`,
      stringValue: deadLetterQueue.queueUrl,
    });

    new StringParameter(this, `${parameterPrefix}DeadLetterQueueArnParameter`, {
      parameterName: `/${resourcePrefix}/sqs/${parameterPrefix}/dlq-arn`,
      stringValue: deadLetterQueue.queueArn,
    });
  }
}
