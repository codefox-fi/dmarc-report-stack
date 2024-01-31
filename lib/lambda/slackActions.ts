import { ReportResult } from "./types";
import { ActionInterface} from "./actionInterface";

/**
 * Sends messages to Slack
 */
export class SlackActions implements ActionInterface {
  private readonly webhookUrl: string;

  /**
   * Initializes the SlackActions class
   *
   * @param webhookUrl Slack webhook URL
   */
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Sends a success message to Slack
   *
   * @param result Results of the DMARC report
   */
  async sendSuccessMessage(result: ReportResult): Promise<void> {
    const message = `Incoming DMARC report processed successfully. ${result.totalReports} passed!`;
    console.log(message);
    await this.sendSlackMessage(message);
  }

  /**
   * Sends a failure message to Slack
   *
   * @param result Results of the DMARC report
   */
  async sendFailureMessage(result: ReportResult): Promise<void> {
    const totalSuccesses = result.totalReports - result.totalFailures;
    let message = `Incoming DMARC report contained failures! ${totalSuccesses} passed, ${result.totalFailures} failed! Failures: `;
    const failures = [];
    for (const failure of result.failures) {
      failures.push(failure.row);
    }
    message += JSON.stringify(failures);
    console.log(message);
    await this.sendSlackMessage(message);
  }

  /**
   * Sends an error message to Slack and logs the error
   *
   * @param error Error that occurred
   */
  async sendErrorMessage(error: any): Promise<void> {
    if (error instanceof Error) {
      const message = `Error processing DMARC report: ${error.message}`;
      console.error(message);
      await this.sendSlackMessage(message);
    } else {
      const message = `Error processing DMARC report and unknown error type! Check logs for details.`;
      console.error(message);
      console.error(error);
      await this.sendSlackMessage(message);
    }
  }

  /**
   * Sends a message to Slack
   *
   * @param message Message to send
   */
  async sendSlackMessage(message: string): Promise<void> {
    const webhookUrl = this.webhookUrl;
    if (!webhookUrl) {
      throw new Error(`Invalid webhook URL "${webhookUrl}"!`);
    }
    const response = await fetch(webhookUrl, {
      method: "POST",
      body: JSON.stringify({ text: message }),
    });
    if (!response.ok) {
      throw new Error(`Error sending Slack message: ${response.statusText}`);
    }
  }
}