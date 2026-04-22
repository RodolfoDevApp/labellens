import { CfnOutput, Duration } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationProtocol,
  ApplicationTargetGroup,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
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

  constructor(scope: Construct, id: string, props: LabelLensIngressConstructProps) {
    super(scope, id);

    this.loadBalancerSecurityGroup = new SecurityGroup(this, "PublicLoadBalancerSecurityGroup", {
      vpc: props.vpc,
      securityGroupName: props.ingress.loadBalancerSecurityGroupName,
      description: "Allows public HTTP ingress to the LabelLens gateway load balancer.",
      allowAllOutbound: true,
      disableInlineRules: true,
    });

    for (const cidrBlock of props.ingress.allowedCidrBlocks) {
      this.loadBalancerSecurityGroup.addIngressRule(
        Peer.ipv4(cidrBlock),
        Port.tcp(props.ingress.httpPort),
        "Allow public HTTP ingress to the LabelLens gateway ALB.",
      );
    }

    props.gatewayIngressSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.loadBalancerSecurityGroup.securityGroupId),
      Port.tcp(props.ingress.gatewayTargetPort),
      "Allow the public ALB to reach only the gateway ECS tasks.",
    );

    this.loadBalancer = new ApplicationLoadBalancer(this, "GatewayLoadBalancer", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: this.loadBalancerSecurityGroup,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
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

    new StringParameter(this, "GatewayPublicUrlParameter", {
      parameterName: `/${props.resourcePrefix}/ingress/gateway-url`,
      stringValue: `http://${this.loadBalancer.loadBalancerDnsName}`,
    });

    new CfnOutput(this, "GatewayLoadBalancerDnsName", {
      value: this.loadBalancer.loadBalancerDnsName,
    });

    new CfnOutput(this, "GatewayPublicUrl", {
      value: `http://${this.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
