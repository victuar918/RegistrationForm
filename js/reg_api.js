/**
 * reg_api.js — Registration GAS / Hub 통신 레이어
 */
"use strict";

var RegApi = (function () {
  function _gas(action, payload) {
    var body = Object.assign({ action: action }, payload || {});
    return fetch(REG_CONFIG.GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); })
      .catch(function (e) { console.error("[RegApi GAS]", action, e); return { success: false, error: "NETWORK_ERROR" }; });
  }

  function _hub(path, payload) {
    return fetch(REG_CONFIG.HUB_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    }).then(function (r) { return r.json(); })
      .catch(function (e) { console.error("[RegApi Hub]", path, e); return { error: "NETWORK_ERROR" }; });
  }

  return {
    checkOrderStatus   : function (orderNo) { return _gas(RA.CHECK_ORDER_STATUS, { orderNo }); },
    createPrivateRow   : function (regName) { return _gas(RA.CREATE_PRIVATE_ROW, { regName }); },
    registerAccess     : function (orderNo, ordererName) { return _gas(RA.REGISTER_ACCESS, { orderNo, ordererName }); },
    saveDraftData      : function (orderNo, step, formData, rubricStatus) {
      return _gas(RA.SAVE_DRAFT_DATA, { orderNo, step, formData, rubricStatus: rubricStatus || null });
    },
    saveRegistration   : function (orderNo, formData) { return _gas(RA.SAVE_REGISTRATION, { orderNo, formData }); },
    saveAddInfo        : function (structureCode, addInfo, addInfoType) {
      return _gas(RA.SAVE_ADD_INFO, { structureCode, addInfo, addInfoType: addInfoType || "REQUEST" });
    },
    validateArchiveCode: function (inputCode) { return _gas(RA.VALIDATE_ARCHIVE_CODE, { inputCode }); },
    saveEvRegistration : function (orderNo, formData, existingStructureCode) {
      return _gas(RA.SAVE_EV_REGISTRATION, { orderNo, formData, existingStructureCode });
    },
    verifyOrder        : function (orderNo, inputName, inputPhone4) {
      return _hub("/api/naver/verify-order", { orderNo, inputName, inputPhone4: inputPhone4 || "" });
    },
    runRubric          : function (orderNo, phase, formData, previousResult) {
      return _hub("/api/reg/rubric", { orderNo, phase, formData, previousResult: previousResult || null });
    },
    processAddInfo     : function (structureCode, addInfoText, existingData) {
      return _hub("/api/reg/addinfo", { structureCode, addInfoText, existingData: existingData || {} });
    },
  };
})();
