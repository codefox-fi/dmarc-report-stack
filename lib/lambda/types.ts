export type ReportResult = {
  totalReports: number;
  totalSuccesses: number;
  totalFailures: number;
  failures: Array<{
    row: string;
    error: string;
  }>;
};

export type DmarcReport = {
  feedback: {
    version: string;
    report_metadata: Array<{
      org_name: Array<string>;
      email: Array<string>;
      report_id: Array<string>;
      date_range: Array<{
        begin: Array<string>;
        end: Array<string>;
      }>;
    }>;
    policy_published: Array<{
      domain: Array<string>;
      adkim: Array<string>;
      aspf: Array<string>;
      p: Array<string>;
      sp: Array<string>;
      pct: Array<string>;
      fo: Array<string>;
    }>;
    record: Array<{
      row: Array<{
        source_ip: Array<string>;
        count: Array<string>;
        policy_evaluated: Array<{
          disposition: Array<string>;
          dkim: Array<string>;
          spf: Array<string>;
        }>;
      }>;
      identifiers: Array<{
        envelope_from: Array<string>;
        header_from: Array<string>;
      }>;
      auth_results: Array<{
        dkim: Array<{
          domain: Array<string>;
          result: Array<string>;
        }>;
        spf: Array<{
          domain: Array<string>;
          result: Array<string>;
        }>;
      }>;
    }>;
  };
};

interface FileItem {
  filename: string;
  content: Buffer;
}

export type FileList = FileItem[];
