// ============================================================
//  BITG Crypto — Reusable Tamper-Resistant Storage
//  braydenistallgames.online
//
//  A small, self-contained obfuscation + integrity layer for
//  anything stored in localStorage. Designed to be used by:
//    - streak.js       (streak data, freezes, milestones)
//    - future modules  (settings, scores, achievements, etc.)
//
//  Why we do this:
//    School students would otherwise edit localStorage to give
//    themselves fake 100-day streaks. This makes that meaningfully
//    annoying — they'd have to reverse the algorithm and forge a
//    valid keyed checksum, instead of just opening DevTools and
//    typing a number.
//
//  IMPORTANT: this is OBFUSCATION, not real cryptography.
//  The key lives in the JS file, so a determined attacker can
//  always recover the plaintext. The goal is to defeat casual
//  cheating, not nation-state adversaries.
//
//  Envelope format stored in localStorage:
//    "v1:" + Base64( salt[4] + RC4(key, json + "|" + checksum) )
//
//    salt     — 4 random alphanumeric chars per record
//    key      — BASE_SECRET concatenated with the per-record salt
//    checksum — djb2(json + BASE_SECRET) — secret-folded so a
//               trivial JSON edit can't produce a matching checksum
//    "v1:"    — format version prefix; if we ever upgrade the
//               algorithm we add "v2:" without breaking old data
//
//  Public API (window.BITGCrypto):
//    .encrypt(obj)     → envelope string, or null on failure
//    .decrypt(string)  → original object, or null if tampered/invalid
//    .isEncrypted(s)   → true if the string looks like our envelope
// ============================================================

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────
  //  CONFIGURATION
  //  Changing BASE_SECRET will invalidate every record on every
  //  user's device — don't rotate it without a migration plan.
  // ──────────────────────────────────────────────────────────
  var BASE_SECRET     = 'BITG_v3_obfuscation_key_2026';
  var ENVELOPE_PREFIX = 'v1:';
  var SALT_LENGTH     = 4;
  var SALT_CHARS      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';


  // ──────────────────────────────────────────────────────────
  //  RC4 STREAM CIPHER
  //  Standard textbook implementation. RC4 is broken for real
  //  cryptography but is fine for client-side obfuscation —
  //  it's small, fast, and outputs unprintable bytes that
  //  students cannot meaningfully edit by hand.
  // ──────────────────────────────────────────────────────────
  function rc4(key, str) {
    var s = [];
    var i, j, x, y;
    // Key-scheduling algorithm (KSA)
    for (i = 0; i < 256; i++) s[i] = i;
    for (i = 0, j = 0; i < 256; i++) {
      j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
      x = s[i]; s[i] = s[j]; s[j] = x;
    }
    // Pseudo-random generation (PRGA) + XOR with the input
    var out = [];
    i = 0; j = 0;
    for (y = 0; y < str.length; y++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      x = s[i]; s[i] = s[j]; s[j] = x;
      out.push(String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]));
    }
    return out.join('');
  }


  // ──────────────────────────────────────────────────────────
  //  DJB2 HASH (folded with secret = HMAC-style integrity)
  //  Used to detect tampering. By mixing BASE_SECRET into the
  //  hash, a student who edits the decrypted JSON can't just
  //  recompute djb2(json) and forge a valid checksum — they
  //  would also need to know the secret.
  // ──────────────────────────────────────────────────────────
  function djb2(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = (((hash << 5) + hash) + str.charCodeAt(i)) | 0; // |0 keeps it in 32-bit int range
    }
    // Convert to unsigned for consistent string output
    return (hash >>> 0).toString(36);
  }

  function keyedChecksum(json) {
    return djb2(json + '|' + BASE_SECRET);
  }


  // ──────────────────────────────────────────────────────────
  //  SALT GENERATION
  //  Per-record random salt means two users with the same data
  //  produce different ciphertexts — small but useful.
  // ──────────────────────────────────────────────────────────
  function generateSalt(length) {
    var s = '';
    for (var i = 0; i < length; i++) {
      s += SALT_CHARS.charAt(Math.floor(Math.random() * SALT_CHARS.length));
    }
    return s;
  }


  // ──────────────────────────────────────────────────────────
  //  BASE64 WRAPPERS (Unicode-safe)
  //  btoa/atob choke on non-Latin-1 characters; these wrappers
  //  round-trip through percent-encoding to handle anything.
  // ──────────────────────────────────────────────────────────
  function toBase64(str) {
    try {
      // Escape multi-byte chars first
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      try { return btoa(str); } catch (_) { return null; }
    }
  }

  function fromBase64(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      try { return atob(str); } catch (_) { return null; }
    }
  }


  // ──────────────────────────────────────────────────────────
  //  PUBLIC API
  // ──────────────────────────────────────────────────────────

  /**
   * Encrypt an object into a tamper-resistant envelope string.
   * @param {*} obj — any JSON-serializable value
   * @returns {string|null} envelope, or null if encryption failed
   */
  function encrypt(obj) {
    try {
      var json     = JSON.stringify(obj);
      var checksum = keyedChecksum(json);
      var payload  = json + '|' + checksum;
      var salt     = generateSalt(SALT_LENGTH);
      var key      = BASE_SECRET + salt;
      var cipher   = rc4(key, payload);
      var b64      = toBase64(salt + cipher);
      return b64 ? (ENVELOPE_PREFIX + b64) : null;
    } catch (e) {
      console.warn('[BITGCrypto] encrypt failed:', e);
      return null;
    }
  }

  /**
   * Decrypt an envelope string back into the original object.
   * Returns null if the envelope is missing, malformed, or has
   * been tampered with (failed checksum).
   * @param {string} envelope
   * @returns {*|null}
   */
  function decrypt(envelope) {
    try {
      if (typeof envelope !== 'string' || envelope.indexOf(ENVELOPE_PREFIX) !== 0) {
        return null;
      }
      var b64 = envelope.substring(ENVELOPE_PREFIX.length);
      var raw = fromBase64(b64);
      if (!raw || raw.length <= SALT_LENGTH) return null;

      var salt    = raw.substring(0, SALT_LENGTH);
      var cipher  = raw.substring(SALT_LENGTH);
      var key     = BASE_SECRET + salt;
      var payload = rc4(key, cipher);

      var pipe = payload.lastIndexOf('|');
      if (pipe === -1) return null;

      var json           = payload.substring(0, pipe);
      var storedChecksum = payload.substring(pipe + 1);

      // Reject if the keyed checksum doesn't match — means the
      // record was edited (or wasn't ours to begin with).
      if (keyedChecksum(json) !== storedChecksum) {
        console.warn('[BITGCrypto] integrity check failed — data was tampered with or corrupted');
        return null;
      }

      return JSON.parse(json);
    } catch (e) {
      console.warn('[BITGCrypto] decrypt failed:', e);
      return null;
    }
  }

  /**
   * Quick check: does this string look like one of our envelopes?
   * Useful for distinguishing encrypted records from legacy plaintext.
   */
  function isEncrypted(str) {
    return typeof str === 'string' && str.indexOf(ENVELOPE_PREFIX) === 0;
  }


  // Expose globally so any script can use the same crypto layer
  window.BITGCrypto = {
    encrypt:     encrypt,
    decrypt:     decrypt,
    isEncrypted: isEncrypted
  };

})();
