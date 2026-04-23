import { CfnOutput, Duration } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationListener, ApplicationProtocol, ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { IngressConfig } from "../config/label-lens-aws-config.js";

export type LabelLensIngressConstructProps = {
  resourcePrefix: string;
  vpc: Vpc;
  gatewayService: FargateService;
  gatewayIngressSecurityGroup: SecurityGroup;
  ingress: IngressConfig;
};

export class LabelLensIngressConstruct extends Construct {
  readonly loadBalancerSecurityGroup: SecurityGroup;
  readonly loadBalancer: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly gatewayTargetGroup: ApplicationTargetGroup;
  readonly gatewayUnhealthyHostsAlarm: Alarm;
  readonly gatewayTarget5xxAlarm: Alarm;
  readonly gatewayTargetResponseTimeAlarm: Alarm;

  constructor(scope: Construct, id: string, props: LabelLensIngressConstructProps) {
    super(scope, id);

    this.loadBalancerSecurityGroup = new SecurityGroup(this, "InternalLoadBalancerSecurityGroup", {
      vpc: props.vpc,
      securityGroupName: props.ingress.loadBalancerSecurityGroupName,
      description: "Allows API Gateway VPC Link traffic to reach the internal LabelLens ALB.",
      allowAllOutbound: true,
      disableInlineRules: true,
    });

    props.gatewayIngressSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.loadBalancerSecurityGroup.securityGroupId),
      Port.tcp(props.ingress.gatewayTargetPort),
      "Allow the internal ALB to reach only the gateway ECS tasks.",
    );

    this.loadBalancer = new ApplicationLoadBalancer(this, "GatewayLoadBalancer", {
      vpc: props.vpc,
      internetFacing: false,
      securityGroup: this.loadBalancerSecurityGroup,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    this.httpListener = this.loadBalancer.addListener("HttpListener", {
      port: props.ingress.httpPort,
      protocol: ApplicationProtocol.HTTP,
      open: false,
    });

    this.gatewayTargetGroup = this.httpListener.addTargets("GatewayTargets", {
      port: props.ingress.gatewayTargetPort,
      protocol: ApplicationProtocol.HTTP,
      targets: [
        props.gatewayService.loadBalancerTarget({
          containerName: "gateway",
          containerPort: props.ingress.gatewayTargetPort,
        }),
      ],
      healthCheck: {
        healthyHttpCodes: props.ingress.gatewayHealthCheckHealthyHttpCodes,
        healthyThresholdCount: props.ingress.healthyThresholdCount,
        interval: Duration.seconds(props.ingress.healthCheckIntervalSeconds),
        path: props.ingress.gatewayHealthCheckPath,
        timeout: Duration.seconds(props.ingress.healthCheckTimeoutSeconds),
        unhealthyThresholdCount: props.ingress.unhealthyThresholdCount,
      },
    });

    const gatewayUnhealthyHostsAlarmName = `${props.resourcePrefix}-gateway-target-unhealthy-hosts`;
    const gatewayTarget5xxAlarmName = `${props.resourcePrefix}-gateway-target-5xx`;
    const gatewayTargetResponseTimeAlarmName = `${props.resourcePrefix}-gateway-target-response-time-high`;

    this.gatewayUnhealthyHostsAlarm = new Alarm(this, "GatewayUnhealthyHostsAlarm", {
      alarmName: gatewayUnhealthyHostsAlarmName,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: props.ingress.gatewayUnhealthyHostAlarmEvaluationPeriods,
      evaluationPeriods: props.ingress.gatewayUnhealthyHostAlarmEvaluationPeriods,
      metric: this.gatewayTargetGroupMetric("UnHealthyHostCount", "Minimum"),
      threshold: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.gatewayTarget5xxAlarm = new Alarm(this, "GatewayTarget5xxAlarm", {
      alarmName: gatewayTarget5xxAlarmName,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      metric: this.gatewayTargetGroupMetric("HTTPCode_Target_5XX_Count", "Sum"),
      threshold: props.ingress.gatewayTarget5xxAlarmThreshold,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.gatewayTargetResponseTimeAlarm = new Alarm(this, "GatewayTargetResponseTimeAlarm", {
      alarmName: gatewayTargetResponseTimeAlarmName,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: 2,
      evaluationPeriods: 3,
      metric: this.gatewayTargetGroupMetric("TargetResponseTime", "Average"),
      threshold: props.ingress.gatewayTargetResponseTimeAlarmThresholdSeconds,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    new StringParameter(this, "GatewayAlbDnsNameParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-alb/dns-name`,
      stringValue: this.loadBalancer.loadBalancerDnsName,
    });
    new StringParameter(this, "GatewayAlbArnParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-alb/arn`,
      stringValue: this.loadBalancer.loadBalancerArn,
    });
    new StringParameter(this, "GatewayAlbSecurityGroupIdParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-alb/security-group-id`,
      stringValue: this.loadBalancerSecurityGroup.securityGroupId,
    });
    new StringParameter(this, "GatewayAlbHttpListenerArnParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-alb/http-listener-arn`,
      stringValue: this.httpListener.listenerArn,
    });
    new StringParameter(this, "GatewayAlbTargetGroupArnParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-alb/target-group-arn`,
      stringValue: this.gatewayTargetGroup.targetGroupArn,
    });
    new StringParameter(this, "GatewayUnhealthyHostsAlarmNameParameter", {
      parameterName: `/${props.resourcePrefix}/alarms/gateway-target-unhealthy-hosts/name`,
      stringValue: gatewayUnhealthyHostsAlarmName,
    });
    new StringParameter(this, "GatewayTarget5xxAlarmNameParameter", {
      parameterName: `/${props.resourcePrefix}/alarms/gateway-target-5xx/name`,
      stringValue: gatewayTarget5xxAlarmName,
    });
    new StringParameter(this, "GatewayTargetResponseTimeAlarmNameParameter", {
      parameterName: `/${props.resourcePrefix}/alarms/gateway-target-response-time-high/name`,
      stringValue: gatewayTargetResponseTimeAlarmName,
    });

    new CfnOutput(this, "GatewayLoadBalancerDnsName", {
      value: this.loadBalancer.loadBalancerDnsName,
    });
  }

  private gatewayTargetGroupMetric(metricName: string, statistic: string): Metric {
    return new Metric({
      dimensionsMap: {
        LoadBalancer: this.loadBalancer.loadBalancerFullName,
        TargetGroup: this.gatewayTargetGroup.targetGroupFullName,
      },
      metricName,
      namespace: "AWS/ApplicationELB",
      period: Duration.minutes(1),
      statistic,
    });
  }
}
