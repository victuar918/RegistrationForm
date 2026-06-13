/**
 * HtmlReg.js – HTML Registration 접수 처리 (독립 실행형 GAS)
 * 2026-06-13
 *
 * ══════════════════════════════════════════════════════════════
 * 배포 방법
 * ══════════════════════════════════════════════════════════════
 * 1. script.google.com → 새 프로젝트 생성 (이름: AsterionHtmlReg)
 * 2. 기본 Code.gs 내용 전부 삭제
 * 3. 이 파일 내용 전체 붙여넣기
 * 4. Ctrl+S 저장
 * 5. 배포 → 새 배포 → 웹앱
 *      다음으로 실행 : 나 (Me)
 *      액세스 권한  : 모든 사용자
 * 6. 배포 URL → reg_config.js 의 GAS_URL 에 붙여넣기
 *
 * ══════════════════════════════════════════════════════════════
 * 보안 구조
 *   HTML Form (GitHub Pages)
 *     ↓ POST (fetch)
 *   이 GAS (doPost)
 *     ↓ openById
 *   StructureRegistration > PvReg 시트   (중간 저장)
 *     ↓ saveRegistration 완료 시
 *   ASTERION Code Archive > Archive 시트  (최종)
 *
 *   ※ 기존 구글폼 / SignReg GAS 에는 영향 없음
 * ══════════════════════════════════════════════════════════════
 *
 * [PvReg 시트 컬럼 정의 (0-based)]
 *   A~R (0~17) : 등록폼 기본 데이터
 *   S(18): OrderNumber   T(19): OrdererName   U(20): Phone4
 *   V(21): LastStep      W(22): DraftData     X(23): RubricStatus
 *   Y(24): IsCompleted   Z(25): StructureCode (동적 추가)
 */

// ── 스프레드시트 ID 설정 ──────────────────────────────────────────────────────
var SIGNREG_CONFIG = {
  ARCHIVE_SS_ID : "1ym1cgr1apEyTlqtJXqrfdnLjoyJTh086CjGycMcUOS8",  // ASTERION Code Archive
  REG_SS_ID     : "1JFR7O9wxzvK4aqw_O2s6ZUSkX8_hw03rAc02l4Km90k",  // StructureRegistration
};

var REG_SHEETS = {
  PV_REG : "PvReg",
};

// ── PvReg 컬럼 인덱스 (0-based) ───────────────────────────────────────────────
var _PVREG_COL = {
  TIMESTAMP      :  0,  NAME           :  1,  GENDER         :  2,
  CALENDAR       :  3,  BIRTH_DATE     :  4,  BIRTH_TIME     :  5,
  LOCATION       :  6,  WRIST_SIZE     :  7,
  CONSENT_DESIGN :  8,  PHONE          :  9,  CONSENT_SMS    : 10,
  WATCH_WORN     : 11,  WATCH_WRIST    : 12,  WATCH_STRAP    : 13,
  INFLECTIONS    : 14,  CURRENT_STATE  : 15,
  CONSENT_CANCEL : 16,  CONSENT_MEDICAL: 17,
  ORDER_NUMBER   : 18,  ORDERER_NAME   : 19,  PHONE4         : 20,
  LAST_STEP      : 21,  DRAFT_DATA     : 22,  RUBRIC_STATUS  : 23,
  IS_COMPLETED   : 24,
  // StructureCode 는 Z(25) 에 동적 추가
};

// ── 공통 유틸 ────────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Archive 시트 객체 반환 */
function _getArchiveSheet() {
  return SpreadsheetApp
    .openById(SIGNREG_CONFIG.ARCHIVE_SS_ID)
    .getSheetByName("Archive");
}

/** PvReg 시트 객체 반환 */
function _pvRegSheet_() {
  return SpreadsheetApp
    .openById(SIGNREG_CONFIG.REG_SS_ID)
    .getSheetByName(REG_SHEETS.PV_REG);
}

/**
 * StructureCode 생성기
 * 형식: {prefix}{5자리 일련번호}-{YYMMDD}  예) L-00001-260613
 * Archive 시트에서 동일 prefix 의 최대 번호 추출 후 +1
 */
function _generateCode(prefix) {
  var archSh  = _getArchiveSheet();
  var lastRow = archSh.getLastRow();
  var maxNum  = 0;
  var pfxKey  = prefix.replace(/-/g, "").toUpperCase();
  if (lastRow >= 2) {
    var codes = archSh.getRange(2, 1, lastRow - 1, 1).getValues();
    codes.forEach(function(row) {
      var code = String(row[0] || "").trim();
      var m    = code.match(/^([A-Za-z]+)-(\d{5})-/);
      if (m && m[1].toUpperCase() === pfxKey) {
        var n = parseInt(m[2], 10);
        if (n > maxNum) maxNum = n;
      }
    });
  }
  var dateStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyMMdd");
  return prefix + String(maxNum + 1).padStart(5, "0") + "-" + dateStr;
}

/** PvReg 에서 orderNo 로 행 탐색 */
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

/** Archive 에 신규 행 추가 (헤더명 기반 set) */
function _addArchiveRow_(code, guestName) {
  var archSh  = _getArchiveSheet();
  var archHdr = archSh.getRange(1, 1, 1, archSh.getLastColumn()).getValues()[0].map(String);
  var newRow  = new Array(archHdr.length).fill("");
  function set(col, val) {
    var ci = archHdr.indexOf(col);
    if (ci >= 0) newRow[ci] = val;
  }
  set("StructureCode", code);
  set("Created Date",  Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"));
  set("Status",        "Tasking");
  set("GuestName",     guestName);
  set("SourceSheet",   "PvReg");
  archSh.appendRow(newRow);
}

// ══════════════════════════════════════════════════════════════════════════════
// createPrivateRow
// 이름 입력 시 PvReg 에 임시 행 생성 → orderNo 반환
// ══════════════════════════════════════════════════════════════════════════════
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
    return { success: false, error: "createPrivateRow 실패: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// saveDraftData
// 각 STEP 완료마다 중간 저장
// ══════════════════════════════════════════════════════════════════════════════
function saveDraftData(payload) {
  var orderNo   = String(payload.orderNo   || "").trim();
  var step      = Number(payload.step      || 0);
  var formStr   = payload.formData         ? JSON.stringify(payload.formData)     : "";
  var rubricStr = payload.rubricStatus     ? JSON.stringify(payload.rubricStatus) : "";
  if (!orderNo) return { success: false, error: "ORDER_NO_REQUIRED" };
  try {
    var found = _findPvRegRow_(orderNo);
    if (!found) return { success: false, error: "NOT_FOUND" };
    var sh  = found.sheet;
    var row = found.rowIndex;
    sh.getRange(row, _PVREG_COL.LAST_STEP     + 1).setValue(step);
    sh.getRange(row, _PVREG_COL.DRAFT_DATA    + 1).setValue(formStr);
    sh.getRange(row, _PVREG_COL.RUBRIC_STATUS + 1).setValue(rubricStr);
    return { success: true };
  } catch(e) {
    return { success: false, error: "saveDraftData 실패: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// saveRegistration
// 최종 제출: 전체 폼 데이터 저장 + L-Code 생성 + Archive 행 추가
// ══════════════════════════════════════════════════════════════════════════════
function saveRegistration(payload) {
  var orderNo = String(payload.orderNo || "").trim();
  var fd      = payload.formData        || {};
  if (!orderNo) return { success: false, error: "ORDER_NO_REQUIRED" };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(e) { return { success: false, error: "Lock 획득 실패" }; }

  try {
    var found = _findPvRegRow_(orderNo);
    if (!found) return { success: false, error: "NOT_FOUND" };
    var sh  = found.sheet;
    var row = found.rowIndex;

    // 변곡점 텍스트 조합
    var inflections = (fd.inflectionPoints || []).map(function(p) {
      return p.seq + ". " + (p.text || "");
    }).join("\n");

    // ── A(1) ~ R(18) 컬럼 저장 ─────────────────────────────────────────────
    sh.getRange(row,  1).setValue(new Date());
    sh.getRange(row,  2).setValue(fd.registrantName || "");
    sh.getRange(row,  3).setValue(
      fd.gender === "male" ? "남자" : fd.gender === "female" ? "여자" : ""
    );
    sh.getRange(row,  4).setValue(fd.birthCalendar  || "solar");
    sh.getRange(row,  5).setValue(fd.birthDate      || fd.birthDateRaw   || "");
    sh.getRange(row,  6).setValue(
      fd.birthTime || fd.birthTimeRaw ||
      (fd.birthTimeMode === "unknown" ? "모름" : "")
    );
    sh.getRange(row,  7).setValue(fd.birthLocation  || "");
    sh.getRange(row,  8).setValue(fd.wristSize ? fd.wristSize + "cm" : "");
    sh.getRange(row,  9).setValue(fd.consentDesign  ? "동의합니다." : "");
    sh.getRange(row, 10).setValue(fd.phone           || "");
    sh.getRange(row, 11).setValue(fd.consentSMSFull  ? "동의합니다." : "미동의");
    sh.getRange(row, 12).setValue(fd.watchWorn       || "");
    sh.getRange(row, 13).setValue(fd.watchWrist      || "");
    sh.getRange(row, 14).setValue(fd.watchStrap      || "");
    sh.getRange(row, 15).setValue(inflections);
    sh.getRange(row, 16).setValue(fd.currentState    || "");
    sh.getRange(row, 17).setValue(
      fd.consentCancel ? "취소불가 안내를 충분히 이해하고 동의합니다." : ""
    );
    sh.getRange(row, 18).setValue(fd.consentMedical  ? "동의합니다." : "");

    // ── StructureCode (L-) 생성 ──────────────────────────────────────────────
    var code = _generateCode("L-");

    // PvReg StructureCode 컬럼 (Z열, 동적 추가)
    var hRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var scCI = hRow.indexOf("StructureCode");
    if (scCI < 0) {
      scCI = hRow.length;
      sh.getRange(1, scCI + 1).setValue("StructureCode");
    }
    sh.getRange(row, scCI + 1).setValue(code);

    // Archive 에 행 추가 (HTML폼 → Archive 사이에 GAS 레이어)
    _addArchiveRow_(code, fd.registrantName || "");

    // IsCompleted = true
    sh.getRange(row, _PVREG_COL.IS_COMPLETED + 1).setValue(true);

    Logger.log("[saveRegistration] 완료: " + code);
    return { success: true, structureCode: code };

  } catch(e) {
    return { success: false, error: "saveRegistration 실패: " + e.message };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// checkOrderStatus
// 접속 시 이어하기 상태 확인
// ══════════════════════════════════════════════════════════════════════════════
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
      return {
        state         : "COMPLETED",
        structureCode : sci >= 0 ? String(rd[sci] || "").trim() : "",
      };
    }

    var draftRaw = String(rd[_PVREG_COL.DRAFT_DATA] || "").trim();
    if (draftRaw) {
      try {
        var rbRaw = String(rd[_PVREG_COL.RUBRIC_STATUS] || "").trim();
        return {
          state        : "IN_PROGRESS",
          draftData    : { formData: JSON.parse(draftRaw), step: rd[_PVREG_COL.LAST_STEP] || 1 },
          rubricStatus : rbRaw ? JSON.parse(rbRaw) : null,
        };
      } catch(e2) {}
    }
    return { state: "PENDING" };

  } catch(e) {
    return { state: "ERROR", error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// doPost – HTML Registration 전용 Web App 엔트리포인트
// ══════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      return jsonResponse({ success: false, error: "POST body 없음" });

    var payload;
    try { payload = JSON.parse(e.postData.contents); }
    catch(err) {
      return jsonResponse({ success: false, error: "JSON 파싱 실패: " + err.message });
    }

    if (!payload.action)
      return jsonResponse({ success: false, error: "action 없음" });

    switch (payload.action) {
      case "createPrivateRow" : return jsonResponse(createPrivateRow(payload));
      case "saveDraftData"    : return jsonResponse(saveDraftData(payload));
      case "saveRegistration" : return jsonResponse(saveRegistration(payload));
      case "checkOrderStatus" : return jsonResponse(checkOrderStatus(payload));
      default:
        return jsonResponse({ success: false, error: "알 수 없는 action: " + payload.action });
    }
  } catch(err) {
    return jsonResponse({ success: false, error: "doPost 실패: " + err.message });
  }
}
