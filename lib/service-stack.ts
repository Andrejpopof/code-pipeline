import { Stack, StackProps } from "aws-cdk-lib";
import { Runtime , Function, Code, CfnParametersCode} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as apiGW from 'aws-cdk-lib/aws-apigateway'; 



export class ServiceStack extends Stack{
    public readonly serviceCode: CfnParametersCode;
    constructor(scope: Construct, id: string, props?: StackProps){
        super(scope,id);

        this.serviceCode = Code.fromCfnParameters()

       const lambda =  new Function(this,'ServiceLambda',{
            runtime: Runtime.NODEJS_14_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: 'ServiceLambda1'
        });

        
        new apiGW.LambdaRestApi(this,'ServerlessLambda',{
            handler: lambda
        })

    }
}