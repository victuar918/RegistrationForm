/**
 * reg_config.js – Registration 설정 파일
 * 로딩 순서: reg_config.js → reg_audio.js → reg_api.js → reg_state.js → reg_rubric.js → reg_steps.js → reg_app.js
 */
"use strict";

var REG_CONFIG = Object.freeze({
  GAS_URL: "https://script.google.com/macros/s/AKfycby_uXWtm4lgpxJTgvQr6En5MiGaBOkVtLZAniqxF5vE0sMR8sSUavex-hQK-KzGicWn/exec",
  HUB_URL: "https://ai-chat-hub-w4ozxil5aq-du.a.run.app",
  AUDIO_BASE: "./mp3/",
  NARRATION: Object.freeze({
    start       : "0001",
    step1       : "0002",
    step2       : "0003",
    step3_1     : "0004",
    step3_2     : "0005",
    step3_3     : "0006",
    step3_4     : "0007",
    step3_5     : "0008",
    step4       : "0009",
    step5       : "0010",
    step6       : "0011",
    step7       : "0012",
    step8       : "0013",
    standby     : "0014",
    start_ev    : "0015",
    ev_confirmed: "0016",
    add_info_1  : "0017",
    add_info_2  : "0018",
    completed   : "0019",
  }),
  INPUT_LIMITS: Object.freeze({
    name           : 50,
    birthLocation  : 100,
    inflectionText : 1000,
    currentState   : 2000,
    watchStrap     : 100,
    addInfo        : 2000,
  }),
  RUBRIC_GRADE: Object.freeze({
    S: 85,
    A: 70,
    B: 50,
  }),
});

var RA = Object.freeze({
  CHECK_ORDER_STATUS   : "checkOrderStatus",
  REGISTER_ACCESS      : "registerAccess",
  SAVE_DRAFT_DATA      : "saveDraftData",
  SAVE_REGISTRATION    : "saveRegistration",
  SAVE_ADD_INFO        : "saveAddInfo",
  CREATE_PRIVATE_ROW   : "createPrivateRow",
  VALIDATE_ARCHIVE_CODE: "validateArchiveCode",
  SAVE_EV_REGISTRATION : "saveEvRegistration",
});
