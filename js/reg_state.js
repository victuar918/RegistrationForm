/**
 * reg_state.js — Registration 폼 상태 관리
 */
"use strict";

var RegState = (function () {
  var _form = {
    registrantName: "", isSameAsOrderer: false, gender: "",
    birthCalendar: "solar", birthDate: "", birthDateRaw: "",
    birthDateMode: "exact", birthTimeMode: "exact",
    birthTime: "", birthTimeRaw: "", birthLocation: "", birthCoords: null,
    inflectionPoints: [], currentState: "",
    watchWorn: "", watchWrist: "", watchStrap: "", wristSize: "",
    email: "", phone: "", consentSMS: false,
    address: "", addressDetail: "",
    consentPrivacy: false, consentDesign: false,
    consentMedical: false, consentCancel: false, consentSMSFull: false,
  };

  var _session = {
    regType: "private", orderNo: "", ordererName: "",
    currentStep: 0, structureCode: "", existingCode: "",
  };

  var _addInfoBuffer = [];

  return {
    getForm    : function ()          { return _form; },
    setForm    : function (k, v)      { _form[k] = v; },
    patchForm  : function (obj)       { Object.assign(_form, obj); },

    addInflection: function (text) {
      _form.inflectionPoints.push({ seq: _form.inflectionPoints.length + 1, text: text });
    },
    updateInflection: function (idx, text) {
      if (_form.inflectionPoints[idx]) _form.inflectionPoints[idx].text = text;
    },
    removeInflection: function (idx) {
      _form.inflectionPoints.splice(idx, 1);
      _form.inflectionPoints.forEach(function (p, i) { p.seq = i + 1; });
    },
    getInflectionCount: function () { return _form.inflectionPoints.length; },

    getSession      : function ()        { return _session; },
    setSession      : function (k, v)    { _session[k] = v; },
    getRegType      : function ()        { return _session.regType; },
    getOrderNo      : function ()        { return _session.orderNo; },
    getStep         : function ()        { return _session.currentStep; },
    setStep         : function (n)       { _session.currentStep = n; },
    getStructureCode: function ()        { return _session.structureCode; },

    initFromUrl: function () {
      var params = new URLSearchParams(location.search);
      var fn = location.pathname.split("/").pop();
      if (fn === "private_reg.html") {
        _session.regType = "private";
      } else if (fn === "evolution_reg.html") {
        _session.regType = "evolution";
        _session.orderNo = params.get("orderNo") || "";
      } else {
        _session.regType = "signature";
        _session.orderNo = params.get("orderNo") || "";
      }
    },

    pushAddInfo       : function (step, data) { _addInfoBuffer.push({ timestamp: new Date().toISOString(), step, data }); },
    getAddInfoBuffer  : function ()           { return _addInfoBuffer.slice(); },
    clearAddInfoBuffer: function ()           { _addInfoBuffer = []; },

    sanitize: function (val) {
      if (typeof val !== "string") return val;
      return val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
    },
    checkLength: function (field, val) {
      var limit = REG_CONFIG.INPUT_LIMITS[field];
      return !limit || String(val || "").length <= limit;
    },
    serialize: function () { return JSON.parse(JSON.stringify(_form)); },
    restoreFromDraft: function (draftJson) {
      try {
        var d = typeof draftJson === "string" ? JSON.parse(draftJson) : draftJson;
        if (d.formData) Object.assign(_form, d.formData);
        if (d.step)     _session.currentStep = d.step;
      } catch (e) { console.warn("[RegState] restore 실패", e); }
    },
  };
})();
