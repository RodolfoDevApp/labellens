import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export type LabelLensDataConstructProps = {
  tableName: string;
  resourcePrefix: string;
};

export class LabelLensDataConstruct extends Construct {
  readonly table: Table;

  constructor(scope: Construct, id: string, props: LabelLensDataConstructProps) {
    super(scope, id);

    this.table = new Table(this, "Table", {
      tableName: props.tableName,
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new StringParameter(this, "TableNameParameter", {
      parameterName: `/${props.resourcePrefix}/dynamodb/table-name`,
      stringValue: this.table.tableName,
    });

    new StringParameter(this, "TableArnParameter", {
      parameterName: `/${props.resourcePrefix}/dynamodb/table-arn`,
      stringValue: this.table.tableArn,
    });
  }
}