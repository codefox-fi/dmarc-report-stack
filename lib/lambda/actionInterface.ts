import { ReportResult } from "./types";

/**
 * Interface for sending messages
 *
 * This interface is used to send messages to different notification systems.
 * The classes must implement the methods in this interface to handle success, failure and error messages.
 */
export interface ActionInterface {
  sendSuccessMessage(result: ReportResult): void;
  sendFailureMessage(result: ReportResult): void;
  sendErrorMessage(error: Error): void;
}
