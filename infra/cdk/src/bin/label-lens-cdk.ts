#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { createLabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensAwsStack } from "../stacks/label-lens-aws-stack.js";

const app = new App();
const environmentName = app.node.tryGetContext("environmentName") ?? process.env.LABEL_LENS_ENVIRONMENT ?? "dev";
const config = createLabelLensAwsConfig(String(environmentName));

const region = process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const account = process.env.CDK_DEFAULT_ACCOUNT;

new LabelLensAwsStack(app, `LabelLens-${config.environmentName}`, {
  config,
  env: account
    ? {
        account,
        region,
      }
    : {
        region,
      },
});