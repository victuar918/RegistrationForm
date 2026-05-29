/**
 * reg_audio.js — ASTERION Registration 오디오 시스템
 */
"use strict";

var AsterionAudio = (function () {
  var _bgMusic = null, _narration = null;
  var _muted = false, _started = false, _pendingKey = null;

  function _narPath(key) {
    var num = REG_CONFIG.NARRATION[key];
    if (!num) return null;
    return REG_CONFIG.AUDIO_BASE + num + ".mp3";
  }

  function _ducking(active) {
    if (!_bgMusic) return;
    _bgMusic.volume = active ? 0.06 : 0.15;
  }

  return {
    start: function () {
      if (_started) return Promise.resolve();
      _started = true;
      _bgMusic = new Audio(REG_CONFIG.AUDIO_BASE + "bg_music.mp3");
      _bgMusic.loop = true;
      _bgMusic.volume = 0.15;
      _narration = new Audio();
      _narration.volume = 0.85;
      var p = _bgMusic.play().catch(function () {});
      if (_pendingKey) {
        var k = _pendingKey; _pendingKey = null;
        p.then(function () { AsterionAudio.playNarration(k); });
      }
      return p;
    },

    playNarration: function (key) {
      if (!_started) { _pendingKey = key; return Promise.resolve(); }
      if (_muted) return Promise.resolve();
      var src = _narPath(key);
      if (!src) return Promise.resolve();
      _narration.pause();
      _narration.src = src;
      _narration.currentTime = 0;
      _ducking(true);
      return _narration.play()
        .then(function () { _narration.onended = function () { _ducking(false); }; })
        .catch(function () { _ducking(false); });
    },

    waitNarration: function () {
      return new Promise(function (resolve) {
        if (!_narration || _narration.paused || _narration.ended) { resolve(); return; }
        _narration.onended = function () { resolve(); };
      });
    },

    toggleMute: function () {
      _muted = !_muted;
      if (_bgMusic) _bgMusic.volume = _muted ? 0 : 0.15;
      if (_narration && _muted) _narration.pause();
      return _muted;
    },

    isMuted  : function () { return _muted; },
    isStarted: function () { return _started; },
  };
})();
