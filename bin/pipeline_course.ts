#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineCourseStack } from '../lib/pipeline_course-stack';
import { BillingStack } from '../lib/billing-stack';
import { env } from 'process';

const app = new cdk.App();
new PipelineCourseStack(app, 'PipelineCourseStack', {
  env: {account: process.env.CDK_DEFAULT_ACCOUNT , region:'us-east-1'}
});

new BillingStack(app, 'BillingStack', {
  env: {account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1'},
  budgetAmount: 5,
  emailAddress: 'pope1.wow@gmail.com'
})