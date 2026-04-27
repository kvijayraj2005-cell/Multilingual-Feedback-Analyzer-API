import * as XLSX from 'xlsx';

export interface ParsedRow {
  text: string;
}

export function parseUpload(buffer: Buffer, mimetype: string): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) throw new Error('Uploaded file contains no rows');

  return rows
    .map((row) => {
      const text =
        (row['text'] as string) ||
        (row['Text'] as string) ||
        (row['feedback'] as string) ||
        (row['Feedback'] as string) ||
        '';
      return { text: String(text).trim() };
    })
    .filter((r) => r.text.length > 0)
    .slice(0, 500); // hard cap per upload
}
