import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { createLabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensAwsStack } from "./label-lens-aws-stack.js";

type CloudFormationResource = {
  Type?: string;
  Properties?: Record<string, unknown>;
};

type ScheduleTarget = {
  Input?: unknown;
};

type EcsContainerDefinition = {
  Name?: string;
  Environment?: Array<{
    Name?: string;
    Value?: unknown;
  }>;
  PortMappings?: Array<{
    ContainerPort?: number;
    Protocol?: string;
  }>;
};

type EcsTaskDefinitionProperties = {
  Family?: string;
  Cpu?: string;
  Memory?: string;
  NetworkMode?: string;
  RequiresCompatibilities?: string[];
  ContainerDefinitions?: EcsContainerDefinition[];
};

type EcsServiceProperties = {
  ServiceName?: string;
  DesiredCount?: number;
  EnableECSManagedTags?: boolean;
  HealthCheckGracePeriodSeconds?: number;
  LaunchType?: string;
  NetworkConfiguration?: {
    AwsvpcConfiguration?: {
      AssignPublicIp?: string;
      SecurityGroups?: unknown[];
      Subnets?: unknown[];
    };
  };
  ServiceRegistries?: unknown[];
  LoadBalancers?: Array<{
    ContainerName?: string;
    ContainerPort?: number;
    TargetGroupArn?: unknown;
  }>;
  PropagateTags?: string;
  DeploymentConfiguration?: {
    DeploymentCircuitBreaker?: {
      Enable?: boolean;
      Rollback?: boolean;
    };
    MaximumPercent?: number;
    MinimumHealthyPercent?: number;
  };
};

const templateCache = new Map<string, Template>();

function synthesizeTemplate(config = createLabelLensAwsConfig("test")) {
  const cacheKey = JSON.stringify(config);
  const cachedTemplate = templateCache.get(cacheKey);
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const app = new App();
  const stack = new LabelLensAwsStack(app, "LabelLensTest", {
    config,
    env: {
      account: "111111111111",
      region: "us-east-1",
    },
  });

  const template = Template.fromStack(stack);
  templateCache.set(cacheKey, template);
  return template;
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

function findTaskDefinitionByFamily(template: Template, family: string): CloudFormationResource {
  const resources = template.findResources("AWS::ECS::TaskDefinition") as Record<string, CloudFormationResource>;
  const resource = Object.values(resources).find((candidate) => candidate.Properties?.Family === family);
  expect(resource).toBeDefined();
  return resource as CloudFormationResource;
}

function findServiceByName(template: Template, serviceName: string): CloudFormationResource {
  const resources = template.findResources("AWS::ECS::Service") as Record<string, CloudFormationResource>;
  const resource = Object.values(resources).find((candidate) => candidate.Properties?.ServiceName === serviceName);
  expect(resource).toBeDefined();
  return resource as CloudFormationResource;
}

function getServiceProperties(resource: CloudFormationResource): EcsServiceProperties {
  expect(resource.Properties).toBeDefined();
  return resource.Properties as EcsServiceProperties;
}

function getTaskDefinitionProperties(resource: CloudFormationResource): EcsTaskDefinitionProperties {
  expect(resource.Properties).toBeDefined();
  return resource.Properties as EcsTaskDefinitionProperties;
}

function findContainer(resource: CloudFormationResource, containerName: string): EcsContainerDefinition {
  const properties = getTaskDefinitionProperties(resource);
  const container = (properties.ContainerDefinitions ?? []).find((candidate) => candidate.Name === containerName);
  expect(container).toBeDefined();
  return container as EcsContainerDefinition;
}

function expectEnvVar(container: EcsContainerDefinition, name: string, expectedValue?: unknown): void {
  const entry = (container.Environment ?? []).find((candidate) => candidate.Name === name);
  expect(entry).toBeDefined();
  if (arguments.length === 3) {
    expect(entry?.Value).toEqual(expectedValue);
  }
}

function expectPortMapping(container: EcsContainerDefinition, containerPort: number): void {
  expect(container.PortMappings ?? []).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ContainerPort: containerPort,
        Protocol: "tcp",
      }),
    ]),
  );
}

function expectStringParameter(template: Template, name: string, expectedValue?: unknown): void {
  const resources = template.findResources("AWS::SSM::Parameter") as Record<string, CloudFormationResource>;
  const resource = Object.values(resources).find((candidate) => candidate.Properties?.Name === name);

  expect(resource).toBeDefined();
  expect(resource?.Properties?.Type).toBe("String");

  if (arguments.length === 3) {
    expect(resource?.Properties?.Value).toEqual(expectedValue);
  } else {
    expect(resource?.Properties?.Value).toBeDefined();
  }
}

function findRouteByKey(template: Template, routeKey: string): CloudFormationResource {
  const resources = template.findResources("AWS::ApiGatewayV2::Route") as Record<string, CloudFormationResource>;
  const resource = Object.values(resources).find((candidate) => candidate.Properties?.RouteKey === routeKey);
  expect(resource).toBeDefined();
  return resource as CloudFormationResource;
}

let releaseTemplate: Template;
let bootstrapTemplate: Template;

beforeAll(() => {
  releaseTemplate = synthesizeTemplate();
  bootstrapTemplate = synthesizeTemplate(
    createLabelLensAwsConfig("test", { deploymentMode: "bootstrap", imageTag: "bootstrap" }),
  );
}, 30_000);

describe("LabelLensAwsStack", () => {
  it("creates the DynamoDB single table with PK/SK, on-demand billing, PITR and TTL", () => {
    const template = releaseTemplate;

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "labellens-test-table",
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      DeletionProtectionEnabled: true,
    });
  });

  it("creates all sealed messaging queues with DLQs and closed retry counts", () => {
    const template = releaseTemplate;
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-product-not-found-dlq" });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-product-not-found-queue", RedrivePolicy: { maxReceiveCount: 3 } });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-analytics-dlq" });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-analytics-queue", RedrivePolicy: { maxReceiveCount: 3 } });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-food-cache-refresh-dlq" });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-food-cache-refresh-queue", RedrivePolicy: { maxReceiveCount: 3 } });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-product-cache-refresh-dlq" });
    template.hasResourceProperties("AWS::SQS::Queue", { QueueName: "labellens-test-product-cache-refresh-queue", RedrivePolicy: { maxReceiveCount: 3 } });
  });

  it("creates EventBridge Scheduler refresh schedules that publish sealed events to SQS", () => {
    const template = releaseTemplate;
    template.hasResourceProperties("AWS::Scheduler::ScheduleGroup", { Name: "labellens-test-schedules" });
    template.resourceCountIs("AWS::Scheduler::Schedule", 2);

    const foodSchedule = findResourceByName(template, "AWS::Scheduler::Schedule", "labellens-test-food-cache-refresh-daily");
    const productSchedule = findResourceByName(template, "AWS::Scheduler::Schedule", "labellens-test-product-cache-refresh-daily");
    const foodInput = getScheduleTargetInputText(foodSchedule);
    const productInput = getScheduleTargetInputText(productSchedule);

    expect(foodInput).toContain("cache.refresh.food.requested.v1");
    expect(foodInput).toContain("eventbridge-scheduler");
    expect(productInput).toContain("cache.refresh.product.requested.v1");
    expect(productInput).toContain("eventbridge-scheduler");
  });

  it("creates ECS/Fargate compute foundation for HTTP services only", () => {
    const template = releaseTemplate;

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allows the internal load balancer to reach only the LabelLens gateway task.",
      GroupName: "labellens-test-gateway-ingress-sg",
    });

    template.resourceCountIs("AWS::ECS::TaskDefinition", 6);
    template.resourceCountIs("AWS::ECS::Service", 6);
    template.resourceCountIs("AWS::ServiceDiscovery::Service", 6);

    const gatewayTask = findTaskDefinitionByFamily(template, "labellens-test-gateway");
    const gatewayTaskProperties = getTaskDefinitionProperties(gatewayTask);
    const gatewayContainer = findContainer(gatewayTask, "gateway");
    expect(gatewayTaskProperties.Cpu).toBe("512");
    expect(gatewayTaskProperties.Memory).toBe("1024");
    expect(gatewayTaskProperties.NetworkMode).toBe("awsvpc");
    expect(gatewayTaskProperties.RequiresCompatibilities ?? []).toContain("FARGATE");
    expectEnvVar(gatewayContainer, "LABEL_LENS_AUTH_SERVICE_URL", "http://auth-service.labellens-test.local:4105");
    expectPortMapping(gatewayContainer, 4000);

    const authTask = findTaskDefinitionByFamily(template, "labellens-test-auth-service");
    const authContainer = findContainer(authTask, "auth-service");
    expectEnvVar(authContainer, "COGNITO_USER_POOL_ID", "{{resolve:ssm:/labellens-test/cognito/user-pool-id}}");
    expectEnvVar(authContainer, "COGNITO_USER_POOL_CLIENT_ID", "{{resolve:ssm:/labellens-test/cognito/user-pool-client-id}}");

    const gatewayService = getServiceProperties(findServiceByName(template, "labellens-test-gateway"));
    expect(gatewayService.DesiredCount).toBe(1);
    expect(gatewayService.LaunchType).toBe("FARGATE");
    expect(gatewayService.NetworkConfiguration?.AwsvpcConfiguration?.AssignPublicIp).toBe("DISABLED");
  });

  it("creates Lambda SQS consumers for async workers with partial batch response", () => {
    const template = releaseTemplate;
    template.resourceCountIs("AWS::Lambda::EventSourceMapping", 8);
    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BatchSize: 10,
      MaximumBatchingWindowInSeconds: 5,
      FunctionResponseTypes: ["ReportBatchItemFailures"],
    });
  });

  it("supports bootstrap deployment mode for first AWS deploy before ECR images exist", () => {
    const template = bootstrapTemplate;
    for (const serviceName of [
      "labellens-test-gateway",
      "labellens-test-auth-service",
      "labellens-test-food-service",
      "labellens-test-product-service",
      "labellens-test-menu-service",
      "labellens-test-favorites-service",
    ]) {
      const service = getServiceProperties(findServiceByName(template, serviceName));
      expect(service.DesiredCount).toBe(0);
    }
    expectStringParameter(template, "/labellens-test/deployment/mode", "bootstrap");
    expectStringParameter(template, "/labellens-test/deployment/image-tag", "bootstrap");
  });

  it("creates API Gateway HTTP API with Cognito JWT authorizer and VPC Link", () => {
    const template = releaseTemplate;
    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Stage", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::VpcLink", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Authorizer", 1);

    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      Name: "labellens-test-http-api",
      ProtocolType: "HTTP",
      CorsConfiguration: Match.objectLike({
        AllowOrigins: ["http://localhost:3000"],
      }),
    });

    const publicHealthRoute = findRouteByKey(template, "GET /api/v1/health");
    expect(publicHealthRoute.Properties?.AuthorizationType).toBe("NONE");
    const protectedMenusRoute = findRouteByKey(template, "GET /api/v1/menus");
    expect(protectedMenusRoute.Properties?.AuthorizationType).toBe("JWT");
    expect(protectedMenusRoute.Properties?.AuthorizerId).toBeDefined();
  });

  it("creates internal ALB ingress for gateway and removes public backend exposure", () => {
    const template = releaseTemplate;
    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allows API Gateway VPC Link traffic to reach the internal LabelLens ALB.",
      GroupName: "labellens-test-internal-alb-sg",
    });
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Scheme: "internal",
      Type: "application",
    });
    const ingressRules = JSON.stringify(template.findResources("AWS::EC2::SecurityGroupIngress"));
    expect(ingressRules).not.toContain("0.0.0.0/0");
  });


  it("creates static web hosting on S3 and CloudFront for the exported Next.js frontend", () => {
    const template = releaseTemplate;

    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
    template.resourceCountIs("AWS::CloudFront::Function", 1);

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          }),
        ]),
      }),
      OwnershipControls: {
        Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Comment: "labellens-test static web distribution",
        DefaultRootObject: "index.html",
        Enabled: true,
      }),
    });

    expectStringParameter(template, "/labellens-test/web/site-bucket/name");
    expectStringParameter(template, "/labellens-test/web/cloudfront/distribution-id");
    expectStringParameter(template, "/labellens-test/web/cloudfront/domain-name");
    expectStringParameter(template, "/labellens-test/web/url");
  });

  it("creates one ECR repository per HTTP service only and creates Cognito resources", () => {
    const template = releaseTemplate;
    template.resourceCountIs("AWS::ECR::Repository", 6);
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "labellens-test-users",
      UsernameConfiguration: { CaseSensitive: false },
    });
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ClientName: "labellens-test-web-client",
      GenerateSecret: false,
    });
  });

  it("exports operational SSM parameters for API Gateway, Cognito and deployment automation", () => {
    const template = releaseTemplate;
    expectStringParameter(template, "/labellens-test/runtime/public-boundary", "api-gateway");
    expectStringParameter(template, "/labellens-test/runtime/auth-mode", "cognito-jwt");
    expectStringParameter(template, "/labellens-test/cognito/user-pool-id");
    expectStringParameter(template, "/labellens-test/cognito/user-pool-client-id");
    expectStringParameter(template, "/labellens-test/cognito/issuer-url");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/id");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/name", "labellens-test-http-api");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/url");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/stage-name", "$default");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/vpc-link-id");
    expectStringParameter(template, "/labellens-test/apigateway/http-api/authorizer-id");
    expectStringParameter(template, "/labellens-test/lambda/analytics-consumer/name", "labellens-test-analytics-consumer");
    expectStringParameter(template, "/labellens-test/web/site-bucket/name");
    expectStringParameter(template, "/labellens-test/web/cloudfront/distribution-id");
    expectStringParameter(template, "/labellens-test/web/cloudfront/domain-name");
    expectStringParameter(template, "/labellens-test/web/url");
  });

  it("alarms on DLQ messages, queue age, ALB health and API Gateway health", () => {
    const template = releaseTemplate;
    const alarmResources = template.findResources("AWS::CloudWatch::Alarm");
    expect(Object.keys(alarmResources)).toHaveLength(13);
    template.hasResourceProperties("AWS::CloudWatch::Alarm", { AlarmName: "labellens-test-http-api-5xx", Threshold: 5, TreatMissingData: "notBreaching" });
    template.hasResourceProperties("AWS::CloudWatch::Alarm", { AlarmName: "labellens-test-http-api-latency-high", Threshold: 2000, TreatMissingData: "notBreaching" });
  });
});
