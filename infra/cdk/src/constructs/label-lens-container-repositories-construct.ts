import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Repository, TagStatus } from "aws-cdk-lib/aws-ecr";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export type LabelLensContainerRepositoriesConstructProps = {
  resourcePrefix: string;
  repositoryNames: readonly string[];
};

export class LabelLensContainerRepositoriesConstruct extends Construct {
  readonly repositories: Record<string, Repository> = {};

  constructor(scope: Construct, id: string, props: LabelLensContainerRepositoriesConstructProps) {
    super(scope, id);

    for (const repositoryName of props.repositoryNames) {
      const repositoryShortName = getRepositoryShortName(repositoryName);
      const logicalId = toConstructId(repositoryShortName);
      const repository = new Repository(this, logicalId, {
        repositoryName,
        imageScanOnPush: true,
        removalPolicy: RemovalPolicy.RETAIN,
        lifecycleRules: [
          {
            description: "Keep the last 20 tagged images per service.",
            maxImageCount: 20,
            tagStatus: TagStatus.TAGGED,
            tagPatternList: ["*"],
          },
          {
            description: "Expire untagged images after 7 days.",
            maxImageAge: Duration.days(7),
            tagStatus: TagStatus.UNTAGGED,
          },
        ],
      });

      this.repositories[repositoryName] = repository;

      new StringParameter(this, `${logicalId}RepositoryNameParameter`, {
        parameterName: `/${props.resourcePrefix}/ecr/repositories/${repositoryShortName}/name`,
        stringValue: repository.repositoryName,
      });

      new StringParameter(this, `${logicalId}RepositoryUriParameter`, {
        parameterName: `/${props.resourcePrefix}/ecr/repositories/${repositoryShortName}/uri`,
        stringValue: repository.repositoryUri,
      });
    }
  }
}

function getRepositoryShortName(repositoryName: string): string {
  return repositoryName.split("/").at(-1) ?? repositoryName;
}

function toConstructId(repositoryName: string): string {
  return repositoryName
    .split(/[/-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}