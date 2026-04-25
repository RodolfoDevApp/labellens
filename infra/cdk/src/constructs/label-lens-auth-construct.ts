import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AccountRecovery, Mfa, UserPool, UserPoolClient, VerificationEmailStyle } from "aws-cdk-lib/aws-cognito";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { AuthConfig } from "../config/label-lens-aws-config.js";

export type LabelLensAuthConstructProps = {
  resourcePrefix: string;
  auth: AuthConfig;
};

export class LabelLensAuthConstruct extends Construct {
  readonly userPool: UserPool;
  readonly userPoolClient: UserPoolClient;
  readonly issuerUrl: string;

  constructor(scope: Construct, id: string, props: LabelLensAuthConstructProps) {
    super(scope, id);

    this.userPool = new UserPool(this, "UserPool", {
      userPoolName: props.auth.userPoolName,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        username: true,
        email: true,
      },
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: "Verify your new account",
        emailBody: "The verification code to your new account is {####}",
        emailStyle: VerificationEmailStyle.CODE,
      },
      mfa: Mfa.OFF,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: props.auth.userPoolClientName,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    const stack = Stack.of(this);
    this.issuerUrl = `https://cognito-idp.${stack.region}.${stack.urlSuffix}/${this.userPool.userPoolId}`;

    new StringParameter(this, "UserPoolIdParameter", {
      parameterName: `/${props.resourcePrefix}/cognito/user-pool-id`,
      stringValue: this.userPool.userPoolId,
    });

    new StringParameter(this, "UserPoolArnParameter", {
      parameterName: `/${props.resourcePrefix}/cognito/user-pool-arn`,
      stringValue: this.userPool.userPoolArn,
    });

    new StringParameter(this, "UserPoolClientIdParameter", {
      parameterName: `/${props.resourcePrefix}/cognito/user-pool-client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
    });

    new StringParameter(this, "IssuerUrlParameter", {
      parameterName: `/${props.resourcePrefix}/cognito/issuer-url`,
      stringValue: this.issuerUrl,
    });

    new CfnOutput(this, "CognitoUserPoolId", {
      value: this.userPool.userPoolId,
    });

    new CfnOutput(this, "CognitoUserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
