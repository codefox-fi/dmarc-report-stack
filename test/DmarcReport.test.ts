import { DmarcReport } from "../lib/lambda/DmarcReport";
import { promises as fs } from "fs";
import * as path from "path";

const fixturePath = path.join(__dirname, "fixtures");

describe('DmarcReport', () => {
  describe('fromXml', () => {
    it('should parse DMARC report with no failures correctly', async () => {
      const xmlBuffer = await fs.readFile(path.join(fixturePath, 'google.com!codefox.fi!1706572800!1706659199.xml'));
      const report = await new DmarcReport().fromXml(xmlBuffer);
      expect(report.totalReports).toBe(4);
      expect(report.totalSuccesses).toBe(4);
      expect(report.totalFailures).toBe(0);
      expect(report.failures.length).toBe(0);
    });

    it('should parse DMARC report with failures correctly', async () => {
      const xmlBuffer = Buffer.from(`<?xml version="1.0"?>
<feedback>
  <record>
    <auth_results>
      <dkim>
        <result>fail</result>
      </dkim>
      <spf>
        <result>pass</result>
      </spf>
    </auth_results>
  </record>
</feedback>`);
      const report = await new DmarcReport().fromXml(xmlBuffer);
      expect(report.totalReports).toBe(1);
      expect(report.totalSuccesses).toBe(0);
      expect(report.totalFailures).toBe(1);
      expect(report.failures.length).toBe(1);
      expect(report.failures[0].error).toContain('DKIM: fail SPF: pass');
    });

    // Additional tests can be added here, such as handling empty or malformed XML
  });
});
