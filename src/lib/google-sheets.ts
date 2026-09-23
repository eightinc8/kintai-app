const GAS_URL = process.env.GAS_URL;
const GAS_SECRET = process.env.GAS_SECRET;
const GAS_TIMEOUT_MS = 60_000;

function getBaseUrl() {
  if (!GAS_URL || !GAS_SECRET) {
    throw new Error("GAS_URL と GAS_SECRET を .env.local に設定してください");
  }
  return GAS_URL;
}

async function checkGasError(data: unknown): Promise<unknown> {
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(`GAS error: ${(data as { error: string }).error}`);
  }
  return data;
}

async function gasGet(params: Record<string, string>): Promise<unknown> {
  const url = new URL(getBaseUrl());
  url.searchParams.set("secret", GAS_SECRET!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(GAS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GAS request failed: ${res.status}`);
  const data = await res.json();
  return checkGasError(data);
}

async function gasPost(
  params: Record<string, string>,
  body: Record<string, string>
): Promise<unknown> {
  const url = new URL(getBaseUrl());
  url.searchParams.set("secret", GAS_SECRET!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(GAS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GAS request failed: ${res.status}`);
  const data = await res.json();
  return checkGasError(data);
}

// シート全体の読み込みは短時間キャッシュする。
// 1画面で4〜5回、複数人が同時に開くとGASが順番待ちになりタイムアウトするため。
// 行番号を返す find 系はキャッシュしない（古い行番号で書き込むと別の行を壊すため）。
const ROWS_TTL_MS = 30_000;
const rowsCache = new Map<string, { rows: Record<string, string>[]; expiresAt: number }>();
const rowsInFlight = new Map<string, Promise<Record<string, string>[]>>();

function invalidateRowsCache(sheetName: string) {
  rowsCache.delete(sheetName);
}

export async function getRows(
  sheetName: string
): Promise<Record<string, string>[]> {
  const cached = rowsCache.get(sheetName);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;

  // 同時に同じシートを要求された場合は1回のGAS通信を共有する
  const inFlight = rowsInFlight.get(sheetName);
  if (inFlight) return inFlight;

  const pending = (async () => {
    const data = await gasGet({ action: "getRows", sheet: sheetName });
    const rows = data as Record<string, string>[];
    rowsCache.set(sheetName, { rows, expiresAt: Date.now() + ROWS_TTL_MS });
    return rows;
  })();

  rowsInFlight.set(sheetName, pending);
  try {
    return await pending;
  } finally {
    rowsInFlight.delete(sheetName);
  }
}

export async function findRows(
  sheetName: string,
  column: string,
  value: string
): Promise<{ rowIndex: number; data: Record<string, string> }[]> {
  const data = await gasGet({
    action: "findRows",
    sheet: sheetName,
    column,
    value,
  });
  return data as { rowIndex: number; data: Record<string, string> }[];
}

export async function findRow(
  sheetName: string,
  column: string,
  value: string
): Promise<{ rowIndex: number; data: Record<string, string> } | null> {
  const data = await gasGet({
    action: "findRow",
    sheet: sheetName,
    column,
    value,
  });
  return data as { rowIndex: number; data: Record<string, string> } | null;
}

export async function findRowByMultiple(
  sheetName: string,
  conditions: Record<string, string>
): Promise<{ rowIndex: number; data: Record<string, string> } | null> {
  const data = await gasGet({
    action: "findRowByMultiple",
    sheet: sheetName,
    conditions: JSON.stringify(conditions),
  });
  return data as { rowIndex: number; data: Record<string, string> } | null;
}

export async function appendRow(
  sheetName: string,
  data: Record<string, string>
): Promise<void> {
  await gasPost({ action: "appendRow", sheet: sheetName }, data);
  invalidateRowsCache(sheetName);
}

export async function updateRow(
  sheetName: string,
  rowIndex: number,
  data: Record<string, string>
): Promise<void> {
  await gasPost(
    { action: "updateRow", sheet: sheetName, rowIndex: String(rowIndex) },
    data
  );
  invalidateRowsCache(sheetName);
}

export async function deleteRow(
  sheetName: string,
  rowIndex: number
): Promise<void> {
  await gasGet({
    action: "deleteRow",
    sheet: sheetName,
    rowIndex: String(rowIndex),
  });
  invalidateRowsCache(sheetName);
}

export async function uploadFile(
  base64: string,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; viewUrl: string }> {
  const data = await gasPost(
    { action: "uploadFile", sheet: "" },
    { base64, fileName, mimeType }
  );
  return data as { fileId: string; viewUrl: string };
}

export async function deleteFile(fileId: string): Promise<void> {
  await gasGet({ action: "deleteFile", sheet: "", fileId });
}

export async function initSpreadsheet(): Promise<string> {
  await gasGet({ action: "initSheets", sheet: "" });
  return "initialized";
}
