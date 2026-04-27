import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export interface ReportData {
  projectName: string;
  totalFeedback: number;
  sentimentBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  topThemes: Array<{ theme: string; count: number; avgSentiment: number }>;
  priorityAlerts: number;
  trendDirection: string;
  generatedAt: string;
}

export function buildPdfBuffer(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });

    doc.pipe(stream);
    stream.on('finish', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    doc.fontSize(20).text('Multilingual Feedback Analysis Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#555').text(`Project: ${report.projectName}`, { align: 'center' });
    doc.text(`Generated: ${report.generatedAt}`, { align: 'center' });
    doc.moveDown(1).fillColor('#000');

    doc.fontSize(14).text('Summary');
    doc.fontSize(11)
      .text(`Total Feedback: ${report.totalFeedback}`)
      .text(`Priority Alerts: ${report.priorityAlerts}`)
      .text(`Trend: ${report.trendDirection}`);

    doc.moveDown(0.8).fontSize(14).text('Sentiment Breakdown');
    doc.fontSize(11);
    for (const [label, count] of Object.entries(report.sentimentBreakdown)) {
      doc.text(`  ${label}: ${count}`);
    }

    doc.moveDown(0.8).fontSize(14).text('Language Breakdown');
    doc.fontSize(11);
    for (const [lang, count] of Object.entries(report.languageBreakdown)) {
      doc.text(`  ${lang}: ${count}`);
    }

    doc.moveDown(0.8).fontSize(14).text('Top Themes');
    doc.fontSize(11);
    for (const t of report.topThemes) {
      doc.text(`  ${t.theme}: ${t.count} items, avg sentiment ${t.avgSentiment.toFixed(2)}`);
    }

    doc.end();
  });
}
