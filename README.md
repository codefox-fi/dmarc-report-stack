# dmarc-report-stack

This is a stack and Lambdas to receive, parse and summarize DMARC reports to Slack (or other targets).

## Deployment

1. Create a Slack webhook URL and point it to a channel
1. Create an AWS Hosted Zone to which you can add the subdomain for the email address. For example, if the hosted zone is `codefox.fi` and the subdomain is `dmarc`, the email address for the reports will be `anything@dmarc.codefox.fi`
1. Copy `.env.template` to `.env`
1. Edit `.env` to suit your installation
1. Set up a Verified identity for the subdomain in AWS SES
1. Run `cdk deploy` to deploy the stack
1. Change your DMARC record to point to the email address specified in your `.env`
1. Test and enjoy!

## License
GNU General Public License v3.0

## Disclaimers
This stack is provided as-is, and there are no guarantees. Use at your own risk.

## TODO
- Create more Actions (where to post the summaries)
- Finetune the DMARC Report parsing for more info
