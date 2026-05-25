// ===================================================
// Google Apps Script — 勤怠管理アプリ用 Web API
// このコードをスプレッドシートの Apps Script に貼り付けてください
// ===================================================

const API_SECRET = "eight-kintai-secret-20260523";

const SHEET_CONFIGS = {
  staff: [
    "id", "email", "name", "name_kana", "role", "start_month",
    "address", "phone", "birthday", "family_composition",
    "is_active", "created_at", "updated_at"
  ],
  attendance: [
    "id", "staff_email", "date", "clock_in", "clock_out", "break_minutes",
    "work_hours", "transport_cost", "work_style", "created_at", "updated_at"
  ],
  daily_reports: [
    "id", "staff_email", "date", "todays_plan", "work_done", "good_points",
    "reflections", "admin_comment", "admin_comment_by", "admin_comment_at",
    "created_at", "updated_at"
  ],
  ideas: [
    "id", "staff_email", "date", "content", "category", "is_done", "done_at", "done_by", "created_at"
  ],
  categories: [
    "id", "name", "sort_order", "created_at"
  ],
  report_images: [
    "id", "staff_email", "date", "file_name", "drive_file_id", "view_url", "created_at"
  ]
};

function formatValue(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    var y = val.getFullYear();
    if (y < 1900) {
      var h = ("0" + val.getHours()).slice(-2);
      var min = ("0" + val.getMinutes()).slice(-2);
      return h + ":" + min;
    }
    var m = ("0" + (val.getMonth() + 1)).slice(-2);
    var d = ("0" + val.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  return String(val);
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = e.parameter || {};
    var secret = params.secret || "";
    if (secret !== API_SECRET) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    var action = params.action || "";
    var sheetName = params.sheet || "";

    switch (action) {
      case "getRows":
        return jsonResponse(getRows(sheetName));
      case "findRow":
        return jsonResponse(findRow(sheetName, params.column, params.value));
      case "findRows":
        return jsonResponse(findRows(sheetName, params.column, params.value));
      case "findRowByMultiple":
        var conditions = JSON.parse(params.conditions || "{}");
        return jsonResponse(findRowByMultiple(sheetName, conditions));
      case "appendRow":
        var appendData = JSON.parse(e.postData ? e.postData.contents : "{}");
        appendRowData(sheetName, appendData);
        return jsonResponse({ success: true });
      case "updateRow":
        var rowIndex = parseInt(params.rowIndex);
        var updateData = JSON.parse(e.postData ? e.postData.contents : "{}");
        updateRowData(sheetName, rowIndex, updateData);
        return jsonResponse({ success: true });
      case "deleteRow":
        var delRowIndex = parseInt(params.rowIndex);
        deleteRowData(sheetName, delRowIndex);
        return jsonResponse({ success: true });
      case "uploadFile":
        var uploadData = JSON.parse(e.postData ? e.postData.contents : "{}");
        var uploadResult = uploadFileToDrive(uploadData);
        return jsonResponse(uploadResult);
      case "deleteFile":
        deleteFileFromDrive(params.fileId);
        return jsonResponse({ success: true });
      case "initSheets":
        initSheets();
        return jsonResponse({ success: true });
      default:
        return jsonResponse({ error: "Unknown action: " + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var name in SHEET_CONFIGS) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, SHEET_CONFIGS[name].length).setValues([SHEET_CONFIGS[name]]);
    }
  }
  var defaultSheet = ss.getSheetByName("シート1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

function autoFillMissingIds(sheet, data, headers) {
  var idColIndex = -1;
  for (var k = 0; k < headers.length; k++) {
    if (String(headers[k]) === "id") { idColIndex = k; break; }
  }
  if (idColIndex === -1) return;
  for (var i = 1; i < data.length; i++) {
    if (formatValue(data[i][idColIndex]) === "") {
      var newId = Utilities.getUuid();
      data[i][idColIndex] = newId;
      sheet.getRange(i + 1, idColIndex + 1).setValue(newId);
    }
  }
}

function getRows(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  autoFillMissingIds(sheet, data, headers);
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[String(headers[j])] = formatValue(data[i][j]);
    }
    results.push(obj);
  }
  return results;
}

function findRow(sheetName, column, value) {
  var results = findRows(sheetName, column, value);
  return results.length > 0 ? results[0] : null;
}

function findRows(sheetName, column, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  autoFillMissingIds(sheet, data, headers);
  var colIndex = -1;
  for (var k = 0; k < headers.length; k++) {
    if (String(headers[k]) === column) { colIndex = k; break; }
  }
  if (colIndex === -1) return [];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (formatValue(data[i][colIndex]) === String(value)) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[String(headers[j])] = formatValue(data[i][j]);
      }
      results.push({ rowIndex: i + 1, data: obj });
    }
  }
  return results;
}

function findRowByMultiple(sheetName, conditions) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  autoFillMissingIds(sheet, data, headers);
  for (var i = 1; i < data.length; i++) {
    var match = true;
    for (var col in conditions) {
      var idx = -1;
      for (var k = 0; k < headers.length; k++) {
        if (String(headers[k]) === col) { idx = k; break; }
      }
      if (idx === -1 || formatValue(data[i][idx]) !== String(conditions[col])) {
        match = false;
        break;
      }
    }
    if (match) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[String(headers[j])] = formatValue(data[i][j]);
      }
      return { rowIndex: i + 1, data: obj };
    }
  }
  return null;
}

function appendRowData(sheetName, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  var headers = SHEET_CONFIGS[sheetName];
  if (!headers) throw new Error("Unknown sheet: " + sheetName);
  var values = headers.map(function(h) { return data[h] || ""; });
  sheet.appendRow(values);
}

function updateRowData(sheetName, rowIndex, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  var headers = SHEET_CONFIGS[sheetName];
  if (!headers) throw new Error("Unknown sheet: " + sheetName);
  var values = headers.map(function(h) { return data[h] || ""; });
  sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
}

function deleteRowData(sheetName, rowIndex) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  sheet.deleteRow(rowIndex);
}

function getOrCreateImageFolder() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ssFile = DriveApp.getFileById(ss.getId());
  var parents = ssFile.getParents();
  var parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folderName = "勤怠管理_画像";
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function uploadFileToDrive(data) {
  var base64 = data.base64 || "";
  var mimeType = data.mimeType || "image/png";
  var fileName = data.fileName || "image.png";
  if (!base64) throw new Error("base64 data is required");

  var decoded = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  var folder = getOrCreateImageFolder();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    fileId: fileId,
    viewUrl: "https://drive.google.com/uc?export=view&id=" + fileId
  };
}

function deleteFileFromDrive(fileId) {
  if (!fileId) return;
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
  } catch (e) {
    // File may already be deleted
  }
}
