const GAS_URL = process.env.GAS_URL;
const GAS_SECRET = process.env.GAS_SECRET;

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
  const res = await fetch(url.toString(), { cache: "no-store" });
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
  });
  if (!res.ok) throw new Error(`GAS request failed: ${res.status}`);
  const data = await res.json();
  return checkGasError(data);
}

export async function getRows(
  sheetName: string
): Promise<Record<string, string>[]> {
  const data = await gasGet({ action: "getRows", sheet: sheetName });
  return data as Record<string, string>[];
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
