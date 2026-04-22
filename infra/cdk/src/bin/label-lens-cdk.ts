#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import {
  createLabelLensAwsConfig,
  normalizeDeploymentMode,
  normalizeImageTag,
} from "../config/label-lens-aws-config.js";
import { LabelLensAwsStack } from "../stacks/label-lens-aws-stack.js";

const app = new App();
const environmentName = getContextOrEnv(app, "environmentName", "LABEL_LENS_ENVIRONMENT", "dev");
const deploymentMode = normalizeDeploymentMode(getContextOrEnv(app, "deploymentMode", "LABEL_LENS_DEPLOYMENT_MODE", "release"));
const imageTag = normalizeImageTag(getContextOrEnv(app, "imageTag", "LABEL_LENS_IMAGE_TAG", "latest"));
const gatewayAllowedOrigins = getCsvContextOrEnv(app, "gatewayAllowedOrigins", "LABEL_LENS_GATEWAY_ALLOWED_ORIGINS");
const ingressAllowedCidrBlocks = getCsvContextOrEnv(app, "ingressAllowedCidrs", "LABEL_LENS_INGRESS_ALLOWED_CIDRS");

const config = createLabelLensAwsConfig(String(environmentName), {
  deploymentMode,
  gatewayAllowedOrigins,
  imageTag,
  ingressAllowedCidrBlocks,
});

const region = process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const account = process.env.CDK_DEFAULT_ACCOUNT;

new LabelLensAwsStack(app, `LabelLens-${config.environmentName}`, {
  config,
  env: account ? { account, region } : { region },
});

function getContextOrEnv(app: App, contextKey: string, envKey: string, fallback: string): string {
  const contextValue = app.node.tryGetContext(contextKey);
  if (typeof contextValue === "string" && contextValue.trim()) return contextValue;
  const envValue = process.env[envKey];
  return typeof envValue === "string" && envValue.trim() ? envValue : fallback;
}

function getCsvContextOrEnv(app: App, contextKey: string, envKey: string): readonly string[] | undefined {
  const value = getOptionalContextOrEnv(app, contextKey, envKey);
  if (!value) return undefined;
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

function getOptionalContextOrEnv(app: App, contextKey: string, envKey: string): string | undefined {
  const contextValue = app.node.tryGetContext(contextKey);
  if (Array.isArray(contextValue)) return contextValue.join(",");
  if (typeof contextValue === "string" && contextValue.trim()) return contextValue;
  const envValue = process.env[envKey];
  return typeof envValue === "string" && envValue.trim() ? envValue : undefined;
}
