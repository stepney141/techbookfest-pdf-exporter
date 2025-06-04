import { promises as fs } from "fs";

import type { BookItem } from "./model";

export interface CsvMapper<T> {
  header: string;
  accessor: (item: T) => string | number;
  transform?: (value: string | number) => string;
}

// BookItem用のCSVマッパー定義
export const BOOK_CSV_MAPPERS: CsvMapper<BookItem>[] = [
  { header: "ID", accessor: (item) => item.id },
  { header: "タイトル", accessor: (item) => item.title },
  { header: "サークル名", accessor: (item) => item.organizationName },
  { header: "購入日時", accessor: (item) => item.causedAt },
  { header: "ファイル名", accessor: (item) => item.fileName }
];

/**
 * CSV値のエスケープ処理
 */
function escapeCsvValue(value: string): string {
  // ダブルクォート、カンマ、改行を含む場合はダブルクォートで囲む
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    // ダブルクォートをエスケープ（""にする）
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * オブジェクト配列からCSV文字列を生成
 */
export function generateCsv<T>(items: T[], mappers: CsvMapper<T>[]): string {
  if (mappers.length === 0) {
    throw new Error("At least one CSV mapper must be provided");
  }

  const lines: string[] = [];

  // ヘッダー行を生成
  const headers = mappers.map((mapper) => escapeCsvValue(mapper.header));
  lines.push(headers.join(","));

  // データ行を生成
  for (const item of items) {
    const values = mappers.map((mapper) => {
      const rawValue = mapper.accessor(item);
      const transformedValue = mapper.transform ? mapper.transform(rawValue) : String(rawValue);
      return escapeCsvValue(transformedValue);
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

/**
 * オブジェクト配列をCSVファイルとして出力
 */
export async function writeCsvFile<T>(filePath: string, items: T[], mappers: CsvMapper<T>[]): Promise<void> {
  const csvContent = generateCsv(items, mappers);

  // UTF-8 BOM付きで出力（Excelで日本語を正しく表示するため）
  const bom = "\uFEFF";
  const contentWithBom = bom + csvContent;

  await fs.writeFile(filePath, contentWithBom, "utf8");
}
