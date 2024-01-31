#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import * as dotenv from "dotenv";

import { DmarcStack } from "../lib/dmarc-stack";
import { DmarcStackProps } from "../lib/types";

dotenv.config();

const props: DmarcStackProps = {
  env: {
    account: process.env.DEPLOYMENT_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.DEPLOYMENT_REGION ?? process.env.CDK_DEFAULT_REGION ?? "eu-west-1",
  },
  dmarcEmail: process.env.DMARC_EMAIL ?? "",
  hostedZone: process.env.HOSTED_ZONE ?? "",
  subdomain: process.env.SUBDOMAIN ?? "dmarc",
  actionSettings: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? "",
  },
  incomingEmailBucketTtl: Number(process.env.TTL_INCOMING_EMAIL ?? 7),
  attachmentsBucketTtl: Number(process.env.TTL_ATTACHMENTS ?? 31),
};

if (!props.dmarcEmail) {
  throw new Error("DMARC_EMAIL not set");
}
if (!props.hostedZone) {
  throw new Error("HOSTED_ZONE not set");
}

const app = new App();
new DmarcStack(app, "DmarcStack", props);
