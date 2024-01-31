import { RemovalPolicy } from 'aws-cdk-lib';
import { Duration, Stack, StackProps } from 'aws-cdk-lib/core';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ReceiptRuleSet } from 'aws-cdk-lib/aws-ses';
import { S3 as S3Action } from 'aws-cdk-lib/aws-ses-actions';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { HostedZone, MxRecord } from 'aws-cdk-lib/aws-route53';

import path = require('path');

import { DmarcStackProps } from './types';

export class DmarcStack extends Stack {
  constructor(scope: Construct, id: string, props: DmarcStackProps) {
    super(scope, id, props);

    const region = props?.env?.region ?? "eu-north-1";
    const awsHostedZone = HostedZone.fromLookup(this, 'HostedZone', { domainName: props.hostedZone });

    new MxRecord(this, 'MxRecord', {
      zone: awsHostedZone,
      values: [
        {
          hostName: `inbound-smtp.${region}.amazonaws.com`,
          priority: 10,
        },
      ],
      recordName: `${props.subdomain}.${props.hostedZone}`
    });

    // Create an S3 bucket to store incoming emails
    const incomingEmailsBucket = new Bucket(this, 'IncomingEmailsBucket', {
      lifecycleRules: [{
        expiration: Duration.days(props.incomingEmailBucketTtl),
      }],
    });

    // Create an S3 bucket to store attachments
    const attachmentsBucket = new Bucket(this, 'AttachmentsBucket', {
      lifecycleRules: [{
        expiration: Duration.days(props.attachmentsBucketTtl),
      }],
    });

    // Create an IAM role for the Lambda function
    const lambdaRole = new Role(this, 'EmailProcessorRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach the required permissions policies to the Lambda role
    lambdaRole.addToPolicy(new PolicyStatement({
      actions: ['ses:SendRawEmail'],
      resources: ['*'], // Be more restrictive in production
    }));

    lambdaRole.addToPolicy(new PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [
        `${attachmentsBucket.bucketArn}/*`,
        `${incomingEmailsBucket.bucketArn}/*`,
      ],
    }));

    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    // Create a Lambda function to process incoming emails
    const emailProcessorFunction = new Function(this, 'EmailProcessorFunction', {
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      architecture: Architecture.ARM_64,
      handler: 'index.emailHandler',
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
      environment: {
        S3_TARGET_BUCKET_NAME: attachmentsBucket.bucketName,
      },
      role: lambdaRole,
    });

    // Grant Lambda permissions to read/write to the S3 bucket
    attachmentsBucket.grantReadWrite(emailProcessorFunction);
    incomingEmailsBucket.grantReadWrite(emailProcessorFunction);

    // Create an SES receipt rule to forward emails to the Lambda function
    const dmarcRuleSet = new ReceiptRuleSet(this, 'DmarcRuleSet');
    dmarcRuleSet.addRule('DmarcRule', {
      recipients: [props.dmarcEmail],
      actions: [new S3Action({
        bucket: incomingEmailsBucket,
      })],
    });

    emailProcessorFunction.addEventSource(new S3EventSource(incomingEmailsBucket, {
      events: [EventType.OBJECT_CREATED],
    }));

    const attachmentProcessorFunction = new Function(this, 'AttachmentProcessorFunction', {
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      architecture: Architecture.ARM_64,
      handler: 'index.attachmentHandler',
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
      environment: {
        SLACK_WEBHOOK_URL: props.actionSettings.slackWebhookUrl ?? "",
      },
      role: lambdaRole,
    });

    attachmentsBucket.grantReadWrite(attachmentProcessorFunction);
    attachmentProcessorFunction.addEventSource(new S3EventSource(attachmentsBucket, {
      events: [EventType.OBJECT_CREATED],
    }));
  }
}
