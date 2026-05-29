/**
 * reg_rubric.js — 루브릭 상태 관리 및 게이지 업데이트
 * Private Registration에서는 Hub 호출 없이 로컬 점수 시뮬레이션 사용
 */
"use strict";

var RegRubric = (function () {
  var _status = {
    grade: "", score: 0, converged: false, phase: 0,
    additionalQuestions: [],
    breakdown: { birthData: 0, inflectionPoints: 0, currentState: 0, consistency: 0 },
    critical_flags: [],
  };
  var _running = false, _callback = null;

  function _updateGauge(score, grade) {
    var bar = document.getElementById("gauge-bar");
    var statusEl = document.getElementById("gauge-status");
    var label = document.getElementById("gauge-label-text");
    if (!bar) return;

    var isMobile = window.innerWidth < 1024;
    if (isMobile) bar.style.width  = Math.min(score, 100) + "%";
    else          bar.style.height = Math.min(score, 100) + "%";

    var statusMap = {
      phase1_running: "기본 정보를 검토하고 있습니다",
      phase2_running: "생애 흐름을 읽고 있습니다",
      phase3_running: "구조적 일관성을 확인하고 있습니다",
      converging    : "에너지 패턴을 정렬하고 있습니다",
      completed     : "에너지 구조 파악 완료",
    };
    if (statusEl) {
      statusEl.textContent = _status.converged
        ? statusMap.completed
        : (_running ? (statusMap["phase" + _status.phase + "_running"] || statusMap.converging) : "");
    }
    if (label) label.textContent = grade ? "Grade " + grade : "에너지 구조 파악";
  }

  function _localScore(formData) {
    var score = 0;
    var timeMode = formData.birthTimeMode;
    if      (timeMode === "exact")       score += 35;
    else if (timeMode === "approximate") score += 25;
    else if (timeMode === "memory")      score += 15;

    var dateMode = formData.birthDateMode;
    if      (dateMode === "approximate") score -= 3;
    else if (dateMode === "unknown")     score -= 7;

    var cnt = (formData.inflectionPoints || []).length;
    if      (cnt >= 5) score += 20;
    else if (cnt >= 3) score += 13;
    else if (cnt === 2) score += 7;
    else if (cnt === 1) score += 3;

    var density = 0;
    (formData.inflectionPoints || []).forEach(function (p) {
      var len = (p.text || "").length;
      if (len >= 50) density += 2;
      else if (len >= 20) density += 1;
    });
    score += Math.min(density, 10);

    var csLen = (formData.currentState || "").length;
    if      (csLen >= 100) score += 20;
    else if (csLen >= 30)  score += 12;
    else if (csLen > 0)    score += 5;

    score += 8;
    return Math.max(0, Math.min(100, score));
  }

  function _gradeFromScore(score) {
    if (score >= REG_CONFIG.RUBRIC_GRADE.S) return "S";
    if (score >= REG_CONFIG.RUBRIC_GRADE.A) return "A";
    if (score >= REG_CONFIG.RUBRIC_GRADE.B) return "B";
    return "C";
  }

  return {
    getStatus   : function () { return _status; },
    isRunning   : function () { return _running; },
    isConverged : function () { return _status.converged; },
    getScore    : function () { return _status.score; },
    getGrade    : function () { return _status.grade; },
    getQuestions: function () { return _status.additionalQuestions || []; },

    run: function (phase, formData, regType, onComplete) {
      if (_running) return;
      _running = true;
      _status.phase = phase;
      _callback = onComplete || null;
      _updateGauge(_status.score, _status.grade);

      if (regType === "private") {
        setTimeout(function () {
          var score = _localScore(formData);
          var grade = _gradeFromScore(score);
          Object.assign(_status, { score, grade, converged: grade === "S", phase, additionalQuestions: [] });
          _running = false;
          _updateGauge(score, grade);
          if (_callback) _callback(_status);
        }, 1200);
      } else {
        RegApi.runRubric(RegState.getOrderNo(), phase, formData, _status)
          .then(function (res) {
            if (res && !res.error) {
              _status.grade    = res.grade    || "C";
              _status.score    = res.score    || 0;
              _status.converged = !!res.converged;
              _status.additionalQuestions = res.additionalQuestions || [];
              _status.breakdown = res.breakdown || _status.breakdown;
              _status.critical_flags = res.critical_flags || [];
            }
          })
          .catch(function (e) { console.error("[Rubric]", e); })
          .finally(function () {
            _running = false;
            _updateGauge(_status.score, _status.grade);
            if (_callback) _callback(_status);
          });
      }
    },

    restoreGauge: function () { _updateGauge(_status.score, _status.grade); },
    restore: function (statusJson) {
      try {
        var s = typeof statusJson === "string" ? JSON.parse(statusJson) : statusJson;
        if (s) Object.assign(_status, s);
      } catch (e) {}
    },
    serialize: function () { return JSON.parse(JSON.stringify(_status)); },
  };
})();
