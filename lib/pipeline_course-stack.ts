import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';


export class PipelineCourseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  const pipeline =  new Pipeline(this, 'Pipeline', {
    pipelineName: 'CodePipeline',
    crossAccountKeys: false
   });

   const sourceOutput = new Artifact('SourceOutput');

   pipeline.addStage({
    stageName: "Source",
    actions: [
      new GitHubSourceAction({
        owner: "Andrejpopof",
        repo: "code-pipeline",
        branch: "main",
        actionName: "Pipeline_Source",
        oauthToken: SecretValue.secretsManager("github-pipeline-token"),
        output: sourceOutput,
      }),
    ],
  });
  
   const codeBuildOutput = new Artifact('BuildOutput');
   pipeline.addStage({
    stageName: 'Build',
    actions:[
      new CodeBuildAction({
        actionName: 'CDK_Build',
        input: sourceOutput,
        outputs: [codeBuildOutput],
        project: new PipelineProject(this,'CdkBuildProject',{
          environment:{
            buildImage: LinuxBuildImage.STANDARD_5_0
          },
          buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yml')
        })
      })
    ]
   });

   pipeline.addStage({
    stageName: 'Pipeline_Update',
    actions:[
      new CloudFormationCreateUpdateStackAction({
        actionName: 'Pipeline_Update',
        stackName: 'PipelineCourseStack',
        templatePath: codeBuildOutput.atPath('PipelineCourseStack.template.json'),
        adminPermissions: true
      })
    ]
   });
   pipeline.addStage({
    stageName: 'Billing_Update',
    actions:[
      new CloudFormationCreateUpdateStackAction({
        actionName: 'Billing_Update',
        stackName: 'BillingStack',
        templatePath: codeBuildOutput.atPath('BillingStack.template.json'),
        adminPermissions: true
      })
    ]
   })

   

  }
}
