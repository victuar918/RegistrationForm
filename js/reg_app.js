/**
 * reg_app.js — Registration 메인 앱 로직
 * Private / Signature / Evolution 분기 처리 포함
 */
"use strict";

var RegApp = (function () {

  var _inflectionSeq = 1;
  var _fromEdit      = false;
  var _standbyTimer  = null;

  // ── 페이지 초기화 ──────────────────────────────
  async function _init() {
    RegState.initFromUrl();
    RegSteps.init("slide-container");
    _initMuteBtn();
    _initGaugePanelVisibility();

    var regType = RegState.getRegType();
    var orderNo = RegState.getSession().orderNo;

    if (regType === "private") {
      RegSteps.renderEntry();
      _bindEntry();
      return;
    }

    if (!orderNo) {
      RegSteps.renderInvalid("주문번호가 확인되지 않습니다.");
      return;
    }

    showLoading("확인 중...");
    var status = await RegApi.checkOrderStatus(orderNo);
    hideLoading();

    switch (status.state) {
      case "NOT_FOUND":
        RegSteps.renderInvalid("등록되지 않은 주문번호입니다.");
        break;
      case "COMPLETED":
        RegState.setSession("structureCode", status.structureCode || "");
        RegSteps.renderAddInfo(status.structureCode || "");
        AsterionAudio.start();
        AsterionAudio.playNarration("completed");
        _bindAddInfo();
        break;
      case "IN_PROGRESS":
        RegState.restoreFromDraft(status.draftData);
        RegRubric.restore(status.rubricStatus);
        RegSteps.renderEntry();
        _bindEntryResume();
        break;
      case "PENDING":
      default:
        RegSteps.renderEntry();
        _bindEntry();
    }
  }

  // ── 진입 화면 바인딩 ────────────────────────────
  function _bindEntry() {
    var btn = document.getElementById("btn-entry");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      var nameEl = document.getElementById("entry-name");
      var name   = (nameEl && nameEl.value.trim()) || "";
      var errEl  = document.getElementById("entry-error");

      if (!name) { if (errEl) errEl.textContent = "성함을 입력해주세요."; return; }

      var regType = RegState.getRegType();

      if (regType === "private") {
        btn.disabled = true;
        showLoading("접수를 시작합니다...");
        var row = await RegApi.createPrivateRow(name);
        hideLoading();
        btn.disabled = false;
        if (!row.success) { if (errEl) errEl.textContent = "오류가 발생했습니다. 다시 시도해주세요."; return; }
        RegState.setSession("ordererName", name);
        RegState.setSession("orderNo", row.orderNo || "PV_" + Date.now());
        await AsterionAudio.start();
        await AsterionAudio.playNarration("start");
        _goStep(1);
        return;
      }

      // Signature / Evolution
      var phone4El = document.getElementById("entry-phone4");
      var phone4   = (phone4El && phone4El.value.trim()) || "";
      if (!phone4 || !/^\d{4}$/.test(phone4)) {
        var ph4Err = document.getElementById("entry-phone-error");
        if (ph4Err) ph4Err.textContent = "전화번호 뒤 4자리를 입력해주세요.";
        return;
      }
      btn.disabled = true;
      showLoading("확인 중...");
      var result = await RegApi.verifyOrder(RegState.getOrderNo(), name, phone4);
      hideLoading();
      btn.disabled = false;

      if (!result.verified) {
        var msgs = {
          NAME_OR_PHONE_MISMATCH: "입력하신 정보를 다시 확인해 주세요.",
          GIFT_NOT_ACCEPTED: "선물 수락(배송지 입력)이 확인되지 않습니다.\n네이버 쇼핑함에서 선물 수락을 먼저 완료해 주세요.",
          ORDER_NOT_FOUND: "Registration은 결제 후 진행이 가능합니다.",
        };
        if (errEl) errEl.textContent = msgs[result.errorCode] || "확인 중 오류가 발생했습니다.";
        return;
      }

      await RegApi.registerAccess(RegState.getOrderNo(), name);
      RegState.setSession("ordererName", name);
      await AsterionAudio.start();
      await AsterionAudio.playNarration("start");
      _goStep(1);
    });
  }

  // ── 이어서 진행 바인딩 ─────────────────────────
  function _bindEntryResume() {
    var btn = document.getElementById("btn-entry") || document.getElementById("btn-resume");
    if (!btn) return;
    btn.textContent = "이어서 진행하기";
    btn.addEventListener("click", async function () {
      await AsterionAudio.start();
      await AsterionAudio.playNarration("start");
      RegRubric.restoreGauge();
      _goStep(RegState.getStep() || 1);
    });
  }

  // ── STEP 네비게이션 ────────────────────────────
  function _goStep(step, isEdit) {
    _fromEdit = !!isEdit;
    _inflectionSeq = Math.max(1, RegState.getInflectionCount() + 1);
    RegState.setStep(step);
    _updateGaugePanel(step);

    switch (step) {
      case 1: RegSteps.renderStep1(RegState.getSession().ordererName); AsterionAudio.playNarration("step1"); _bindStep1(); break;
      case 2: RegSteps.renderStep2(); AsterionAudio.playNarration("step2"); _bindStep2(); break;
      case 3:
        _inflectionSeq = Math.min(_inflectionSeq, 5);
        RegSteps.renderStep3(_inflectionSeq);
        AsterionAudio.playNarration(RegApp._currentNarKey || "step3_1");
        _bindStep3();
        break;
      case 4: RegSteps.renderStep4(); AsterionAudio.playNarration("step4"); _bindStep4(); break;
      case 5: RegSteps.renderStep5(); AsterionAudio.playNarration("step5"); _bindStep5(); break;
      case 6: RegSteps.renderStep6(); AsterionAudio.playNarration("step6"); _bindStep6(); break;
      case 7: RegSteps.renderStep7(); AsterionAudio.playNarration("step7"); _bindStep7(); break;
      case 8: RegSteps.renderStep8(); AsterionAudio.playNarration("step8"); _bindStep8(); break;
    }
  }

  // ── STEP 1 ─────────────────────────────────────
  function _bindStep1() {
    var btn = document.getElementById("btn-s1");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var name   = (document.getElementById("s1-name") || {}).value || "";
      var same   = document.getElementById("s1-same");
      var gender = (document.querySelector('input[name="s1-gender"]:checked') || {}).value || "";
      var errEl  = document.getElementById("s1-error");
      if (!name.trim())   { if (errEl) errEl.textContent = "성함을 입력해주세요."; return; }
      if (!gender) { if (errEl) errEl.textContent = "성별을 선택해주세요."; return; }
      if (errEl) errEl.textContent = "";
      RegState.patchForm({ registrantName: name.trim(), isSameAsOrderer: !!(same && same.checked), gender });
      _saveDraft(1);
      _goStep(2);
    });
  }

  // ── STEP 2 ─────────────────────────────────────
  function _bindStep2() {
    var btn = document.getElementById("btn-s2");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var errEl = document.getElementById("s2-error");
      var dateMode = (document.querySelector("#s2-date-tabs .mode-tab.active") || {}).dataset?.mode || "exact";
      var birthDate = "", birthDateRaw = "";
      var calEl = document.querySelector('input[name="s2-calendar"]:checked');
      if (dateMode === "exact") {
        birthDate = (document.getElementById("s2-date") || {}).value || "";
        if (!birthDate) { if (errEl) errEl.textContent = "생년월일을 입력해주세요."; return; }
      } else {
        var rawId = dateMode === "approximate" ? "s2-date-raw" : "s2-date-raw2";
        birthDateRaw = (document.getElementById(rawId) || {}).value || "";
        if (!birthDateRaw) { if (errEl) errEl.textContent = "생년월일을 입력해주세요."; return; }
      }
      var timeMode = (document.querySelector("#s2-time-tabs .mode-tab.active") || {}).dataset?.mode || "exact";
      var birthTime = "", birthTimeRaw = "";
      if (timeMode === "exact") {
        birthTime = (document.getElementById("s2-time") || {}).value || "";
      } else if (timeMode !== "unknown") {
        var rawTimeId = timeMode === "approximate" ? "s2-time-raw" : "s2-time-raw2";
        birthTimeRaw = (document.getElementById(rawTimeId) || {}).value || "";
      }
      var location = (document.getElementById("s2-location") || {}).value || "";
      if (!location.trim()) { if (errEl) errEl.textContent = "출생 지역을 입력해주세요."; return; }
      if (errEl) errEl.textContent = "";
      RegState.patchForm({
        birthCalendar: calEl ? calEl.value : "solar",
        birthDateMode: dateMode, birthDate, birthDateRaw,
        birthTimeMode: timeMode, birthTime, birthTimeRaw,
        birthLocation: location.trim(),
      });
      _saveDraft(2);
      RegRubric.run(1, RegState.getForm(), RegState.getRegType(), null);
      _goStep(3);
    });
  }

  // ── STEP 3 ─────────────────────────────────────
  function _bindStep3() {
    var seq = _inflectionSeq;

    function _validateAndSave() {
      var text  = ((document.getElementById("s3-text") || {}).value || "").trim();
      var errEl = document.getElementById("s3-error");
      var nudge = document.getElementById("s3-nudge");
      if (!text) { if (errEl) errEl.textContent = "내용을 입력해주세요."; return false; }
      if (errEl) errEl.textContent = "";
      if (nudge) nudge.classList.toggle("hidden", text.length >= 10);
      if (seq <= RegState.getInflectionCount()) RegState.updateInflection(seq - 1, text);
      else RegState.addInflection(text);
      return true;
    }

    var btnNext = document.getElementById("btn-s3-next");
    if (btnNext) btnNext.addEventListener("click", function () {
      if (!_validateAndSave()) return;
      _saveDraft(3);
      if (seq === 2) RegRubric.run(2, RegState.getForm(), RegState.getRegType(), null);
      _inflectionSeq = seq + 1;
      RegApp._currentNarKey = ["step3_1","step3_2","step3_3","step3_4","step3_5"][seq] || "step3_2";
      RegSteps.renderStep3(_inflectionSeq);
      AsterionAudio.playNarration(RegApp._currentNarKey);
      _bindStep3();
    });

    var btnDone = document.getElementById("btn-s3-done");
    if (btnDone) btnDone.addEventListener("click", function () {
      if (!_validateAndSave()) return;
      _saveDraft(3);
      _goStep(4);
    });

    var btnAdd = document.getElementById("btn-s3-add");
    if (btnAdd) btnAdd.addEventListener("click", function () {
      if (!_validateAndSave()) return;
      _saveDraft(3);
      _inflectionSeq = seq + 1;
      RegApp._currentNarKey = "step3_2";
      RegSteps.renderStep3(_inflectionSeq);
      AsterionAudio.playNarration("step3_2");
      _bindStep3();
    });
  }

  // ── STEP 4 ─────────────────────────────────────
  function _bindStep4() {
    var btn = document.getElementById("btn-s4");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text  = ((document.getElementById("s4-text") || {}).value || "").trim();
      var errEl = document.getElementById("s4-error");
      if (!text) { if (errEl) errEl.textContent = "내용을 입력해주세요."; return; }
      if (errEl) errEl.textContent = "";
      RegState.setForm("currentState", text);
      _saveDraft(4);
      RegRubric.run(3, RegState.getForm(), RegState.getRegType(), function (status) {
        if (!status.converged && status.additionalQuestions && status.additionalQuestions.length) {
          setTimeout(function () {
            if (RegState.getStep() >= 5) {
              RegSteps.renderAdditionalQuestions(status.additionalQuestions);
              _bindAdditionalQuestions(status.additionalQuestions);
            }
          }, 500);
        }
      });
      _goStep(5);
    });
  }

  // ── STEP 5 ─────────────────────────────────────
  function _bindStep5() {
    var btn = document.getElementById("btn-s5");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var watchEl = document.querySelector('input[name="s5-watch"]:checked');
      var errEl   = document.getElementById("s5-error");
      if (!watchEl) { if (errEl) errEl.textContent = "손목시계 착용 여부를 선택해주세요."; return; }
      var watchWorn = watchEl.value;
      var watchWrist = watchWorn !== "none" ? ((document.querySelector('input[name="s5-wrist"]:checked') || {}).value || "") : "";
      var watchStrap = watchWorn !== "none" ? ((document.getElementById("s5-strap") || {}).value || "") : "";
      var wristSize  = (document.getElementById("s5-wrist-size") || {}).value || "";
      if (!wristSize) { if (errEl) errEl.textContent = "손목 둘레를 입력해주세요."; return; }
      if (errEl) errEl.textContent = "";
      RegState.patchForm({ watchWorn, watchWrist, watchStrap, wristSize });
      _saveDraft(5);
      _goStep(6);
    });
  }

  // ── STEP 6 ─────────────────────────────────────
  function _bindStep6() {
    var btn = document.getElementById("btn-s6");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var email   = (document.getElementById("s6-email")          || {}).value || "";
      var phone   = (document.getElementById("s6-phone")          || {}).value || "";
      var smsEl   = document.getElementById("s6-sms");
      var address = (document.getElementById("s6-address")        || {}).value || "";
      var detail  = (document.getElementById("s6-address-detail") || {}).value || "";
      var errEl   = document.getElementById("s6-error");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if (errEl) errEl.textContent = "올바른 이메일을 입력해주세요."; return; }
      if (!phone || !/^\d{10,11}$/.test(phone))                 { if (errEl) errEl.textContent = "올바른 전화번호를 입력해주세요."; return; }
      if (!address)                                              { if (errEl) errEl.textContent = "배송지를 입력해주세요."; return; }
      if (errEl) errEl.textContent = "";
      RegState.patchForm({ email, phone, consentSMS: !!(smsEl && smsEl.checked), address, addressDetail: detail });
      _saveDraft(6);
      _goStep(7);
    });
  }

  // ── STEP 7 ─────────────────────────────────────
  function _bindStep7() {
    var btn = document.getElementById("btn-s7");
    if (!btn) return;
    btn.addEventListener("click", function () {
      RegState.patchForm({
        consentPrivacy: !!((document.getElementById("c-privacy") || {}).checked),
        consentDesign : !!((document.getElementById("c-design")  || {}).checked),
        consentMedical: !!((document.getElementById("c-medical") || {}).checked),
        consentCancel : !!((document.getElementById("c-cancel")  || {}).checked),
        consentSMSFull: !!((document.getElementById("c-sms")     || {}).checked),
      });
      _saveDraft(7);
      _goStep(8);
    });
  }

  // ── STEP 8 ─────────────────────────────────────
  function _bindStep8() {
    var btn = document.getElementById("btn-submit");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      showLoading("제출 중...");
      var orderNo  = RegState.getOrderNo();
      var formData = RegState.serialize();
      var regType  = RegState.getRegType();
      var res = regType === "evolution"
        ? await RegApi.saveEvRegistration(orderNo, formData, RegState.getSession().existingCode)
        : await RegApi.saveRegistration(orderNo, formData);
      hideLoading();
      if (!res || !res.success) {
        btn.disabled = false;
        var errEl = document.getElementById("s8-error");
        if (errEl) errEl.textContent = "제출 중 오류가 발생했습니다. 다시 시도해주세요.";
        return;
      }
      RegState.setSession("structureCode", res.structureCode || "");
      AsterionAudio.playNarration("completed");
      var grade = RegRubric.getGrade();
      if (grade === "S" || regType === "private" || regType === "evolution") {
        RegSteps.renderComplete(res.structureCode);
      } else {
        RegSteps.renderStandby("");
        _waitForRubric();
      }
    });
  }

  // ── 추가질문 바인딩 ────────────────────────────
  function _bindAdditionalQuestions(questions) {
    var btn = document.getElementById("btn-aq");
    if (!btn) return;
    btn.addEventListener("click", function () {
      questions.forEach(function (q) {
        var ta = document.getElementById("aq-" + q.id);
        var ans = ta ? ta.value.trim() : "";
        if (ans) RegState.addInflection("[추가질문] " + ans);
      });
      _saveDraft(RegState.getStep());
      _goStep(5);
    });
  }

  // ── AddInfo 바인딩 ─────────────────────────────
  function _bindAddInfo() {
    var btn = document.getElementById("btn-addinfo");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      var text  = (document.getElementById("addinfo-text") || {}).value || "";
      var errEl = document.getElementById("addinfo-error");
      if (!text.trim()) { if (errEl) errEl.textContent = "내용을 입력해주세요."; return; }
      if (errEl) errEl.textContent = "";
      btn.disabled = true;
      showLoading("처리 중...");
      var sc  = RegState.getStructureCode();
      var res = await RegApi.processAddInfo(sc, text, {});
      hideLoading();
      btn.disabled = false;
      if (res.requiresStandby) {
        RegSteps.renderStandby("");
        AsterionAudio.playNarration("add_info_1");
        _waitForRubric();
        return;
      }
      if (errEl) { errEl.style.color = "rgba(100,220,130,.9)"; errEl.textContent = res.feedback || "접수되었습니다."; }
      var taEl = document.getElementById("addinfo-text");
      if (taEl) taEl.value = "";
      await RegApi.saveAddInfo(sc, text, res.type || "REQUEST");
    });
  }

  // ── 대기 화면 루브릭 완료 폴링 ────────────────
  function _waitForRubric() {
    _standbyTimer = setInterval(function () {
      if (RegRubric.isConverged()) {
        clearInterval(_standbyTimer);
        RegSteps.renderComplete(RegState.getStructureCode());
        AsterionAudio.playNarration("completed");
      }
    }, 3000);
  }

  // ── 중간 저장 ──────────────────────────────────
  async function _saveDraft(step) {
    var orderNo = RegState.getOrderNo();
    if (!orderNo) return;
    RegApi.saveDraftData(orderNo, step, RegState.serialize(), RegRubric.serialize())
      .catch(function (e) { console.warn("[Draft]", e); });
  }

  // ── 게이지 패널 ────────────────────────────────
  function _initGaugePanelVisibility() {
    var panel = document.getElementById("gauge-panel");
    if (panel) panel.style.display = "none";
  }

  function _updateGaugePanel(step) {
    var panel = document.getElementById("gauge-panel");
    if (panel) panel.style.display = step >= 2 ? "" : "none";
  }

  // ── 음소거 버튼 ────────────────────────────────
  function _initMuteBtn() {
    var btn = document.getElementById("mute-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var muted = AsterionAudio.toggleMute();
      btn.classList.toggle("muted", muted);
      btn.setAttribute("aria-label", muted ? "음소거 해제" : "음소거");
    });
  }

  // ── 모바일 키보드 처리 ─────────────────────────
  function _initKeyboardHandler() {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener("resize", function () {
      var kbH  = window.innerHeight - window.visualViewport.height;
      var open = kbH > 100;
      var slide = document.querySelector(".slide");
      if (!slide) return;
      var narr = slide.querySelector(".step-sub, .step-desc");
      if (narr) narr.style.opacity = open ? "0" : "1";
      var nextBtn = slide.querySelector(".btn-next");
      if (nextBtn) {
        nextBtn.style.position = open ? "fixed" : "";
        nextBtn.style.bottom   = open ? (kbH + 16) + "px" : "";
        nextBtn.style.left     = open ? "0" : "";
        nextBtn.style.right    = open ? "0" : "";
        nextBtn.style.margin   = open ? "0 20px" : "";
      }
    });
  }

  return {
    _currentNarKey: "step3_1",

    init: function () {
      document.addEventListener("DOMContentLoaded", function () {
        _init();
        _initKeyboardHandler();
      });
    },

    navigateToStep: function (step, isEdit) {
      _goStep(step, isEdit);
    },
  };
})();

RegApp.init();
