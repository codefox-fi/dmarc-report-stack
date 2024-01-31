import { S3Handler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { simpleParser } from 'mailparser';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { gunzip } from 'zlib';
import { promisify } from 'util';

import { ReportResult, DmarcReport, FileList } from './types';
import { SlackActions } from './slackActions';

const gunzipAsync = promisify(gunzip);
const s3 = new S3();

/**
 * Handles incoming emails from SES
 *
 * SES saves the email to an S3 bucket, which triggers this Lambda function.
 * The function parses the email and extracts any attachments.
 * The attachments are then uploaded to the target bucket.
 *
 * The target bucket is used by the DMARC report parser.
 *
 * The current implementation supports zip and gzip files.
 *
 * @param event Incoming event from S3
 */
export const emailHandler: S3Handler = async (event) => {
  const { S3_TARGET_BUCKET_NAME } = process.env;

  try {
    for (const record of event.Records) {
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      const emailObject = await s3.getObject({
        Bucket: record.s3.bucket.name,
        Key: key,
      }).promise();

      const emailData = emailObject.Body as Buffer;
      const parsedEmail = await simpleParser(emailData);

      if (parsedEmail.attachments) {
        for (const attachment of parsedEmail.attachments) {
          const fileList: FileList = [];
          switch (attachment.contentType) {
            case "application/zip":
            case "application/x-zip":
              const zipFileList = await handleZipFile(attachment.content);
              fileList.push(...zipFileList);
              break;

            case "application/x-gzip":
            case "application/gzip":
              const decompressedContent = await gunzipAsync(attachment.content);
              fileList.push({
                filename: attachment.filename ?? generateFilename(),
                content: decompressedContent
              });
              break;

          default:
            throw new Error("unknown file type, skipping");
          }

          if (fileList.length > 0) {
            await uploadFile(S3_TARGET_BUCKET_NAME!, fileList);
          }
        }
      }
    }
  } catch (error) {
    console.error("error processing email", error);
  }
};

/**
 * Handles digesting DMARC reports from S3
 *
 * emailHandler saves the DMARC report to an S3 bucket, which triggers this Lambda function.
 * The function retrieves the file, parses the report and sends a Slack message with the results.
 * The function can be extended to send the results to other services.
 *
 * @param event Incoming event from S3
 */
export const attachmentHandler: S3Handler = async (event) => {
  const actionHandler = new SlackActions(process.env.SLACK_WEBHOOK_URL!);
  try {
    for (const record of event.Records) {
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      const attachmentObject = await s3.getObject({
        Bucket: record.s3.bucket.name,
        Key: key,
      }).promise();

      const attachmentData = attachmentObject.Body as Buffer;
      try {
        const result = await parseDmarcReportsFromXml(attachmentData);
        if (result.totalFailures > 0) {
          await actionHandler.sendFailureMessage(result);
        } else {
          await actionHandler.sendSuccessMessage(result);
        }
      } catch (error) {
        await actionHandler.sendErrorMessage(error);
      }
    }
  } catch (error) {
    await actionHandler.sendErrorMessage(error);
  }
};

/**
 * Parses a DMARC report from XML
 *
 * @param xml buffer of the DMARC report as XML
 * @returns a report result containing the results of the report
 */
const parseDmarcReportsFromXml = async (xml: Buffer): Promise<ReportResult> => {
  const result: ReportResult = {
    totalReports: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    failures: [],
  };

  const parser = new xml2js.Parser();
  const report: DmarcReport = await parser.parseStringPromise(xml);

  for (const records of report.feedback.record) {
    result.totalReports++;
    const resultCollection = [];
    for (const result of records.auth_results[0].dkim) {
      resultCollection.push(result.result[0]);
    }
    for (const result of records.auth_results[0].spf) {
      resultCollection.push(result.result[0]);
    }
    if (!resultCollection.includes("fail")) {
      result.totalSuccesses++;
    } else {
      result.totalFailures++;
      result.failures.push({
        row: JSON.stringify(records),
        error: `DKIM: ${records.auth_results[0].dkim[0].result[0]} SPF: ${records.auth_results[0].spf[0].result[0]}`,
      });
    }
  }

  return result;
};

/**
 * Uploads the files to the target bucket
 *
 * @param bucket name of the target bucket
 * @param fileList list of files to upload
 */
const uploadFile = async (bucket: string, fileList: FileList) => {
  const promises = [];
  for (const file of fileList) {
    promises.push(s3.upload({
      Bucket: bucket,
      Key: file.filename,
      Body: file.content,
    }).promise());
  }

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error("error uploading file", error);
  }
};

/**
 * Handles zip files, extracting the files and returning a list of files
 *
 * @param content buffer of the zip file
 * @returns a list of files with their names and content
 */
const handleZipFile = async (content: Buffer) => {
  const zip = new JSZip();
  const fileList: FileList = [];
  await zip.loadAsync(content);
  for (const filename in zip.files) {
    const file = zip.files[filename];
    const content = await file.async("nodebuffer");
    fileList.push({
      filename,
      content,
    });
  }

  return fileList;
};

/**
 * Generates a filename for unnamed files
 *
 * @returns a filename based on the current timestamp
 */
const generateFilename = () => {
  return `unnamed-${Date.now()}.xml`;
}