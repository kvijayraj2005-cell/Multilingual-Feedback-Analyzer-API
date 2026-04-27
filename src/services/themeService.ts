export type Theme =
  | 'service'
  | 'price'
  | 'quality'
  | 'delivery'
  | 'staff'
  | 'food'
  | 'app_ux'
  | 'billing'
  | 'other';

export interface ThemeCount {
  theme: Theme;
  count: number;
  avgSentiment: number;
}

export function aggregateThemes(
  rows: Array<{ themes: string[]; confidence: number; sentiment: string }>
): ThemeCount[] {
  const map = new Map<string, { count: number; scores: number[] }>();

  for (const row of rows) {
    const score = row.sentiment === 'positive' ? row.confidence : row.sentiment === 'negative' ? -row.confidence : 0;
    for (const theme of row.themes) {
      if (!map.has(theme)) map.set(theme, { count: 0, scores: [] });
      const entry = map.get(theme)!;
      entry.count++;
      entry.scores.push(score);
    }
  }

  return Array.from(map.entries())
    .map(([theme, { count, scores }]) => ({
      theme: theme as Theme,
      count,
      avgSentiment: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count);
}
