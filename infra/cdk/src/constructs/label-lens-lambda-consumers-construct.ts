import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { SecurityGroup, SubnetType, type Vpc } from "aws-cdk-lib/aws-ec2";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type LabelLensLambdaConsumersConstructProps = {
  resourcePrefix: string;
  table: Table;
  vpc: Vpc;
  serviceSecurityGroup: SecurityGroup;
  privateDnsNamespaceName: string;
  queues: {
    productNotFound: Queue;
    productNotFoundDeadLetter: Queue;
    analytics: Queue;
    analyticsDeadLetter: Queue;
    foodCacheRefresh: Queue;
    foodCacheRefreshDeadLetter: Queue;
    productCacheRefresh: Queue;
    productCacheRefreshDeadLetter: Queue;
  };
};

type LambdaConsumerConfig = {
  id: string;
  functionName: string;
  handlerEntry: string;
  eventSources: Queue[];
  environment?: Record<string, string>;
};

const LAMBDA_BATCH_SIZE = 10;
const LAMBDA_BATCHING_WINDOW_SECONDS = 5;
const LAMBDA_RESERVED_CONCURRENCY = 2;
const LAMBDA_TIMEOUT_SECONDS = 30;

export class LabelLensLambdaConsumersConstruct extends Construct {
  readonly functions: Record<string, NodejsFunction> = {};

  constructor(scope: Construct, id: string, props: LabelLensLambdaConsumersConstructProps) {
    super(scope, id);

    const serviceUrl = (name: string, port: number) => `http://${name}.${props.privateDnsNamespaceName}:${port}`;

    const consumers: LambdaConsumerConfig[] = [
      {
        id: "ProductNotFoundHandler",
        functionName: `${props.resourcePrefix}-product-not-found-handler`,
        handlerEntry: "product-not-found-handler.ts",
        eventSources: [props.queues.productNotFound],
      },
      {
        id: "AnalyticsConsumer",
        functionName: `${props.resourcePrefix}-analytics-consumer`,
        handlerEntry: "analytics-consumer.ts",
        eventSources: [props.queues.analytics],
      },
      {
        id: "FoodCacheRefresh",
        functionName: `${props.resourcePrefix}-food-cache-refresh`,
        handlerEntry: "food-cache-refresh.ts",
        eventSources: [props.queues.foodCacheRefresh],
        environment: {
          LABEL_LENS_FOOD_SERVICE_URL: serviceUrl("food-service", 4101),
        },
      },
      {
        id: "ProductCacheRefresh",
        functionName: `${props.resourcePrefix}-product-cache-refresh`,
        handlerEntry: "product-cache-refresh.ts",
        eventSources: [props.queues.productCacheRefresh],
        environment: {
          LABEL_LENS_PRODUCT_SERVICE_URL: serviceUrl("product-service", 4102),
        },
      },
      {
        id: "DlqHandler",
        functionName: `${props.resourcePrefix}-dlq-handler`,
        handlerEntry: "dlq-handler.ts",
        eventSources: [
          props.queues.productNotFoundDeadLetter,
          props.queues.analyticsDeadLetter,
          props.queues.foodCacheRefreshDeadLetter,
          props.queues.productCacheRefreshDeadLetter,
        ],
      },
    ];

    for (const consumer of consumers) {
      const fn = this.createConsumerFunction(props, consumer);
      this.functions[consumer.functionName] = fn;

      for (const queue of consumer.eventSources) {
        fn.addEventSource(
          new SqsEventSource(queue, {
            batchSize: LAMBDA_BATCH_SIZE,
            maxBatchingWindow: Duration.seconds(LAMBDA_BATCHING_WINDOW_SECONDS),
            reportBatchItemFailures: true,
          }),
        );
      }

      props.table.grantReadWriteData(fn);

      new StringParameter(this, `${consumer.id}FunctionNameParameter`, {
        parameterName: `/${props.resourcePrefix}/lambda/${consumer.functionName.replace(`${props.resourcePrefix}-`, "")}/name`,
        stringValue: consumer.functionName,
      });

      new StringParameter(this, `${consumer.id}FunctionArnParameter`, {
        parameterName: `/${props.resourcePrefix}/lambda/${consumer.functionName.replace(`${props.resourcePrefix}-`, "")}/arn`,
        stringValue: fn.functionArn,
      });
    }
  }

  private createConsumerFunction(
    props: LabelLensLambdaConsumersConstructProps,
    consumer: LambdaConsumerConfig,
  ): NodejsFunction {
    const lambdaLogGroup = new LogGroup(this, `${consumer.id}LogGroup`, {
      logGroupName: `/${props.resourcePrefix}/lambda/${consumer.functionName.replace(`${props.resourcePrefix}-`, "")}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    return new NodejsFunction(this, consumer.id, {
      functionName: consumer.functionName,
      entry: join(getRepositoryRoot(), "apps", "lambdas", "src", "handlers", consumer.handlerEntry),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
      memorySize: 512,
      reservedConcurrentExecutions: LAMBDA_RESERVED_CONCURRENCY,
      tracing: Tracing.ACTIVE,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.serviceSecurityGroup],
      logGroup: lambdaLogGroup,
      environment: {
        LABEL_LENS_TABLE: props.table.tableName,
        NODE_ENV: "production",
        ...(consumer.environment ?? {}),
      },
    });
  }
}

function getRepositoryRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "..", "..", "..", "..");
}