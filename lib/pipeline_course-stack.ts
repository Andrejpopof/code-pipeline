import * as cdk from 'aws-cdk-lib';
import { SecretValue, Stage } from 'aws-cdk-lib';
import { IStage } from 'aws-cdk-lib/aws-apigateway';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Action, Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeCommitSourceAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import { BillingStack } from './billing-stack';
import { ServiceStack } from './service-stack';


export class PipelineCourseStack extends cdk.Stack {

  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  this.pipeline =  new Pipeline(this, 'Pipeline', {
    pipelineName: 'CodePipeline',
    crossAccountKeys: false,
    restartExecutionOnUpdate: true
   });

   const cdkSourceOutput = new Artifact('CDKSourceOutput');
   const serviceSourceOutput = new Artifact('ServiceSourceOutput')

   this.pipeline.addStage({
    stageName: "Source",
    actions: [
      new GitHubSourceAction({
        owner: "Andrejpopof",
        repo: "code-pipeline",
        branch: "main",
        actionName: "Pipeline_Source",
        oauthToken: SecretValue.secretsManager("github-pipeline-token"),
        output: cdkSourceOutput,
      }),
      new GitHubSourceAction({
        owner: "Andrejpopof",
        repo: "express-lambda",
        branch: "main",
        actionName: "Service-Source",
        oauthToken: SecretValue.secretsManager("github-pipeline-token"),
        output: serviceSourceOutput,
      }),
    ],
  });
  
   this.cdkBuildOutput = new Artifact('cdkBuildOutput');
   this.serviceBuildOutput = new Artifact('serviceBuildOutput');
   this.pipeline.addStage({
    stageName: 'Build',
    actions:[
      new CodeBuildAction({
        actionName: 'CDK_Build',
        input: cdkSourceOutput,
        outputs: [this.cdkBuildOutput],
        project: new PipelineProject(this,'CdkBuildProject',{
          environment:{
            buildImage: LinuxBuildImage.STANDARD_5_0
          },
          buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yml')
        })
      }),

      new CodeBuildAction({
        actionName: 'Service_Build',
        input: serviceSourceOutput,
        outputs: [this.serviceBuildOutput],
        project: new PipelineProject(this, 'ServiceBuildProject',{
          environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0
          },
          buildSpec: BuildSpec.fromSourceFilename('build-specs/service-build-spec.yml')
        })
      })
    ]
   });

   this.pipeline.addStage({
    stageName: 'Pipeline_Update',
    actions:[
      new CloudFormationCreateUpdateStackAction({
        actionName: 'Pipeline_Update',
        stackName: 'PipelineCourseStack',
        templatePath: this.cdkBuildOutput.atPath('PipelineCourseStack.template.json'),
        adminPermissions: true
      }),
      
    ]
   });

  }

  public addServicesToStage(serviceStack: ServiceStack, stageName: string, billingStack: BillingStack) {
    this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Service_Update',
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(this.serviceBuildOutput.s3Location)
          },
          extraInputs: [this.serviceBuildOutput]
        }),

        new CloudFormationCreateUpdateStackAction({
          actionName: 'Billing_Update',
          stackName: billingStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${billingStack.stackName}.template.json`),
          adminPermissions: true
        })
      ]
    })
  }


  

  

  
}
