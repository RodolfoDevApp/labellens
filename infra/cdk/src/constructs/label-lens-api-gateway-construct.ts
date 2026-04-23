import { AccessLogFormat } from "aws-cdk-lib/aws-apigateway";
import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
  HttpStage,
  LogGroupLogDestination,
  MappingValue,
  ParameterMapping,
  VpcLink,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpAlbIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { ApplicationListener } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { ApiGatewayConfig } from "../config/label-lens-aws-config.js";

export type LabelLensApiGatewayConstructProps = {
  resourcePrefix: string;
  vpc: Vpc;
  apiGateway: ApiGatewayConfig;
  listener: ApplicationListener;
  issuerUrl: string;
  audience: string;
};

export class LabelLensApiGatewayConstruct extends Construct {
  readonly securityGroup: SecurityGroup;
  readonly vpcLink: VpcLink;
  readonly httpApi: HttpApi;
  readonly stage: HttpStage;
  readonly authorizer: HttpJwtAuthorizer;
  readonly accessLogGroup: LogGroup;
  readonly api5xxAlarm: Alarm;
  readonly apiLatencyAlarm: Alarm;

  constructor(scope: Construct, id: string, props: LabelLensApiGatewayConstructProps) {
    super(scope, id);

    this.securityGroup = new SecurityGroup(this, "VpcLinkSecurityGroup", {
      vpc: props.vpc,
      securityGroupName: props.apiGateway.vpcLinkSecurityGroupName,
      description: "Allows API Gateway VPC Link traffic to reach the internal LabelLens ALB.",
      allowAllOutbound: true,
      disableInlineRules: true,
    });

    this.vpcLink = new VpcLink(this, "VpcLink", {
      vpc: props.vpc,
      vpcLinkName: props.apiGateway.vpcLinkName,
      securityGroups: [this.securityGroup],
      subnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    this.accessLogGroup = new LogGroup(this, "HttpApiAccessLogGroup", {
      logGroupName: props.apiGateway.accessLogGroupName,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.httpApi = new HttpApi(this, "HttpApi", {
      apiName: props.apiGateway.httpApiName,
      corsPreflight: {
        allowCredentials: false,
        allowHeaders: [...props.apiGateway.corsAllowedHeaders],
        allowMethods: props.apiGateway.corsAllowedMethods.map((method) => toCorsMethod(method)),
        allowOrigins: [...props.apiGateway.corsAllowedOrigins],
        maxAge: Duration.hours(1),
      },
      createDefaultStage: false,
    });

    this.stage = new HttpStage(this, "HttpApiStage", {
      httpApi: this.httpApi,
      stageName: props.apiGateway.stageName,
      autoDeploy: true,
      accessLogSettings: {
        destination: new LogGroupLogDestination(this.accessLogGroup),
        format: AccessLogFormat.custom(
          JSON.stringify({
            requestId: "$context.requestId",
            ip: "$context.identity.sourceIp",
            requestTime: "$context.requestTime",
            httpMethod: "$context.httpMethod",
            routeKey: "$context.routeKey",
            status: "$context.status",
            protocol: "$context.protocol",
            responseLength: "$context.responseLength",
            integrationErrorMessage: "$context.integrationErrorMessage",
          }),
        ),
      },
    });

    this.authorizer = new HttpJwtAuthorizer("CognitoJwtAuthorizer", props.issuerUrl, {
      jwtAudience: [props.audience],
    });

    const integration = new HttpAlbIntegration("GatewayAlbIntegration", props.listener, {
      vpcLink: this.vpcLink,
      parameterMapping: new ParameterMapping().overwritePath(MappingValue.requestPath()),
    });

    this.addPublicRoute("/api/v1/health", [HttpMethod.GET], integration);
    this.addPublicRoute("/api/v1/foods/search", [HttpMethod.GET], integration);
    this.addPublicRoute("/api/v1/foods/{fdcId}", [HttpMethod.GET], integration);
    this.addPublicRoute("/api/v1/products/barcode/{barcode}", [HttpMethod.GET], integration);
    this.addPublicRoute("/api/v1/products/search", [HttpMethod.GET], integration);
    this.addPublicRoute("/api/v1/menus/calculate", [HttpMethod.POST], integration);

    this.addProtectedRoute("/api/v1/auth/me", [HttpMethod.GET], integration);
    this.addProtectedRoute("/api/v1/menus", [HttpMethod.GET, HttpMethod.POST], integration);
    this.addProtectedRoute("/api/v1/menus/{menuId}", [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE], integration);
    this.addProtectedRoute("/api/v1/favorites", [HttpMethod.GET, HttpMethod.POST], integration);
    this.addProtectedRoute("/api/v1/favorites/{favoriteId}", [HttpMethod.DELETE], integration);

    this.api5xxAlarm = new Alarm(this, "HttpApi5xxAlarm", {
      alarmName: `${props.resourcePrefix}-http-api-5xx`,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      metric: this.httpApi.metricServerError({ period: Duration.minutes(5), statistic: "Sum" }),
      threshold: props.apiGateway.api5xxAlarmThreshold,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.apiLatencyAlarm = new Alarm(this, "HttpApiLatencyAlarm", {
      alarmName: `${props.resourcePrefix}-http-api-latency-high`,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: 2,
      evaluationPeriods: 3,
      metric: this.httpApi.metricLatency({ period: Duration.minutes(5), statistic: "p95" }),
      threshold: props.apiGateway.apiLatencyAlarmThresholdMs,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    new StringParameter(this, "HttpApiIdParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/id`,
      stringValue: this.httpApi.httpApiId,
    });

    new StringParameter(this, "HttpApiNameParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/name`,
      stringValue: props.apiGateway.httpApiName,
    });

    new StringParameter(this, "HttpApiUrlParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/url`,
      stringValue: this.httpApi.apiEndpoint,
    });

    new StringParameter(this, "HttpApiStageNameParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/stage-name`,
      stringValue: props.apiGateway.stageName,
    });

    new StringParameter(this, "HttpApiVpcLinkIdParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/vpc-link-id`,
      stringValue: this.vpcLink.vpcLinkId,
    });

    new StringParameter(this, "HttpApiAuthorizerIdParameter", {
      parameterName: `/${props.resourcePrefix}/apigateway/http-api/authorizer-id`,
      stringValue: this.authorizer.authorizerId,
    });

    new StringParameter(this, "HttpApi5xxAlarmNameParameter", {
      parameterName: `/${props.resourcePrefix}/alarms/http-api-5xx/name`,
      stringValue: this.api5xxAlarm.alarmName,
    });

    new StringParameter(this, "HttpApiLatencyAlarmNameParameter", {
      parameterName: `/${props.resourcePrefix}/alarms/http-api-latency-high/name`,
      stringValue: this.apiLatencyAlarm.alarmName,
    });

    new CfnOutput(this, "HttpApiUrl", {
      value: this.httpApi.apiEndpoint,
    });
  }

  addIngressRuleFromApiGatewayToAlb(albSecurityGroup: SecurityGroup, port: number): void {
    albSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.securityGroup.securityGroupId),
      Port.tcp(port),
      "Allow API Gateway VPC Link traffic to reach the internal LabelLens ALB.",
    );
  }

  private addPublicRoute(path: string, methods: HttpMethod[], integration: HttpAlbIntegration): void {
    this.httpApi.addRoutes({ path, methods, integration });
  }

  private addProtectedRoute(path: string, methods: HttpMethod[], integration: HttpAlbIntegration): void {
    this.httpApi.addRoutes({ path, methods, integration, authorizer: this.authorizer });
  }
}

function toCorsMethod(method: string): CorsHttpMethod {
  switch (method) {
    case "GET":
      return CorsHttpMethod.GET;
    case "POST":
      return CorsHttpMethod.POST;
    case "PUT":
      return CorsHttpMethod.PUT;
    case "DELETE":
      return CorsHttpMethod.DELETE;
    case "OPTIONS":
      return CorsHttpMethod.OPTIONS;
    default:
      throw new Error(`Unsupported CORS method: ${method}`);
  }
}