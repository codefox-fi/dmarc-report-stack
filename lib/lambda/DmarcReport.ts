import * as xml2js from 'xml2js';

export class DmarcReport {
  public totalReports: number;
  public totalSuccesses: number;
  public totalFailures: number;
  public records: any[];
  public failures: { row: string; error: string }[];

  constructor() {
    this.totalReports = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.failures = [];
  }

  /**
   * Parses a DMARC report from XML
   *
   * @param xml buffer of the DMARC report as XML
   * @returns a report result containing the results of the report
   */
  async fromXml(xml: Buffer): Promise<DmarcReport> {
    const report = new DmarcReport();
    const parser = new xml2js.Parser();
    const data = await parser.parseStringPromise(xml);
    console.log(JSON.stringify(data));

    for (const records of data.feedback.record) {
      const report = new DmarcReport();
      report.totalReports++;
      const resultCollection = [];
      for (const result of records.auth_results[0].dkim) {
        resultCollection.push(result.result[0]);
      }
      for (const result of records.auth_results[0].spf) {
        resultCollection.push(result.result[0]);
      }
      if (!resultCollection.includes("fail")) {
        report.totalSuccesses++;
      } else {
        report.totalFailures++;
        report.failures.push({
          row: JSON.stringify(records),
          error: `DKIM: ${records.auth_results[0].dkim[0].result[0]} SPF: ${records.auth_results[0].spf[0].result[0]}`,
        });
      }
    }

    return report;
  };
}