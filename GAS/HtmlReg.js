/**
 * HtmlReg.js — HTML Registration 전용 엔드포인트
 * ASTERION SignReg GAS에 추가 (기존 Code.js에는 doPost 없음)
 * 2026-06-12
 *
 * ═══════════════════════════════════════════════
 * GAS 에디터에서 적용 방법
 * ═══════════════════════════════════════════════
 * 1. script.google.com → ASTERION SignReg GAS 열기
 * 2. 좌측 파일 목록 [+] → "스크립트" 선택
 * 3. 파일 이름: HtmlReg (확장자 없이)
 * 4. 이 파일 전체 내용 붙여넣기
 * 5. Ctrl+S 저장
 * 6. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자로 실행: 나(victuar918@gmail.com)
 *    - 액세스 권한: 모든 사용자(익명 포함)
 * 7. 배포 URL을 reg_config.js의 GAS_URL에 입력
 * ═══════════════════════════════════════════════
 *
 * [사용 상수/함수 — Code.js에서 상속]
 *   SIGNREG_CONFIG.ARCHIVE_SS_ID  Archive SS ID
 *   REG_SHEETS.PV_REG             "PvReg"
 *   _generateCode(prefix, sheet)  StructureCode 채번
 *   _getArchiveSheet()            Archive 시트 접근
 *
 * [PvReg 시트 컬럼 구조]
 *   A~R(0~17) : 기존 구글폼 컬럼 ← 절대 순서 변경 금지
 *   S(18): OrderNumber   T(19): OrdererName   U(20): Phone4
 *   V(21): LastStep      W(22): DraftData     X(23): RubricStatus
 *   Y(24): IsCompleted
 */

// ── 헬퍼 ──────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── PvReg 컬럼 인덱스 (0-based) ───────────────────────────────
var _PVREG_COL = {
  TIMESTAMP    : 0,  NAME         : 1,  GENDER      : 2,
  CALENDAR     : 3,  BIRTH_DATE   : 4,  BIRTH_TIME  : 5,
  LOCATION     : 6,  WRIST_SIZE   : 7,
  CONSENT_DESIGN: 8, PHONE        : 9,  CONSENT_SMS : 10,
  WATCH_WORN   : 11, WATCH_WRIST  : 12, WATCH_STRAP : 13,
  INFLECTIONS  : 14, CURRENT_STATE: 15,
  CONSENT_CANCEL: 16, CONSENT_MEDICAL: 17,
  ORDER_NUMBER : 18, // S
  ORDERER_NAME : 19, // T
  PHONE4       : 20, // U
  LAST_STEP    : 21, // V
  DRAFT_DATA   : 22, // W
  RUBRIC_STATUS: 23, // X
  IS_COMPLETED : 24, // Y
};

// ── 내부 헬퍼 ──────────────────────────────────────────────────
function _pvRegSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REG_SHEETS.PV_REG);
}

function _findPvRegRow_(orderNo) {
  var sh = _pvRegSheet_();
  if (!sh || sh.getLastRow() < 2) return null;
  var data   = sh.getDataRange().getValues();
  var target = String(orderNo).trim();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][_PVREG_COL.ORDER_NUMBER] || "").trim() === target) {
      return { sheet: sh, rowIndex: i + 1, rowData: data[i] };
    }
  }
  return null;
}

function _addArchiveRow_(code, guestName) {
  var archSh  = _getArchiveSheet();
  var archHdr = archSh.getRange(1, 1, 1, archSh.getLastColumn()).getValues()[0].map(String);
  var newRow  = new Array(archHdr.length).fill("");
  function set(col, val) { var ci = archHdr.indexOf(col); if (ci >= 0) newRow[ci] = val; }
  set("StructureCode", code);
  set("Created Date",  Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"));
  set("Status",        "Tasking");
  set("GuestName",     guestName);
  set("SourceSheet",   "PvReg");
  archSh.appendRow(newRow);
}

// ══════════════════════════════════════════════════════════════
// createPrivateRow
// ── 진입 시 PvReg에 임시 행 생성 → orderNo 반환
// ══════════════════════════════════════════════════════════════
function createPrivateRow(payload) {
  var regName = String(payload.regName || "").trim();
  if (!regName) return { success: false, error: "NAME_REQUIRED" };
  try {
    var sh      = _pvRegSheet_();
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var now     = new Date();
    var tempNo  = "PV_" + now.getTime();
    var row     = new Array(headers.length).fill("");
    row[_PVREG_COL.TIMESTAMP]    = now;
    row[_PVREG_COL.ORDER_NUMBER] = tempNo;
    row[_PVREG_COL.ORDERER_NAME] = regName;
    row[_PVREG_COL.IS_COMPLETED] = false;
    sh.appendRow(row);
    Logger.log("[createPrivateRow] " + tempNo + " / " + regName);
    return { success: true, orderNo: tempNo };
  } catch(e) {
    return { success: false, error: "createPrivateRow 오류: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// saveDraftData
// ── 각 STEP 완료 시 임시 저장
// ══════════════════════════════════════════════════════════════
function saveDraftData(payload) {
  var orderNo   = String(payload.orderNo  || "").trim();
  var step      = Number(payload.step     || 0);
  var formStr   = payload.formData     ? JSON.stringify(payload.formData)     : "";
  var rubricStr = payload.rubricStatus ? JSON.stringify(payload.rubricStatus) : "";
  if (!orderNo) return { success: false, error: "ORDER_NO_REQUIRED" };
  try {
    var found = _findPvRegRow_(orderNo);
    if (!found) return { success: false, error: "NOT_FOUND" };
    var sh  = found.sheet, row = found.rowIndex;
    sh.getRange(row, _PVREG_COL.LAST_STEP     + 1).setValue(step);
    sh.getRange(row, _PVREG_COL.DRAFT_DATA    + 1).setValue(formStr);
    sh.getRange(row, _PVREG_COL.RUBRIC_STATUS + 1).setValue(rubricStr);
    return { success: true };
  } catch(e) {
    return { success: false, error: "saveDraftData 오류: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// saveRegistration
// ── 최종 제출: 폼 데이터 기록 + L-코드 채번 + Archive 등록
// ══════════════════════════════════════════════════════════════
function saveRegistration(payload) {
  var orderNo  = String(payload.orderNo || "").trim();
  var fd       = payload.formData       || {};
  if (!orderNo) return { success: false, error: "ORDER_NO_REQUIRED" };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e) { return { success: false, error: "Lock 오류" }; }
  try {
    var found = _findPvRegRow_(orderNo);
    if (!found) return { success: false, error: "NOT_FOUND" };
    var sh = found.sheet, row = found.rowIndex;

    // 변곡점 텍스트 조합
    var inflections = (fd.inflectionPoints || []).map(function(p) {
      return p.seq + ". " + (p.text || "");
    }).join("\n");

    // ── A(1)~R(18) 폼 데이터 기록 ───────────────────────────
    // 기존 구글폼 제출과 동일한 컬럼 순서·양식을 유지
    sh.getRange(row,  1).setValue(new Date());
    sh.getRange(row,  2).setValue(fd.registrantName || "");
    sh.getRange(row,  3).setValue(fd.gender === "male" ? "남성" : fd.gender === "female" ? "여성" : "");
    sh.getRange(row,  4).setValue(fd.birthCalendar || "solar");
    sh.getRange(row,  5).setValue(fd.birthDate    || fd.birthDateRaw  || "");
    sh.getRange(row,  6).setValue(fd.birthTime    || fd.birthTimeRaw  || (fd.birthTimeMode === "unknown" ? "모름" : ""));
    sh.getRange(row,  7).setValue(fd.birthLocation || "");
    sh.getRange(row,  8).setValue(fd.wristSize ? fd.wristSize + "cm" : "");
    sh.getRange(row,  9).setValue(fd.consentDesign  ? "동의합니다." : "");
    sh.getRange(row, 10).setValue(fd.phone || "");
    sh.getRange(row, 11).setValue(fd.consentSMSFull ? "동의합니다." : "미동의");
    sh.getRange(row, 12).setValue(fd.watchWorn  || "");
    sh.getRange(row, 13).setValue(fd.watchWrist || "");
    sh.getRange(row, 14).setValue(fd.watchStrap || "");
    sh.getRange(row, 15).setValue(inflections);
    sh.getRange(row, 16).setValue(fd.currentState || "");
    sh.getRange(row, 17).setValue(fd.consentCancel  ? "위 내용을 정확히 인지하고 동의합니다." : "");
    sh.getRange(row, 18).setValue(fd.consentMedical ? "동의합니다." : "");

    // ── StructureCode 채번 ──────────────────────────────────
    var code = _generateCode("L-", REG_SHEETS.PV_REG);

    // ── PvReg StructureCode 컬럼 기록 (없으면 Z에 자동 추가) ─
    var hRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var scCI = hRow.indexOf("StructureCode");
    if (scCI < 0) { scCI = hRow.length; sh.getRange(1, scCI + 1).setValue("StructureCode"); }
    sh.getRange(row, scCI + 1).setValue(code);

    // ── Archive 최소 행 추가 ────────────────────────────────
    _addArchiveRow_(code, fd.registrantName || "");

    // ── IsCompleted = true ──────────────────────────────────
    sh.getRange(row, _PVREG_COL.IS_COMPLETED + 1).setValue(true);

    Logger.log("[saveRegistration] 완료: " + code);
    return { success: true, structureCode: code };
  } catch(e) {
    return { success: false, error: "saveRegistration 오류: " + e.message };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════
// checkOrderStatus
// ── 이어서 진행 지원 (Signature/Evolution 용, Private는 미사용)
// ══════════════════════════════════════════════════════════════
function checkOrderStatus(payload) {
  var orderNo = String(payload.orderNo || "").trim();
  if (!orderNo) return { state: "NOT_FOUND" };
  try {
    var found = _findPvRegRow_(orderNo);
    if (!found) return { state: "NOT_FOUND" };
    var rd = found.rowData;
    if (rd[_PVREG_COL.IS_COMPLETED] === true) {
      var sh  = found.sheet;
      var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      var sci = hdr.indexOf("StructureCode");
      return { state: "COMPLETED", structureCode: sci >= 0 ? String(rd[sci] || "").trim() : "" };
    }
    var draftRaw = String(rd[_PVREG_COL.DRAFT_DATA] || "").trim();
    if (draftRaw) {
      try {
        var rbRaw = String(rd[_PVREG_COL.RUBRIC_STATUS] || "").trim();
        return {
          state        : "IN_PROGRESS",
          draftData    : { formData: JSON.parse(draftRaw), step: rd[_PVREG_COL.LAST_STEP] || 1 },
          rubricStatus : rbRaw ? JSON.parse(rbRaw) : null
        };
      } catch(e2) {}
    }
    return { state: "PENDING" };
  } catch(e) {
    return { state: "ERROR", error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// doPost
// ── SignReg GAS 최초 doPost 정의 (Code.js에는 없었음)
// ══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      return jsonResponse({ success: false, error: "POST body 없음" });
    var payload;
    try { payload = JSON.parse(e.postData.contents); }
    catch(err) { return jsonResponse({ success: false, error: "JSON 파싱 오류: " + err.message }); }
    if (!payload.action)
      return jsonResponse({ success: false, error: "action 없음" });

    switch(payload.action) {
      case "createPrivateRow":  return jsonResponse(createPrivateRow(payload));
      case "saveDraftData":     return jsonResponse(saveDraftData(payload));
      case "saveRegistration":  return jsonResponse(saveRegistration(payload));
      case "checkOrderStatus":  return jsonResponse(checkOrderStatus(payload));
      default:
        return jsonResponse({ success: false, error: "알 수 없는 action: " + payload.action });
    }
  } catch(err) {
    return jsonResponse({ success: false, error: "doPost 오류: " + err.message });
  }
}
