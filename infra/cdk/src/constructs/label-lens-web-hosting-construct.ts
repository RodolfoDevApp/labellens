import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { AllowedMethods, CachePolicy, Distribution, Function, FunctionCode, FunctionEventType, PriceClass, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WebHostingConfig } from "../config/label-lens-aws-config.js";

export type LabelLensWebHostingConstructProps = {
  resourcePrefix: string;
  web: WebHostingConfig;
};

export class LabelLensWebHostingConstruct extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly rewriteFunction: Function;

  constructor(scope: Construct, id: string, props: LabelLensWebHostingConstructProps) {
    super(scope, id);

    this.bucket = new Bucket(this, "SiteBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.rewriteFunction = new Function(this, "RewriteFunction", {
      functionName: props.web.cloudFrontFunctionName,
      code: FunctionCode.fromInline(`function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  if (uri.indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }

  return request;
}`),
    });

    this.distribution = new Distribution(this, "Distribution", {
      comment: props.web.distributionComment,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        functionAssociations: [
          {
            function: this.rewriteFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        [props.web.runtimeConfigCachePathPattern]: {
          origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: CachePolicy.CACHING_DISABLED,
        },
      },
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    new BucketDeployment(this, "SiteDeployment", {
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
      sources: [Source.asset(join(getRepositoryRoot(), "apps", "web", "out"))],
    });

    new StringParameter(this, "BucketNameParameter", {
      parameterName: `/${props.resourcePrefix}/web/site-bucket/name`,
      stringValue: this.bucket.bucketName,
    });

    new StringParameter(this, "DistributionIdParameter", {
      parameterName: `/${props.resourcePrefix}/web/cloudfront/distribution-id`,
      stringValue: this.distribution.distributionId,
    });

    new StringParameter(this, "DistributionDomainNameParameter", {
      parameterName: `/${props.resourcePrefix}/web/cloudfront/domain-name`,
      stringValue: this.distribution.distributionDomainName,
    });

    new StringParameter(this, "WebsiteUrlParameter", {
      parameterName: `/${props.resourcePrefix}/web/url`,
      stringValue: `https://${this.distribution.distributionDomainName}`,
    });

    new CfnOutput(this, "WebsiteUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}

function getRepositoryRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "..", "..", "..", "..");
}
