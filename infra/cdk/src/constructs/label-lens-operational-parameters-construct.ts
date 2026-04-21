import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export type LabelLensOperationalParametersConstructProps = {
  resourcePrefix: string;
  environmentName: string;
};

export class LabelLensOperationalParametersConstruct extends Construct {
  constructor(scope: Construct, id: string, props: LabelLensOperationalParametersConstructProps) {
    super(scope, id);

    new StringParameter(this, "EnvironmentNameParameter", {
      parameterName: `/${props.resourcePrefix}/environment/name`,
      stringValue: props.environmentName,
    });

    new StringParameter(this, "StorageDriverParameter", {
      parameterName: `/${props.resourcePrefix}/runtime/storage-driver`,
      stringValue: "dynamodb",
    });

    new StringParameter(this, "PublicGatewayBoundaryParameter", {
      parameterName: `/${props.resourcePrefix}/runtime/public-boundary`,
      stringValue: "gateway-only",
    });
  }
}
