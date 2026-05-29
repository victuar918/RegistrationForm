/**
 * reg_steps.js — STEP별 HTML 렌더링
 * 각 renderStepN() 함수는 슬라이드 컨테이너에 삽입할 HTML 문자열을 반환
 */
"use strict";

var RegSteps = (function () {

  var _container = null;

  function _wrap(content) {
    return '<div class="slide">' + content + '</div>';
  }

  function _nextBtn(label, id) {
    return '<button class="btn-next" id="' + (id || "btn-next") + '">' + (label || "다음") + '</button>';
  }

  function _initTextarea(el) {
    if (!el) return;
    function resize() {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.4) + "px";
    }
    el.addEventListener("input", resize);
    resize();
  }

  function _radioGroup(name, options, currentVal) {
    return options.map(function (o) {
      var checked = currentVal === o.value ? " checked" : "";
      return '<label class="radio-label"><input type="radio" name="' + name + '" value="' + o.value + '"' + checked + '><span>' + o.label + '</span></label>';
    }).join("");
  }

  return {

    init: function (containerId) {
      _container = document.getElementById(containerId);
    },

    // ── 진입 화면 — Private ────────────────────────
    renderEntry: function () {
      _container.innerHTML = _wrap(
        '<div class="entry-wrap">' +
          '<div class="brand-logo">ASTERION</div>' +
          '<p class="entry-sub">에너지 구조 접수를 시작합니다.</p>' +
          '<div class="field-group">' +
            '<label class="field-label">성함</label>' +
            '<input type="text" id="entry-name" class="field-input" placeholder="성함을 입력해주세요." maxlength="50" autocomplete="off">' +
            '<p class="field-error" id="entry-error"></p>' +
          '</div>' +
          _nextBtn("시작하기", "btn-entry") +
        '</div>'
      );
      var inp = document.getElementById("entry-name");
      if (inp) inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); var b = document.getElementById("btn-entry"); if (b) b.click(); }
      });
    },

    // ── STEP 1 — 본인 확인 ────────────────────────
    renderStep1: function (ordererName) {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 1</p>' +
          '<h2 class="step-title">접수하실 분의 성함과 성별을 알려주세요.</h2>' +
          '<div class="field-group">' +
            '<label class="field-label">성함</label>' +
            '<input type="text" id="s1-name" class="field-input" placeholder="성함을 입력해주세요." maxlength="50" value="' + (form.registrantName || "") + '" autocomplete="off">' +
          '</div>' +
          '<label class="checkbox-label">' +
            '<input type="checkbox" id="s1-same"' + (form.isSameAsOrderer ? " checked" : "") + '>' +
            '<span>주문하신 분과 동일합니다.</span>' +
          '</label>' +
          '<div class="field-group mt-20">' +
            '<label class="field-label">성별</label>' +
            '<div class="radio-group">' +
              _radioGroup("s1-gender", [{ value:"male",label:"남성" },{ value:"female",label:"여성" }], form.gender) +
            '</div>' +
          '</div>' +
          '<p class="field-error" id="s1-error"></p>' +
          _nextBtn("다음", "btn-s1") +
        '</div>'
      );
      var sameChk = document.getElementById("s1-same");
      var nameInp = document.getElementById("s1-name");
      if (sameChk && nameInp && ordererName) {
        sameChk.addEventListener("change", function () {
          nameInp.value = this.checked ? ordererName : "";
          nameInp.disabled = this.checked;
        });
        if (form.isSameAsOrderer) { nameInp.value = ordererName; nameInp.disabled = true; }
      }
    },

    // ── STEP 2 — 출생 정보 ────────────────────────
    renderStep2: function () {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 2</p>' +
          '<h2 class="step-title">출생 정보를 입력해주세요.</h2>' +
          '<div class="field-group">' +
            '<label class="field-label">생년월일</label>' +
            '<div class="mode-tabs" id="s2-date-tabs">' +
              '<button class="mode-tab' + (form.birthDateMode==="exact"?"  active":"") + '" data-mode="exact">정확한 날짜</button>' +
              '<button class="mode-tab' + (form.birthDateMode==="approximate"?" active":"") + '" data-mode="approximate">대략적인 시기</button>' +
              '<button class="mode-tab' + (form.birthDateMode==="unknown"?" active":"") + '" data-mode="unknown">잘 모름</button>' +
            '</div>' +
            '<div id="s2-date-exact" class="mode-panel' + (form.birthDateMode!=="exact"?" hidden":"") + '">' +
              '<div class="radio-group mb-10">' + _radioGroup("s2-calendar",[{value:"solar",label:"양력"},{value:"lunar",label:"음력"},{value:"leap",label:"윤달"}],form.birthCalendar||"solar") + '</div>' +
              '<input type="date" id="s2-date" class="field-input" value="' + (form.birthDate||"") + '">' +
            '</div>' +
            '<div id="s2-date-approx" class="mode-panel' + (form.birthDateMode==="approximate"?"":" hidden") + '">' +
              '<textarea id="s2-date-raw" class="field-textarea" placeholder="예) 1980년 추석 무렵, 1970년대 초반 겨울" maxlength="200">' + (form.birthDateRaw||"") + '</textarea>' +
            '</div>' +
            '<div id="s2-date-unknown" class="mode-panel' + (form.birthDateMode==="unknown"?"":" hidden") + '">' +
              '<textarea id="s2-date-raw2" class="field-textarea" placeholder="예) 현재 나이 40대 중반, 정확한 연도 불확실" maxlength="200">' + (form.birthDateRaw||"") + '</textarea>' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">출생 시각</label>' +
            '<div class="mode-tabs" id="s2-time-tabs">' +
              '<button class="mode-tab' + (form.birthTimeMode==="exact"?" active":"") + '" data-mode="exact">정확한 시각</button>' +
              '<button class="mode-tab' + (form.birthTimeMode==="approximate"?" active":"") + '" data-mode="approximate">대략적인 범위</button>' +
              '<button class="mode-tab' + (form.birthTimeMode==="memory"?" active":"") + '" data-mode="memory">기억/전해들은 것</button>' +
              '<button class="mode-tab' + (form.birthTimeMode==="unknown"?" active":"") + '" data-mode="unknown">전혀 모름</button>' +
            '</div>' +
            '<div id="s2-time-exact" class="mode-panel' + (form.birthTimeMode!=="exact"?" hidden":"") + '">' +
              '<input type="time" id="s2-time" class="field-input" value="' + (form.birthTime||"") + '">' +
            '</div>' +
            '<div id="s2-time-approx" class="mode-panel' + (form.birthTimeMode==="approximate"?"":" hidden") + '">' +
              '<textarea id="s2-time-raw" class="field-textarea" placeholder="예) 오전 9시~11시 사이, 저녁 7시경" maxlength="200">' + (form.birthTimeRaw||"") + '</textarea>' +
            '</div>' +
            '<div id="s2-time-memory" class="mode-panel' + (form.birthTimeMode==="memory"?"":" hidden") + '">' +
              '<textarea id="s2-time-raw2" class="field-textarea" placeholder="예) 저녁 식사 후였다, 해 뜨기 직전이었다" maxlength="200">' + (form.birthTimeRaw||"") + '</textarea>' +
            '</div>' +
            '<div id="s2-time-unknown" class="mode-panel' + (form.birthTimeMode==="unknown"?"":" hidden") + '">' +
              '<p class="mode-note">출생 시각을 모르시면 그대로 진행하셔도 됩니다.<br>이후 추가 질문을 통해 분석이 진행됩니다.</p>' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">출생 지역</label>' +
            '<input type="text" id="s2-location" class="field-input" placeholder="예) 서울 강서구, 부산, Tokyo, New York" maxlength="100" value="' + (form.birthLocation||"") + '" autocomplete="off">' +
            '<p class="field-hint">국가와 도시만 알고 계셔도 충분합니다.</p>' +
          '</div>' +
          '<p class="field-error" id="s2-error"></p>' +
          _nextBtn("다음", "btn-s2") +
        '</div>'
      );
      this._initModeTabs("s2-date-tabs", ["s2-date-exact","s2-date-approx","s2-date-unknown"]);
      this._initModeTabs("s2-time-tabs", ["s2-time-exact","s2-time-approx","s2-time-memory","s2-time-unknown"]);
      ["s2-date-raw","s2-date-raw2","s2-time-raw","s2-time-raw2"].forEach(function(id){ _initTextarea(document.getElementById(id)); });
    },

    // ── STEP 3-N — 변곡점 ─────────────────────────
    renderStep3: function (seq) {
      var form = RegState.getForm();
      var existing = form.inflectionPoints[seq - 1] || {};
      var narKeys = ["step3_1","step3_2","step3_3","step3_4","step3_5"];
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 3 — ' + seq + '/5</p>' +
          '<div class="inflection-dots">' +
            [1,2,3,4,5].map(function(n){ return '<span class="dot'+(n===seq?" active":n<seq?" done":"")+'"></span>'; }).join("") +
          '</div>' +
          '<h2 class="step-title">삶에서 중요한 변화의 순간을 들려주세요.</h2>' +
          '<p class="step-sub">직업, 거주지, 관계, 건강 — 어떤 변화든 괜찮습니다.</p>' +
          '<textarea id="s3-text" class="field-textarea field-textarea-lg" placeholder="연도나 나이, 계절과 함께 기억나는 대로 적어주세요." maxlength="1000">' + (existing.text||"") + '</textarea>' +
          '<p class="field-nudge hidden" id="s3-nudge">조금 더 자세히 적어주시면 더 정확한 분석이 가능합니다.</p>' +
          '<p class="field-error" id="s3-error"></p>' +
          '<div class="btn-row">' +
            (seq < 5
              ? _nextBtn("다음", "btn-s3-next")
              : '<button class="btn-secondary" id="btn-s3-done">여기까지 입력하겠습니다</button>' +
                '<button class="btn-next" id="btn-s3-add">하나 더 추가하겠습니다</button>'
            ) +
          '</div>' +
        '</div>'
      );
      _initTextarea(document.getElementById("s3-text"));
      RegApp._currentNarKey = narKeys[seq - 1] || "step3_2";
    },

    // ── STEP 4 — 현재 상태 ────────────────────────
    renderStep4: function () {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 4</p>' +
          '<h2 class="step-title">재정, 건강, 인간관계 등<br>자유롭게 작성해 주세요.</h2>' +
          '<p class="step-sub">힘들고 고통스러운 것들, 개선을 원하는 것들—<br>어떤 것도 상관이 없습니다.</p>' +
          '<p class="step-desc">당신의 스토리는 ASTERION의 설계에 녹아들어<br>오직 당신만을 위한 단 하나의 오브제가 됩니다.</p>' +
          '<textarea id="s4-text" class="field-textarea field-textarea-lg" placeholder="이 질문에 대한 고객님의 말씀은 에너지 분석의 정확도 판단과 제품 구조 설계의 아주 중요한 기준이 됩니다." maxlength="2000">' + (form.currentState||"") + '</textarea>' +
          '<p class="field-char-count" id="s4-count">' + (form.currentState||"").length + ' / 2000</p>' +
          '<p class="field-error" id="s4-error"></p>' +
          _nextBtn("다음", "btn-s4") +
        '</div>'
      );
      var ta = document.getElementById("s4-text");
      var count = document.getElementById("s4-count");
      _initTextarea(ta);
      if (ta && count) ta.addEventListener("input", function(){ count.textContent = ta.value.length + " / 2000"; });
    },

    // ── STEP 5 — 착용 환경 ────────────────────────
    renderStep5: function () {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 5</p>' +
          '<h2 class="step-title">착용 환경을 알려주세요.</h2>' +
          '<div class="field-group">' +
            '<label class="field-label">손목시계 착용 여부</label>' +
            '<div class="radio-group">' +
              _radioGroup("s5-watch",[{value:"none",label:"착용하지 않음"},{value:"sometimes",label:"가끔 착용"},{value:"often",label:"자주 착용"}],form.watchWorn) +
            '</div>' +
          '</div>' +
          '<div id="s5-watch-detail" class="' + (form.watchWorn==="none"||!form.watchWorn?"hidden":"") + '">' +
            '<div class="field-group">' +
              '<label class="field-label">착용 손목</label>' +
              '<div class="radio-group">' +
                _radioGroup("s5-wrist",[{value:"left",label:"왼쪽"},{value:"right",label:"오른쪽"},{value:"both",label:"상황에 따라 다름"}],form.watchWrist) +
              '</div>' +
            '</div>' +
            '<div class="field-group">' +
              '<label class="field-label">스트랩 재질 / 색상</label>' +
              '<input type="text" id="s5-strap" class="field-input" placeholder="예) 실버 메탈, 브라운 가죽, 블랙 러버" maxlength="100" value="' + (form.watchStrap||"") + '">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">손목 둘레</label>' +
            '<div class="input-unit-wrap">' +
              '<input type="number" id="s5-wrist-size" class="field-input field-input-sm" placeholder="예) 16" min="10" max="30" step="0.1" value="' + (form.wristSize||"") + '">' +
              '<span class="input-unit">cm</span>' +
            '</div>' +
            '<details class="field-detail">' +
              '<summary>측정 방법 보기</summary>' +
              '<p>손목이 가장 얇은 부분을 줄자로 측정해 주세요.<br>줄자가 없다면 실로 감은 후 자로 재셔도 됩니다.</p>' +
            '</details>' +
          '</div>' +
          '<p class="field-error" id="s5-error"></p>' +
          _nextBtn("다음", "btn-s5") +
        '</div>'
      );
      document.querySelectorAll('input[name="s5-watch"]').forEach(function(radio){
        radio.addEventListener("change", function(){
          var detail = document.getElementById("s5-watch-detail");
          if (detail) detail.classList.toggle("hidden", this.value === "none");
        });
      });
    },

    // ── STEP 6 — 수령 정보 ────────────────────────
    renderStep6: function () {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 6</p>' +
          '<h2 class="step-title">수령 정보를 입력해주세요.</h2>' +
          '<div class="field-group">' +
            '<label class="field-label">이메일</label>' +
            '<input type="email" id="s6-email" class="field-input" placeholder="example@email.com" autocomplete="email" value="' + (form.email||"") + '">' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">전화번호</label>' +
            '<input type="tel" id="s6-phone" class="field-input" placeholder="숫자만 입력 (예: 01012345678)" maxlength="11" value="' + (form.phone||"") + '">' +
            '<label class="checkbox-label mt-8">' +
              '<input type="checkbox" id="s6-sms"' + (form.consentSMS?" checked":"") + '>' +
              '<span>분석 정확도 확인을 위한 개별 문자 수신에 동의합니다.</span>' +
            '</label>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">배송지</label>' +
            '<div class="address-wrap">' +
              '<input type="text" id="s6-postcode" class="field-input field-input-sm" placeholder="우편번호" readonly>' +
              '<button class="btn-address" id="btn-postcode" type="button">주소 검색</button>' +
            '</div>' +
            '<input type="text" id="s6-address" class="field-input mt-8" placeholder="기본 주소" readonly value="' + (form.address||"") + '">' +
            '<input type="text" id="s6-address-detail" class="field-input mt-8" placeholder="상세 주소 입력" maxlength="100" value="' + (form.addressDetail||"") + '">' +
          '</div>' +
          '<p class="field-error" id="s6-error"></p>' +
          _nextBtn("다음", "btn-s6") +
        '</div>'
      );
      var btnPost = document.getElementById("btn-postcode");
      if (btnPost) btnPost.addEventListener("click", function(){
        if (typeof daum === "undefined" || !daum.Postcode) { alert("주소 검색 서비스를 불러오는 중입니다."); return; }
        new daum.Postcode({ oncomplete: function(data){
          document.getElementById("s6-postcode").value = data.zonecode;
          document.getElementById("s6-address").value  = data.roadAddress || data.jibunAddress;
        }}).open();
      });
    },

    // ── STEP 7 — 동의 및 확인 ─────────────────────
    renderStep7: function () {
      var form = RegState.getForm();
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 7</p>' +
          '<h2 class="step-title">아래 내용을 확인하고 동의해주세요.</h2>' +
          '<div class="consent-block"><label class="consent-label">' +
            '<input type="checkbox" id="c-privacy"' + (form.consentPrivacy?" checked":"") + '>' +
            '<span class="consent-text"><strong>개인정보 수집·이용 동의 (필수)</strong></span>' +
          '</label>' +
          '<details class="consent-detail"><summary>상세 보기</summary>' +
            '<p>수집 항목: 성함, 생년월일, 출생시각, 출생지, 연락처, 배송지<br>이용 목적: 원석 팔찌 에너지 구조 분석 및 제작<br>보관 기간: 배송 완료 후 15일</p>' +
          '</details></div>' +
          '<div class="consent-block"><label class="consent-label">' +
            '<input type="checkbox" id="c-design"' + (form.consentDesign?" checked":"") + '>' +
            '<span class="consent-text">본 등록 정보는 명리학 및 베다 점성술 교차 분석을 통한 제품 설계 목적에만 사용되며, 별도의 상담이나 운세 해석은 제공되지 않음을 이해합니다.</span>' +
          '</label></div>' +
          '<div class="consent-divider">' +
            '<p class="consent-section-title">Signature 설계의 이해</p>' +
            '<p class="consent-section-desc">ASTERION Signature는 삶의 방향성과 상징을 설계하는 프로젝트로, 의학적·과학적 치료를 목적으로 하지 않습니다.</p>' +
          '</div>' +
          '<div class="consent-block"><label class="consent-label">' +
            '<input type="checkbox" id="c-medical"' + (form.consentMedical?" checked":"") + '>' +
            '<span class="consent-text">질병의 예방·치료·진단을 위한 제품이 아님을 충분히 이해하였습니다.</span>' +
          '</label></div>' +
          '<div class="consent-block"><label class="consent-label">' +
            '<input type="checkbox" id="c-cancel"' + (form.consentCancel?" checked":"") + '>' +
            '<span class="consent-text">본 등록 제출 즉시 제작이 시작되며 단순 변심에 의한 취소 및 환불이 불가함을 확인합니다.</span>' +
          '</label></div>' +
          '<div class="consent-block"><label class="consent-label">' +
            '<input type="checkbox" id="c-sms"' + (form.consentSMSFull?" checked":"") + '>' +
            '<span class="consent-text">분석 정확도 확인을 위한 개별 문자 수신에 동의합니다.</span>' +
          '</label></div>' +
          '<p class="field-error" id="s7-error"></p>' +
          '<button class="btn-next" id="btn-s7" disabled>모두 동의하고 다음으로</button>' +
        '</div>'
      );
      var checkIds = ["c-privacy","c-design","c-medical","c-cancel","c-sms"];
      var btn = document.getElementById("btn-s7");
      function checkAll() {
        var all = checkIds.every(function(id){ var el=document.getElementById(id); return el&&el.checked; });
        if (btn) btn.disabled = !all;
      }
      checkIds.forEach(function(id){ var el=document.getElementById(id); if(el) el.addEventListener("change", checkAll); });
      checkAll();
    },

    // ── STEP 8 — 최종 제출 ────────────────────────
    renderStep8: function () {
      var form = RegState.getForm();
      var inflStr = form.inflectionPoints.map(function(p){ return p.seq+". "+(p.text||"").slice(0,40)+((p.text||"").length>40?"…":""); }).join("<br>");
      var watchLabel = { none:"착용하지 않음", sometimes:"가끔 착용", often:"자주 착용" };
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">STEP 8</p>' +
          '<h2 class="step-title">모든 정보가 입력되었습니다.</h2>' +
          '<p class="step-sub">제출 전 내용을 확인해 주세요.</p>' +
          '<div class="summary-block">' +
            _summaryRow("성함", form.registrantName||"-", 1) +
            _summaryRow("성별", form.gender==="male"?"남성":form.gender==="female"?"여성":"-", 1) +
            _summaryRow("생년월일", form.birthDate||form.birthDateRaw||"-", 2) +
            _summaryRow("출생 시각", form.birthTime||form.birthTimeRaw||(form.birthTimeMode==="unknown"?"모름":"-"), 2) +
            _summaryRow("출생 지역", form.birthLocation||"-", 2) +
            _summaryRow("변곡점", inflStr||"-", 3) +
            _summaryRow("현재 상태", ((form.currentState||"").slice(0,60)+((form.currentState||"").length>60?"…":"")), 4) +
            _summaryRow("손목시계", watchLabel[form.watchWorn]||"-", 5) +
            _summaryRow("손목 둘레", form.wristSize?form.wristSize+" cm":"-", 5) +
            _summaryRow("이메일", form.email||"-", 6) +
            _summaryRow("전화번호", form.phone||"-", 6) +
            _summaryRow("배송지", form.address?(form.address+" "+(form.addressDetail||"")):"-", 6) +
          '</div>' +
          '<p class="field-error" id="s8-error"></p>' +
          '<button class="btn-next btn-submit" id="btn-submit">제출하기</button>' +
        '</div>'
      );
      document.querySelectorAll(".btn-edit").forEach(function(btn){
        btn.addEventListener("click", function(){ RegApp.navigateToStep(parseInt(this.dataset.step,10), true); });
      });
    },

    // ── 완료 화면 ─────────────────────────────────
    renderComplete: function (structureCode) {
      _container.innerHTML = _wrap(
        '<div class="step-wrap complete-wrap">' +
          '<div class="complete-icon">✦</div>' +
          '<h2 class="complete-title">접수가 완료되었습니다.</h2>' +
          (structureCode?'<p class="complete-code">'+structureCode+'</p>':"") +
          '<p class="complete-desc">ASTERION은 지금부터<br>당신의 에너지 구조를 설계하기 시작합니다.<br><br>분석이 완료되는 대로<br>안내드린 방법으로 연락드리겠습니다.</p>' +
        '</div>'
      );
    },

    // ── 대기 화면 ─────────────────────────────────
    renderStandby: function (videoId) {
      var videoHtml = videoId
        ? '<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/'+videoId+'?autoplay=1&controls=0&rel=0&loop=1&playlist='+videoId+'" frameborder="0" allow="autoplay"></iframe><div class="video-overlay"></div></div>'
        : '<div class="standby-animation"><span></span><span></span><span></span></div>';
      _container.innerHTML = _wrap(
        '<div class="standby-wrap">' + videoHtml +
          '<div class="standby-text">' +
            '<p class="standby-main">정보가 충분한지 검토하고 있습니다.</p>' +
            '<p class="standby-sub">당신이 제공해주신 정보들이<br>설계에 충분한 구조를 갖추고 있는지<br>면밀히 살피고 있습니다.</p>' +
            '<div class="dots-indicator"><span></span><span></span><span></span></div>' +
          '</div>' +
        '</div>'
      );
    },

    // ── 추가질문 ──────────────────────────────────
    renderAdditionalQuestions: function (questions) {
      if (!questions||!questions.length) return;
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<p class="step-num">추가 확인</p>' +
          '<h2 class="step-title">분석을 위해 조금 더 여쭤볼게요.</h2>' +
          questions.map(function(q){
            return '<div class="field-group"><p class="aq-question">'+q.question+'</p><textarea id="aq-'+q.id+'" class="field-textarea" maxlength="500" placeholder="편하게 적어주세요."></textarea></div>';
          }).join("") +
          '<p class="field-error" id="aq-error"></p>' +
          _nextBtn("답변 완료", "btn-aq") +
        '</div>'
      );
      questions.forEach(function(q){ _initTextarea(document.getElementById("aq-"+q.id)); });
    },

    // ── AddInfo 화면 ──────────────────────────────
    renderAddInfo: function (structureCode) {
      _container.innerHTML = _wrap(
        '<div class="step-wrap">' +
          '<div class="addinfo-header">' +
            '<p class="addinfo-code">'+(structureCode||"")+'</p>' +
            '<p class="addinfo-title">이미 접수가 완료되었습니다.</p>' +
          '</div>' +
          '<p class="addinfo-desc">추가하거나 수정하고 싶으신 내용이 있으시면<br>아래에 자유롭게 적어주세요.</p>' +
          '<textarea id="addinfo-text" class="field-textarea field-textarea-lg" placeholder="추가 정보, 수정 요청, 궁금한 점 등 무엇이든 편하게 적어주세요." maxlength="2000"></textarea>' +
          '<p class="field-error" id="addinfo-error"></p>' +
          '<button class="btn-next" id="btn-addinfo">제출하기</button>' +
        '</div>'
      );
      _initTextarea(document.getElementById("addinfo-text"));
    },

    // ── 유효하지 않은 접근 ────────────────────────
    renderInvalid: function (msg) {
      _container.innerHTML = _wrap(
        '<div class="step-wrap invalid-wrap">' +
          '<p class="invalid-icon">—</p>' +
          '<p class="invalid-msg">'+(msg||"유효하지 않은 접근입니다.")+'</p>' +
        '</div>'
      );
    },

    // ── 모드 탭 공통 초기화 ───────────────────────
    _initModeTabs: function (tabsId, panelIds) {
      var tabs = document.getElementById(tabsId);
      if (!tabs) return;
      tabs.querySelectorAll(".mode-tab").forEach(function(tab, i){
        tab.addEventListener("click", function(){
          tabs.querySelectorAll(".mode-tab").forEach(function(t){ t.classList.remove("active"); });
          tab.classList.add("active");
          panelIds.forEach(function(pid){ var p=document.getElementById(pid); if(p) p.classList.add("hidden"); });
          var active = document.getElementById(panelIds[i]);
          if (active) active.classList.remove("hidden");
        });
      });
    },
  };

  // 요약 행 헬퍼
  function _summaryRow(key, val, step) {
    return '<div class="summary-row"><span class="summary-key">'+key+'</span><span class="summary-val">'+val+'</span><button class="btn-edit" data-step="'+step+'">수정</button></div>';
  }

})();
