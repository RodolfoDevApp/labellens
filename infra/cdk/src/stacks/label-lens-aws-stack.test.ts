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

  it("creates ECS/Fargate compute foundation with VPC, cluster, task definitions and log groups", () => {
    const template = synthesizeTemplate();

    template.hasResourceProperties("AWS::EC2::VPC", {
      CidrBlock: "10.0.0.0/16",
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allows LabelLens ECS tasks to call each other inside the private VPC.",
      GroupName: "labellens-test-service-sg",
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allows the public load balancer to reach only the LabelLens gateway task.",
      GroupName: "labellens-test-gateway-ingress-sg",
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 4000,
      IpProtocol: "tcp",
      ToPort: 4105,
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 4101,
      IpProtocol: "tcp",
      ToPort: 4105,
    });

    template.hasResourceProperties("AWS::ECS::Cluster", {
      ClusterName: "labellens-test-cluster",
    });

    template.hasResourceProperties("AWS::ServiceDiscovery::PrivateDnsNamespace", {
      Name: "labellens-test.local",
    });

    template.resourceCountIs("AWS::ECS::TaskDefinition", 11);
    template.resourceCountIs("AWS::ECS::Service", 11);
    template.resourceCountIs("AWS::ServiceDiscovery::Service", 6);
    template.resourceCountIs("AWS::Logs::LogGroup", 11);

    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/labellens-test/ecs/gateway",
      RetentionInDays: 30,
    });

    const gatewayTask = findTaskDefinitionByFamily(template, "labellens-test-gateway");
    const gatewayTaskProperties = getTaskDefinitionProperties(gatewayTask);
    const gatewayContainer = findContainer(gatewayTask, "gateway");

    expect(gatewayTaskProperties.Cpu).toBe("512");
    expect(gatewayTaskProperties.Memory).toBe("1024");
    expect(gatewayTaskProperties.NetworkMode).toBe("awsvpc");
    expect(gatewayTaskProperties.RequiresCompatibilities ?? []).toContain("FARGATE");
    expectEnvVar(gatewayContainer, "NODE_ENV", "production");
    expectEnvVar(gatewayContainer, "STORAGE_DRIVER", "dynamodb");
    expectEnvVar(gatewayContainer, "LABEL_LENS_AUTH_SERVICE_URL", "http://auth-service.labellens-test.local:4105");
    expectEnvVar(gatewayContainer, "LABEL_LENS_PRODUCT_SERVICE_URL", "http://product-service.labellens-test.local:4102");
    expectPortMapping(gatewayContainer, 4000);

    const productTask = findTaskDefinitionByFamily(template, "labellens-test-product-service");
    const productTaskProperties = getTaskDefinitionProperties(productTask);
    const productContainer = findContainer(productTask, "product-service");

    expect(productTaskProperties.Cpu).toBe("256");
    expect(productTaskProperties.Memory).toBe("512");
    expect(productTaskProperties.NetworkMode).toBe("awsvpc");
    expect(productTaskProperties.RequiresCompatibilities ?? []).toContain("FARGATE");
    expectEnvVar(productContainer, "OPEN_FOOD_FACTS_MODE", "fixture");
    expectEnvVar(productContainer, "PRODUCT_NOT_FOUND_QUEUE_URL");
    expectEnvVar(productContainer, "ANALYTICS_QUEUE_URL");
    expectPortMapping(productContainer, 4102);

    const dlqHandlerTask = findTaskDefinitionByFamily(template, "labellens-test-dlq-handler");
    const dlqHandlerContainer = findContainer(dlqHandlerTask, "dlq-handler");

    expectEnvVar(dlqHandlerContainer, "PRODUCT_NOT_FOUND_DLQ_URL");
    expectEnvVar(dlqHandlerContainer, "ANALYTICS_DLQ_URL");
    expectEnvVar(dlqHandlerContainer, "FOOD_CACHE_REFRESH_DLQ_URL");
    expectEnvVar(dlqHandlerContainer, "PRODUCT_CACHE_REFRESH_DLQ_URL");

    const gatewayService = getServiceProperties(findServiceByName(template, "labellens-test-gateway"));
    expect(gatewayService.DesiredCount).toBe(1);
    expect(gatewayService.LaunchType).toBe("FARGATE");
    expect(gatewayService.NetworkConfiguration?.AwsvpcConfiguration?.AssignPublicIp).toBe("DISABLED");
    expect(gatewayService.NetworkConfiguration?.AwsvpcConfiguration?.SecurityGroups ?? []).toHaveLength(1);
    expect(gatewayService.NetworkConfiguration?.AwsvpcConfiguration?.Subnets ?? []).toHaveLength(2);
    expect(gatewayService.ServiceRegistries).toBeDefined();
    expect(gatewayService.DeploymentConfiguration?.DeploymentCircuitBreaker).toEqual({
      Enable: true,
      Rollback: true,
    });
    expect(gatewayService.DeploymentConfiguration?.MaximumPercent).toBe(200);
    expect(gatewayService.DeploymentConfiguration?.MinimumHealthyPercent).toBe(100);
    expect(gatewayService.EnableECSManagedTags).toBe(true);
    expect(gatewayService.HealthCheckGracePeriodSeconds).toBe(60);
    expect(gatewayService.PropagateTags).toBe("SERVICE");

    const analyticsWorkerService = getServiceProperties(findServiceByName(template, "labellens-test-analytics-worker"));
    expect(analyticsWorkerService.DesiredCount).toBe(1);
    expect(analyticsWorkerService.LaunchType).toBe("FARGATE");
    expect(analyticsWorkerService.NetworkConfiguration?.AwsvpcConfiguration?.AssignPublicIp).toBe("DISABLED");
    expect(analyticsWorkerService.ServiceRegistries).toBeUndefined();
    expect(analyticsWorkerService.DeploymentConfiguration?.DeploymentCircuitBreaker).toEqual({
      Enable: true,
      Rollback: true,
    });
    expect(analyticsWorkerService.DeploymentConfiguration?.MaximumPercent).toBe(200);
    expect(analyticsWorkerService.DeploymentConfiguration?.MinimumHealthyPercent).toBe(100);
    expect(analyticsWorkerService.EnableECSManagedTags).toBe(true);
    expect(analyticsWorkerService.PropagateTags).toBe("SERVICE");

    template.hasResourceProperties("AWS::ServiceDiscovery::Service", {
      Name: "gateway",
      DnsConfig: Match.objectLike({
        DnsRecords: Match.arrayWith([
          Match.objectLike({
            TTL: 30,
            Type: "A",
          }),
        ]),
      }),
    });

    template.resourceCountIs("AWS::ApplicationAutoScaling::ScalableTarget", 1);
    template.resourceCountIs("AWS::ApplicationAutoScaling::ScalingPolicy", 1);

    template.hasResourceProperties("AWS::ApplicationAutoScaling::ScalableTarget", {
      MaxCapacity: 3,
      MinCapacity: 1,
      ScalableDimension: "ecs:service:DesiredCount",
      ServiceNamespace: "ecs",
    });

    template.hasResourceProperties("AWS::ApplicationAutoScaling::ScalingPolicy", {
      PolicyType: "TargetTrackingScaling",
      TargetTrackingScalingPolicyConfiguration: {
        PredefinedMetricSpecification: {
          PredefinedMetricType: "ECSServiceAverageCPUUtilization",
        },
        TargetValue: 60,
      },
    });

    template.hasResourceProperties("AWS::ServiceDiscovery::Service", {
      Name: "product-service",
      DnsConfig: Match.objectLike({
        DnsRecords: Match.arrayWith([
          Match.objectLike({
            TTL: 30,
            Type: "A",
          }),
        ]),
      }),
    });
  });


  it("creates public ALB ingress for gateway only", () => {
    const template = synthesizeTemplate();

    template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::Listener", 1);
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::TargetGroup", 1);

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allows public HTTP ingress to the LabelLens gateway load balancer.",
      GroupName: "labellens-test-public-alb-sg",
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      CidrIp: "0.0.0.0/0",
      FromPort: 80,
      IpProtocol: "tcp",
      ToPort: 80,
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 4000,
      IpProtocol: "tcp",
      ToPort: 4000,
    });

    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Scheme: "internet-facing",
      Type: "application",
    });

    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTP",
    });

    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckIntervalSeconds: 30,
      HealthCheckPath: "/gateway/health",
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 2,
      Matcher: {
        HttpCode: "200",
      },
      Port: 4000,
      Protocol: "HTTP",
      TargetType: "ip",
      UnhealthyThresholdCount: 3,
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-gateway-target-unhealthy-hosts",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      DatapointsToAlarm: 2,
      EvaluationPeriods: 2,
      MetricName: "UnHealthyHostCount",
      Namespace: "AWS/ApplicationELB",
      Statistic: "Minimum",
      Threshold: 1,
      TreatMissingData: "notBreaching",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-gateway-target-5xx",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      EvaluationPeriods: 1,
      MetricName: "HTTPCode_Target_5XX_Count",
      Namespace: "AWS/ApplicationELB",
      Statistic: "Sum",
      Threshold: 5,
      TreatMissingData: "notBreaching",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "labellens-test-gateway-target-response-time-high",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      DatapointsToAlarm: 2,
      EvaluationPeriods: 3,
      MetricName: "TargetResponseTime",
      Namespace: "AWS/ApplicationELB",
      Statistic: "Average",
      Threshold: 2,
      TreatMissingData: "notBreaching",
    });

    const gatewayService = getServiceProperties(findServiceByName(template, "labellens-test-gateway"));
    expect(gatewayService.LoadBalancers ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ContainerName: "gateway",
          ContainerPort: 4000,
        }),
      ]),
    );

    for (const internalServiceName of [
      "labellens-test-auth-service",
      "labellens-test-food-service",
      "labellens-test-product-service",
      "labellens-test-menu-service",
      "labellens-test-favorites-service",
      "labellens-test-analytics-worker",
    ]) {
      const service = getServiceProperties(findServiceByName(template, internalServiceName));
      expect(service.LoadBalancers).toBeUndefined();
    }
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

    expectStringParameter(template, "/labellens-test/runtime/storage-driver", "dynamodb");
    expectStringParameter(template, "/labellens-test/runtime/public-boundary", "gateway-only");
    expectStringParameter(template, "/labellens-test/scheduler/group-name", "labellens-test-schedules");
    expectStringParameter(template, "/labellens-test/ecs/cluster-name", "labellens-test-cluster");
    expectStringParameter(template, "/labellens-test/ecs/cluster-arn");
    expectStringParameter(template, "/labellens-test/network/vpc-id");
    expectStringParameter(template, "/labellens-test/network/service-security-group-id");
    expectStringParameter(template, "/labellens-test/network/gateway-ingress-security-group-id");
    expectStringParameter(template, "/labellens-test/service-discovery/private-dns-namespace-name", "labellens-test.local");
    expectStringParameter(template, "/labellens-test/ecs/task-definitions/gateway/arn");
    expectStringParameter(template, "/labellens-test/ecs/services/gateway/name", "labellens-test-gateway");
    expectStringParameter(template, "/labellens-test/ecs/services/gateway/arn");
    expectStringParameter(template, "/labellens-test/ecs/services/analytics-worker/name", "labellens-test-analytics-worker");
    expectStringParameter(template, "/labellens-test/ecs/services/analytics-worker/arn");
    expectStringParameter(template, "/labellens-test/ingress/gateway-alb/dns-name");
    expectStringParameter(template, "/labellens-test/ingress/gateway-alb/arn");
    expectStringParameter(template, "/labellens-test/ingress/gateway-alb/security-group-id");
    expectStringParameter(template, "/labellens-test/ingress/gateway-alb/http-listener-arn");
    expectStringParameter(template, "/labellens-test/ingress/gateway-alb/target-group-arn");
    expectStringParameter(template, "/labellens-test/ingress/gateway-url");
    expectStringParameter(
      template,
      "/labellens-test/alarms/gateway-target-unhealthy-hosts/name",
      "labellens-test-gateway-target-unhealthy-hosts",
    );
    expectStringParameter(
      template,
      "/labellens-test/alarms/gateway-target-5xx/name",
      "labellens-test-gateway-target-5xx",
    );
    expectStringParameter(
      template,
      "/labellens-test/alarms/gateway-target-response-time-high/name",
      "labellens-test-gateway-target-response-time-high",
    );

    template.resourceCountIs("AWS::SSM::Parameter", 94);
  });

  it("alarms on DLQ messages and queue age", () => {
    const template = synthesizeTemplate();

    expect(Object.keys(template.findResources("AWS::CloudWatch::Alarm"))).toHaveLength(11);

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