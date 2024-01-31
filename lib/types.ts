import { StackProps } from "aws-cdk-lib";

export type ActionSettings = {
  slackWebhookUrl: string;
};

export interface DmarcStackProps extends StackProps {
  actionSettings: ActionSettings;
  dmarcEmail: string;
  hostedZone: string;
  subdomain: string;
  incomingEmailBucketTtl: number;
  attachmentsBucketTtl: number;
};