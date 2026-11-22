/* app.js — منطق الموقع
   - المحتوى في data.js والسيرفر، وهذا الملف لا يحتاج تعديلًا
   - الأدوار: متدرب · المدربـة (تعديل) · الإداري/ة (اطلاع وتقارير) */
(function () {
  "use strict";

  const S = window.SITE, SES = window.SESSIONS, WK = window.WEEKS, RES = window.RESOURCES,
        QZ = window.QUIZZES, ALERTS = window.ALERTS, PROJ = window.PROJECTS || [];
  /* الجلسات التي لها اختبار (الجلسة 8 تخص أسبوع المشروع ولا اختبار لها) */
  const NOQ = [1, 8], QSES = SES.filter(x => !NOQ.includes(x.n));
  let STUDENTS = window.STUDENTS;
  const PAGE = document.body.dataset.page;
  const Q = new URLSearchParams(location.search);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* تخزين محلي: store دائم و ss للجلسة فقط */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("dab_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("dab_" + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem("dab_" + k); } catch (e) {} }
  };
  const ss = {
    get(k) { try { const v = sessionStorage.getItem("dab_" + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem("dab_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pad = n => String(n).padStart(2, "0");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const keepQ = Q.get("today") ? "&today=" + Q.get("today") : "";
  const qs0 = () => keepQ ? "?" + keepQ.slice(1) : "";
  const isUrl = u => /^https?:\/\/\S+\.\S+/i.test(String(u || ""));
  const siteBase = () => new URL(".", location.href).href;
  const readB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(f); });

  /* روابط حسابات المقدّم: القيم الابتدائية من data.js وما يحفظه المدرب من الإدارة يغلبها */
  const PL0 = Object.assign({}, S.presenterLinks || {});
  let sess = store.get("sess", null);
  let isTr = false, isAd = false, isStaff = false, me = null, trainer = false;
  function setRoles() {
    const r = sess ? sess.role : "";
    isTr = r === "trainer"; isAd = r === "admin"; isStaff = isTr || isAd;
    me = r === "trainee" ? sess.name : null; trainer = isStaff; /* وضع تعديل جدول المتابعة: للمدربـة والإداري/ة */
  }
  setRoles();
  const API = () => String(S.api || "").trim();
  if (!API() && isTr) { const ov = store.get("students", null); if (Array.isArray(ov) && ov.length) STUDENTS = ov; }
  let timers = [];
  const clearTimers = () => { timers.forEach(t => clearInterval(t)); timers = []; };

  let CONTENT = {}, QATT = [], SUBS = [], MINE = [], BOARD = [], STATS = null, NOTES = [], ASKS = [], MYRANK = null, STAR = null, INTER = [];
  let XPL = ((window.BADGES || {}).points || []).map(b => b.xp).filter(Boolean);
  if (!XPL.length) XPL = [50, 150, 300, 450];
  const authBody = () => !sess ? {} : sess.role === "trainee" ? { email: sess.email, code: sess.code } : { pin: sess.pin };
  /* إعادة المحاولة تلقائيًا (3 مرات) عند ازدحام السيرفر */
  async function api(action, body = {}) {
    for (let k = 0; ; k++) {
      const r = await fetch(API(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, authBody(), body)) });
      const j = await r.json();
      if (j.err === "busy" && k < 3) { await new Promise(res => setTimeout(res, 1200 + Math.random() * 1800)); continue; }
      return j;
    }
  }
  async function getData() {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 15000);
    try { return await (await fetch(API() + "?action=data", { signal: c.signal })).json(); } finally { clearTimeout(t); }
  }
  const normStu = s => ({ name: s.name, github: s.github || "", email: s.email || "", code: s.code || "", points: s.points || 0, joined: s.joined || "", checkins: s.checkins || {}, quiz: s.quiz || {}, quizW: s.quizW || {}, subPts: s.subPts || 0, inter: s.inter || { shares: 0, reacts: 0, pts: 0 },
    att: Array.from({ length: SES.length }, (_, i) => (s.att && s.att[i] != null) ? s.att[i] : null), hw: Array.from({ length: SES.length }, (_, i) => (s.hw && s.hw[i] != null) ? s.hw[i] : null) });
  function applyContent(c) {
    CONTENT = c || {};
    Object.assign(S, CONTENT.site || {});
    S.presenterLinks = Object.assign({}, PL0, (CONTENT.site || {}).presenterLinks || {});
    if (Array.isArray(CONTENT.alerts)) { ALERTS.length = 0; CONTENT.alerts.forEach(a => ALERTS.push(a)); }
    Object.entries(CONTENT.sessions || {}).forEach(([n, v]) => { if (SES[n - 1]) Object.assign(SES[n - 1], v); });
    Object.entries(CONTENT.weeks || {}).forEach(([n, v]) => { const w = WK.find(x => String(x.n) === String(n)); if (w) Object.assign(w, v); });
    Object.entries(CONTENT.quizzes || {}).forEach(([n, v]) => { if (Array.isArray(v)) QZ[n] = v; });
    const T = window.TASKS || {}; if (CONTENT.project && T.project) Object.assign(T.project, CONTENT.project);
    Object.entries(CONTENT.tasks || {}).forEach(([id, v]) => { const a = (T.assignments || []).find(x => x.id === id); if (a) Object.assign(a, v); });
  }
  const FAQ = () => Array.isArray(CONTENT.faq) ? CONTENT.faq : (window.FAQ || []);
  function applyRemote(j) {
    applyContent(j.content || {});
    if (Array.isArray(j.xpLevels) && j.xpLevels.length) XPL = j.xpLevels;
    if (j.students) {
      STUDENTS = j.students.map(normStu); SUBS = j.subs || []; QATT = j.attempts || []; ASKS = j.asks || []; NOTES = j.notes || []; STATS = null; INTER = j.inter || []; STAR = j.star || null;
      BOARD = STUDENTS.slice().sort((a, b) => xpOf(b) - xpOf(a)).map(s => ({ name: s.name, github: s.github, cw: commitLv(s), lv: ptsLv(s) }));
    } else { BOARD = j.board || []; STATS = j.stats || null; }
  }
  /* يصل المتدرب فقط الاختبارات والمهام المفتوحة، من السيرفر بعد تسجيل الدخول */
  function applySecure(sec) {
    if (!sec) return;
    Object.entries(sec.quizzes || {}).forEach(([n, v]) => { QZ[n] = v; });
    const T = window.TASKS;
    Object.entries(sec.tasks || {}).forEach(([id, v]) => { const a = T.assignments.find(x => x.id === id); if (a) Object.assign(a, v); });
    if (sec.project) Object.assign(T.project, sec.project);
  }
  function applyMe(m) {
    STUDENTS = [normStu(m.me)]; MINE = m.subs || []; NOTES = m.notes || []; ASKS = m.asks || []; MYRANK = { rank: m.rank, total: m.total }; INTER = m.inter || []; STAR = m.star || null;
    if (m.board) BOARD = m.board;
    STATS = m.stats || null;
    applySecure(m.secure);
  }
  function logout() { store.del("sess"); store.del("meData"); store.del("remote"); try { sessionStorage.removeItem("dab_full"); } catch (e) {} location.href = location.pathname; }
  async function loadRemote() {
    if (!API()) return false;
    try {
      if (isStaff) { const j = await api("full"); if (j.err === "pin") { logout(); return false; } if (!j.ok) throw 0; ss.set("full", j); applyRemote(j); return true; }
      const j = await getData(); if (!j.ok) throw 0; store.set("remote", j); applyRemote(j);
      if (me) { const m = await api("me"); if (m.err === "auth") { logout(); return false; } if (m.ok) { applyMe(m); store.set("meData", m); } }
      return true;
    } catch (e) { return false; }
  }

  /* الأقفال: q1..q8 اختبارات · a1..a4 مهام · p5 المشروع */
  const UNL = () => Array.isArray(S.unlocked) ? S.unlocked : [];
  const canSee = id => isStaff || UNL().includes(id);
  const tm = () => S.sessionTime ? " · " + esc(S.sessionTime) : "";
  const TK = () => window.TASKS || { assignments: [], project: {} };
  const PF_DEF = [
    { id: "team", label: "اسم الفريق (أو اسمك إن كان فرديًا)", type: "text", ph: "مثال: Insight Squad", hint: "", req: true },
    { id: "leader", label: "صاحب المشروع / قائد الفريق", type: "text", ph: "الاسم", hint: "", req: true },
    { id: "members", label: "أعضاء الفريق (إن وُجدوا)", type: "text", ph: "أسماء الأعضاء مفصولة بفاصلة", hint: "", req: false },
    { id: "title", label: "عنوان المشروع", type: "text", ph: "مثال: Chat with Your Sales Data", hint: "", req: true },
    { id: "github", label: "رابط GitHub", type: "link", ph: "https://github.com/username/repo", hint: "رابط المستودع، ويجب أن يحوي README", req: true },
    { id: "demo", label: "رابط العرض التقديمي أو الـ Demo", type: "link", ph: "https://…", hint: "Presentation (Google Slides / PDF) أو تطبيق Streamlit / Colab", req: true },
    { id: "desc", label: "وصف مختصر", type: "long", ph: "ما المشكلة؟ ما البيانات؟ ما النموذج؟", hint: "", req: false }];
  const projFields = () => { const f = (TK().project || {}).fields; return Array.isArray(f) && f.length ? f : PF_DEF; };

  const P = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    check: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9.5 14l2 2 3.5-4"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
    rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5M14 4c3 0 6 0 6 0s0 3 0 6c0 4-4 7-8 8l-4-4c1-4 4-8 6-10z"/><circle cx="15" cy="9" r="1.5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.6 3.5 5.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/><path d="M12 15v2"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10l5-3v10l-5-3"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
    chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6 8.5-6"/>',
    menu: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    out: '<path d="M7 17L17 7M9 7h8v8"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
  };
  const ico = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  const ic3 = (n, cls = "") => `<img class="ic3 ${cls}" src="img/ic-${n}.webp" alt="" width="64" height="64" loading="lazy" decoding="async">`;

  const lockedCard = (label, sub, cls = "", lines = 4) => `<div class="lk ${cls}" role="button" tabindex="0" aria-label="${esc(label)} — مقفل"><div class="lk-ghost" aria-hidden="true">${Array.from({ length: lines }, (_, i) => `<i style="width:${[72, 94, 58, 84, 66, 90, 50, 78][i % 8]}%"></i>`).join("")}</div><div class="lk-badge">${ico("lock", "ico lg")}<b>${esc(label)}</b><small>${esc(sub || "مقفل — يفتحه المدربـة في الوقت المناسب")}</small></div></div>`;
  const lockSw = (id, mini) => { if (!isTr) return ""; const on = UNL().includes(id); return `<button type="button" class="lock-sw ${on ? "on" : ""} ${mini ? "mini" : ""}" data-lock="${id}" title="${on ? "مفتوح للمتدربين — اضغطي لإعادة القفل" : "مقفل عن المتدربين — اضغطي للفتح"}">${ico(on ? "unlock" : "lock", "ico sm")}${mini ? "" : `<span>${on ? "مفتوح للمتدربين — اضغطي للقفل" : "مقفل عن المتدربين — اضغطي للفتح"}</span>`}</button>`; };
  async function toggleLock(id) {
    const set = new Set(UNL()); set.has(id) ? set.delete(id) : set.add(id);
    const n = cloneC(); n.site = Object.assign({}, n.site, { unlocked: [...set] });
    await saveContent(n, null); render();
  }
  function bindLocks() {
    $$("[data-lock]").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleLock(b.dataset.lock); });
    $$(".lk").forEach(el => { const f = () => toast("🔒 مقفل — سيفتحه المدربـة في الوقت المناسب"); el.onclick = f; el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; });
  }

  function today() {
    const p = Q.get("today");
    const d = p ? new Date(p + "T12:00:00") : new Date();
    d.setHours(12, 0, 0, 0); return d;
  }
  function sessionDate(i) {
    const o = SES[i] && SES[i].date;
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return new Date(o + "T12:00:00");
    const d = new Date(S.startDate + "T12:00:00");
    const per = (S.sessionDays || []).length || 1;
    d.setDate(d.getDate() + Math.floor(i / per) * 7 + (S.sessionDays[i % per] || 0)); return d;
  }
  const sessionStart = i => { const d = sessionDate(i); d.setHours(S.sessionHour ?? 20, +S.sessionMinute || 0, 0, 0); return d; };
  const dayDiff = i => Math.round((sessionDate(i) - today()) / 864e5);
  const status = i => { const d = dayDiff(i); return d < 0 ? "past" : d === 0 ? "today" : "up"; };
  const fmtLong = d => d.toLocaleDateString("ar-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" });
  const fmtShort = d => d.getDate() + "/" + (d.getMonth() + 1);
  const fmtDue = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? fmtShort(new Date(s.slice(0, 10) + "T12:00:00")) : String(s || "");
  const nextIdx = () => { for (let i = 0; i < SES.length; i++) if (dayDiff(i) >= 0) return i; return -1; };
  const projW = () => WK.find(w => w.project);
  const trainW = () => WK.filter(w => !w.project);
  const projStart = () => { const d = new Date(S.startDate + "T12:00:00"); d.setDate(d.getDate() + trainW().length * 7); return d; };
  const projEnd = () => { if (S.endDate && /^\d{4}-\d{2}-\d{2}$/.test(S.endDate)) return new Date(S.endDate + "T12:00:00"); const d = projStart(); d.setDate(d.getDate() + 6); return d; };
  const curWeekN = () => { const ni = nextIdx(); return ni >= 0 ? SES[ni].week : (projW() ? projW().n : SES[SES.length - 1].week); };
  const openSess = () => { const n = +S.checkinOpen || 0, at = Date.parse(S.checkinAt || ""); return n && at && Date.now() - at < 4 * 3600e3 ? n : 0; };
  function dueLate(a) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec((a && a.due) || ""); if (!m) return false;
    const d = new Date(m[1] + "T23:59:59"); return Date.now() > d.getTime() && !Q.get("today");
  }

  function stat(key, cols) {
    let ok = 0, tot = 0, bad = 0, mid = 0;
    STUDENTS.forEach(s => s[key].forEach((v, i) => {
      if (cols && !cols.includes(i)) return;
      if (v === null || v === undefined) return;
      tot++; if (v === 1) ok++; else if (v === 2) mid++; else bad++;
    }));
    const good = ok + mid;
    return { ok, mid, bad, tot, good, pct: tot ? Math.round(good / tot * 100) : 0 };
  }
  const pctOf = arr => { let ok = 0, t = 0; arr.forEach(v => { if (v === null || v === undefined) return; t++; if (v === 1 || v === 2) ok++; }); return t ? Math.round(ok / t * 100) : 0; };
  const okV = v => v === 1 || v === 2;
  const hwDoneFor = (s, a) => okV(s.hw[a.week * 2 - 2]) || okV(s.hw[a.week * 2 - 1]);

  const bestMap = () => {
    if (API() && me) { const s = STUDENTS.find(x => x.name === me), o = {}; Object.entries((s && s.quiz) || {}).forEach(([n, v]) => { o[n] = { score: v[0], total: v[1] }; }); return o; }
    return store.get("quiz", {});
  };
  const localPoints = () => Object.values(bestMap()).reduce((a, r) => a + r.score * 10 + (r.score === r.total ? 10 : 0), 0);
  const showPts = () => isStaff || !API();
  function board() {
    if (API() && !isStaff) return BOARD.map(b => { const mine = b.name === me, st = mine ? stuOf(me) : null; return { name: b.name, github: b.github, cw: st ? commitLv(st) : b.cw, lv: st ? ptsLv(st) : b.lv, me: mine, pts: st ? xpOf(st) : null }; });
    const loc = API() ? 0 : localPoints();
    const list = STUDENTS.map(s => ({ name: s.name, github: s.github, pts: xpOf(s), cw: commitLv(s), lv: ptsLv(s), me: false, tmp: false }));
    if (me) {
      const r = list.find(x => x.name === me), st = stuOf(me), extra = Math.max(0, loc - ((st && st.points) || 0));
      if (r) { r.me = true; if (extra) { r.pts += extra; r.tmp = true; } }
      else if (loc > 0) list.push({ name: me, pts: loc, cw: 0, lv: 0, me: true, tmp: true });
    }
    return list.sort((a, b) => b.pts - a.pts);
  }

  /* XP والأوسمة: يجب أن تطابق Code.gs */
  const XP = { att: 10, late: 5, hw: 20, hwLate: 10, share: 5, react: 2 };
  function xpOf(s) {
    let x = (s.points || 0) + (s.subPts || 0) + ((s.inter && s.inter.pts) || 0);
    Object.values(s.quiz || {}).forEach(v => { x += v[0] * 10 + (v[0] === v[1] ? 10 : 0); });
    (s.att || []).forEach(v => { if (v === 1) x += XP.att; else if (v === 2) x += XP.late; });
    (s.hw || []).forEach(v => { if (v === 1) x += XP.hw; else if (v === 2) x += XP.hwLate; });
    return x;
  }
  function weekDone(s, w) {
    const a = 2 * w - 2, b = 2 * w - 1;
    if (!okV(s.att[a]) || !okV(s.att[b])) return false;
    if (UNL().includes("a" + w) && !okV(s.hw[a]) && !okV(s.hw[b])) return false;
    for (const n of [a + 1, b + 1]) if (UNL().includes("q" + n) && !(s.quiz || {})[n]) return false;
    return true;
  }
  function commitLv(s) { if (!s.att) return s.cw || 0; let best = 0, c = 0; trainW().forEach(w => { if (weekDone(s, w.n)) { c++; best = Math.max(best, c); } else c = 0; }); return Math.min(best, 4); }
  const ptsLv = s => s.att ? XPL.filter(t => xpOf(s) >= t).length : (s.lv || 0);
  const BD = k => ((window.BADGES || {})[k] || []);
  function mainBadge(x) {
    const cw = commitLv(x), lv = ptsLv(x);
    if (cw) return { kind: "commit", lv: cw, b: BD("commit")[cw - 1] || { t: "", d: "" } };
    if (lv) return { kind: "points", lv, b: BD("points")[lv - 1] || { t: "", d: "" } };
    return null;
  }
  function badgeSvg(kind, lv, size = 40, off = false) {
    const b = BD(kind)[lv - 1] || {}, c1 = off ? "#d5dbe4" : (b.c || "#468BE6"), c2 = off ? "#aab3c0" : (b.c2 || c1), id = "bg" + kind[0] + lv + (off ? "o" : "");
    const shape = kind === "commit" ? "M32 3l25 9v17c0 16-10.5 27-25 32C17.5 56 7 45 7 29V12z" : "M32 3l26 15v28L32 61 6 46V18z";
    const inner = kind === "commit"
      ? `<path d="M32 14l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L32 32.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#fff"/>` + Array.from({ length: lv }, (_, i) => `<circle cx="${32 + (i - (lv - 1) / 2) * 7}" cy="45" r="2.4" fill="#fff"/>`).join("")
      : [0, 1, 2, 3].map(i => `<rect x="${19.5 + i * 7}" y="${43 - (6 + i * 5)}" width="5" height="${6 + i * 5}" rx="1.5" fill="#fff" opacity="${i < lv ? 1 : .35}"/>`).join("");
    return `<svg class="bsvg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="${shape}" fill="url(#${id})"/><path d="${shape}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/><g style="filter:drop-shadow(0 1px 0 rgba(90,50,0,.35))">${inner}</g></svg>`;
  }
  const badgeChip = (m, sm) => m ? `<span class="bdg2 ${sm ? "sm" : ""} k-${m.kind}" title="${esc(m.b.t)} — ${esc(m.b.d)}">${badgeSvg(m.kind, m.lv, sm ? 18 : 24)}<b>${esc(m.b.t)}</b></span>` : "";

  /* ===== صورة مباركة الوسام (بنفس ثيم وخط الصورة الترحيبية) ===== */
  const SHARE_TAGS = "#نيوتك_لمستقبل_تقني #مسار_البيانات_الذكي";
  const SHARE_FONT = '"IBM Plex Sans Arabic", Tahoma, Arial, sans-serif';
  let shareBg = null;
  const loadShareBg = () => shareBg || (shareBg = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = "img/share-bg.jpg"; }));
  async function loadShareFont() {
    try { await Promise.race([Promise.all([500, 600, 700].map(w => document.fonts.load(`${w} 40px "IBM Plex Sans Arabic"`, "مبروك الوسام"))), new Promise(r => setTimeout(r, 3500))]); } catch (e) {}
  }
  function drawBadgeCanvas(ctx, kind, lv, cx, cy, size) {
    const b = BD(kind)[lv - 1] || {}, c1 = b.c || "#468BE6", c2 = b.c2 || c1, k = size / 64;
    ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(k, k);
    const shape = new Path2D(kind === "commit" ? "M32 3l25 9v17c0 16-10.5 27-25 32C17.5 56 7 45 7 29V12z" : "M32 3l26 15v28L32 61 6 46V18z");
    const g = ctx.createLinearGradient(0, 3, 0, 61); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.shadowColor = c1; ctx.shadowBlur = 60 / k; ctx.fillStyle = g; ctx.fill(shape);
    ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke(shape);
    ctx.shadowColor = "rgba(40,20,0,.35)"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 1; ctx.fillStyle = "#fff";
    if (kind === "commit") {
      ctx.fill(new Path2D("M32 14l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L32 32.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z"));
      for (let i = 0; i < lv; i++) { ctx.beginPath(); ctx.arc(32 + (i - (lv - 1) / 2) * 7, 45, 2.4, 0, 7); ctx.fill(); }
    } else {
      for (let i = 0; i < 4; i++) { const h = 6 + i * 5; ctx.globalAlpha = i < lv ? 1 : .35; ctx.beginPath(); ctx.roundRect(19.5 + i * 7, 43 - h, 5, h, 1.5); ctx.fill(); }
    }
    ctx.restore();
  }
  const SHARE_WHY = {
    commit: ["وذلك تقديرًا لالتزامك أسبوعًا كاملًا", "وذلك تقديرًا لالتزامك أسبوعين متتاليين", "وذلك تقديرًا لالتزامك 3 أسابيع متتالية", "وذلك تقديرًا لالتزامك الأسابيع الأربعة كلها"],
    points: b => `وذلك تقديرًا لجمعك ${b.xp} نقطة (XP)`
  };
  async function makeBadgeImage(kind, lv, name) {
    const b = BD(kind)[lv - 1]; if (!b) throw new Error("badge");
    const [bg] = await Promise.all([loadShareBg(), loadShareFont()]);
    const W = 1080, H = 1350, k = W / 922, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"); ctx.direction = "rtl"; ctx.textBaseline = "middle"; ctx.drawImage(bg, 0, 0, W, H); ctx.scale(k, k);
    const CX = 461, ACC = "#5CC8F2", font = (w, px) => `${w} ${px}px ${SHARE_FONT}`;
    const fit = (txt, w, px, max) => { ctx.font = font(w, px); while (px > 14 && ctx.measureText(txt).width > max) { px -= 1; ctx.font = font(w, px); } return px; };
    const line = (txt, y, w, px, color, max) => { px = fit(txt, w, px, max || 760); ctx.save(); ctx.textAlign = "center"; ctx.font = font(w, px); ctx.fillStyle = color; ctx.fillText(txt, CX, y); ctx.restore(); };
    /* الشريط العلوي: الوسوم يسارًا — الشعار مدمج في الخلفية يمينًا */
    ctx.save(); ctx.font = font(700, 17); ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText("#نيوتك_لمستقبل_تقني | #مسار_البيانات_الذكي", 60, 105); ctx.restore();
    /* العنوان */
    line("نبارك حصولك على:", 293, 700, 40, "#fff");
    ctx.save(); ctx.font = font(700, 40); ctx.textAlign = "left";
    const pre = "وســام ", wp = ctx.measureText(pre).width, nm0 = b.t, px2 = fit(nm0, 700, 40, 560); ctx.font = font(700, px2);
    const wn = ctx.measureText(nm0).width, wp2 = (ctx.font = font(700, px2), ctx.measureText(pre).width), x0 = CX + (wp2 + wn) / 2;
    ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.fillText(pre, x0, 368); ctx.fillStyle = ACC; ctx.fillText(nm0, x0 - wp2, 368); ctx.restore();
    const why = kind === "commit" ? SHARE_WHY.commit[lv - 1] : SHARE_WHY.points(b);
    line(why, 441, 400, 24, "#fff");
    /* الدرع في المنتصف */
    drawBadgeCanvas(ctx, kind, lv, CX, 665, 300);
    /* اسم المتدرب */
    const nm = String(name || "").trim();
    if (nm) line(nm, 958, 700, 40, "#fff", 760);
    line("متدرب - معسكر مسار البيانات الذكي", 1033, 400, 22, "#6CB8E8");
    return new Promise((res, rej) => cv.toBlob(bl => bl ? res(bl) : rej(new Error("blob")), "image/png"));
  }
  async function openBadgeShare(key, name) {
    const [kind, n] = String(key).split(":"), lv = +n + 1, b = BD(kind)[lv - 1]; if (!b) return;
    openDlg(`<h3>${ico("trophy")} مبروك! وسام «${esc(b.t)}»</h3><div class="bshare-load muted">جارٍ تجهيز الصورة…</div>`); dlg.classList.add("bshare");
    dlg.addEventListener("close", () => dlg.classList.remove("bshare"), { once: true });
    try {
      const blob = await makeBadgeImage(kind, lv, name), url = URL.createObjectURL(blob), file = new File([blob], `وسام-${b.t}.png`, { type: "image/png" });
      const text = `🎉 حصلتُ على وسام «${b.t}» في معسكر مسار البيانات الذكي\n${SHARE_TAGS}`, canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
      openDlg(`<h3>${ico("trophy")} مبروك! وسام «${esc(b.t)}»</h3><img class="bshare-img" src="${url}" alt="صورة مباركة بوسام ${esc(b.t)}"><p class="muted bshare-tags" dir="rtl">شاركها مع الهاشتاقات: <b>${SHARE_TAGS}</b></p>
        <div class="row">${canShare ? '<button class="btn btn-pri" id="bsShare">مشاركة</button>' : ""}<a class="btn ${canShare ? "" : "btn-pri"}" id="bsDl" href="${url}" download="${esc("وسام-" + b.t)}.png">تنزيل الصورة</a><button class="btn" id="bsTags">نسخ الهاشتاقات</button><button class="btn" id="bsX">إغلاق</button></div>`);
      dlg.addEventListener("close", () => URL.revokeObjectURL(url), { once: true });
      $("#bsX").onclick = closeDlg;
      $("#bsTags").onclick = async () => { try { await navigator.clipboard.writeText(SHARE_TAGS); toast("تم نسخ الهاشتاقات ✓"); } catch (e) { toast(SHARE_TAGS); } };
      if (canShare) $("#bsShare").onclick = async () => { try { await navigator.share({ files: [file], text }); } catch (e) {} };
    } catch (e) { openDlg(`<h3>تعذّر تجهيز الصورة</h3><p class="muted">حاول مرة أخرى بعد قليل.</p><div class="row"><button class="btn" id="bsX">إغلاق</button></div>`); $("#bsX").onclick = closeDlg; }
  }
  document.addEventListener("click", e => { const c = e.target.closest(".bcell.on[data-bd]"); if (c) openBadgeShare(c.dataset.bd, c.dataset.nm); });
  document.addEventListener("keydown", e => { if (e.key !== "Enter" && e.key !== " ") return; const c = e.target.closest && e.target.closest(".bcell.on[data-bd]"); if (c) { e.preventDefault(); openBadgeShare(c.dataset.bd, c.dataset.nm); } });

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 3400 + (msg.length > 60 ? 4000 : 0)); }
  const dlg = $("#dlg");
  function openDlg(inner) { dlg.innerHTML = inner; if (!dlg.open) dlg.showModal(); }
  function closeDlg() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("click", e => { if (e.target === dlg) closeDlg(); });
  document.addEventListener("click", e => $$("details.menu[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; }));

  const roleName = () => isTr ? "المدربـة" : isAd ? "الإداري/ة" : "";
  function updateChip() { $("#meChip").textContent = sess ? (isStaff ? roleName() + " · " : "") + sess.name : "دخول"; }
  function askMe() {
    if (!sess) return showGate();
    const s = me ? stuOf(me) : null, m = s ? mainBadge(s) : null;
    openDlg(`<h3>${isStaff ? "حساب " + roleName() : "حسابي"}</h3>
      <div class="acct">${avHtml(sess.name, "av lg")}<div><b>${esc(sess.name)}</b>${s && s.github ? `<br><a class="mono" href="https://github.com/${esc(s.github)}" target="_blank" rel="noopener">@${esc(s.github)}</a>` : ""}${sess.email ? `<br><small class="muted" dir="ltr">${esc(sess.email)}</small>` : ""}${m ? `<div style="margin-top:6px">${badgeChip(m)}</div>` : ""}</div></div>
      ${me && sess.code ? `<div class="mycode"><span class="mc-l">رمز دخولك</span><b class="mono mc-v" id="myCode">••••••</b><button class="btn btn-sm" id="showCode" type="button">إظهار</button></div>` : ""}
      ${isAd ? '<p class="muted" style="font-size:13.5px;margin:12px 0 0">صلاحيتك مثل المدربـة، ما عدا: فتح وقفل الاختبارات والمهام والمشروع، وأقسام الإدارة «الموقع والنصوص» و«الاختبارات والمهام» و«التسليمات».</p>' : ""}
      <div class="row"><button class="btn btn-pri" id="clsBtn">إغلاق</button><button class="btn" id="outBtn">تسجيل الخروج</button></div>`);
    $("#outBtn").onclick = logout;
    $("#clsBtn").onclick = closeDlg;
    const sc = $("#showCode"); if (sc) sc.onclick = () => { const v = $("#myCode"), on = sc.dataset.on === "1"; v.textContent = on ? "••••••" : sess.code; sc.dataset.on = on ? "" : "1"; sc.textContent = on ? "إظهار" : "إخفاء"; };
  }
  const ensureMe = cb => me ? cb() : toast("سجّل الدخول كمتدرب لإرسال النتائج");

  async function submitRecord(kind, payload, title) {
    if (S.formEndpoint) {
      try {
        const r = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ kind, ...payload }) });
        if (r.ok) return "endpoint";
      } catch (e) {}
    }
    const body = Object.entries(payload).map(([k, v]) => "**" + k + ":** " + v).join("\n\n");
    window.open("https://github.com/" + S.repo + "/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body) + "&labels=" + encodeURIComponent(kind), "_blank", "noopener");
    return "issue";
  }

  function ringSvg(segments, centerText, size = 130) {
    const r = 48, C = 2 * Math.PI * r; let acc = 0;
    const arcs = segments.map(s => {
      const len = C * s.v; const o = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.c}" stroke-width="12" stroke-linecap="butt" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`;
      acc += len; return o;
    }).join("");
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(centerText)}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#E6EEFB" stroke-width="12"/>${arcs}<text x="60" y="68" text-anchor="middle" class="big">${esc(centerText)}</text></svg>`;
  }
  function confetti() {
    if (reduced) return;
    const cv = $("#confetti"), ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#0040A8", "#22B8F0", "#10B981", "#FFD84D", "#D9E8FF", "#072971"];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .4, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.floor(Math.random() * cols.length)] }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (++f < 200) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  function animate() {
    $$("[data-count]").forEach(el => {
      const target = +el.dataset.count, suf = el.dataset.suf || "";
      if (reduced) { el.textContent = target + suf; return; }
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * e) + suf;
        if (k < 1 && el.isConnected) requestAnimationFrame(step);
      })(t0);
    });
    setTimeout(() => { $$("[data-w]").forEach(e => { e.style.width = e.dataset.w + "%"; }); $$("[data-h]").forEach(e => { e.style.height = Math.max(2, +e.dataset.h) + "%"; }); }, 60);
  }
  const PH_IC = { agenda: "calendar", tracker: "chart", quiz: "checklist", projects: "rocket", faq: "chat", admin: "dashboard" };
  const PH_EN = { agenda: "Agenda & Resources", tracker: "Progress Tracker", quiz: "Practice Hub", projects: "Final Project", faq: "Help Center", admin: "Control Panel" };
  const pageHead = (kicker, title, sub) => `<div class="pagehead"><div class="container"><div class="ph-in"><div class="ph-tx">${PH_EN[PAGE] ? `<span class="ph-k">${PH_EN[PAGE]}</span>` : ""}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${PH_IC[PAGE] ? `<div class="ph-art" aria-hidden="true"><img class="ph-ic" src="img/ic-${PH_IC[PAGE]}.webp" alt="" width="150" height="150"></div>` : ""}</div></div></div>`;

  function liveBtn(s, sm) {
    const cls = "btn btn-live" + (sm ? " btn-sm" : "");
    if (isStaff) return `<button type="button" class="${cls}" data-link="${s.n}">${ico("video", "ico sm")} رابط الجلسة${s.link ? " · تعديل" : " · إضافة"}</button>`;
    return s.link ? `<a class="${cls}" href="${esc(s.link)}" target="_blank" rel="noopener">${ico("video", "ico sm")} رابط الجلسة</a>` : `<span class="${cls} off">${ico("video", "ico sm")} رابط الجلسة · قريبًا</span>`;
  }
  function linkDlg(n) {
    const s = SES[n - 1]; if (!s) return;
    openDlg(`<h3>رابط الجلسة ${n}</h3><p class="muted" style="font-size:14px;margin:0 0 10px">${esc(s.ar)}</p>
      <div class="fld"><label for="lnkIn">الرابط (Zoom / Meet / Teams…)</label><input type="url" id="lnkIn" dir="ltr" placeholder="https://…" value="${esc(s.link || "")}"><div class="err" id="lnkErr"></div></div>
      <div class="row"><button class="btn btn-pri" id="lnkOk">حفظ</button>${s.link ? `<a class="btn" href="${esc(s.link)}" target="_blank" rel="noopener">فتح</a><button class="btn" id="lnkDel">حذف الرابط</button>` : ""}<button class="btn" id="lnkX">إلغاء</button></div>`);
    const save = async link => {
      if (link && !isUrl(link)) return ($("#lnkErr").textContent = "أدخل رابطًا صحيحًا يبدأ بـ https://");
      $("#lnkOk").disabled = true;
      if (API()) { let r; try { r = await api("sessionLink", { n, link }); } catch (e) { r = { ok: false }; } if (!r.ok) { $("#lnkOk").disabled = false; return ($("#lnkErr").textContent = "تعذّر الحفظ، حاول مجددًا"); } }
      CONTENT.sessions = CONTENT.sessions || {}; CONTENT.sessions[n] = Object.assign({}, CONTENT.sessions[n], { link }); s.link = link;
      if (!API()) store.set("content", CONTENT);
      closeDlg(); toast(link ? "تم حفظ رابط الجلسة ✓ — يظهر للمتدربين الآن" : "حُذف رابط الجلسة"); render();
    };
    $("#lnkOk").onclick = () => save($("#lnkIn").value.trim());
    const d = $("#lnkDel"); if (d) d.onclick = () => save("");
    $("#lnkX").onclick = closeDlg;
  }
  const bindLinks = () => $$("[data-link]").forEach(b => b.onclick = e => { e.preventDefault(); linkDlg(+b.dataset.link); });

  function homeStats() {
    if (STATS && !isStaff) return STATS;
    const a = stat("att"), h = stat("hw"); return { attPct: a.pct, hwGood: h.good, hwTot: h.tot, n: STUDENTS.length };
  }

  /* ===== أخبار اليوم: نجم التفاعل ===== */
  const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  /* الاسم الثنائي: الأول + الأخير */
  const twoName = n => { const p = String(n || "").trim().split(/\s+/).filter(Boolean); return p.length <= 2 ? p.join(" ") : p[0] + " " + p[p.length - 1]; };
  const intPts = (sh, re) => sh * XP.share + re * XP.react;
  /* جمل تحفيزية بصيغة محايدة: [لشخص واحد، لأكثر من شخص] */
  const STAR_LINES = [
    ["تفاعلك يُلهم الزملاء ويصنع الفرق", "تفاعلكم يُلهم الزملاء ويصنع الفرق"],
    ["شكرًا لأنك تجعل الجلسة أكثر حياة وحماسًا", "شكرًا لأنكم تجعلون الجلسة أكثر حياة وحماسًا"],
    ["المشاركة الجريئة أول طريق التميّز", "المشاركة الجريئة أول طريق التميّز"],
    ["حضور لافت وتفاعل يستحق التصفيق 👏", "حضور لافت وتفاعل يستحق التصفيق 👏"],
    ["كل مشاركة تقرّبك خطوة من القمة", "كل مشاركة تقرّبكم خطوة من القمة"],
    ["بصمتك اليوم كانت واضحة، وننتظر المزيد!", "بصمتكم اليوم كانت واضحة، وننتظر المزيد!"]
  ];
  /* نفس منطق السيرفر: نجم اليوم الحالي، وإلا آخر يوم فيه تفاعل. يُستخدم عند تعديل المدرب ليتحدّث الرئيسية فورًا */
  function calcStar() {
    const names = new Set(STUDENTS.map(x => x.name)), by = {}, t = ymd(today());
    INTER.forEach(x => { const pt = intPts(x.shares, x.reacts); if (!names.has(x.name) || pt <= 0) return; const d = by[x.date] = by[x.date] || {}; d[x.name] = (d[x.name] || 0) + pt; });
    const days = Object.keys(by).sort(); if (!days.length) return null;
    const date = by[t] ? t : days[days.length - 1], d = by[date], max = Math.max(...Object.values(d));
    return { date, today: date === t, pts: max, names: Object.keys(d).filter(k => d[k] === max) };
  }
  function starBox() {
    const st = STAR, trophy = ic3("trophy", "news-ic");
    const head = `<span class="pin" aria-hidden="true"></span><div class="news-top"><span class="news-tag"><i></i>أخبار اليوم</span></div>`;
    if (!st || !st.names || !st.names.length) {
      return `<div class="news-wrap"><aside class="news news-empty" aria-label="أخبار اليوم">${head}${trophy}
        <h3>نجم اليوم الأكثر تفاعلًا</h3>
        <p class="news-quote">المنصّة تنتظر نجمها الأول… شاركوا في الجلسة وتفاعلوا في المجموعة وسيظهر اسمكم هنا 🚀</p>
        ${isStaff ? `<a class="news-hint" href="tracker.html?tab=inter${keepQ}">سجّلي نقاط التفاعل من المتابعة ← التفاعل</a>` : ""}</aside></div>`;
    }
    const many = st.names.length > 1, k = String(st.date).split("").reduce((t, c) => t + (+c || 0), 0), line = STAR_LINES[k % STAR_LINES.length][many ? 1 : 0];
    const when = st.today ? "اليوم" : "آخر تفاعل مسجّل", dt = fmtLong(new Date(st.date + "T12:00:00"));
    return `<div class="news-wrap"><aside class="news" aria-label="أخبار اليوم">${head}${trophy}
      <h3>${many ? "نجوم اليوم الأكثر تفاعلًا" : "نجم اليوم الأكثر تفاعلًا"}</h3>
      <ul class="news-names ${many ? "multi" : ""}">${st.names.map(n => `<li><span class="nm">${esc(twoName(n))}</span></li>`).join("")}</ul>
      <p class="news-quote">${esc(line)}</p>
      <div class="news-foot"><span class="news-pts">${ico("star", "ico sm")}${st.pts} نقطة تفاعل</span><span class="news-date">${when} · ${esc(dt)}</span></div></aside></div>`;
  }

  /* ===== حسابات المقدّم (م.أماسي) ===== */
  const PRES_LINKS = [["x", "X", "X", "تابعني على منصة X"], ["linkedin", "in", "LinkedIn", "تواصل معي مهنيًا"], ["portfolio", "globe", "البورتفوليو", "أعمالي ومشاريعي"]];
  function normLink(k, v) {
    v = String(v || "").trim(); if (!v) return "";
    if (/^https?:\/\//i.test(v)) return isUrl(v) ? v : "";
    if (k === "x" && /^@?[A-Za-z0-9_]{1,15}$/.test(v)) return "https://x.com/" + v.replace(/^@/, "");
    if (k === "linkedin" && /^(in|company)\//i.test(v)) return "https://www.linkedin.com/" + v;
    return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? "https://" + v : "";
  }
  const presName = () => String(S.presenter || "").replace(/^[^:：]*[:：]\s*/, "").trim() || "م.أماسي";
  function presDlg() {
    const L = S.presenterLinks || {}, items = PRES_LINKS.map(([k, ic, label, sub]) => ({ k, ic, label, sub, u: normLink(k, L[k]) })).filter(x => x.u);
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
    const mark = x => x.ic === "globe" ? ico("globe", "ico") : `<b class="pl-t" aria-hidden="true">${esc(x.ic)}</b>`;
    openDlg(`<div class="pres-card"><div class="pres-av" aria-hidden="true"><span>${esc(presName()[0] || "م")}</span></div>
      <h3>${esc(presName())}</h3><p class="muted pres-sub">تقديم وبرمجة المنصّة</p>
      ${items.length ? `<div class="pres-links">${items.map(x => `<a class="plink k-${x.k}" href="${esc(x.u)}" target="_blank" rel="noopener noreferrer"><span class="pl-i">${mark(x)}</span><span class="pl-tx"><b>${x.label}</b><small dir="ltr">${esc(host(x.u))}</small></span>${ico("out", "ico sm pl-go")}</a>`).join("")}</div>`
        : `<p class="muted" style="text-align:center;margin:16px 0 4px">الحسابات ستظهر هنا قريبًا.</p>${isTr ? '<p style="text-align:center;margin:0"><a class="btn-link" href="admin.html' + qs0() + '">أضيفي الروابط من الإدارة ← الموقع والنصوص</a></p>' : ""}`}
      <div class="row" style="justify-content:center"><button class="btn" id="presX" type="button">إغلاق</button></div></div>`);
    $("#presX").onclick = closeDlg;
  }

  function pageHome() {
    const st = homeStats(), done = SES.filter((_, i) => dayDiff(i) < 0).length;
    const ni = nextIdx(), list = board(), myRow = me ? list.find(x => x.me) : null, curWeek = curWeekN(), q = qs0(), open = openSess();

    let next;
    if (ni < 0) next = today() <= projEnd()
      ? `<span class="lab">أسبوع المشروع النهائي</span><h3>انتهت الجلسات وبقي المشروع</h3><p class="muted">آخر موعد: ${fmtLong(projEnd())}.</p>${canSee("p5") ? `<a class="btn btn-pri btn-sm" href="projects.html${q}">المشروع النهائي</a>` : ""}`
      : `<span class="lab">اكتمل المعسكر</span><h3>مبروك على الإنجاز</h3><p class="muted">لا تنسوا مراجعة المصادر.</p>`;
    else {
      const s = SES[ni], d = sessionDate(ni);
      next = `<span class="lab">${dayDiff(ni) === 0 ? "جلسة اليوم" : "الجلسة القادمة"} · ${s.n} من ${SES.length}</span>
        <h3>${esc(s.ar)}</h3><div class="en">${esc(s.en)}</div>
        <p class="muted" style="margin:8px 0 0">${fmtLong(d)}${tm()}</p>
        ${s.place ? `<p style="margin:6px 0 0"><b>المكان:</b> ${isUrl(s.place) ? `<a href="${esc(s.place)}" target="_blank" rel="noopener">${esc(s.place)}</a>` : esc(s.place)}</p>` : ""}
        ${S.nextNote ? `<p class="muted" style="margin:6px 0 0">${esc(S.nextNote)}</p>` : ""}
        ${open && me ? `<a class="live-banner" href="tracker.html${q}"><i></i>تسجيل الحضور مفتوح — سجّل الآن</a>` : ""}
        <div class="countdown"><div><b id="cdD">--</b><small>يوم</small></div><div><b id="cdH">--</b><small>ساعة</small></div><div><b id="cdM">--</b><small>دقيقة</small></div><div><b id="cdS">--</b><small>ثانية</small></div></div>
        <div class="next-acts"><a class="btn btn-pri" href="agenda.html?w=${s.week}${keepQ}#s${s.n}">${ico("cal", "ico sm")} تفاصيل الجلسة</a>${liveBtn(s)}</div>`;
    }

    const weeks = WK.map(w => {
      if (w.project) {
        const t = today(), st0 = projStart(), en = projEnd(), span = Math.max(1, Math.round((en - st0) / 864e5) + 1), el = Math.min(span, Math.max(0, Math.round((t - st0) / 864e5) + 1));
        return `<a class="wcard c-${w.color}" href="agenda.html?w=${w.n}${keepQ}"><span class="wn">${w.n}</span><h3>${esc(w.ar || w.title)}</h3><p>${esc(w.goal)}</p>
          <div class="cnt"><span>${t > en ? "اكتمل" : t >= st0 ? "جارٍ" : "قادم"}</span><span class="mono">${fmtShort(st0)} – ${fmtShort(en)}</span></div><div class="bar"><i data-w="${Math.round(el / span * 100)}"></i></div></a>`;
      }
      const all = SES.filter(s => s.week === w.n), d = all.filter(s => dayDiff(s.n - 1) < 0).length;
      return `<a class="wcard c-${w.color}" href="agenda.html?w=${w.n}${keepQ}"><span class="wn">${w.n}</span><h3>${esc(w.ar || w.title.split("&")[0].trim())}</h3><p>${esc(w.goal)}</p>
        <div class="cnt"><span>${d === all.length ? "اكتمل" : d === 0 && curWeek < w.n ? "قادم" : "جارٍ"}</span><span class="mono">${d}/${all.length}</span></div><div class="bar"><i data-w="${Math.round(d / all.length * 100)}"></i></div></a>`;
    }).join("");

    const about = `<section class="section" style="padding-top:10px"><div class="container">
      <div class="sec-head has-ic">${ic3("rocket", "ic3-h")}<h2>عن <span class="acc">المعسكر</span></h2></div>
      <div class="grid g2 about">
        <div class="card ab1">${ic3("idea")}<h3>نبذة</h3><p style="margin:0">${esc(S.about || "")}</p></div>
        <div class="card ab2">${ic3("target")}<h3>الفئة المستهدفة</h3><p style="margin:0">${esc(S.audience || "")}</p></div>
        <div class="card ab3">${ic3("layers")}<h3>المحاور</h3><ul class="plain">${(S.axes || []).map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>
        <div class="card ab4">${ic3("calendar")}<h3>توقيت المعسكر</h3><ul class="plain">${(S.timing || []).map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>
      </div></div></section>`;

    const tips = (S.notes || []).length ? `<section class="section" style="padding-top:0"><div class="container"><div class="tips-card">
      <h2>${ic3("checklist", "ic3-h")} تعليمات <span class="acc">المعسكر</span></h2>
      <ul class="tips">${S.notes.map(n => `<li>${ico("check", "ico sm")}<span>${esc(n)}</span></li>`).join("")}</ul></div></div></section>` : "";

    const top3 = list.slice(0, 3).map((p, i) => {
      const m = mainBadge(p);
      return `<div class="card stu">${avHtml(p.name)}<span class="rk">المركز ${i + 1}</span><h3>${esc(p.name)}</h3>
        <div class="stu-b">${m ? badgeChip(m) : '<span class="muted" style="font-size:13px">يجمع أوسمته الأولى</span>'}</div>
        ${showPts() || p.me ? `<div class="row"><span>XP <b>${p.pts}</b></span></div>` : ""}</div>`;
    }).join("");

    const alertsBox = ALERTS.length || isStaff ?`<div class="next alerts"><span class="lab">${ic3("bell", "ic3-s")} تنبيهات مهمة</span>
        ${ALERTS.length ? `<ul class="notice">${ALERTS.map(a => `<li><span class="t ${esc(a.type)}">${a.type === "deadline" ? "موعد" : a.type === "important" ? "مهم" : "معلومة"}</span><span class="tx">${esc(a.text)}</span>${a.date ? `<span class="d">${esc(a.date)}</span>` : ""}</li>`).join("")}</ul>` : '<p class="muted" style="margin:8px 0 0">لا توجد تنبيهات. أضيفيها من الإدارة.</p>'}</div>` : "";
    return `
    <div class="container hero">
      <div>
        <h1>${esc(S.heroPre)} <span class="acc">${esc(S.heroAccent)}</span> ${esc(S.heroPost)}</h1>
        <p class="lead">${esc(S.heroLead)}</p>
        ${S.presenter ? `<button class="presenter" type="button" id="presBtn" aria-haspopup="dialog" title="حسابات ${esc(presName())}">${ico("code", "ico sm")}<span>${esc(S.presenter)}</span>${ico("out", "ico sm pr-go")}</button>` : ""}
        <p class="where">${S.progressNote ? esc(S.progressNote) : today() < new Date(S.startDate + "T12:00:00") ? `يبدأ المعسكر <b>${fmtLong(new Date(S.startDate + "T12:00:00"))}</b>.` : `نحن الآن في <b>الأسبوع ${curWeek} من ${WK.length}</b> — أنجزنا ${done} جلسة من ${SES.length}.`}</p>
      </div>
      <div class="hero-side">
        <div class="hs-stack">
          <div class="next">${next}</div>
          ${alertsBox}
        </div>
        ${starBox()}
      </div>
    </div>

    ${about}
    ${tips}

    <section class="section" style="padding-top:20px">
      <div class="container">
        <div class="sec-head has-ic">${ic3("chart", "ic3-h")}<h2>أين <span class="acc">وصلنا؟</span></h2></div>
        <div class="grid g5">${weeks}</div>
      </div>
    </section>

    <section class="section band">
      <div class="container stats">
        <div>${ic3("calendar", "ic3-st")}<span class="n" data-count="${st.attPct}" data-suf="%">0%</span><span class="l">نسبة الحضور العامة</span></div>
        <div>${ic3("checklist", "ic3-st")}<span class="n" data-count="${st.hwGood}">0</span><span class="l">مهمة مسلَّمة${st.hwTot ? " من " + st.hwTot : ""}</span></div>
        <div>${ic3("layers", "ic3-st")}<span class="n" data-count="${done}">0</span><span class="l">جلسة منجزة من ${SES.length}</span></div>
        <div>${ic3("target", "ic3-st")}<span class="n" data-count="${st.n}">0</span><span class="l">مشارك في المعسكر</span></div>
      </div>
    </section>

    ${list.length ? `<section class="section">
      <div class="container">
        <div class="sec-head has-ic">${ic3("trophy", "ic3-h")}<h2>المتدربون <span class="acc">المميزون</span></h2></div>
        <div class="grid g3">${top3}</div>
        <div class="mini"><span>${myRow ? `ترتيبك: <b>${list.indexOf(myRow) + 1}</b> من ${list.length} · ${myRow.pts} XP` : isStaff ? "مسجّل الدخول كـ" + roleName() : `<button class="btn-link" id="homeMe">سجّل دخولك</button> لترى ترتيبك`}</span><a class="btn btn-sm" href="tracker.html?tab=board${keepQ}">لوحة المتصدرين</a></div>
      </div>
    </section>` : ""}`;
  }
  function bindHome() {
    const b = $("#homeMe"); if (b) b.onclick = () => askMe();
    const pb = $("#presBtn"); if (pb) pb.onclick = presDlg;
    const ni = nextIdx();
    if (ni >= 0 && $("#cdD")) {
      const target = sessionStart(ni);
      const tick = () => {
        let diff = Math.max(0, Math.floor((target - (Q.get("today") ? today().getTime() : Date.now())) / 1000));
        $("#cdD").textContent = Math.floor(diff / 86400); diff %= 86400;
        $("#cdH").textContent = pad(Math.floor(diff / 3600)); diff %= 3600;
        $("#cdM").textContent = pad(Math.floor(diff / 60)); $("#cdS").textContent = pad(diff % 60);
      };
      tick(); timers.push(setInterval(tick, 1000));
    }
    animate();
  }

  let agendaWeek = null;
  function sessCard(s) {
    const i = s.n - 1, st = status(i), d = sessionDate(i);
    const yt = v => v.u || ("https://www.youtube.com/results?search_query=" + encodeURIComponent(v.q || v.t));
    const res = (u, ic, t, k) => u ? `<a class="btn btn-sm rbtn r-${k}" href="${esc(u)}" target="_blank" rel="noopener">${ico(ic, "ico sm")}${t}</a>` : `<span class="btn btn-sm off r-${k}" title="قريبًا">${ico(ic, "ico sm")}${t}</span>`;
    return `<article class="sess sc-${((s.n - 1) % 8) + 1} st-${st} ${st === "today" ? "today" : ""}" id="s${s.n}">
      <header><span class="no"><b>${pad(s.n)}</b>SESSION</span><span class="badge ${st}">${st === "past" ? "انتهت" : st === "today" ? "اليوم" : "قادمة"}</span></header>
      <h4>${esc(s.ar)}</h4><div class="en">${esc(s.en)}</div>
      <div class="date">${fmtLong(d)}${tm()}${s.place ? " · " + (isUrl(s.place) ? `<a href="${esc(s.place)}" target="_blank" rel="noopener">المكان</a>` : esc(s.place)) : ""}${s.link ? ` · <a class="live-link" href="${esc(s.link)}" target="_blank" rel="noopener">رابط الجلسة</a>` : ""}</div>
      <p>${esc(s.desc)}</p>
      <ul>${(s.topics || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="links">
        ${(s.refs || []).map(r => `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)}</a>`).join("")}
        ${(s.videos || []).map(v => `<a href="${esc(yt(v))}" target="_blank" rel="noopener">${esc(v.t)}</a>`).join("")}
      </div>
      <div class="acts">${res(s.slides, "file", "المحتوى", "content")}${res(s.colab, "code", "العملي", "lab")}${res(s.rec, "play", "التسجيل", "rec")}</div>
      ${isStaff ? `<button type="button" class="btn-link edit-link" data-link="${s.n}">✎ ${s.link ? "تعديل" : "إضافة"} رابط الجلسة</button>` : ""}
      </article>`;
  }
  function pageAgenda() {
    if (agendaWeek === null) {
      const w = Q.get("w");
      if (w !== null && +w >= 0 && +w <= WK.length) agendaWeek = +w;
      else agendaWeek = curWeekN();
    }
    const weeks = agendaWeek ? WK.filter(w => w.n === agendaWeek) : WK;
    return pageHead("الأجندة", "الأجندة والمصادر", "8 جلسات · 4 أسابيع · أسبوع للمشروع") + `
    <div class="container">
      <div class="tabs" role="tablist">
        <button class="tab ${agendaWeek === 0 ? "on" : ""}" data-w="0">كل الأسابيع</button>
        ${WK.map(w => `<button class="tab c-${w.color} ${agendaWeek === w.n ? "on" : ""}" data-w="${w.n}">الأسبوع ${w.n}</button>`).join("")}
      </div>
      ${weeks.map(w => `<div class="weekbox c-${w.color}"><div class="weekhead"><span class="wk-n">${w.n}</span><div><h3><small>WEEK ${w.n}</small>${esc(w.title)}${w.ar ? ` <span class="muted" style="font-weight:600;font-size:.8em">· ${esc(w.ar)}</span>` : ""}</h3><p>${esc(w.goal)}</p></div></div>${w.project
        ? `<div class="grid g2"><div class="card"><h4>أسبوع العمل على المشروع</h4><p class="muted" style="margin:0">من ${fmtLong(projStart())} إلى ${fmtLong(projEnd())}. لا جلسات في هذا الأسبوع؛ العمل على المشروع والتسليم.</p>${canSee("p5") ? `<p style="margin:12px 0 0"><a class="btn btn-pri btn-sm" href="projects.html${qs0()}">المشروع النهائي</a></p>${lockSw("p5")}` : ""}</div>${canSee("p5") ? "" : lockedCard("المشروع النهائي", "", "", 3)}</div>`
        : `<div class="grid g3">${SES.filter(s => s.week === w.n).map(sessCard).join("")}</div>`}</div>`).join("")}

      ${RES.some(r => !agendaWeek || r.week === agendaWeek) ? `<div class="block" style="margin-top:50px">
        <div class="sec-head has-ic">${ic3("layers", "ic3-h")}<h2>المصادر الأساسية <span class="acc">${agendaWeek ? "للأسبوع " + agendaWeek : "لكل أسبوع"}</span></h2></div>
        <div class="res-grid">${RES.filter(r => !agendaWeek || r.week === agendaWeek).map(r => { const w = WK.find(x => x.n === r.week); return `<div class="res-row c-${w.color}"><div class="w"><small>WEEK ${r.week}</small>${esc(r.label)}</div>${[["book", "الكتاب العلمي"], ["platform", "المنصة التعليمية"], ["channel", "قناة اليوتيوب"]].map(k => `<div><small>${k[1]}</small><a href="${esc(r[k[0]].u)}" target="_blank" rel="noopener">${esc(r[k[0]].t)}</a></div>`).join("")}</div>`; }).join("")}</div>
      </div>` : ""}
    </div>`;
  }
  function bindAgenda() {
    $$(".tab").forEach(b => b.onclick = () => { agendaWeek = +b.dataset.w; history.replaceState(null, "", "?w=" + agendaWeek + keepQ); render(); });
    if (location.hash) { const el = $(location.hash); if (el) setTimeout(() => el.scrollIntoView({ block: "center" }), 80); }
  }

  let tv = ["att", "hw", "inter", "board", "mine"].includes(Q.get("tab")) ? Q.get("tab") : "att", tWeek = 0, tQuery = "";
  const SYM = { att: { 1: "✓", 0: "✕", 2: "⏱" }, hw: { 1: "✓", 0: "✕", 2: "◐" } };
  const LBL = { att: { 1: "حاضر", 0: "غائب", 2: "متأخر / معتذر" }, hw: { 1: "مسلَّم", 0: "لم يُسلَّم", 2: "متأخر" } };

  const toolsMenu = () => `<details class="menu"><summary class="btn btn-sm">${ico("menu", "ico sm")} أدوات</summary><div class="menu-list">
      ${isStaff ? `<button type="button" data-m="edit">${trainer ? "إيقاف وضع التعديل" : "تفعيل وضع التعديل"}</button>` : ""}
      ${API() ? '<button type="button" data-m="refresh">↻ تحديث البيانات</button>' : ""}
      <button type="button" data-m="csv">تصدير CSV</button></div></details>`;
  function pageTracker() {
    if (tv === "mine" && !me) tv = "att";
    const tabs = [["att", "الحضور"], ["hw", "المهام"], ["inter", "التفاعل"], ["board", "المتصدرون"]].concat(me ? [["mine", "تقدّمي"]] : []);
    return pageHead("المتابعة", isStaff ? "متابعة المتدربين" : "متابعتي", isStaff ? "الحضور والمهام والتفاعل والترتيب." : "حضورك ومهامك وتفاعلك وترتيبك.") + `
    <div class="container">
      <div class="toolbar">
        <div class="seg" role="tablist">${tabs.map(t => `<button data-tv="${t[0]}" class="${tv === t[0] ? "on" : ""}">${t[1]}</button>`).join("")}</div>
        <span id="tcontrols" class="tctl"></span>
        ${isStaff ? toolsMenu() : ""}
      </div>
      <div id="attPanel"></div>
      <div id="tbody"></div>
    </div>`;
  }

  function renderTracker() {
    clearTimers();
    const body = $("#tbody"), ctl = $("#tcontrols"), ap = $("#attPanel");
    ap.innerHTML = tv === "att" ? attPanelHtml() : ""; if (tv === "att") bindAttPanel();
    if (tv === "mine") { ctl.innerHTML = ""; body.innerHTML = mineHtml(); bindMine(); return; }
    if (tv === "board") { ctl.innerHTML = ""; body.innerHTML = boardHtml(); animate(); return; }
    if (tv === "inter") { ctl.innerHTML = ""; body.innerHTML = interHtml(); bindInter(); return; }
    ctl.innerHTML = isStaff ? `<select id="tw" aria-label="الأسبوع"><option value="0">كل الأسابيع</option>${trainW().map(w => `<option value="${w.n}" ${tWeek === w.n ? "selected" : ""}>الأسبوع ${w.n}</option>`).join("")}</select>
      <input type="search" id="tq" placeholder="ابحث عن اسم…" value="${esc(tQuery)}" aria-label="بحث">` : "";
    if (isStaff) { $("#tw").onchange = e => { tWeek = +e.target.value; drawTable(); }; $("#tq").oninput = e => { tQuery = e.target.value; drawTable(); }; }
    drawTable();
  }

  /* ===== التفاعل (المدرب يسجّل، والمتدرب يرى نفسه) ===== */
  let iDate = "", iSrc = "جلسة", iQuery = "";
  const INT_SRC = [["جلسة", "في الجلسة"], ["سوشال", "على السوشال ميديا"]];
  const recalcInter = st => { const o = { shares: 0, reacts: 0, pts: 0 }; INTER.forEach(x => { if (x.name === st.name) { o.shares += x.shares; o.reacts += x.reacts; o.pts += intPts(x.shares, x.reacts); } }); st.inter = o; };
  const intRowOf = (name, date, src) => INTER.find(x => x.name === name && x.date === date && x.src === src);
  const stepper = (k, v) => `<span class="step"><button type="button" data-d="-1" aria-label="إنقاص">−</button><input type="number" inputmode="numeric" min="0" max="99" value="${v}" data-k="${k}" aria-label="${k === "shares" ? "مشاركات" : "تفاعلات"}"><button type="button" data-d="1" aria-label="زيادة">+</button></span>`;
  function interHtml() {
    if (!isStaff) return interMineHtml();
    if (!iDate) iDate = ymd(today());
    const rows = STUDENTS.map((s, idx) => ({ s, idx })).filter(r => r.s.name.includes(iQuery.trim()));
    const body = rows.map(({ s, idx }) => {
      const x = intRowOf(s.name, iDate, iSrc) || { shares: 0, reacts: 0 };
      return `<tr data-i="${idx}"><td>${avHtml(s.name)}${esc(s.name)}</td><td>${trainer ? stepper("shares", x.shares) : x.shares}</td><td>${trainer ? stepper("reacts", x.reacts) : x.reacts}</td><td class="pct" data-ipt>${intPts(x.shares, x.reacts)}</td><td class="pct" data-itot>${s.inter.pts}</td></tr>`;
    }).join("");
    return `<div class="card inter-card">
      <div class="inter-bar">
        <div class="fld"><label for="iDate">التاريخ</label><input type="date" id="iDate" value="${esc(iDate)}"></div>
        <div class="seg" role="tablist" aria-label="مصدر التفاعل">${INT_SRC.map(x => `<button type="button" data-src="${x[0]}" class="${iSrc === x[0] ? "on" : ""}">${x[1]}</button>`).join("")}</div>
        <input type="search" id="iq" placeholder="ابحث عن اسم…" value="${esc(iQuery)}" aria-label="بحث">
      </div>
      <p class="muted tnote">لكل متدرب: كم مرة <b>شارك</b> وكم مرة <b>تفاعل</b> في هذا اليوم. كل مشاركة = ${XP.share} نقاط، وكل تفاعل = ${XP.react}، وتُضاف إلى XP المتدرب ضمن حضوره ومهامه. الأعلى نقاطًا في اليوم يظهر في الرئيسية كـ«نجم اليوم» (ومع التعادل تظهر كل الأسماء).</p>
      ${trainer ? "" : '<div class="trainer-bar">وضع التعديل متوقف — فعّليه من «أدوات» لتسجيل التفاعل.</div>'}
      <div class="tbl-wrap"><table class="tr inter"><thead><tr><th>المتدرب</th><th>مشاركات</th><th>تفاعلات</th><th>نقاط اليوم</th><th>إجمالي نقاط التفاعل</th></tr></thead><tbody>${body || `<tr><td colspan="5" style="padding:24px">${STUDENTS.length ? "لا نتائج" : "لا يوجد متدربون بعد."}</td></tr>`}</tbody></table></div>
      <div class="inter-star" id="iStar"></div></div>`;
  }
  function drawInterStar() {
    const el = $("#iStar"); if (!el) return;
    const d = {}; INTER.filter(x => x.date === iDate).forEach(x => { d[x.name] = (d[x.name] || 0) + intPts(x.shares, x.reacts); });
    const max = Math.max(0, ...Object.values(d)), top = Object.keys(d).filter(k => d[k] === max);
    el.innerHTML = max > 0 ? `${ico("star", "ico sm")} الأعلى تفاعلًا في هذا اليوم: <b>${top.map(n => esc(twoName(n))).join(" · ")}</b> (${max} نقطة)` : '<span class="muted">لم يُسجَّل تفاعل في هذا اليوم بعد.</span>';
  }
  function bindInter() {
    if (!isStaff) return;
    drawInterStar();
    $("#iDate").onchange = e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { iDate = e.target.value; renderTracker(); } };
    $$("[data-src]").forEach(b => b.onclick = () => { iSrc = b.dataset.src; renderTracker(); });
    $("#iq").oninput = e => { iQuery = e.target.value; const pos = e.target.selectionStart; renderTracker(); const q = $("#iq"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} };
    if (!trainer) return;
    const tm = {}, tb = $("table.inter tbody");
    const commit = (tr, name, date, src) => {
      const sh = Math.min(99, Math.max(0, parseInt($("[data-k=shares]", tr).value) || 0)), re = Math.min(99, Math.max(0, parseInt($("[data-k=reacts]", tr).value) || 0));
      $("[data-k=shares]", tr).value = sh; $("[data-k=reacts]", tr).value = re;
      const st = STUDENTS[+tr.dataset.i]; let x = intRowOf(name, date, src);
      if (!sh && !re) { if (x) INTER.splice(INTER.indexOf(x), 1); } else if (x) { x.shares = sh; x.reacts = re; } else INTER.push({ id: "", date, name, src, shares: sh, reacts: re });
      recalcInter(st); $("[data-ipt]", tr).textContent = intPts(sh, re); $("[data-itot]", tr).textContent = st.inter.pts;
      STAR = calcStar(); drawInterStar();
      const key = name + "|" + date + "|" + src; clearTimeout(tm[key]);
      tm[key] = setTimeout(() => api("interSet", { name, date, src, shares: sh, reacts: re }).then(r => r.ok ? toast("تم حفظ التفاعل ✓") : toast(r.err === "action" ? "⚠️ السيرفر يعمل بنسخة Code.gs القديمة — حدّثيه وانشري نسخة جديدة" : "⚠️ لم يُحفظ على السحابة — تحقّقي من الاتصال")).catch(cloudFail), 500);
    };
    $$("tr[data-i]", tb).forEach(tr => {
      const name = STUDENTS[+tr.dataset.i].name, date = iDate, src = iSrc;
      $$("[data-d]", tr).forEach(b => b.onclick = () => { const inp = b.parentElement.querySelector("input"); inp.value = Math.min(99, Math.max(0, (parseInt(inp.value) || 0) + +b.dataset.d)); commit(tr, name, date, src); });
      $$("input[data-k]", tr).forEach(inp => inp.onchange = () => commit(tr, name, date, src));
    });
  }
  function interMineHtml() {
    const s = stuOf(me); if (!s) return '<div class="card"><p class="muted">سجّل الدخول لترى تفاعلك.</p></div>';
    const rows = INTER.filter(x => x.name === me).sort((a, b) => b.date.localeCompare(a.date) || a.src.localeCompare(b.src));
    return `<div class="grid g3 mstats">
      <div class="card mstat k-blue">${ico("chat", "ico lg")}<small>المشاركات</small><b>${s.inter.shares}</b><span>${XP.share} نقاط لكل مشاركة</span></div>
      <div class="card mstat k-green">${ico("bolt", "ico lg")}<small>التفاعلات</small><b>${s.inter.reacts}</b><span>${XP.react} لكل تفاعل</span></div>
      <div class="card mstat k-pink">${ico("star", "ico lg")}<small>نقاط التفاعل</small><b>${s.inter.pts}</b><span>تُضاف إلى XP الخاص بك</span></div></div>
      <div class="card" style="margin-top:18px"><h3>${ico("chat")} سجلّ تفاعلك</h3>
      ${rows.length ? `<div class="tbl-wrap"><table class="tr inter"><thead><tr><th>اليوم</th><th>المصدر</th><th>مشاركات</th><th>تفاعلات</th><th>النقاط</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(fmtLong(new Date(x.date + "T12:00:00")))}</td><td>${x.src === "سوشال" ? "السوشال ميديا" : "الجلسة"}</td><td class="mono">${x.shares}</td><td class="mono">${x.reacts}</td><td class="pct">${intPts(x.shares, x.reacts)}</td></tr>`).join("")}</tbody></table></div>`
        : '<p class="muted" style="margin:6px 0 0">لم يُسجَّل لك تفاعل بعد. شارك في الجلسة وتفاعل في المجموعة، ويسجّله المدرب لك فتُضاف نقاطك. 🌟</p>'}
      <p class="muted tnote" style="margin:12px 0 0">يظهر في الرئيسية «نجم اليوم» — الأعلى تفاعلًا في كل يوم.</p></div>`;
  }

  function boardHtml() {
    const list = board(), sp = showPts(), max = Math.max(1, ...list.map(x => x.pts || 0)), top = list.slice(0, 3);
    return `<div class="card"><div class="podium">${top.map((p, i) => { const m = mainBadge(p); return `<div class="pod p${i + 1}"><div class="pos">${i + 1}</div>${m ? badgeSvg(m.kind, m.lv, 34) : ""}<div class="nm">${esc(p.name)}</div>${sp || p.me ? `<div class="pt">${p.pts} XP</div>` : ""}</div>`; }).join("")}</div>
      ${sp ? "" : `<p class="privacy">${ico("lock", "ico sm")} نقاط زملائك خاصة بهم — ترى الأسماء والترتيب والأوسمة، ونقاطك أنت فقط.</p>`}
      <ol class="lb">${list.map((p, i) => { const m = mainBadge(p); return `<li class="${p.me ? "me" : ""}"><span class="rk">${i + 1}</span><span class="nm">${avHtml(p.name)}${esc(p.name)}${p.me ? " (أنت)" : ""}${m ? badgeChip(m, true) : ""}${p.tmp ? '<span class="tag" title="نقاط اختباراتك على هذا المتصفح">مؤقتة</span>' : ""}</span><span class="pts">${sp || p.me ? p.pts : ""}</span>${sp ? `<div class="track"><i data-w="${Math.round((p.pts || 0) / max * 100)}"></i></div>` : ""}</li>`; }).join("") || '<li class="muted">لا يوجد متدربون بعد.</li>'}</ol>
      <div class="howpts"><b>كيف تُحسب النقاط والأوسمة؟</b><ul class="plain">
        <li>الحضور: ${XP.att} نقاط في الوقت، و${XP.late} إذا تأخرت.</li>
        <li>المهمة: ${XP.hw} نقطة عند التسليم في وقته، و${XP.hwLate} إذا تأخرت.</li>
        <li>التفاعل: ${XP.share} نقاط لكل مشاركة، و${XP.react} لكل تفاعل (في الجلسة أو على السوشال ميديا) — يسجّله المدرب.</li>
        <li>الاختبار: 10 نقاط لكل إجابة صحيحة، و10 إضافية للعلامة الكاملة (المحاولة الأولى فقط).</li>
        <li>أوسمة الالتزام (درع): أسبوع كامل بحضور الجلستين والمهمة والاختبارات، وترتقي مع كل أسبوع متتالٍ.</li>
        <li>أوسمة النقاط (سداسي): تُجمع تدريجيًا حسب مجموع نقاطك.</li></ul></div></div>`;
  }

  function drawTable() {
    const isHw = tv === "hw", asg = TK().assignments || [], sym = SYM[tv];
    const cols = isHw ? asg.map((_, k) => k).filter(k => !tWeek || asg[k].week === tWeek) : SES.map((_, i) => i).filter(i => !tWeek || SES[i].week === tWeek);
    const ix = k => isHw ? asg[k].week * 2 - 1 : k;
    const valAt = (s, k) => { const v = s[tv][ix(k)]; if (v === null || v === undefined) return isHw && dueLate(asg[k]) ? 0 : null; return v; };
    const subOf = (s, k) => isHw ? (isStaff ? SUBS.find(x => x.key === asg[k].id && x.name === s.name) : MINE.find(x => x.key === asg[k].id)) : null;
    const rows = STUDENTS.map((s, idx) => ({ s, idx })).filter(r => r.s.name.includes(tQuery.trim()));
    const head = cols.map(k => isHw ? `<th title="${esc(asg[k].title)}">مهمة ${asg[k].week}<small>${asg[k].due ? esc(fmtDue(asg[k].due)) : "—"}</small></th>` : `<th title="${esc(SES[k].ar)}">S${SES[k].n}<small>${fmtShort(sessionDate(k))}</small></th>`).join("");
    const body = rows.map(({ s, idx }) => {
      let ok = 0, tot = 0;
      const cells = cols.map(k => {
        const v = valAt(s, k); if (v !== null) { tot++; if (okV(v)) ok++; }
        const inner = v === null ? "·" : sym[v], cls = "cell " + (v === null ? "" : "v" + v), sub = subOf(s, k);
        const tip = (v === null ? "لم تُسجَّل" : LBL[tv][v]) + (sub ? " — اضغط لفتح التسليم" : "");
        if (trainer) return `<td><button class="${cls}" data-r="${idx}" data-c="${ix(k)}" aria-label="تبديل الحالة" title="${tip}">${inner}</button>${sub ? `<a class="sublink" href="${esc(sub.link)}" target="_blank" rel="noopener" title="فتح التسليم">↗</a>` : ""}</td>`;
        return `<td>${sub ? `<a class="${cls}" href="${esc(sub.link)}" target="_blank" rel="noopener" title="${tip}">${inner}</a>` : `<span class="${cls}" title="${tip}">${inner}</span>`}</td>`;
      }).join("");
      const pts = xpOf(s) + (trainer ? ` <input type="text" inputmode="numeric" value="${s.points || 0}" data-p="${idx}" title="نقاط إضافية يدوية" class="pts-in">` : "");
      const pc = tot ? Math.round(ok / tot * 100) : null;
      return `<tr class="${s.name === me ? "me" : ""}"><td>${avHtml(s.name)}${esc(s.name)}</td>${cells}<td class="pct">${pc === null ? "—" : pc + "%"}${pc === null ? "" : `<div class="mbar"><i style="width:${pc}%"></i></div>`}</td><td class="pct">${pts}</td></tr>`;
    }).join("");
    const foot = cols.map(k => { let ok = 0, tot = 0; STUDENTS.forEach(s => { const v = valAt(s, k); if (v !== null) { tot++; if (okV(v)) ok++; } }); return `<td>${tot ? Math.round(ok / tot * 100) + "%" : "·"}</td>`; }).join("");
    const tb = $("#tbody");
    tb.innerHTML = `
      ${trainer ? `<div class="trainer-bar"><strong>وضع التعديل:</strong> ${API() ? "اضغطي أي خانة لتبديل الحالة — تُحفظ فورًا وتظهر للمتدرب." : "⚠️ التخزين السحابي غير مربوط: التعديلات تُحفظ على هذا المتصفح فقط."}</div>` : ""}
      ${isHw ? `<p class="muted tnote">تتحدّث تلقائيًا عند تسليم المتدرب: ✓ مسلَّم · ◐ متأخر · ✕ لم يُسلَّم بعد انتهاء الموعد.${isStaff ? " اضغطي الخانة لفتح ملف/رابط التسليم." : ""}</p>` : ""}
      <div class="tbl-wrap"><table class="tr"><thead><tr><th>الاسم</th>${head}<th>النسبة</th><th>XP</th></tr></thead><tbody>${body || `<tr><td colspan="${cols.length + 3}" style="padding:24px">${STUDENTS.length ? "لا نتائج" : isStaff ? "لا يوجد متدربون بعد — شاركي رابط التسجيل (الإدارة ← الإعدادات)." : "سجّل الدخول كمتدرب لترى متابعتك."}</td></tr>`}</tbody>${isStaff ? `<tfoot><tr><td>المتوسط</td>${foot}<td></td><td></td></tr></tfoot>` : ""}</table></div>
      <div class="key">${[1, 0, 2].map(v => `<span><span class="cell v${v}">${sym[v]}</span>${LBL[tv][v]}</span>`).join("")}<span><span class="cell">·</span>لم تُسجَّل بعد</span></div>`;
    if (trainer) {
      $$("button.cell", tb).forEach(b => b.onclick = () => {
        const r = +b.dataset.r, c = +b.dataset.c, cur = STUDENTS[r][tv][c] ?? null, order = [null, 1, 0, 2];
        const nv = order[(order.indexOf(cur) + 1) % 4], st = STUDENTS[r]; st[tv][c] = nv; drawTable(); persistCell(st, tv, c, nv);
      });
      $$("[data-p]", tb).forEach(inp => inp.onchange = () => { const st = STUDENTS[+inp.dataset.p]; st.points = Math.max(0, parseInt(inp.value) || 0); persistPoints(st); });
    }
  }
  function cloudFail() { toast("⚠️ لم يُحفظ على السحابة — تحقّقي من الاتصال ثم أعيدي التحديث"); }
  function persistCell(st, key, i, v) {
    if (!API()) return store.set("students", STUDENTS);
    api("cell", { name: st.name, key, i, v }).then(r => { if (!r.ok) cloudFail(); }).catch(cloudFail);
  }
  function persistPoints(st) {
    if (!API()) { store.set("students", STUDENTS); return toast("تم الحفظ على هذا المتصفح"); }
    api("points", { name: st.name, v: st.points }).then(r => r.ok ? toast("تم حفظ النقاط ✓") : cloudFail()).catch(cloudFail);
  }

  const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    const w16 = (a, v) => a.push(v & 255, (v >> 8) & 255), w32 = (a, v) => a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
    files.forEach(f => {
      const nm = enc.encode(f.name), crc = crc32(f.data), h = [];
      w32(h, 0x04034b50); w16(h, 20); w16(h, 0x0800); w16(h, 0); w16(h, 0); w16(h, 0x21); w32(h, crc); w32(h, f.data.length); w32(h, f.data.length); w16(h, nm.length); w16(h, 0);
      parts.push(new Uint8Array(h), nm, f.data);
      const c = []; w32(c, 0x02014b50); w16(c, 20); w16(c, 20); w16(c, 0x0800); w16(c, 0); w16(c, 0); w16(c, 0x21); w32(c, crc); w32(c, f.data.length); w32(c, f.data.length); w16(c, nm.length); w16(c, 0); w16(c, 0); w16(c, 0); w16(c, 0); w32(c, 0); w32(c, off);
      cen.push(new Uint8Array(c), nm); off += h.length + nm.length + f.data.length;
    });
    const cs = cen.reduce((t, x) => t + x.length, 0), e = []; w32(e, 0x06054b50); w16(e, 0); w16(e, 0); w16(e, files.length); w16(e, files.length); w32(e, cs); w32(e, off); w16(e, 0);
    return new Blob([...parts, ...cen, new Uint8Array(e)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  /* تصدير xlsx بدون مكتبات */
  function xlsxDownload(sheets, fname) {
    const enc = new TextEncoder(), X = t => String(t ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const colL = n => { let r = ""; n++; while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - 1) / 26); } return r; };
    const files = [], names = sheets.map((sh, i) => X(String(sh.name).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31)) || ("ورقة" + (i + 1)));
    sheets.forEach((sh, i) => {
      const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
        const ref = colL(ci) + (ri + 1);
        if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
        if (v === null || v === undefined || v === "") return "";
        return `<c r="${ref}" t="inlineStr"${ri === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${X(v)}</t></is></c>`;
      }).join("")}</row>`).join("");
      files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="${Math.max(1, (sh.rows[0] || []).length)}" width="22" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`) });
    });
    const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    files.unshift(
      { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`) },
      { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
      { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`) },
      { name: "xl/styles.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E8FF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`) });
    const a = document.createElement("a"); a.href = URL.createObjectURL(zipStore(files)); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function csvDownload(rows, fname) {
    const csv = "\ufeff" + rows.map(r => r.map(x => '"' + String(x ?? "").replace(/"/g, '""') + '"').join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = fname; a.click();
  }
  function exportCsv() {
    const asg = TK().assignments || [];
    const head = ["الاسم", "XP", "نقاط إضافية", "مشاركات", "تفاعلات", ...SES.map(s => "حضور " + s.n), ...asg.map(a => "مهمة " + a.week)];
    const rows = STUDENTS.map(s => [s.name, xpOf(s), s.points || 0, s.inter.shares, s.inter.reacts, ...SES.map((_, i) => s.att[i] == null ? "" : LBL.att[s.att[i]]), ...asg.map(a => { const v = s.hw[a.week * 2 - 1] ?? s.hw[a.week * 2 - 2]; return v == null ? (dueLate(a) ? "لم يُسلَّم" : "") : LBL.hw[v]; })]);
    csvDownload([head, ...rows], "tracker.csv");
  }

  function mineHtml() {
    const s = stuOf(me); if (!s) return '<div class="card"><p class="muted">لم نجد بياناتك بعد — حدّث الصفحة.</p></div>';
    const asg = TK().assignments || [], hwN = asg.filter(a => hwDoneFor(s, a)).length;
    const rec = s.att.filter(v => v != null).length, pres = s.att.filter(okV).length, qv = Object.values(s.quiz || {}), qAvg = qv.length ? Math.round(qv.reduce((t, v) => t + v[0] / v[1], 0) / qv.length * 100) : 0;
    return profileHtml() + `<div class="grid g4 mstats">
      <div class="card mstat k-blue">${ico("check", "ico lg")}<small>الحضور</small><b>${pctOf(s.att)}%</b><span>${pres} من ${rec} جلسة مسجّلة</span></div>
      <div class="card mstat k-green">${ico("file", "ico lg")}<small>المهام المسلَّمة</small><b>${hwN} / ${asg.length}</b><span>${MINE.filter(x => x.status === "مقبول").length} مقبولة</span></div>
      <div class="card mstat k-amber">${ico("quiz", "ico lg")}<small>الاختبارات</small><b>${qv.length} / ${QSES.length}</b><span>متوسط ${qAvg}%</span></div>
      <div class="card mstat k-pink">${ico("star", "ico lg")}<small>التفاعل</small><b>${s.inter.pts} نقطة</b><span>${s.inter.shares} مشاركة · ${s.inter.reacts} تفاعل</span></div></div>` + badgePathHtml(s);
  }
  function badgePathHtml(s) {
    const cw = commitLv(s), lv = ptsLv(s), xp = xpOf(s);
    const cell = (kind, b, i, on, sub) => `<div class="bcell ${on ? "on" : ""}"${on ? ` data-bd="${kind}:${i}" data-nm="${esc(s.name)}" role="button" tabindex="0" aria-label="${esc(b.t)} — اضغط لعرض صورة المباركة ومشاركتها"` : ""}>${badgeSvg(kind, i + 1, 58, !on)}<b>${esc(b.t)}</b><small>${esc(b.d)}</small>${sub ? `<small class="mono sub">${sub}</small>` : ""}${on ? '<small class="bshare-hint">اضغط للمشاركة ↗</small>' : ""}</div>`;
    return `<div class="card bpath"><h3>${ico("trophy")} مسار الأوسمة</h3>
      <h4>أوسمة الالتزام <small class="muted">— حضور الجلستين + مهمة الأسبوع + الاختبارات، أسبوعًا بعد أسبوع</small></h4>
      <div class="wkc-row">${trainW().map(w => `<span class="wkc ${weekDone(s, w.n) ? "on" : ""}">الأسبوع ${w.n} ${weekDone(s, w.n) ? "✓" : "…"}</span>`).join("")}</div>
      <div class="brow">${BD("commit").map((b, i) => cell("commit", b, i, cw >= i + 1)).join("")}</div>
      <h4>أوسمة النقاط <small class="muted">— تُجمع تدريجيًا من كل نشاط</small></h4>
      <div class="brow">${BD("points").map((b, i) => cell("points", b, i, lv >= i + 1, lv >= i + 1 ? "✓" : `${xp} / ${XPL[i] ?? b.xp} XP`)).join("")}</div></div>`;
  }
  function bindMine() { loadRepos(); }
  function bindTracker() {
    $$("[data-tv]").forEach(b => b.onclick = () => { tv = b.dataset.tv; $$("[data-tv]").forEach(x => x.classList.toggle("on", x === b)); renderTracker(); });
    $$("[data-m]").forEach(b => b.onclick = async () => {
      const d = b.closest("details"); if (d) d.open = false;
      if (b.dataset.m === "edit") { trainer = !trainer; render(); }
      else if (b.dataset.m === "refresh") { const ok = await loadRemote(); toast(ok ? "تم التحديث ✓" : "تعذّر التحديث"); renderTracker(); }
      else exportCsv();
    });
    renderTracker();
  }

  let qs = null;
  const pageQuiz = () => `<div id="quizHead"></div><div class="container" id="quizStage"></div>`;

  const asgCard = a => canSee(a.id)
    ? `<div class="card asg c-${(WK.find(w => w.n === a.week) || {}).color || "blue"}" style="border-top:4px solid var(--c)"><span class="badge">الأسبوع ${a.week}</span><h3 style="margin-top:8px">${esc(a.title)}</h3><p>${esc(a.desc)}</p>${(a.todo || []).length ? `<ul class="plain">${a.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}${a.due ? `<p class="muted" style="margin:8px 0 0"><b>موعد التسليم:</b> ${esc(a.due)}</p>` : ""}${isTr ? `<div style="margin-top:12px">${lockSw(a.id)}</div>` : API() && me ? `<div class="subbox" data-key="${a.id}"></div>` : ""}</div>`
    : lockedCard("مهمة الأسبوع " + a.week, "", "", 5);

  async function loadMine() {
    try { const r = await api("me"); if (r.ok) applyMe(r); } catch (e) {}
    return MINE;
  }
  const subStatusBadge = x => `<span class="badge ${x.status === "مقبول" ? "up" : ""}">${esc(x.status)}</span>`;
  function subInfo(x) {
    return `${subStatusBadge(x)}${x.points ? ` <b class="mono">+${x.points} نقطة</b>` : ""}<div class="muted" style="margin-top:4px"><a href="${esc(x.link)}" target="_blank" rel="noopener" dir="ltr">${/drive\.google\.com/.test(x.link) ? "📎 الملف المرفوع" : esc(x.link)}</a></div>${x.comment ? `<div class="explain" style="margin-top:8px"><b>ملاحظة المدربـة:</b> ${esc(x.comment)}</div>` : ""}`;
  }
  function drawSubBoxes() {
    $$(".subbox").forEach(box => {
      const key = box.dataset.key, a = (TK().assignments || []).find(x => x.id === key), cur = MINE.find(x => x.key === key);
      const locked = cur && cur.status !== "يحتاج تعديل";
      box.innerHTML = `<hr class="sep"><b>تسليمك</b>
        ${cur ? `<div style="margin:8px 0"><span class="badge up">✓ تم التسليم</span> ${subInfo(cur)}</div>` : '<p class="muted" style="margin:6px 0">لم تسلّم بعد.</p>'}
        ${locked ? '<p class="muted" style="font-size:13px;margin:6px 0 0">أُغلق التسليم لهذه المهمة. إن احتاجت المدربـة تعديلًا فسيفتح لك النموذج من جديد.</p>' : `<form class="sform" data-key="${key}"><div class="fld"><label for="lk_${key}">رابط التسليم (Colab أو Drive أو غيره)</label><input type="url" id="lk_${key}" dir="ltr" placeholder="https://…" value="${esc(cur && !/drive\.google\.com/.test(cur.link) ? cur.link : "")}"></div>
        <div class="or"><span>أو</span></div>
        <div class="fld"><label for="fl_${key}">ارفع ملفًا (txt أو pdf — حتى 10MB)</label><input type="file" id="fl_${key}" accept=".txt,.pdf,text/plain,application/pdf"></div>
        <div class="fld"><label for="nt_${key}">ملاحظة (اختيارية)</label><input type="text" id="nt_${key}" maxlength="300" value="${esc(cur ? cur.note : "")}"></div>
        <div class="err" data-sub-err></div><button class="btn btn-pri btn-sm" type="submit">${cur ? "تحديث التسليم" : "سلّم المهمة"}</button></form>`}`;
      const f = $("form", box); if (!f) return;
      f.onsubmit = async e => {
        e.preventDefault();
        const link = $("#lk_" + key).value.trim(), fi = $("#fl_" + key).files[0], er = $("[data-sub-err]", f), btn = $("button", f), set = m => { er.textContent = m; };
        let file = null;
        if (fi) {
          const ext = (fi.name.split(".").pop() || "").toLowerCase();
          if (!["txt", "pdf"].includes(ext)) return set("الملف يجب أن يكون txt أو pdf");
          if (fi.size > 10 * 1024 * 1024) return set("حجم الملف أكبر من 10MB");
          btn.disabled = true; btn.textContent = "جارٍ رفع الملف…";
          file = { name: fi.name, type: fi.type || (ext === "pdf" ? "application/pdf" : "text/plain"), data: await readB64(fi) };
        } else if (!isUrl(link)) return set("ضع رابطًا صحيحًا يبدأ بـ https:// أو ارفع ملفًا");
        else { btn.disabled = true; btn.textContent = "جارٍ الإرسال…"; }
        set("");
        let r; try { r = await api("submit", { kind: "task", key, link, file, note: $("#nt_" + key).value.trim() }); } catch (x) { r = { ok: false, err: "net" }; }
        btn.disabled = false; btn.textContent = cur ? "تحديث التسليم" : "سلّم المهمة";
        if (!r.ok) return set((r.err === "accepted" || r.err === "done") ? "سبق أن سلّمت هذه المهمة — التسليم مغلق." : r.err === "locked" ? "هذه المهمة مقفلة الآن." : r.err === "type" ? "نوع الملف غير مقبول (txt أو pdf فقط)." : r.err === "size" ? "حجم الملف كبير." : r.err === "auth" ? "انتهت جلستك — سجّل الدخول من جديد." : "تعذّر الإرسال، حاول مرة أخرى.");
        toast(dueLate(a) ? "تم التسليم (متأخر) ✓" : "تم التسليم ✓");
        await loadMine(); drawSubBoxes();
      };
    });
  }

  function renderSelect() {
    const best = bestMap(), ni = nextIdx(), asg = TK().assignments || [];
    $("#quizHead").innerHTML = pageHead("", "التمارين", "اختبار لكل جلسة ومهمة لكل أسبوع.");
    $("#quizStage").innerHTML = `
      ${isTr ? `<div class="trainer-bar">🔑 وضع المعاينة: زر القفل يفتح العنصر للمتدربين أو يقفله.</div>` : isAd ? `<div class="note-bar">${ico("users", "ico sm")} فتح الاختبارات والمهام وقفلها من صلاحيات المدربـة فقط.</div>` : ""}
      ${isStaff ? "" : `<div class="card ptsbar"><span><b>نقاط اختباراتك:</b> <span class="mono" style="color:var(--pri);font-size:1.1em">${localPoints()}</span></span>${me ? `<span class="muted">${esc(me)}</span>` : '<button class="btn btn-sm btn-pri" id="qMe">سجّل الدخول</button>'}</div>`}
      <div class="sec-head"><h2>الاختبارات <span class="acc">القصيرة</span></h2><p>تصحيح فوري · 10 نقاط لكل إجابة · المحاولة الأولى هي المعتمدة ويمكنك الإعادة</p></div>
      <div class="grid g4">${trainW().map(w => `<div class="card c-${w.color}" style="border-top:4px solid var(--c)"><h3>الأسبوع ${w.n}</h3><div class="qchips">${QSES.filter(s => s.week === w.n).map(s => {
        const id = "q" + s.n;
        if (!canSee(id)) return `<div class="qchip lk-chip" role="button" tabindex="0" aria-label="اختبار الجلسة ${s.n} — مقفل"><span class="lk-lines" aria-hidden="true"></span><span class="lk-lab">${ico("lock", "ico sm")} اختبار الجلسة ${s.n}</span></div>`;
        const b = best[s.n];
        return `<div class="qrow"><button class="qchip c-${w.color}" data-n="${s.n}"><span>${s.n}. ${esc(s.ar)}${ni === s.n - 1 ? " " : ""}</span>${b ? `<span class="sc ${b.score === b.total ? "perfect" : ""}">${b.score}/${b.total}</span>` : ""}</button>${lockSw(id, true)}</div>`;
      }).join("")}</div></div>`).join("")}</div>
      <div class="sec-head" id="tasks" style="margin-top:50px"><h2>المهام <span class="acc">الأسبوعية</span></h2><p>مهمة أسبوعية · رابط أو ملف txt / pdf</p></div>
      <div class="grid g2">${asg.map(asgCard).join("")}</div>`;
    $$(".qchip[data-n]").forEach(b => b.onclick = () => { location.href = "quizzes.html?s=" + b.dataset.n + keepQ; });
    $$(".lk-chip").forEach(el => { const f = () => toast("🔒 مقفل — سيفتحه المدربـة في الوقت المناسب"); el.onclick = f; el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; });
    const m = $("#qMe"); if (m) m.onclick = () => askMe();
    if (API() && me) drawSubBoxes();
    if (location.hash === "#tasks") { const el = $("#tasks"); if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 80); }
  }
  function startQuiz(n) {
    const bank = QZ[n]; if (!bank || !bank.length || !canSee("q" + n)) return renderSelect();
    const items = shuffle(bank.map((q, i) => Object.assign({}, q, { i }))).map(q => { const opts = shuffle(q.o ? q.o : [q.c, ...(q.w || [])]); return { q: q.q, opts, ans: q.o ? -1 : opts.indexOf(q.c), e: q.e, i: q.i }; });
    qs = { n, items, i: 0, score: 0, log: [] };
    $("#quizHead").innerHTML = ""; $("#quizStage").style.paddingTop = "34px";
    renderQ();
  }
  function renderQ() {
    const { n, items, i } = qs, it = items[i], s = SES[n - 1], stage = $("#quizStage");
    stage.innerHTML = `<div class="quiz-box">
      <div class="q-top"><span>الجلسة ${n}: ${esc(s.ar)}</span><span class="mono">${i + 1} / ${items.length}</span></div>
      <div class="progress"><i style="width:${i / items.length * 100}%"></i></div>
      <div class="qcard"><h3>${esc(it.q)}</h3>
        <div class="opts">${it.opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${"أبجدهوزح"[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
        <div id="fb"></div></div>
      <div style="text-align:center;margin-top:16px"><a class="btn-link" href="quizzes.html${qs0()}">إنهاء والعودة للقائمة</a></div></div>`;
    requestAnimationFrame(() => { const p = $(".progress i"); if (p) p.style.width = ((i + .0001) / items.length * 100) + "%"; });
    $$(".opt").forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === it.ans;
      if (it.ans < 0) { qs.log.push({ q: it.q, i: it.i, pick: it.opts[k] }); qs.i++; return qs.i >= items.length ? finishBlind() : renderQ(); }
      $$(".opt").forEach(x => { x.disabled = true; const kk = +x.dataset.k; if (kk === it.ans) x.classList.add("right"); else if (kk === k) x.classList.add("wrong"); });
      if (ok) qs.score++;
      qs.log.push({ q: it.q, ok, correct: it.opts[it.ans], i: it.i, pick: it.opts[k] });
      $("#fb").innerHTML = `<div class="explain"><b>${ok ? "إجابة صحيحة!" : "❌ ليست الإجابة الصحيحة."}</b> ${esc(it.e || "")}</div>
        <div style="margin-top:14px;text-align:end"><button class="btn btn-pri" id="nxt">${i + 1 === items.length ? "عرض النتيجة" : "السؤال التالي ←"}</button></div>`;
      $("#nxt").onclick = () => { qs.i++; qs.i >= items.length ? finishQuiz() : renderQ(); };
      $("#nxt").focus();
    });
  }
  async function finishBlind() {
    const { n, log } = qs, stage = $("#quizStage");
    stage.innerHTML = '<div class="quiz-box result"><div class="qcard"><h3>جارٍ تصحيح إجاباتك…</h3></div></div>';
    let r; try { r = await api("quiz", { n, answers: log.map(l => ({ i: l.i, a: l.pick })) }); } catch (e) { r = { ok: false, err: "net" }; }
    if (!r.ok) {
      stage.innerHTML = `<div class="quiz-box result"><div class="qcard"><h3>${r.err === "locked" ? "هذا الاختبار مقفل الآن" : "⚠️ تعذّر إرسال إجاباتك"}</h3><p class="muted">${r.err === "locked" ? "لم تُحفظ النتيجة." : "تحقق من الاتصال ثم أعد الاختبار."}</p><a class="btn btn-pri" href="quizzes.html${qs0()}">العودة للقائمة</a></div></div>`;
      return;
    }
    const st = stuOf(me); if (st && r.first) { st.quiz = st.quiz || {}; st.quiz[n] = [r.score, r.total]; }
    const sc = r.attempt, total = r.total, pts = r.score * 10 + (r.score === r.total ? 10 : 0);
    if (sc >= total * .8) confetti();
    const msg = sc === total ? "ممتاز! علامة كاملة " : sc >= total * .8 ? "أداء رائع " : sc >= total * .6 ? "جيّد، راجع الأخطاء وأعد المحاولة" : "لا بأس — راجع المصادر وجرّب مرة أخرى ";
    stage.innerHTML = `<div class="quiz-box result"><div class="qcard">
      <div class="score-ring">${ringSvg([{ v: sc / total, c: sc === total ? "#10B981" : "#0040A8" }], sc + "/" + total, 170)}</div>
      <h3>${msg}</h3>
      <p class="muted">${r.first ? `حُفظت محاولتك الأولى: <b class="mono">${r.score}/${r.total}</b> — <b class="mono" style="color:var(--pri)">${pts}</b> نقطة. الإعادة بعد ذلك محاولات إضافية تُحفظ عند المدربـة.` : `هذه محاولة إضافية وقد حُفظت عند المدربـة (نتيجتها <b class="mono">${r.attempt}/${r.total}</b>). درجتك المعتمدة (المحاولة الأولى): <b class="mono">${r.score}/${r.total}</b>.`}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="btn btn-pri" id="again">إعادة الاختبار</button><a class="btn" href="quizzes.html${qs0()}">اختبار آخر</a></div>
      <div class="review">${r.review.map(l => `<div class="${l.ok ? "" : "bad"}">${l.ok ? "✔" : "✘"} ${esc(l.q)}${l.ok ? "" : `<br><small class="muted">الصحيح: ${esc(l.c)}</small>`}${l.e ? `<br><small class="muted">${esc(l.e)}</small>` : ""}</div>`).join("")}</div>
    </div></div>`;
    $("#again").onclick = () => startQuiz(n);
  }
  function finishQuiz() {
    const { n, items, score, log } = qs, total = items.length, stage = $("#quizStage");
    const best = bestMap(), prev = best[n], improved = !prev || score > prev.score;
    if (!API() && improved) { best[n] = { score, total, at: Date.now() }; store.set("quiz", best); }
    const pts = score * 10 + (score === total ? 10 : 0);
    const msg = score === total ? "ممتاز! علامة كاملة " : score >= total * .8 ? "أداء رائع " : score >= total * .6 ? "جيّد، راجع الأخطاء وأعد المحاولة" : "لا بأس — راجع المصادر وجرّب مرة أخرى ";
    if (score >= total * .8) confetti();
    stage.innerHTML = `<div class="quiz-box result"><div class="qcard">
      <div class="score-ring">${ringSvg([{ v: score / total, c: score === total ? "#10B981" : "#0040A8" }], score + "/" + total, 170)}</div>
      <h3>${msg}</h3>
      ${API() ? '<p id="qSave" class="muted">جارٍ حفظ نتيجتك…</p>' : `<p>حصلت على <b class="mono" style="color:var(--pri)">${pts}</b> نقطة في هذه المحاولة${improved ? " — وهي أفضل نتيجة لك " : ` (أفضل نتيجة سابقة ${prev.score}/${prev.total})`}.</p>
      <p class="muted">مجموع نقاط اختباراتك: <b class="mono">${localPoints()}</b></p>`}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-pri" id="again">إعادة الاختبار</button>
        ${API() ? "" : '<button class="btn" id="sendRes">أرسل نتيجتي للمدربـة</button>'}
        <a class="btn" href="quizzes.html${qs0()}">اختبار آخر</a></div>
      <div class="review">${log.map(l => `<div class="${l.ok ? "" : "bad"}">${l.ok ? "✔" : "✘"} ${esc(l.q)}${l.ok ? "" : `<br><small class="muted">الصحيح: ${esc(l.correct)}</small>`}</div>`).join("")}</div>
    </div></div>`;
    $("#again").onclick = () => startQuiz(n);
    if (API()) saveQuiz(n, log.map(l => ({ i: l.i, a: l.pick })));
    const sr = $("#sendRes"); if (sr) sr.onclick = () => ensureMe(async () => {
      const how = await submitRecord("quiz", { "الاسم": me, "الجلسة": n + " — " + SES[n - 1].ar, "النتيجة": score + "/" + total, "النقاط": pts, "التاريخ": new Date().toLocaleString("ar") }, "نتيجة اختبار — " + me + " — جلسة " + n);
      toast(how === "endpoint" ? "تم إرسال نتيجتك ✓" : "فُتحت صفحة GitHub: اضغط Submit new issue لإتمام الإرسال");
    });
  }
  async function saveQuiz(n, answers) {
    const el = $("#qSave"); if (!el) return;
    if (!me || isStaff) { el.textContent = isStaff ? "وضع المعاينة: لا تُحفظ النتيجة." : "سجّل الدخول كمتدرب لتُحفظ نتيجتك."; return; }
    let r; try { r = await api("quiz", { n, answers }); } catch (e) { r = { ok: false, err: "net" }; }
    if (!r.ok) { el.textContent = r.err === "locked" ? "هذا الاختبار مقفل الآن — لم تُحفظ النتيجة." : "⚠️ تعذّر حفظ النتيجة. تحقق من الاتصال ثم أعد الاختبار."; return; }
    const st = stuOf(me); if (st && r.first) { st.quiz = st.quiz || {}; st.quiz[n] = [r.score, r.total]; }
    const pts = r.score * 10 + (r.score === r.total ? 10 : 0);
    el.innerHTML = r.first ? `حُفظت محاولتك الأولى: <b class="mono">${r.score}/${r.total}</b> — <b class="mono" style="color:var(--pri)">${pts}</b> نقطة. الإعادة بعد ذلك محاولات إضافية تُحفظ عند المدربـة.`
      : `هذه محاولة إضافية وقد حُفظت عند المدربـة (نتيجتها <b class="mono">${r.attempt}/${r.total}</b>). درجتك المعتمدة (المحاولة الأولى): <b class="mono">${r.score}/${r.total}</b>.`;
  }
  function bindQuiz() { const n = +Q.get("s"); if (n && QZ[n] && canSee("q" + n)) startQuiz(n); else renderSelect(); }

  function pageProjects() {
    const T = TK().project || {};
    if (!canSee("p5")) return pageHead("", "المشروع النهائي", "يُفتح في أسبوع المشروع.") + `<div class="container" style="max-width:860px">${lockedCard("المشروع النهائي", "", "lk-big", 8)}</div>`;
    const subs = store.get("subs", []), d = store.get("draft", {});
    const mineP = API() && me && !isStaff ? MINE.find(y => y.key === "p5") : null, closedP = !!mineP && mineP.status !== "يحتاج تعديل";
    if (mineP && !closedP) { let ex = {}; try { ex = JSON.parse(mineP.extra || "{}"); } catch (e) {} const FL0 = projFields(); FL0.forEach(fd => { if (!d[fd.id] && ex[fd.id]) d[fd.id] = ex[fd.id]; }); const mf0 = FL0.find(x => x.type === "link"); if (mf0 && !d[mf0.id] && mineP.link) d[mf0.id] = mineP.link; }
    window.__projClosed = closedP;
    const f = (id, label, ph, extra = "", hint = "") => `<div class="fld"><label for="${id}">${label}</label><input ${extra} id="${id}" name="${id}" placeholder="${ph}" value="${esc(d[id] || "")}">${hint ? `<small>${hint}</small>` : ""}<div class="err" data-err="${id}"></div></div>`;
    return pageHead("المشاريع", "تسليم المشروع النهائي", esc(T.desc || "")) + `
    <div class="container">
      ${isTr ? `<div class="trainer-bar">${lockSw("p5")}<span>المشروع مفتوح للمتدربين حاليًا. اضغطي الزر لإعادة قفله.</span></div>` : ""}
      <div class="split block">
        ${isStaff ? `<div class="card"><h3>نموذج التسليم</h3><p class="muted" style="margin:0">يظهر النموذج للمتدربين هنا. التسليمات تصل إلى ${isTr ? "الإدارة ← التسليمات" : "المدربـة لتصحيحها"}. يُغلق النموذج على كل متدرب بعد تسليمه، وتصحّحه المدربـة وتكتب تعليقًا يصله على بريده.</p></div>` : closedP ? `<div class="card"><h3>نموذج التسليم</h3><p style="margin:8px 0"><span class="badge up">✓ تم التسليم</span></p><p class="muted" style="margin:0">أُغلق تسليم المشروع. ستصحّحه المدربـة ويصلك التعليق هنا وعلى بريدك، وإن احتاج تعديلًا فسيفتح لك النموذج من جديد.</p></div>` : `<form class="card" id="pform" novalidate>
          <h3>نموذج التسليم</h3>
          ${projFields().map(fd => fd.type === "long" ? `<div class="fld"><label for="${esc(fd.id)}">${esc(fd.label)}</label><textarea id="${esc(fd.id)}" name="${esc(fd.id)}" rows="3" maxlength="600" placeholder="${esc(fd.ph || "")}">${esc(d[fd.id] || "")}</textarea>${fd.hint ? `<small>${esc(fd.hint)}</small>` : ""}<div class="err" data-err="${esc(fd.id)}"></div></div>` : f(fd.id, esc(fd.label), esc(fd.ph || ""), fd.type === "link" ? 'type="url" dir="ltr"' : 'type="text" maxlength="200"', esc(fd.hint || ""))).join("")}
          ${T.allowFile ? `<div class="fld"><label for="pfile">أو ارفع ملفًا (txt أو pdf — حتى 10MB)</label><input type="file" id="pfile" accept=".txt,.pdf,text/plain,application/pdf"><div class="err" data-err="pfile"></div></div>` : ""}
          <button class="btn btn-pri" type="submit">تسليم المشروع</button>
          <small class="muted">${API() ? "يُغلق التسليم بعد الإرسال حتى تصحّحه المدربـة." : "ستُفتح صفحة GitHub لإتمام التسليم."} المسودة تُحفظ تلقائيًا.</small>
        </form>`}
        <div style="display:grid;gap:18px">
          <div class="card"><h3>خطوات المشروع</h3><ol class="steps">
            ${(T.steps || []).map(x => `<li><span>${esc(x)}</span></li>`).join("")}</ol></div>
          <div class="card"><h3>معايير التقييم</h3><div class="rubric">
            ${(T.rubric || []).map(r => `<div class="row"><span>${r[0]}</span><b class="mono">${r[1]}</b><div class="bar"><i data-w="${r[1] * 3}"></i></div></div>`).join("")}</div></div>
        </div>
      </div>
      ${API() && me ? `<div class="block" id="mineP"></div>` : ""}
      ${!API() && subs.length ? `<div class="block"><div class="card-h"><h2>تسليماتي على هذا المتصفح</h2></div><div class="grid g3">${subs.map(p => `<div class="proj c-green"><span class="badge up">${esc(p.date)}</span><h4>${esc(p.title)}</h4><p class="muted" style="margin:0">${esc(p.team)}</p></div>`).join("")}</div></div>` : ""}
      ${PROJ.length ? `<div class="block"><div class="card-h"><h2>مشاريع الدفعة</h2></div>
      <div class="grid g3">${PROJ.map((p, i) => `<div class="proj c-${["blue", "yellow", "green"][i % 3]}"><span class="badge">${esc(p.tag || "PROJECT")}</span><h4>${esc(p.title)}</h4><p class="muted" style="margin:0 0 12px;font-size:14px">${esc(p.team)} · ${esc(p.leader)}</p><div style="display:flex;gap:8px;flex-wrap:wrap">${p.github ? `<a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(p.github)}">GitHub</a>` : ""}${p.demo ? `<a class="btn btn-sm btn-pri" target="_blank" rel="noopener" href="${esc(p.demo)}">Demo</a>` : ""}</div></div>`).join("")}</div></div>` : ""}
    </div>`;
  }
  function bindProjects() {
    if (API() && me && $("#mineP")) loadMine().then(() => {
      const x = MINE.find(y => y.key === "p5"), T = TK().project || {}; if (!x) return;
      if (!isStaff && (x.status !== "يحتاج تعديل") !== !!window.__projClosed) return render();
      let rub = []; try { rub = (JSON.parse(x.extra || "{}").rubric) || []; } catch (e) {}
      $("#mineP").innerHTML = `<div class="card"><h3>تسليمك للمشروع</h3>${subInfo(x)}${rub.length ? `<div class="rubric" style="margin-top:10px">${(T.rubric || []).map((r, i) => `<div class="row"><span>${esc(r[0])}</span><b class="mono">${rub[i] ?? "—"} / ${r[1]}</b></div>`).join("")}</div>` : ""}</div>`;
    });
    const form = $("#pform"); if (!form) { animate(); return; }
    { const ld = $("#leader"); if (me && ld && !ld.value) ld.value = me; }
    form.addEventListener("input", () => { const d = {}; $$("input,textarea", form).forEach(x => { d[x.id] = x.value; }); store.set("draft", d); });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const v = id => { const el = $("#" + id); return el ? el.value.trim() : ""; }, errs = {}, FL = projFields(), TP = TK().project || {}, pf = $("#pfile") && $("#pfile").files[0];
      const links = FL.filter(x => x.type === "link"), mainFd = links.find(x => v(x.id)) || null;
      FL.forEach(fd => {
        const val = v(fd.id);
        if (fd.req && !val && !(fd.type === "link" && pf)) errs[fd.id] = "هذا الحقل مطلوب";
        else if (fd.type === "link" && val && !isUrl(val)) errs[fd.id] = "أدخل رابطًا صحيحًا يبدأ بـ https://";
        else if (/github/i.test(fd.label) && val && !/^https:\/\/(www\.)?github\.com\/[^\/\s]+\/[^\/\s]+/i.test(val)) errs[fd.id] = "أدخل رابط مستودع GitHub صحيح، مثل https://github.com/user/repo";
      });
      if (!mainFd && !pf) { if (links.length) errs[links[0].id] = errs[links[0].id] || "أدخل رابطًا أو ارفع ملفًا"; else if (TP.allowFile) errs.pfile = "ارفع ملفًا (txt أو pdf)"; }
      if (pf) { const ext = (pf.name.split(".").pop() || "").toLowerCase(); if (!["txt", "pdf"].includes(ext)) errs.pfile = "الملف يجب أن يكون txt أو pdf"; else if (pf.size > 10 * 1024 * 1024) errs.pfile = "حجم الملف أكبر من 10MB"; }
      $$("[data-err]").forEach(el => { el.textContent = errs[el.dataset.err] || ""; });
      const first = Object.keys(errs)[0]; if (first) { const el = $("#" + first); if (el) el.focus(); return; }
      if (API()) {
        if (!me) { toast("سجّل الدخول كمتدرب لتسليم المشروع"); return; }
        const btn = $("button[type=submit]", form); btn.disabled = true;
        let r; try {
          const file = pf ? { name: pf.name, type: pf.type || (pf.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain"), data: await readB64(pf) } : null;
          const vals = {}, labs = {}; FL.forEach(fd => { vals[fd.id] = v(fd.id).slice(0, 500); labs[fd.id] = fd.label; });
          const noteFd = FL.find(x => x.id === "title") || FL.find(x => x.type === "text");
          r = await api("submit", { kind: "project", key: "p5", link: mainFd ? v(mainFd.id) : "", file, note: noteFd ? v(noteFd.id) : "", extra: Object.assign(vals, { _labels: labs }) });
        } catch (x) { r = { ok: false, err: "net" }; }
        btn.disabled = false;
        if (!r.ok) { toast(r.err === "accepted" ? "قُبل مشروعك مسبقًا" : r.err === "done" ? "سبق أن سلّمت المشروع — التسليم مغلق" : "⚠️ تعذّر التسليم، حاول مرة أخرى"); if (r.err === "done" || r.err === "accepted") { await loadMine(); setTimeout(render, 300); } return; }
        store.del("draft"); confetti(); toast("تم تسليم مشروعك ✓"); await loadMine(); setTimeout(render, 400); return;
      }
      const how = await submitRecord("project", { "الفريق": v("team"), "القائد": v("leader"), "الأعضاء": v("members") || "—", "العنوان": v("title"), "GitHub": v("github"), "Demo / Presentation": v("demo"), "الوصف": v("desc") || "—" }, "تسليم مشروع — " + v("team"));
      const subs = store.get("subs", []); subs.unshift({ team: v("team"), title: v("title"), date: new Date().toLocaleDateString("ar-u-ca-gregory-nu-latn") }); store.set("subs", subs);
      store.del("draft"); confetti();
      toast(how === "endpoint" ? "تم تسليم مشروعك بنجاح " : "فُتحت صفحة GitHub: اضغط Submit new issue لإتمام التسليم");
      setTimeout(render, 600);
    });
    animate();
  }

  const nulls = () => Array(SES.length).fill(null);
  const stuOf = n => STUDENTS.find(s => s.name === n);
  const persistMe = () => { const s = me && stuOf(me); if (s && !API()) store.set("rec", s); };
  const fmtDT = iso => iso ? new Date(iso).toLocaleString("ar-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "";
  const fmtT = iso => new Date(iso).toLocaleTimeString("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  function avHtml(name, cls = "av") {
    const s = stuOf(name) || BOARD.find(x => x.name === name), gh = s && s.github, l = esc(String(name || "").trim()[0] || "·");
    return `<div class="${cls}"><span>${l}</span>${gh ? `<img src="https://github.com/${encodeURIComponent(gh)}.png?size=96" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>`;
  }

  const GH_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
  function register(name, email, gh) {
    let s = stuOf(name);
    if (!s) { s = { name, att: nulls(), hw: nulls(), points: 0, tasks: {}, checkins: {}, joined: new Date().toISOString() }; STUDENTS.push(s); }
    s.email = email; s.github = gh; s.tasks = s.tasks || {}; s.checkins = s.checkins || {};
    store.set("rec", s); return s;
  }
  function mergeMine() {
    if (!me || API()) return;
    let s = stuOf(me); const r = store.get("rec", null);
    if (!s && r && r.name === me) { STUDENTS.push(r); s = r; }
    else if (s && r && r.name === me && r !== s) {
      ["github", "email", "joined"].forEach(k => { if (!s[k] && r[k]) s[k] = r[k]; });
      s.tasks = Object.assign({}, r.tasks, s.tasks); s.checkins = Object.assign({}, r.checkins, s.checkins);
      ["att", "hw"].forEach(k => { s[k] = s[k] || nulls(); (r[k] || []).forEach((v, i) => { if (v != null && s[k][i] == null) s[k][i] = v; }); });
    }
    if (s) { s.tasks = s.tasks || {}; s.checkins = s.checkins || {}; store.set("rec", s); }
  }
  function applySess() {
    setRoles();
    if (isTr && !API()) { const o = store.get("students", null); if (o && Array.isArray(o) && o.length) STUDENTS = o; }
    mergeMine(); updateChip(); drawNav(); render();
  }

  /* بوابة الدخول: متدرب (بريد + رمز) · المدربـة · الإداري/ة */
  function showGate() {
    if ($("#gate")) return;
    const g = document.createElement("div"); g.id = "gate"; g.className = "gate"; document.body.appendChild(g);
    document.body.classList.add("gated");
    const art = `<aside class="gate-art" aria-hidden="true"><div class="ga-panel">
        <span class="ga-orb o1"></span><span class="ga-orb o2"></span>
        <img class="ga-img" src="img/login-illustration.webp" alt="" width="820" height="820">
      </div></aside>`;
    const shell = (inner, step) => { g.innerHTML = `<div class="gate-shell"><div class="gate-frame">${art}<div class="gate-card"><h2 class="gate-hi">أهلًا بك</h2><p class="gate-sub">في معسكر تحليل البيانات، سجل دخولك:</p>${step ? `<p class="gate-step">${step}</p>` : ""}${inner}</div></div></div>`; };
    const done = (role, name, extra) => { sess = Object.assign({ role, name }, extra || {}); store.set("sess", sess); g.remove(); document.body.classList.remove("gated"); applySess(); };
    const fld = (id, label, extra = "", hint = "", type = "text") => `<div class="fld"><label for="${id}">${label}</label><input type="${type}" id="${id}" ${extra}>${hint ? `<small>${hint}</small>` : ""}<div class="err" data-e="${id}"></div></div>`;
    const setErr = e => $$("[data-e]", g).forEach(x => { x.textContent = e[x.dataset.e] || ""; });
    const acts = (label, id, type = "button") => `<div class="gate-acts"><button class="btn btn-pri" type="${type}" id="${id}">${label}</button><button class="btn btn-ghost" type="button" id="gBack">رجوع</button></div>`;
    const busy = (b, t) => { b.disabled = !!t; if (t) { b.dataset.t = b.textContent; b.textContent = t; } else if (b.dataset.t) b.textContent = b.dataset.t; };

    function roleStep() {
      shell(`<div class="roles">
        <button class="role" data-r="trainee">${ico("users", "ico lg")}<b>متدرب/ة</b></button>
        <button class="role" data-r="trainer">${ico("flag", "ico lg")}<b>المدربـة</b></button>
        <button class="role" data-r="admin">${ico("chart", "ico lg")}<b>إداري/ة</b></button></div>`);
      $$(".role", g).forEach(b => b.onclick = () => b.dataset.r === "trainee" ? traineeStep("new") : staffStep(b.dataset.r));
    }
    function staffStep(role) {
      shell(`<div class="gform">${fld("gN", "الاسم", 'maxlength="40" autocomplete="off"')}
        ${fld("gP", "رمز الدخول", 'autocomplete="off"', role === "admin" ? "الرمز الذي أعطتك إياه المدربـة" : "", "password")}
        ${acts("دخول", "gGo")}</div>`, role === "admin" ? "دخول الإداري/ة" : "دخول المدربـة");
      $("#gBack").onclick = roleStep;
      const go = async () => {
        const n = $("#gN").value.trim(), pin = $("#gP").value.trim();
        if (!n) return setErr({ gN: "اكتب الاسم" });
        if (!pin) return setErr({ gP: "اكتب رمز الدخول" });
        if (!API()) return setErr({ gP: "دخول المدربـة والإداري/ة يحتاج ربط السيرفر (الحقل api في data.js)" });
        const btn = $("#gGo"); busy(btn, "جارٍ التحقق…");
        let r; try { r = await api("auth", { pin, as: role, site: siteBase() }); } catch (e) { r = { ok: false, err: "net" }; }
        busy(btn);
        if (!r.ok) return setErr({ gP: r.err === "pin" ? "الرمز غير صحيح" : r.err === "locked" ? "محاولات خاطئة كثيرة — انتظر 10 دقائق ثم حاول" : "تعذّر الاتصال بالسيرفر، حاول مجددًا" });
        sess = { role, name: n, pin }; setRoles(); busy(btn, "جارٍ التحميل…"); await loadRemote(); done(role, n, { pin });
      };
      $("#gGo").onclick = go; $("#gP").onkeydown = e => { if (e.key === "Enter") go(); }; $("#gN").focus();
    }
    function codeStep(name, mail, code, mailed) {
      shell(`<div class="code-box"><p>تم تسجيلك يا <b>${esc(name)}</b> ✓</p><small>رمز دخولك الشخصي</small><div class="code-big mono">${esc(code)}</div>
        <p class="muted" style="font-size:13.5px;margin:0">${mailed ? "أرسلناه أيضًا إلى بريدك مع تأكيد التسجيل." : "احفظ الرمز — ستحتاجه للدخول من أي جهاز."} لا تشاركه مع أحد.</p></div>
        <div class="gate-acts"><button class="btn btn-pri" id="gEnter">دخول للموقع</button></div>`);
      $("#gEnter").onclick = async () => { busy($("#gEnter"), "جارٍ التحميل…"); sess = { role: "trainee", name, email: mail, code }; setRoles(); await loadRemote(); done("trainee", name, { email: mail, code }); toast("أهلًا بك في المعسكر ✓"); };
    }
    function traineeStep(tab) {
      const seg = `<div class="seg gseg"><button type="button" data-t="new" class="${tab === "new" ? "on" : ""}">تسجيل جديد</button><button type="button" data-t="in" class="${tab === "in" ? "on" : ""}">لدي حساب</button></div>`;
      if (tab === "new") shell(seg + `<form id="regF" novalidate class="gform">
          ${fld("gName", "الاسم الثلاثي", 'maxlength="60" autocomplete="name"')}
          ${fld("gMail", "البريد الإلكتروني", 'dir="ltr" maxlength="80" autocomplete="email"', "يصلك عليه تأكيد التسجيل ورمز الدخول", "email")}
          ${fld("gGh", "اسم المستخدم في GitHub (اختياري)", 'dir="ltr" maxlength="60" placeholder="octocat"', "اتركه فارغًا إن لم يكن لديك حساب")}
          ${acts("انضمام للمعسكر", "gReg", "submit")}</form>`);
      else if (API()) shell(seg + `<form id="inF" novalidate class="gform">
          ${fld("gMail2", "بريدك المسجَّل", 'dir="ltr" autocomplete="email"', "", "email")}
          ${fld("gCode", "رمز الدخول", 'inputmode="numeric" dir="ltr" maxlength="12" autocomplete="off"', "وصلك على بريدك عند التسجيل")}
          <div class="gmsg" id="gMsg"></div><button type="button" class="btn-link forgot" id="gForgot">نسيت الرمز؟</button>
          ${acts("دخول", "gIn", "submit")}</form>`);
      else {
        const names = STUDENTS.map(s => s.name), rec = store.get("rec", null);
        if (rec && !names.includes(rec.name)) names.push(rec.name);
        shell(seg + `<div class="gform"><div class="fld"><label for="gSel">اختر اسمك</label><select id="gSel"><option value="">— اختر —</option>${names.map(n => `<option>${esc(n)}</option>`).join("")}</select><div class="err" data-e="gSel"></div></div>${acts("دخول", "gIn")}</div>`);
      }
      $("#gBack").onclick = roleStep;
      $$(".gseg button", g).forEach(b => b.onclick = () => traineeStep(b.dataset.t));
      if (tab === "in") {
        if (!API()) {
          $("#gIn").onclick = () => { const n = $("#gSel").value; if (!n) return setErr({ gSel: "اختر اسمك من القائمة" }); sess = { role: "trainee", name: n }; setRoles(); mergeMine(); done("trainee", n); };
          return;
        }
        $("#inF").onsubmit = async e => {
          e.preventDefault();
          const em = $("#gMail2").value.trim(), cd = $("#gCode").value.trim();
          if (!/^\S+@\S+\.\S+$/.test(em)) return setErr({ gMail2: "أدخل بريدًا صحيحًا" });
          if (!cd) return setErr({ gCode: "اكتب رمز الدخول" });
          setErr({}); const btn = $("#gIn"); busy(btn, "جارٍ التحقق…");
          let r; try { r = await api("login", { email: em, code: cd }); } catch (x) { r = { ok: false, err: "net" }; }
          if (!r.ok) { busy(btn); return setErr(r.err === "mail" ? { gMail2: "هذا البريد غير مسجَّل — اختر «تسجيل جديد»" } : r.err === "nocode" ? { gCode: "لا يوجد رمز لحسابك بعد — اضغط «نسيت الرمز؟» ليصلك على بريدك" } : r.err === "code" ? { gCode: "الرمز غير صحيح" } : r.err === "locked" ? { gCode: "محاولات خاطئة كثيرة — انتظر 10 دقائق ثم حاول" } : { gCode: "تعذّر الاتصال بالسيرفر" }); }
          sess = { role: "trainee", name: r.name, email: em, code: cd }; setRoles(); busy(btn, "جارٍ التحميل…"); await loadRemote(); done("trainee", r.name, { email: em, code: cd });
        };
        $("#gForgot").onclick = async () => {
          const em = $("#gMail2").value.trim(), msg = $("#gMsg");
          if (!/^\S+@\S+\.\S+$/.test(em)) return setErr({ gMail2: "اكتب بريدك أولًا ثم اضغط «نسيت الرمز؟»" });
          setErr({}); msg.textContent = "جارٍ الإرسال…";
          let r; try { r = await api("forgot", { email: em }); } catch (x) { r = { ok: false, err: "net" }; }
          msg.textContent = r.ok ? (r.mailed ? "✓ أرسلنا رمز الدخول إلى بريدك (تحقق أيضًا من الرسائل غير المرغوبة)." : "تعذّر إرسال البريد الآن — تواصل مع المدربـة.") : r.err === "mail" ? "هذا البريد غير مسجَّل." : r.err === "locked" ? "طلبات كثيرة — انتظر 10 دقائق ثم حاول." : "تعذّر الاتصال بالسيرفر.";
        };
        return;
      }
      $("#regF").onsubmit = async e => {
        e.preventDefault();
        const name = $("#gName").value.trim().replace(/\s+/g, " "), mail = $("#gMail").value.trim(),
              gh = $("#gGh").value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, ""), er = {};
        if (name.split(" ").length < 3) er.gName = "اكتب الاسم الثلاثي";
        if (!/^\S+@\S+\.\S+$/.test(mail)) er.gMail = "أدخل بريدًا صحيحًا";
        if (gh && !GH_RE.test(gh)) er.gGh = "اسم مستخدم GitHub غير صالح";
        setErr(er); if (Object.keys(er).length) return;
        const btn = $("#gReg"); busy(btn, "جارٍ التحقق…");
        if (gh) try { const r = await fetch("https://api.github.com/users/" + encodeURIComponent(gh)); if (r.status === 404) { busy(btn); return setErr({ gGh: "هذا الحساب غير موجود في GitHub" }); } } catch (x) {}
        if (API()) {
          btn.textContent = "جارٍ التسجيل…";
          let r; try { r = await api("register", { name, email: mail, github: gh, site: siteBase() }); } catch (x) { r = { ok: false, err: "net" }; }
          busy(btn);
          if (!r.ok) return setErr(r.err === "exists" ? { gName: "هذا الاسم مسجَّل مسبقًا — استخدم «لدي حساب»" } : r.err === "mailexists" ? { gMail: "هذا البريد مسجَّل مسبقًا — استخدم «لدي حساب»" } : { gName: "تعذّر الاتصال بالسيرفر، حاول مرة أخرى" });
          return codeStep(name, mail, r.code, r.mailed);
        }
        register(name, mail, gh); done("trainee", name, { email: mail }); toast("تم تسجيلك في المعسكر ✓");
      };
    }
    Q.get("join") ? traineeStep("new") : roleStep();
  }

  const OTP_MS = () => (S.otpMinutes || 5) * 60000;
  const hash32 = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const otpFor = w => String(hash32((S.otpSecret || "x") + ":" + w) % 10000).padStart(4, "0");
  const otpWin = () => Math.floor(Date.now() / OTP_MS());
  const otpOk = c => { const w = otpWin(), el = Date.now() - w * OTP_MS(); return c === otpFor(w) || (el < 60000 && c === otpFor(w - 1)); };
  let otpS = { code: "----", end: 0, busy: false };
  async function fetchOtp() {
    if (otpS.busy) return; otpS.busy = true;
    try { const r = await api("otp"); if (r.ok) otpS = { code: r.code, end: Date.now() + r.left * 1000, busy: false }; } catch (e) {}
    otpS.busy = false;
  }
  const todayIdx = () => SES.findIndex((_, i) => dayDiff(i) === 0);

  function attPanelHtml() {
    const ni = todayIdx(), open = openSess();
    if (isStaff) {
      const past = SES.map((_, i) => i).filter(i => dayDiff(i) < 0), ci = open ? open - 1 : ni >= 0 ? ni : past[past.length - 1];
      let sum = "";
      if (ci !== undefined) {
        const c = { 1: 0, 2: 0, 0: 0, n: 0 };
        STUDENTS.forEach(s => { const v = s.att[ci]; if (v === 1 || v === 2 || v === 0) c[v]++; else c.n++; });
        sum = `<div class="sumrow"><span class="sum ok"><b>${c[1]}</b> حاضر</span><span class="sum late"><b>${c[2]}</b> متأخر</span><span class="sum bad"><b>${c[0]}</b> غائب</span><span class="sum"><b>${c.n}</b> لم يُسجَّل</span><small class="muted">جلسة ${SES[ci].n} — ${esc(SES[ci].ar)}</small></div>`;
      }
      const opts = SES.map((s, i) => `<option value="${s.n}" ${i === (ci ?? 0) ? "selected" : ""}>الجلسة ${s.n} · ${fmtShort(sessionDate(i))}</option>`).join("");
      return `<div class="card attp"><div class="otpbox"><div><small class="muted">رمز الحضور — يتغيّر كل ${S.otpMinutes || 5} دقائق</small>
        <div class="otp mono" id="otpCode">----</div><small>ينتهي بعد <b class="mono" id="otpLeft">--:--</b></small></div>
        <div class="regbox">${open ? `<p class="live-dot"><i></i>التسجيل مفتوح للجلسة ${open}</p><button class="btn btn-pri" id="regToggle" data-n="0">■ إغلاق التسجيل</button>` : `<select id="regSes" aria-label="الجلسة">${opts}</select><button class="btn btn-live" id="regToggle">▶ فتح التسجيل</button>`}
        ${ci !== undefined ? `<button class="btn-link" id="markAbs" data-ci="${ci}">غير المسجّلين في الجلسة ${SES[ci].n} ← غائب</button>` : ""}</div></div>
        ${open ? "" : '<p class="muted hint">اضغطي «فتح التسجيل» فتظهر للمتدربين فورًا خانة كتابة الرمز في صفحاتهم.</p>'}${sum}</div>`;
    }
    if (!me) return `<div class="card attp"><b>تسجيل الحضور</b><p class="muted" style="margin:4px 0 0">سجّل الدخول كمتدرب لتسجيل حضورك.</p></div>`;
    const s = stuOf(me);
    if (!open) return `<div class="card attp att-closed">${ico("lock", "ico lg")}<div><b>تسجيل الحضور مغلق الآن</b><p class="muted" style="margin:2px 0 0">يُفتح أثناء الجلسة وتظهر هنا خانة الرمز.</p></div></div>`;
    const i = open - 1, v = s && s.att[i], t = s && s.checkins && s.checkins[open];
    if (v === 1 || v === 2) return `<div class="card attp"><b>✓ تم تسجيل حضورك — الجلسة ${open}</b> <span class="badge ${v === 2 ? "" : "up"}">${v === 2 ? "متأخر" : "في الوقت"}</span>${t ? `<span class="muted mono"> · ${fmtT(t)}</span>` : ""}</div>`;
    return `<div class="card attp att-open"><p class="live-dot"><i></i>التسجيل مفتوح — الجلسة ${open}: ${esc(SES[i].ar)}</p><form id="ciF" class="cirow"><input type="text" id="ciCode" inputmode="numeric" maxlength="4" placeholder="0000" dir="ltr" autocomplete="off" aria-label="رمز الحضور"><button class="btn btn-pri" type="submit">تسجيل</button></form><div class="err" id="ciE"></div></div>`;
  }
  function bindAttPanel() {
    if (isStaff) {
      {
        const tick = () => {
          const el = $("#otpCode"); if (!el) return;
          if (API()) {
            if (Date.now() >= otpS.end - 800) fetchOtp();
            el.textContent = otpS.code; const left = Math.max(0, Math.ceil((otpS.end - Date.now()) / 1000));
            $("#otpLeft").textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60); return;
          }
          const w = otpWin(); el.textContent = otpFor(w); const left = Math.max(0, Math.ceil(((w + 1) * OTP_MS() - Date.now()) / 1000)); $("#otpLeft").textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60);
        };
        tick(); timers.push(setInterval(tick, 1000));
      }
      if (API()) timers.push(setInterval(async () => { if (document.activeElement && /INPUT|SELECT/.test(document.activeElement.tagName)) return; if (await loadRemote()) renderTracker(); }, 30000));
      const rt = $("#regToggle"); if (rt) rt.onclick = async () => {
        const n = rt.dataset.n === "0" ? 0 : +$("#regSes").value; rt.disabled = true;
        if (API()) {
          let r; try { r = await api("checkinOpen", { n }); } catch (e) { r = { ok: false }; }
          if (!r.ok) { rt.disabled = false; return cloudFail(); }
          Object.assign(S, r.site); CONTENT.site = Object.assign({}, CONTENT.site, r.site);
        } else { const c = cloneC(); c.site = Object.assign({}, c.site, { checkinOpen: n, checkinAt: n ? new Date().toISOString() : "" }); store.set("content", c); applyContent(c); }
        toast(n ? "فُتح التسجيل للجلسة " + n + " ✓ — يستطيع المتدربون كتابة الرمز الآن" : "أُغلق التسجيل"); renderTracker();
      };
      const m = $("#markAbs"); if (m) m.onclick = async () => {
        const ci = +m.dataset.ci; STUDENTS.forEach(s => { if (s.att[ci] == null) s.att[ci] = 0; });
        if (API()) { try { const r = await api("absent", { i: ci }); if (!r.ok) throw 0; } catch (e) { cloudFail(); } } else store.set("students", STUDENTS);
        renderTracker(); toast("سُجّل غير الحاضرين كغائبين");
      };
      return;
    }
    const f = $("#ciF"); if (f) { f.onsubmit = e => { e.preventDefault(); checkin($("#ciCode").value.trim()); }; $("#ciCode").focus(); }
    if (API() && me) timers.push(setInterval(async () => {
      if (document.activeElement && document.activeElement.id === "ciCode") return;
      try { const j = await getData(); if (j.ok) { const b = openSess(); applyContent(j.content); if (openSess() !== b) renderTracker(); } } catch (e) {}
    }, 15000));
  }
  async function checkin(code) {
    const n = openSess(), s = stuOf(me), err = m => { $("#ciE").textContent = m; };
    if (!n || !s) return err("التسجيل مغلق الآن");
    if (!/^\d{4}$/.test(code)) return err("أدخل الرمز المكوّن من 4 أرقام");
    const ni = n - 1, now = new Date();
    let v = !Q.get("today") && now - sessionStart(ni) > (S.lateAfterMin ?? 15) * 60000 ? 2 : 1;
    if (API()) {
      const b = $("#ciF button"); b.disabled = true; err("");
      let r; try { r = await api("checkin", { otp: code, session: n }); } catch (e) { r = { ok: false, err: "net" }; }
      b.disabled = false;
      if (!r.ok) return err(r.err === "code" ? "الرمز غير صحيح أو انتهت صلاحيته" : r.err === "closed" ? "أُغلق التسجيل لهذه الجلسة" : r.err === "auth" ? "انتهت جلستك — سجّل الدخول من جديد" : "تعذّر الاتصال بالسيرفر، أعد المحاولة");
      v = r.v;
    } else if (!otpOk(code)) return err("الرمز غير صحيح أو انتهت صلاحيته");
    s.att[ni] = v; s.checkins = s.checkins || {}; s.checkins[n] = now.toISOString(); persistMe(); renderTracker();
    toast(v === 2 ? "سُجّل حضورك (متأخر) +" + XP.late + " XP" : "سُجّل حضورك +" + XP.att + " XP");
  }

  function profileHtml() {
    const s = stuOf(me); if (!s) return "";
    const m = mainBadge(s), gh = s.github;
    return `<div class="card prof"><div class="profhead">${avHtml(me, "av lg")}<div><h3 style="margin:0">${esc(me)}</h3>${gh ? `<a class="mono" href="https://github.com/${esc(gh)}?tab=repositories" target="_blank" rel="noopener">@${esc(gh)}</a>` : '<small class="muted">لم يُربط حساب GitHub</small>'}${m ? `<div style="margin-top:6px">${badgeChip(m)}</div>` : ""}</div>
      <div class="xpbig"><b class="mono">${xpOf(s)}</b><small>XP</small></div>${MYRANK && MYRANK.rank ? `<div class="xpbig"><b class="mono">#${MYRANK.rank}</b><small>من ${MYRANK.total}</small></div>` : ""}</div>
      ${gh ? '<div id="repos" class="repos"><small class="muted">جارٍ تحميل مستودعاتك…</small></div>' : ""}</div>`;
  }
  async function loadRepos() {
    const s = me && stuOf(me), box = $("#repos"); if (!s || !s.github || !box) return;
    try {
      const r = await fetch("https://api.github.com/users/" + encodeURIComponent(s.github) + "/repos?sort=pushed&per_page=4");
      if (!r.ok) throw 0; const j = await r.json();
      box.innerHTML = j.length ? j.map(x => `<a class="repo" href="${esc(x.html_url)}" target="_blank" rel="noopener"><b>${esc(x.name)}</b><small class="muted">${esc(x.language || "")}</small></a>`).join("") : '<small class="muted">لا مستودعات عامة بعد</small>';
    } catch (e) { box.innerHTML = ""; }
  }

  let faqEdit = false;
  const toName = t => t === "admin" ? "الإدارة" : "المدربـة";
  function pageFaq() {
    return pageHead("", "الاستفسارات", "الأسئلة الشائعة واستفسارك الخاص.") + `<div class="container">
      <div class="split faq-split"><div id="faqBox"></div><div id="sideBox"></div></div>
      ${isStaff ? '<div id="inbox" class="block" style="margin-top:34px"></div>' : ""}</div>`;
  }
  function bindFaq() {
    drawFaq(); drawSide(); if (isStaff) drawInbox();
    if (location.hash === "#inbox") { const el = $("#inbox"); if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 120); }
  }
  function drawFaq() {
    const box = $("#faqBox"), list = FAQ(); if (!box) return;
    if (faqEdit) {
      const row = x => `<div class="faq-ed"><input type="text" class="fq" value="${esc(x.q)}" placeholder="السؤال"><textarea class="fa" rows="2" placeholder="الجواب">${esc(x.a)}</textarea><button type="button" class="btn-link fdel">حذف</button></div>`;
      box.innerHTML = `<div class="card"><h3>تعديل الأسئلة الشائعة</h3><div id="fqList">${list.map(row).join("")}</div>
        <div class="row-acts"><button class="btn btn-sm" id="fqAdd" type="button">+ سؤال</button><button class="btn btn-pri btn-sm" id="fqSave" type="button">حفظ</button><button class="btn btn-sm" id="fqX" type="button">إلغاء</button></div></div>`;
      const bindDel = () => $$(".fdel", box).forEach(d => d.onclick = () => d.closest(".faq-ed").remove());
      bindDel();
      $("#fqAdd").onclick = () => { $("#fqList").insertAdjacentHTML("beforeend", row({ q: "", a: "" })); bindDel(); $$(".fq", box).pop().focus(); };
      $("#fqSave").onclick = async e => {
        const faq = $$(".faq-ed", box).map(r => ({ q: $(".fq", r).value.trim(), a: $(".fa", r).value.trim() })).filter(x => x.q && x.a);
        e.target.disabled = true;
        if (API()) { let r; try { r = await api("saveFaq", { faq }); } catch (x) { r = { ok: false }; } if (!r.ok) { e.target.disabled = false; return toast("⚠️ تعذّر الحفظ"); } }
        CONTENT.faq = faq; if (!API()) store.set("content", CONTENT);
        faqEdit = false; drawFaq(); toast("تم الحفظ ✓ — يظهر للجميع");
      };
      $("#fqX").onclick = () => { faqEdit = false; drawFaq(); };
      return;
    }
    box.innerHTML = `<div class="card"><div class="card-top"><h3>${ico("quiz")} الأسئلة الشائعة</h3>${isStaff ? '<button class="btn btn-sm" id="fqEdit" type="button">✎ تعديل</button>' : ""}</div>
      ${list.length ? list.map((x, i) => `<details class="faq" ${i === 0 ? "open" : ""}><summary>${esc(x.q)}</summary><p>${esc(x.a).replace(/\n/g, "<br>")}</p></details>`).join("") : '<p class="muted">لا توجد أسئلة بعد.</p>'}</div>`;
    const ed = $("#fqEdit"); if (ed) ed.onclick = () => { faqEdit = true; drawFaq(); };
  }
  const askItem = x => `<div class="ask ${x.a ? "done" : ""}"><div class="ask-h"><span class="badge ${x.a ? "up" : ""}">${x.a ? "تم الرد" : "بانتظار الرد"}</span><small class="muted">إلى ${toName(x.to)} · ${esc(fmtDT(x.at))}</small></div><p class="ask-q">${esc(x.q)}</p>${x.a ? `<div class="explain"><b>الرد (${esc(normAr(x.by))}):</b> ${esc(x.a).replace(/\n/g, "<br>")}</div>` : ""}</div>`;
  function drawSide() {
    const box = $("#sideBox"); if (!box) return;
    if (isStaff) {
      box.innerHTML = `<div class="card"><h3>${ico("bell")} إرسال تذكير أو إشعار مهم</h3><p class="muted" style="font-size:14px;margin-top:-6px">يظهر للمتدرب في جرس الإشعارات أعلى الموقع، ويصله على البريد.</p>
        <form id="ntF" class="stack"><div class="fld"><label for="ntTo">إلى</label><select id="ntTo"><option value="*">كل المتدربين</option>${STUDENTS.map(s => `<option>${esc(s.name)}</option>`).join("")}</select></div>
        <div class="fld"><label for="ntT">العنوان</label><input type="text" id="ntT" maxlength="150" placeholder="مثال: تذكير بموعد تسليم المهمة الثانية"></div>
        <div class="fld"><label for="ntB">النص</label><textarea id="ntB" rows="3" maxlength="1500"></textarea></div>
        <label class="chk"><input type="checkbox" id="ntMail" checked> إرسال على البريد أيضًا</label>
        <div class="err" id="ntE"></div><button class="btn btn-pri" type="submit">إرسال</button></form></div>
        <div class="card" style="margin-top:18px"><h3>آخر الإشعارات</h3>${NOTES.slice(-8).reverse().map(n => `<div class="note-it" data-note="${esc(n.id || "")}"><div class="note-h"><span><b>${esc(n.title)}</b><small class="muted"> · ${n.to === "*" ? "الكل" : esc(n.to)} · ${esc(fmtDT(n.at))}</small></span>${n.id ? `<button type="button" class="btn btn-sm btn-del" data-dnote title="حذف الإشعار" aria-label="حذف الإشعار">🗑 حذف</button>` : ""}</div>${n.body ? `<p>${esc(n.body).replace(/\n/g, "<br>")}</p>` : ""}</div>`).join("") || '<p class="muted">لا شيء بعد.</p>'}</div>`;
      $$("[data-dnote]", box).forEach(btn => btn.onclick = async () => {
        const id = btn.closest("[data-note]").dataset.note; if (!id) return;
        if (!confirm("حذف هذا الإشعار؟ سيختفي من جرس الإشعارات عند المتدربين. لا يمكن التراجع.")) return;
        btn.disabled = true;
        let r; try { r = await api("deleteNote", { id }); } catch (e) { r = { ok: false }; }
        if (!r.ok) { btn.disabled = false; return toast(r.err === "action" ? "⚠️ السيرفر يعمل بنسخة Code.gs القديمة — حدّثيه وانشري نسخة جديدة" : "⚠️ تعذّر الحذف"); }
        NOTES = NOTES.filter(n => n.id !== id); toast("تم حذف الإشعار ✓"); drawSide(); updateBell();
      });
      $("#ntF").onsubmit = async e => {
        e.preventDefault();
        const to = $("#ntTo").value, title = $("#ntT").value.trim(), body = $("#ntB").value.trim(), mail = $("#ntMail").checked, er = $("#ntE");
        if (!title) return (er.textContent = "اكتب عنوان الإشعار");
        if (!API()) return (er.textContent = "الإرسال يحتاج ربط السيرفر.");
        const btn = $("button[type=submit]", e.target); btn.disabled = true; er.textContent = "";
        let r; try { r = await api("notify", { to, title, body, mail }); } catch (x) { r = { ok: false }; }
        btn.disabled = false;
        if (!r.ok) return (er.textContent = "تعذّر الإرسال، حاول مجددًا");
        await loadRemote(); /* لنحصل على معرّف الإشعار الجديد (لزر الحذف) */
        if (mail && !r.sent) { toast("⚠️ ظهر الإشعار في الموقع لكن البريد لم يُرسل — " + (r.mailErr !== undefined ? (r.mailErr || "سبب غير معروف") : "السيرفر يعمل بنسخة Code.gs القديمة — الصقي النسخة الجديدة وانشريها (Deploy ← New version)")); er.textContent = "البريد لم يُرسل: " + (r.mailErr !== undefined ? (r.mailErr || "سبب غير معروف") : "السيرفر يعمل بنسخة Code.gs القديمة — الصقي النسخة الجديدة وانشريها (Deploy ← New version)") + " — راجع «الإدارة ← الإعدادات ← البريد» وأرسل رسالة تجريبية."; }
        else toast("تم الإرسال ✓" + (r.sent ? " — بريد إلى " + r.sent : ""));
        drawSide();
      };
      return;
    }
    if (!me) { box.innerHTML = `<div class="card"><h3>${ico("chat")} أرسل استفسارك</h3><p class="muted">سجّل الدخول لإرسال استفسار خاص.</p><button class="btn btn-pri" id="fLogin">تسجيل الدخول</button></div>`; $("#fLogin").onclick = () => askMe(); return; }
    box.innerHTML = `<div class="card"><h3>${ico("chat")} أرسل استفسارك</h3><form id="askF" class="stack">
      <div class="fld"><label for="askTo">إلى</label><select id="askTo"><option value="trainer">المدربـة</option><option value="admin">الإدارة</option></select></div>
      <div class="fld"><label for="askQ">استفسارك</label><textarea id="askQ" rows="4" maxlength="1500" placeholder="اكتب سؤالك بوضوح…"></textarea></div>
      <div class="err" id="askE"></div><button class="btn btn-pri" type="submit">إرسال</button>
      <small class="muted">${ico("lock", "ico sm")} لا يرى استفسارك إلا أنت والمدربـة والإدارة. يصلك الرد هنا وفي الإشعارات وعلى بريدك.</small></form></div>
      <div class="card" style="margin-top:18px"><h3>استفساراتي (${ASKS.length})</h3>${ASKS.length ? ASKS.slice().reverse().map(askItem).join("") : '<p class="muted">لم ترسل أي استفسار بعد.</p>'}</div>`;
    $("#askF").onsubmit = async e => {
      e.preventDefault();
      const q = $("#askQ").value.trim(), er = $("#askE");
      if (q.length < 3) return (er.textContent = "اكتب استفسارك");
      if (!API()) return (er.textContent = "الإرسال يحتاج ربط السيرفر.");
      const btn = $("button[type=submit]", e.target); btn.disabled = true; er.textContent = "";
      let r; try { r = await api("ask", { to: $("#askTo").value, q }); } catch (x) { r = { ok: false }; }
      btn.disabled = false;
      if (!r.ok) return (er.textContent = r.err === "auth" ? "انتهت جلستك — سجّل الدخول من جديد" : "تعذّر الإرسال، حاول مجددًا");
      toast("وصل استفسارك ✓ — سيصلك الرد هنا وعلى بريدك"); await loadMine(); drawSide();
    };
  }
  const normAr = t => String(t || "").replace(/مدرّب/g, "مدربـة");
  function drawInbox() {
    const box = $("#inbox"); if (!box) return;
    const pend = ASKS.filter(x => !x.a), done = ASKS.filter(x => x.a);
    const item = x => `<div class="card ask-in" data-ask="${esc(x.id)}"><div class="ask-h"><b>${esc(x.name)}</b><small class="muted">إلى ${toName(x.to)} · ${esc(fmtDT(x.at))}</small></div><p class="ask-q">${esc(x.q)}</p>
      ${x.a ? `<div class="explain"><b>الرد (${esc(normAr(x.by))}):</b> <span data-shown>${esc(x.a).replace(/\n/g, "<br>")}</span></div>
        <div class="row-acts"><button class="btn btn-sm" type="button" data-edit>✎ تعديل الرد</button><button class="btn btn-sm" type="button" data-del>🗑 حذف الرد</button></div>` : `<textarea rows="2" data-ans placeholder="اكتب الرد…"></textarea><div class="row-acts"><button class="btn btn-pri btn-sm" data-send="0">إرسال الرد</button><button class="btn btn-sm" data-send="1">إرسال + إضافته للأسئلة الشائعة</button></div>`}</div>`;
    box.innerHTML = `<div class="sec-head"><h2>الاستفسارات <span class="acc">الواردة</span></h2><p>${pend.length} بانتظار الرد · كل متدرب يرى استفساره فقط.</p></div>
      ${pend.length ? `<div class="grid g2">${pend.map(item).join("")}</div>` : '<div class="card"><p class="muted" style="margin:0">لا توجد استفسارات بانتظار الرد ✓</p></div>'}
      ${done.length ? `<details class="acc" style="margin-top:16px"><summary><b>تم الرد عليها (${done.length})</b></summary><div class="acc-in">${done.slice().reverse().map(item).join("")}</div></details>` : ""}`;
    $$("[data-edit]", box).forEach(b => b.onclick = () => {
      const c = b.closest("[data-ask]"), x = ASKS.find(y => y.id === c.dataset.ask);
      b.closest(".row-acts").outerHTML = `<textarea rows="3" data-eans maxlength="2000">${esc(x.a)}</textarea>
        <label class="chk"><input type="checkbox" data-enote checked> إبلاغ المتدرب بالرد المعدَّل (إشعار + بريد)</label>
        <div class="row-acts"><button class="btn btn-pri btn-sm" type="button" data-esave>حفظ التعديل</button><button class="btn btn-sm" type="button" data-ecancel>إلغاء</button></div>`;
      $("[data-ecancel]", c).onclick = () => drawInbox();
      $("[data-esave]", c).onclick = async e => {
        const a = $("[data-eans]", c).value.trim(), note = $("[data-enote]", c).checked;
        if (!a) return toast("الرد لا يمكن أن يكون فارغًا — استخدم «حذف الرد»");
        $$("button", c).forEach(y => { y.disabled = true; });
        let r; try { r = await api("editAnswer", { id: x.id, a, notify: note }); } catch (err) { r = { ok: false }; }
        if (!r.ok) { $$("button", c).forEach(y => { y.disabled = false; }); return toast("⚠️ تعذّر حفظ التعديل"); }
        toast("تم تعديل الرد ✓" + (note ? (r.mailed ? " — وصل المتدرب إشعار وبريد" : " — وصل المتدرب إشعار (البريد لم يُرسل)") : "")); await loadRemote(); drawInbox(); drawFaq(); updateBell();
      };
    });
    $$("[data-del]", box).forEach(b => b.onclick = async () => {
      const c = b.closest("[data-ask]"), x = ASKS.find(y => y.id === c.dataset.ask);
      if (!confirm("حذف هذا الرد؟ سيعود الاستفسار إلى «بانتظار الرد» ويختفي الرد من صفحة المتدرب.")) return;
      $$("button", c).forEach(y => { y.disabled = true; });
      let r; try { r = await api("deleteAnswer", { id: x.id }); } catch (err) { r = { ok: false }; }
      if (!r.ok) { $$("button", c).forEach(y => { y.disabled = false; }); return toast("⚠️ تعذّر الحذف"); }
      toast("تم حذف الرد ✓"); await loadRemote(); drawInbox(); updateBell();
    });
    $$("[data-send]", box).forEach(b => b.onclick = async () => {
      const c = b.closest("[data-ask]"), x = ASKS.find(y => y.id === c.dataset.ask), a = $("[data-ans]", c).value.trim();
      if (!a) return toast("اكتب الرد أولًا");
      $$("button", c).forEach(y => { y.disabled = true; });
      let r; try { r = await api("answer", { id: x.id, a }); } catch (e) { r = { ok: false }; }
      if (r.ok && b.dataset.send === "1") { try { const f = FAQ().concat([{ q: x.q, a }]); const r2 = await api("saveFaq", { faq: f }); if (r2.ok) CONTENT.faq = f; } catch (e) {} }
      if (!r.ok) { $$("button", c).forEach(y => { y.disabled = false; }); return toast("⚠️ تعذّر الإرسال"); }
      toast(r.mailed === false ? "أُرسل الرد ✓ — لكن البريد لم يصل المتدرب: " + (r.mailErr || "تحقق من إعدادات البريد") : "أُرسل الرد ✓ — وصل المتدرب تنبيه وبريد"); await loadRemote(); drawInbox(); drawFaq(); updateBell();
    });
  }

  function updateBell() {
    const b = $("#bell"); if (!b) return;
    const seen = store.get("seen", 0) || 0, n = me ? NOTES.filter(x => Date.parse(x.at) > seen).length : isStaff ? ASKS.filter(x => !x.a).length : 0;
    b.hidden = !API() || !(me || isStaff);
    $(".bell-n", b).textContent = n ? (n > 9 ? "9+" : n) : "";
    b.classList.toggle("has", n > 0);
    b.title = me ? "الإشعارات" : "استفسارات بانتظار الرد";
  }
  $("#bell").onclick = () => {
    if (isStaff) { if (PAGE === "faq") { const el = $("#inbox"); if (el) el.scrollIntoView({ block: "start" }); } else location.href = "faq.html" + qs0() + "#inbox"; return; }
    const seen = store.get("seen", 0) || 0, list = NOTES.slice().reverse();
    openDlg(`<h3>${ico("bell")} الإشعارات</h3>${list.length ? `<div class="notes">${list.map(x => `<div class="note-it ${Date.parse(x.at) > seen ? "new" : ""}"><b>${esc(x.title)}</b><small class="muted"> · ${esc(fmtDT(x.at))}</small>${x.body ? `<p>${esc(x.body).replace(/\n/g, "<br>")}</p>` : ""}</div>`).join("")}</div>` : '<p class="muted">لا توجد إشعارات بعد.</p>'}<div class="row"><button class="btn btn-pri" id="nClose">إغلاق</button><a class="btn" href="faq.html${qs0()}">الاستفسارات</a></div>`);
    store.set("seen", Date.now()); updateBell(); $("#nClose").onclick = closeDlg;
  };

  let adTab = null, adAlerts = [];
  /* الإداري/ة: كل أقسام الإدارة ما عدا «الموقع والنصوص» و«الاختبارات والمهام» و«التسليمات» */
  const AD_TABS = () => isTr ? [["site", "الموقع والنصوص"], ["sessions", "الجلسات"], ["qt", "الاختبارات والمهام"], ["alerts", "التنبيهات"], ["subs", "التسليمات"], ["people", "المتدربون"], ["reports", "التقارير"], ["settings", "الإعدادات"]] : [["sessions", "الجلسات"], ["alerts", "التنبيهات"], ["people", "المتدربون"], ["reports", "التقارير"], ["settings", "الإعدادات"]];
  const val = id => { const e = document.getElementById(id); return e ? e.value : ""; };
  const inp = (id, label, v, extra = "", hint = "") => `<div class="fld"><label for="${id}">${label}</label><input type="text" id="${id}" value="${esc(v ?? "")}" ${extra}>${hint ? `<small>${hint}</small>` : ""}</div>`;
  const area = (id, label, v, rows = 3, hint = "") => `<div class="fld"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows}">${esc(v ?? "")}</textarea>${hint ? `<small>${hint}</small>` : ""}</div>`;
  const cloneC = () => JSON.parse(JSON.stringify(CONTENT || {}));

  async function saveContent(next, btn) {
    const old = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = "جارٍ الحفظ…"; }
    try {
      if (API()) { const r = await api("saveContent", { content: next }); if (!r.ok) throw 0; if (r.content) next = r.content; } else store.set("content", next);
      applyContent(next); applySite(); toast(API() ? "تم الحفظ ✓ — يظهر الآن لكل المتدربين" : "تم الحفظ على هذا المتصفح فقط (اربطي السيرفر ليظهر للمتدربين)");
    } catch (e) { toast("⚠️ تعذّر الحفظ — تحقّقي من الاتصال وأعيدي المحاولة"); }
    if (btn) { btn.disabled = false; btn.textContent = old; }
  }

  function pageAdmin() {
    if (!isStaff) return pageHead("", "الإدارة", "هذه الصفحة للمدربـة والإدارة فقط.") + `<div class="container"><div class="card" style="text-align:center"><p>سجّل الدخول كمدربـة أو إداري/ة للوصول إلى هذه الصفحة.</p><button class="btn btn-pri" id="adLogin">تسجيل الدخول</button></div></div>`;
    const tabs = AD_TABS();
    if (!adTab || !tabs.some(t => t[0] === adTab)) adTab = tabs.some(t => t[0] === Q.get("tab")) ? Q.get("tab") : tabs[0][0];
    return pageHead("", "الإدارة", "التعديلات تظهر للمتدربين فور الحفظ.") + `<div class="container">
      ${API() ? "" : '<div class="trainer-bar">⚠️ التخزين السحابي غير مربوط (الحقل <code>api</code> فارغ في data.js): ما تعدّلينه يُحفظ على هذا المتصفح فقط.</div>'}
      ${tabs.length > 1 ? `<div class="toolbar adtabs"><div class="seg seg-wrap" role="tablist">${tabs.map(t => `<button data-ad="${t[0]}" class="${adTab === t[0] ? "on" : ""}">${t[1]}</button>`).join("")}</div>
        <select id="adSel" class="ad-sel" aria-label="القسم">${tabs.map(t => `<option value="${t[0]}" ${adTab === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select></div>` : ""}
      <div id="adBody"></div></div>`;
  }
  function bindAdmin() {
    const l = $("#adLogin"); if (l) { l.onclick = () => askMe(); return; }
    if (!isStaff) return;
    const go = t => { adTab = t; $$("[data-ad]").forEach(x => x.classList.toggle("on", x.dataset.ad === t)); const s = $("#adSel"); if (s) s.value = t; renderAd(); };
    $$("[data-ad]").forEach(b => b.onclick = () => go(b.dataset.ad));
    const s = $("#adSel"); if (s) s.onchange = () => go(s.value);
    renderAd();
  }
  function renderAd() { const b = $("#adBody"); ({ site: adSite, sessions: adSessions, qt: adQT, alerts: adAlertsUi, subs: adSubs, people: adPeople, reports: adReports, settings: adSettings })[adTab](b); }

  function adSubs(b) {
    if (!API()) { b.innerHTML = '<div class="card"><p class="muted">اربطي الشيت (الحقل api) لتظهر التسليمات هنا.</p></div>'; return; }
    const T = TK().project || {}, rub = T.rubric || [], pending = SUBS.filter(x => x.status !== "مقبول");
    const attOf = (nm, n) => QATT.filter(a => a.name === nm && a.n === n);
    const qrows = STUDENTS.map((st, si) => `<tr><td>${esc(st.name)}</td>${QSES.map(x => { const i = x.n - 1, v = (st.quiz || {})[x.n], at = attOf(st.name, x.n), extra = at.filter(a => a.kind !== "معتمدة").length; return `<td class="mono">${v || at.length ? `${v ? v[0] + "/" + v[1] : "—"}${extra ? ` <small class="muted">(+${extra})</small>` : ""} <button type="button" class="del-x" data-dq data-si="${si}" data-n="${x.n}" title="عرض الدرجة المعتمدة والمحاولات وإدارتها" aria-label="إدارة نتائج ${esc(st.name)} في اختبار الجلسة ${x.n}">⋯</button>` : "—"}</td>`; }).join("")}</tr>`).join("");
    const card = x => {
      const isP = x.kind === "project"; let ex = {}; try { ex = JSON.parse(x.extra || "{}"); } catch (e) {}
      const asg = (TK().assignments || []).find(a => a.id === x.key), title = isP ? "المشروع النهائي" : (asg ? asg.title : x.key);
      return `<div class="card" data-sub="${esc(x.id)}" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(x.name)}</b>${subStatusBadge(x)}</div>
        <div class="muted" style="margin:4px 0">${esc(title)} · ${esc(fmtDT(x.at))}</div>
        <div><a href="${esc(x.link)}" target="_blank" rel="noopener" dir="ltr">${/drive\.google\.com/.test(x.link) ? "📎 فتح الملف المرفوع" : esc(x.link)}</a></div>
        ${isP ? `<ul class="plain" style="margin:6px 0">${Object.keys(ex).filter(k => k !== "rubric" && k !== "_labels" && ex[k]).map(k => `<li><b>${esc((ex._labels || {})[k] || (projFields().find(f => f.id === k) || {}).label || k)}:</b> ${isUrl(String(ex[k])) ? `<a href="${esc(ex[k])}" target="_blank" rel="noopener" dir="ltr">${esc(ex[k])}</a>` : esc(ex[k])}</li>`).join("")}</ul>` : x.note ? `<p style="margin:6px 0">${esc(x.note)}</p>` : ""}
        ${isP ? `<div class="rubric">${rub.map((r, i) => `<div class="row"><span>${esc(r[0])}</span><span class="mono">/ ${r[1]}</span><input type="number" min="0" max="${r[1]}" data-rb="${i}" value="${(ex.rubric || [])[i] ?? ""}" style="width:70px"></div>`).join("")}</div>` : `<div class="fld"><label>نقاط</label><input type="number" min="0" data-pts value="${x.points || 0}" style="width:90px"></div>`}
        <div class="fld"><label>تعليق للمتدرب</label><input type="text" data-cm maxlength="300" value="${esc(x.comment)}"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri btn-sm" data-rv="مقبول">مقبول</button><button class="btn btn-sm" data-rv="يحتاج تعديل">يحتاج تعديل</button><button class="btn btn-sm btn-del" type="button" data-dsub style="margin-inline-start:auto">🗑 حذف التسليم</button></div></div>`;
    };
    const qs2 = QSES.map(x => { const n = x.n, a = STUDENTS.map(st => (st.quiz || {})[n]).filter(Boolean); return { n, taken: a.length, avg: a.length ? Math.round(a.reduce((t, v) => t + v[0] / v[1], 0) / a.length * 100) : null }; });
    b.innerHTML = `<p class="muted" style="margin:0 0 12px">عند الضغط على «مقبول» أو «يحتاج تعديل» يصل المتدرب تنبيه على الموقع وبريد تلقائيًا.</p><div class="sec-head"><h2>بانتظار التصحيح (${pending.length})</h2></div>
      ${pending.length ? pending.map(card).join("") : '<div class="card"><p class="muted">لا توجد تسليمات بانتظار التصحيح.</p></div>'}
      <details class="acc" style="margin-top:24px"><summary><b>تم تصحيحها (${SUBS.length - pending.length})</b></summary><div class="acc-in">${SUBS.filter(x => x.status === "مقبول").map(card).join("") || '<p class="muted">لا شيء بعد.</p>'}</div></details>
      <div class="sec-head" style="margin-top:30px"><h2>نتائج الاختبارات (المعتمدة + المحاولات)</h2></div>
      <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${qs2.filter(x => x.taken).map(x => `<span class="badge">جلسة ${x.n}: ${x.taken} متدرب · متوسط ${x.avg}%</span>`).join("") || '<span class="muted">لا نتائج بعد.</span>'}</div>
      <p class="muted" style="font-size:13px;margin:0 0 10px">زر ⋯ بجانب الدرجة يعرض الدرجة المعتمدة (المحاولة الأولى) وكل محاولات المتدرب؛ تقررين إبقاءها أو حذفها أو اعتماد محاولة بدل الأولى. (+ن) = عدد المحاولات الإضافية.</p>
      <div class="tbl-wrap"><table class="tr"><thead><tr><th>المتدرب</th>${QSES.map(x => `<th>${x.n}</th>`).join("")}</tr></thead><tbody>${qrows}</tbody></table></div></div>`;
    $$("[data-sub]", b).forEach(c => { const d = $("[data-dsub]", c); if (d) d.onclick = async () => {
      const x = SUBS.find(y => y.id === c.dataset.sub); if (!x) return;
      if (!confirm("حذف تسليم «" + x.name + "» " + (x.kind === "project" ? "للمشروع النهائي" : "لهذه المهمة") + "؟\nسيُمسح من القائمة وتعود خانته في جدول المتابعة فارغة، ويستطيع المتدرب التسليم من جديد. لا يمكن التراجع.")) return;
      d.disabled = true;
      let r; try { r = await api("deleteSub", { id: x.id }); } catch (e) { r = { ok: false }; }
      if (!r.ok) { d.disabled = false; return toast(r.err === "action" ? "⚠️ السيرفر يعمل بنسخة Code.gs القديمة — حدّثيه وانشري نسخة جديدة" : "⚠️ تعذّر الحذف"); }
      toast("تم حذف التسليم ✓"); await loadRemote(); renderAd();
    }; });
    const qDlg = (st, n) => {
      const rows = attOf(st.name, n).slice().sort((x, y) => String(x.at).localeCompare(String(y.at)));
      openDlg(`<h3>اختبار الجلسة ${n} — ${esc(st.name)}</h3>
        <p class="muted" style="margin:0 0 10px">الدرجة المعتمدة هي التي تُحتسب في النقاط والتقارير. المتدرب وحده يعيد الاختبار؛ وأنتِ من تقررين ما يبقى.</p>
        ${rows.length ? `<div class="tbl-wrap"><table class="tr"><thead><tr><th>الوقت</th><th>الدرجة</th><th>النوع</th><th></th></tr></thead><tbody>${rows.map(a => `<tr><td>${esc(fmtDT(a.at))}</td><td class="mono">${a.score}/${a.total}</td><td>${a.kind === "معتمدة" ? "<b>معتمدة</b>" : "محاولة"}</td><td style="white-space:nowrap">${a.kind === "معتمدة" ? "" : `<button class="btn btn-sm" data-qa="${esc(a.id)}">اعتمدها</button> `}<button class="btn btn-sm btn-del" data-qd="${esc(a.id)}">🗑 حذف</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">لا توجد نتائج.</p>'}
        <div class="row" style="margin-top:12px"><button class="btn" id="q_x">إغلاق</button></div>`);
      $("#q_x").onclick = closeDlg;
      const run = async (action, id, msg, ask) => {
        if (ask && !confirm(ask)) return;
        let r; try { r = await api(action, { id }); } catch (e) { r = { ok: false }; }
        if (!r.ok) return toast(r.err === "action" ? "⚠️ السيرفر يعمل بنسخة Code.gs القديمة — حدّثيه وانشري نسخة جديدة" : "⚠️ تعذّر تنفيذ العملية");
        toast(msg); await loadRemote(); renderAd(); const st2 = STUDENTS.find(y => y.name === st.name); if (st2 && attOf(st2.name, n).length) qDlg(st2, n); else closeDlg();
      };
      $$("[data-qd]", dlg).forEach(x => x.onclick = () => run("deleteQuiz", x.dataset.qd, "تم الحذف ✓", "حذف هذه النتيجة؟ إن كانت المعتمدة فسيُحتسب للمتدرب ما يحل بعدها عند إعادته للاختبار. لا يمكن التراجع."));
      $$("[data-qa]", dlg).forEach(x => x.onclick = () => run("approveQuiz", x.dataset.qa, "تم اعتماد المحاولة ✓", "اعتماد هذه المحاولة بدل الدرجة المعتمدة الحالية؟"));
    };
    $$("[data-dq]", b).forEach(btn => btn.onclick = () => { const st = STUDENTS[+btn.dataset.si]; if (st) qDlg(st, +btn.dataset.n); });
    $$("[data-sub]", b).forEach(c => $$("[data-rv]", c).forEach(btn => btn.onclick = async () => {
      const x = SUBS.find(y => y.id === c.dataset.sub), isP = x.kind === "project", extra = {}; let pts = +(($("[data-pts]", c) || {}).value || 0);
      if (isP) { extra.rubric = $$("[data-rb]", c).map(i => Math.max(0, +i.value || 0)); pts = extra.rubric.reduce((t, v) => t + v, 0); try { Object.assign(extra, JSON.parse(x.extra || "{}"), { rubric: extra.rubric }); } catch (e) {} }
      btn.disabled = true;
      let r; try { r = await api("review", { id: x.id, status: btn.dataset.rv, comment: $("[data-cm]", c).value, points: pts, extra: isP ? extra : null }); } catch (e) { r = { ok: false }; }
      if (!r.ok) { btn.disabled = false; return toast("⚠️ تعذّر الحفظ"); }
      toast(r.mailed === false ? "تم الحفظ ✓ — لكن البريد لم يصل المتدرب: " + (r.mailErr || "السيرفر يعمل بنسخة Code.gs القديمة — حدّثيه وانشري نسخة جديدة") : "تم الحفظ ✓ — وصل المتدرب تنبيه وبريد"); await loadRemote(); renderAd();
    }));
  }

  function adSite(b) {
    b.innerHTML = `<div class="card"><h3>معلومات عامة</h3><div class="ad-grid">
        ${inp("f_name", "اسم المعسكر", S.name)}${inp("f_shortName", "الاسم في الشريط العلوي", S.shortName || S.name)}
        ${inp("f_presenter", "سطر التقديم (تحت العنوان في الرئيسية)", S.presenter || "")}${inp("f_trainer", "اسم المدربـة", S.trainer)}
        ${inp("f_plx", "حساب X (رابط أو @اسم_المستخدم)", (S.presenterLinks || {}).x || "", 'dir="ltr" placeholder="https://x.com/…"', "تظهر الحسابات عند ضغط المتدرب على سطر التقديم في الرئيسية. اتركيه فارغًا لإخفائه.")}${inp("f_plin", "حساب LinkedIn", (S.presenterLinks || {}).linkedin || "", 'dir="ltr" placeholder="https://www.linkedin.com/in/…"')}
        ${inp("f_plpf", "رابط البورتفوليو", (S.presenterLinks || {}).portfolio || "", 'dir="ltr" placeholder="https://…"')}
        <div class="fld"><label for="f_startDate">تاريخ أول جلسة</label><input type="date" id="f_startDate" value="${esc(S.startDate)}"><small>الجلسات الأخرى تُحسب منه. ولأي جلسة تاريخ خاص من تبويب «الجلسات».</small></div>
        <div class="fld"><label for="f_endDate">نهاية المعسكر (آخر يوم في أسبوع المشروع)</label><input type="date" id="f_endDate" value="${esc(S.endDate || "")}"></div>
        ${inp("f_days", "أيام الجلسات في الأسبوع", (S.sessionDays || []).join(","), 'dir="ltr"', "0 = نفس يوم بداية الأسبوع، 2 = بعده بيومين… مثال: 0,2 (الاثنين والأربعاء)")}
        ${inp("f_time", "وقت الجلسة (للعرض)", S.sessionTime, "", "مثال: 8:00 م")}
        ${inp("f_hour", "الساعة بنظام 24 (للعدّاد والتذكير)", S.sessionHour, 'dir="ltr" inputmode="numeric"')}${inp("f_min", "الدقائق", S.sessionMinute || 0, 'dir="ltr" inputmode="numeric"', "مثال: 30 لجلسة تبدأ 8:30")}
        ${inp("f_late", "التأخير يُحتسب بعد (دقيقة)", S.lateAfterMin, 'dir="ltr" inputmode="numeric"')}
      </div></div>
      <div class="card" style="margin-top:16px"><h3>الصفحة الرئيسية</h3><div class="ad-grid">
        ${inp("f_heroPre", "العنوان — الجزء الأول", S.heroPre)}${inp("f_heroAccent", "العنوان — الجزء الملوّن", S.heroAccent)}${inp("f_heroPost", "العنوان — الجزء الأخير", S.heroPost)}
      </div>${area("f_heroLead", "الوصف تحت العنوان", S.heroLead, 2)}
      ${area("f_notes", "التعليمات (كل سطر تعليمة) — تظهر في الرئيسية", (S.notes || []).join("\n"), 4)}
      ${area("f_progress", "أين وصلنا؟ (نص حر)", S.progressNote, 2, "اتركيه فارغًا ليُحسب تلقائيًا من التواريخ.")}
      ${area("f_nextNote", "ملاحظة تحت «الجلسة القادمة»", S.nextNote, 2, "رابط الجلسة يُضاف من زر «رابط الجلسة» في الرئيسية أو الأجندة.")}</div>
      <div class="card" style="margin-top:16px"><h3>الأسابيع</h3>${WK.map(w => `<div class="ad-grid">${inp("w" + w.n + "_t", "الأسبوع " + w.n + " — العنوان", w.title, 'dir="ltr"')}${inp("w" + w.n + "_g", "الهدف", w.goal)}</div>`).join("")}</div>
      <div class="savebar"><button class="btn btn-pri" id="adSave">حفظ</button></div>`;
    $("#adSave").onclick = e => {
      const days = val("f_days").split(/[,،\s]+/).filter(Boolean).map(Number);
      if (days.length < 1 || days.length > 3 || days.some(n => !(n >= 0 && n <= 6))) return toast("أيام الجلسات: رقم إلى ثلاثة أرقام بين 0 و6، مثل 0,2");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val("f_startDate"))) return toast("اختاري تاريخ أول جلسة");
      for (const [id, k, nm] of [["f_plx", "x", "X"], ["f_plin", "linkedin", "LinkedIn"], ["f_plpf", "portfolio", "البورتفوليو"]]) if (val(id).trim() && !normLink(k, val(id))) return toast("رابط " + nm + " غير صحيح — اكتبيه كاملًا يبدأ بـ https://");
      const n = cloneC(); n.site = Object.assign({}, n.site, { name: val("f_name"), shortName: val("f_shortName"), presenter: val("f_presenter"), presenterLinks: { x: normLink("x", val("f_plx")), linkedin: normLink("linkedin", val("f_plin")), portfolio: normLink("portfolio", val("f_plpf")) }, trainer: val("f_trainer"), startDate: val("f_startDate"), endDate: val("f_endDate"), sessionDays: days, sessionTime: val("f_time"), sessionHour: +val("f_hour") || 20, sessionMinute: Math.min(59, Math.max(0, +val("f_min") || 0)), lateAfterMin: +val("f_late") || 15, heroPre: val("f_heroPre"), heroAccent: val("f_heroAccent"), heroPost: val("f_heroPost"), heroLead: val("f_heroLead"), notes: val("f_notes").split("\n").map(x => x.trim()).filter(Boolean), progressNote: val("f_progress"), nextNote: val("f_nextNote") });
      n.weeks = {}; WK.forEach(w => { n.weeks[w.n] = { title: val("w" + w.n + "_t"), goal: val("w" + w.n + "_g") }; });
      saveContent(n, e.target);
    };
  }

  function adQT(b) {
    const asg = TK().assignments || [], PJ = TK().project || {};
    const pfRow = f => `<div class="qed pfed" data-id="${esc(f.id)}"><div class="qed-h"><b>حقل</b><span><button type="button" class="btn-link pfup">▲</button> <button type="button" class="btn-link pfdn">▼</button> <button type="button" class="btn-link pfdel">حذف</button></span></div>
      <input type="text" class="pf-l" placeholder="عنوان الحقل" value="${esc(f.label)}">
      <div class="qed-g"><select class="pf-t">${[["text", "نص قصير"], ["link", "رابط"], ["long", "نص طويل"]].map(t => `<option value="${t[0]}" ${f.type === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select><input type="text" class="pf-p" placeholder="مثال داخل الحقل" value="${esc(f.ph || "")}"><input type="text" class="pf-h" placeholder="تلميح تحت الحقل (اختياري)" value="${esc(f.hint || "")}"></div>
      <label class="chk"><input type="checkbox" class="pf-r" ${f.req ? "checked" : ""}> مطلوب</label></div>`;
    const row = (id, label) => `<label class="lockrow"><input type="checkbox" data-ck="${id}" ${UNL().includes(id) ? "checked" : ""}><span>${label}</span></label>`;
    const qRow = q => `<div class="qed"><div class="qed-h"><b>سؤال</b><button type="button" class="btn-link qdel">حذف</button></div>
      <input type="text" class="qe-q" placeholder="نص السؤال" value="${esc(q.q)}">
      <div class="qed-g"><input type="text" class="qe-c" placeholder="✓ الإجابة الصحيحة" value="${esc(q.c)}">${[0, 1, 2].map(i => `<input type="text" class="qe-w" placeholder="✕ إجابة خاطئة ${i + 1}" value="${esc((q.w || [])[i] || "")}">`).join("")}</div>
      <input type="text" class="qe-e" placeholder="الشرح (يظهر للمتدرب بعد الإجابة)" value="${esc(q.e || "")}"></div>`;
    b.innerHTML = `
    <div class="card"><h3>${ico("lock")} الفتح والقفل</h3><p class="muted" style="margin-top:-6px">ما لم يُفعَّل يراه المتدربون رماديًا عليه قفل، بدون أي تفاصيل.</p>
      <div class="lockgrid"><div><h4>الاختبارات</h4>${QSES.map(s => row("q" + s.n, `اختبار الجلسة ${s.n} — ${esc(s.ar)}`)).join("")}</div><div><h4>المهام والمشروع</h4>${asg.map(a => row(a.id, esc(a.title))).join("")}${row("p5", "المشروع النهائي")}</div></div>
      <div class="row-acts"><button class="btn btn-pri" id="lkSave" type="button">حفظ الأقفال</button><button class="btn btn-sm" id="lkAll" type="button">تحديد الكل</button><button class="btn btn-sm" id="lkNone" type="button">قفل الكل</button></div></div>
    <div class="card" style="margin-top:16px"><h3>${ico("file")} المهام الأسبوعية</h3>${asg.map(a => `<details class="acc"><summary><b>${esc(a.title)}</b>${a.due ? ` <small class="muted">· التسليم ${esc(a.due)}</small>` : ""}</summary><div class="acc-in">
        ${inp("t_" + a.id + "_title", "العنوان", a.title)}${area("t_" + a.id + "_desc", "الوصف", a.desc, 2)}${area("t_" + a.id + "_todo", "المطلوب (كل سطر بند)", (a.todo || []).join("\n"), 3)}
        <div class="fld"><label for="t_${a.id}_due">موعد التسليم</label><input type="date" id="t_${a.id}_due" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(a.due || "") ? a.due : "")}"><small>بعده يُسجَّل التسليم «متأخر»، ومن لم يسلّم يظهر «لم يُسلَّم» تلقائيًا.</small></div></div></details>`).join("")}</div>
    <div class="card" style="margin-top:16px"><h3>${ico("layers")} المشروع النهائي</h3><p class="muted" style="margin-top:-6px">المكتوب حاليًا هو الافتراضي — عدّلي ما تحتاجينه فقط. يظهر التعديل للمتدربين فور الحفظ.</p>
      <details class="acc"><summary><b>الوصف والخطوات</b></summary><div class="acc-in">${area("pj_desc", "الوصف", PJ.desc || "", 3)}${area("pj_steps", "خطوات المشروع (كل سطر خطوة)", (PJ.steps || []).join("\n"), 5)}</div></details>
      <details class="acc"><summary><b>معايير التقييم</b> <small class="muted">· المجموع <span id="pjTot">${(PJ.rubric || []).reduce((t, r) => t + (+r[1] || 0), 0)}</span></small></summary><div class="acc-in">${area("pj_rubric", "كل سطر: المعيار | الدرجة", (PJ.rubric || []).map(r => r[0] + " | " + r[1]).join("\n"), 6)}<small class="muted">مثال: جودة التحليل | 25 — الدرجة رقم في آخر السطر.</small></div></details>
      <details class="acc"><summary><b>طريقة التسليم وحقول النموذج</b> <small class="muted">· <span id="pjCnt">${projFields().length}</span> حقول</small></summary><div class="acc-in">
        <p class="muted" style="margin:0 0 8px;font-size:13.5px">النوع «رابط» يُتحقَّق منه ويُعتمد أول رابط فيه كالرابط الرئيسي للتسليم. «نص قصير» و«نص طويل» للمعلومات الإضافية.</p>
        <div id="pfList">${projFields().map(pfRow).join("")}</div>
        <div class="row-acts"><button type="button" class="btn btn-sm" id="pfAdd">+ إضافة حقل</button><button type="button" class="btn btn-sm" id="pfReset">استعادة الافتراضي</button></div>
        <label class="chk" style="margin-top:10px"><input type="checkbox" id="pj_file" ${PJ.allowFile ? "checked" : ""}> السماح للمتدرب برفع ملف (txt أو pdf) بدل الرابط</label></div></details></div>
    <div class="card" style="margin-top:16px"><h3>${ico("quiz")} أسئلة الاختبارات</h3><p class="muted" style="margin-top:-6px">التعديل يظهر للمتدربين فور الحفظ. ترتيب الخيارات يُخلط تلقائيًا.</p>
      ${QSES.map(s => `<details class="acc"><summary><b>اختبار الجلسة ${s.n}</b> — ${esc(s.ar)} <small class="muted">· <span data-qc="${s.n}">${(QZ[s.n] || []).length}</span> أسئلة</small></summary><div class="acc-in"><div class="qlist" data-qz="${s.n}">${(QZ[s.n] || []).map(qRow).join("")}</div><button type="button" class="btn btn-sm" data-addq="${s.n}">+ إضافة سؤال</button></div></details>`).join("")}</div>
    <div class="savebar"><button class="btn btn-pri" id="qtSave">حفظ المهام والمشروع والأسئلة</button></div>`;
    const all = v => $$("[data-ck]", b).forEach(c => { c.checked = v; });
    $("#lkAll").onclick = () => all(true); $("#lkNone").onclick = () => all(false);
    $("#lkSave").onclick = e => { const n = cloneC(); n.site = Object.assign({}, n.site, { unlocked: $$("[data-ck]", b).filter(c => c.checked).map(c => c.dataset.ck) }); saveContent(n, e.target); };
    const count = l => { const c = $(`[data-qc="${l.dataset.qz}"]`, b); if (c) c.textContent = $$(".qed", l).length; };
    const bindQ = () => $$(".qdel", b).forEach(d => d.onclick = () => { const l = d.closest(".qlist"); d.closest(".qed").remove(); count(l); });
    bindQ();
    $$("[data-addq]", b).forEach(x => x.onclick = () => { const l = $(`[data-qz="${x.dataset.addq}"]`, b); l.insertAdjacentHTML("beforeend", qRow({ q: "", c: "", w: [], e: "" })); bindQ(); count(l); $$(".qe-q", l).pop().focus(); });
    const pfBind = () => {
      const L = $("#pfList", b), cnt = () => { $("#pjCnt", b).textContent = $$(".pfed", L).length; };
      $$(".pfdel", L).forEach(d => d.onclick = () => { d.closest(".pfed").remove(); cnt(); });
      $$(".pfup", L).forEach(d => d.onclick = () => { const r = d.closest(".pfed"); if (r.previousElementSibling) L.insertBefore(r, r.previousElementSibling); });
      $$(".pfdn", L).forEach(d => d.onclick = () => { const r = d.closest(".pfed"); if (r.nextElementSibling) L.insertBefore(r.nextElementSibling, r); });
    };
    pfBind();
    $("#pfAdd").onclick = () => { $("#pfList", b).insertAdjacentHTML("beforeend", pfRow({ id: "f" + Date.now().toString(36), label: "", type: "text", ph: "", hint: "", req: false })); pfBind(); $("#pjCnt", b).textContent = $$(".pfed", b).length; $$(".pf-l", b).pop().focus(); };
    $("#pfReset").onclick = () => { if (!confirm("استعادة حقول النموذج الافتراضية؟ (لا يُحفظ شيء حتى تضغطي «حفظ»)")) return; $("#pfList", b).innerHTML = PF_DEF.map(pfRow).join(""); pfBind(); $("#pjCnt", b).textContent = PF_DEF.length; };
    $("#pj_rubric", b).oninput = () => { $("#pjTot", b).textContent = $("#pj_rubric", b).value.split("\n").reduce((t, l) => t + (parseInt((l.split("|").pop() || "").trim()) || 0), 0); };
    const readProject = () => {
      const fields = $$(".pfed", b).map(r => ({ id: r.dataset.id, label: $(".pf-l", r).value.trim(), type: $(".pf-t", r).value, ph: $(".pf-p", r).value.trim(), hint: $(".pf-h", r).value.trim(), req: $(".pf-r", r).checked })).filter(f => f.label);
      const allowFile = $("#pj_file", b).checked;
      if (!fields.length) return { err: "أضيفي حقلًا واحدًا على الأقل لنموذج المشروع" };
      if (!fields.some(f => f.type === "link") && !allowFile) return { err: "نموذج المشروع يحتاج حقل «رابط» واحدًا على الأقل، أو فعّلي رفع الملف" };
      const rubric = []; for (const l of val("pj_rubric").split("\n").map(x => x.trim()).filter(Boolean)) { const parts = l.split("|"), sc = parseInt((parts.pop() || "").trim()); if (!(sc > 0) || !parts.join("|").trim()) return { err: "سطر معيار غير صحيح: «" + l + "» — الصيغة: المعيار | الدرجة" }; rubric.push([parts.join("|").trim(), sc]); }
      if (!rubric.length) return { err: "أضيفي معيار تقييم واحدًا على الأقل" };
      return { data: { desc: val("pj_desc").trim(), steps: val("pj_steps").split("\n").map(x => x.trim()).filter(Boolean), rubric, fields, allowFile } };
    };
    $("#qtSave").onclick = e => {
      const n = cloneC(); n.quizzes = {}; let bad = 0;
      const pj = readProject(); if (pj.err) return toast(pj.err); n.project = pj.data;
      $$("[data-qz]", b).forEach(l => {
        n.quizzes[l.dataset.qz] = $$(".qed", l).map(r => ({ q: $(".qe-q", r).value.trim(), c: $(".qe-c", r).value.trim(), w: $$(".qe-w", r).map(x => x.value.trim()).filter(Boolean), e: $(".qe-e", r).value.trim() }))
          .filter(x => { const ok = x.q && x.c && x.w.length; if (!ok && (x.q || x.c || x.w.length)) bad++; return ok; });
      });
      if (bad) return toast("أكملي كل سؤال: النص + الإجابة الصحيحة + إجابة خاطئة واحدة على الأقل");
      n.tasks = {}; asg.forEach(a => { const k = "t_" + a.id + "_"; n.tasks[a.id] = { title: val(k + "title").trim() || a.title, desc: val(k + "desc").trim(), todo: val(k + "todo").split("\n").map(x => x.trim()).filter(Boolean), due: val(k + "due") }; });
      saveContent(n, e.target);
    };
  }

  function readAlerts() { return $$(".arow").map(r => ({ type: $(".a-type", r).value, text: $(".a-text", r).value.trim(), date: $(".a-date", r).value.trim() })); }
  function adAlertsUi(b) {
    if (!$(".arow")) adAlerts = ALERTS.map(a => Object.assign({}, a)); else adAlerts = readAlerts();
    const row = (a, i) => `<div class="arow" data-i="${i}"><select class="a-type">${[["important", "مهم"], ["deadline", "موعد"], ["info", "معلومة"]].map(t => `<option value="${t[0]}" ${a.type === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select>
      <input type="text" class="a-text" value="${esc(a.text)}" placeholder="نص التنبيه"><input type="text" class="a-date" value="${esc(a.date || "")}" placeholder="مثال: هذا الأسبوع"><button class="btn btn-sm a-del" type="button">حذف</button></div>`;
    b.innerHTML = `<div class="card"><h3>التنبيهات في الصفحة الرئيسية</h3><p class="muted" style="font-size:14px">تظهر للمتدربين بنفس الترتيب. عند حفظ تنبيه جديد يصل المتدربين إشعار على الموقع وبريد تلقائيًا (التنبيهات القديمة التي لم تتغيّر لا تُرسل من جديد).</p>
      <div id="alist">${adAlerts.map(row).join("") || '<p class="muted">لا توجد تنبيهات بعد.</p>'}</div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" id="aMail" checked> إشعار المتدربين بالتنبيهات الجديدة (موقع + بريد)</label>
      <div class="row-acts"><button class="btn" id="aAdd" type="button">+ إضافة تنبيه</button><button class="btn btn-pri" id="aSave" type="button">حفظ</button></div></div>`;
    $("#aAdd").onclick = () => { adAlerts = $(".arow") ? readAlerts() : []; adAlerts.push({ type: "info", text: "", date: "" }); $("#alist").innerHTML = adAlerts.map(row).join(""); bindDel(); $$(".a-text").pop().focus(); };
    const bindDel = () => $$(".a-del").forEach(d => d.onclick = () => { d.closest(".arow").remove(); });
    bindDel();
    $("#aSave").onclick = async e => {
      const list = readAlerts().filter(a => a.text), btn = e.target;
      if (!API()) { const n = cloneC(); n.alerts = list; return saveContent(n, btn); }
      btn.disabled = true;
      let r; try { r = await api("saveAlerts", { alerts: list, notify: $("#aMail").checked }); } catch (x) { r = { ok: false }; }
      btn.disabled = false;
      if (!r.ok) return toast(r.err === "action" ? "⚠️ السيرفر يعمل بنسخة Code.gs القديمة — الصقي النسخة الجديدة وانشريها (Deploy ← New version)" : "⚠️ تعذّر الحفظ — تحقّقي من الاتصال وأعيدي المحاولة");
      CONTENT.alerts = r.alerts; ALERTS.length = 0; r.alerts.forEach(a => ALERTS.push(a));
      toast(!r.notified ? "تم الحفظ ✓" : r.sent ? "تم الحفظ ✓ — أُرسل التنبيه الجديد بالبريد إلى " + r.sent + " متدرب" : "تم الحفظ ✓ — ظهر التنبيه في الموقع لكن البريد لم يُرسل: " + (r.mailErr || "راجعي «الإعدادات ← البريد»"));
      loadRemote();
    };
  }

  const linesOf = arr => (arr || []).map(r => r.t + " | " + (r.u || r.q || "")).join("\n");
  const parseLinks = (txt, needUrl) => txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [t, ...r] = l.split("|"), u = r.join("|").trim(), o = { t: t.trim() }; if (/^https?:\/\//i.test(u)) o.u = u; else if (!needUrl) o.q = u || o.t; return o; }).filter(o => o.t && (!needUrl || o.u));
  function adSessions(b) {
    b.innerHTML = `<p class="muted" style="margin:0 0 12px">اضغطي على الجلسة لتعديلها. لكل جلسة ثلاثة أزرار تظهر للمتدربين في الأجندة: <b>المحتوى</b> (ملف السلايدات) · <b>العملي</b> (Colab) · <b>التسجيل</b> (رابط تسجيل المحاضرة).</p>
      ${SES.map(s => { const k = "s" + s.n + "_"; return `<details class="acc" ${s.n === (nextIdx() + 1) ? "open" : ""}><summary><b>الجلسة ${s.n}</b> — ${esc(s.ar)} <small class="muted">· ${fmtShort(sessionDate(s.n - 1))}</small></summary><div class="acc-in">
        <div class="ad-grid">${inp(k + "ar", "العنوان بالعربية", s.ar)}${inp(k + "en", "العنوان بالإنجليزية", s.en, 'dir="ltr"')}</div>
        ${area(k + "desc", "الوصف", s.desc, 2)}
        <div class="ad-grid"><div class="fld"><label for="${k}date">تاريخ الجلسة (اتركيه فارغًا ليُحسب تلقائيًا)</label><input type="date" id="${k}date" value="${esc(s.date || "")}"></div>
        ${inp(k + "place", "المكان (اختياري)", s.place || "", "", "رابط الجلسة المباشر يُضاف من زر «رابط الجلسة»")}</div>
        <div class="res3">
          <div>${inp(k + "slides", "① المحتوى: ملف السلايدات", s.slides || "", 'dir="ltr" placeholder="https://… أو ارفعي الملف"')}<div class="upl"><input type="file" id="${k}file" hidden><button type="button" class="btn btn-sm" data-up="${s.n}">${ico("file", "ico sm")} رفع ملف</button><small class="muted" id="${k}upst"></small></div></div>
          <div>${inp(k + "colab", "② العملي: رابط Colab", s.colab || "", 'dir="ltr" placeholder="https://colab.research.google.com/…"')}</div>
          <div>${inp(k + "rec", "③ التسجيل: رابط تسجيل المحاضرة", s.rec || "", 'dir="ltr" placeholder="https://…"')}</div>
        </div>
        ${area(k + "topics", "المحاور (كل سطر محور)", (s.topics || []).join("\n"), 4)}
        ${area(k + "refs", "المراجع (كل سطر: العنوان | الرابط)", linesOf(s.refs), 3)}
        ${area(k + "vids", "الفيديوهات (كل سطر: العنوان | رابط أو كلمات بحث يوتيوب)", linesOf(s.videos), 2)}
      </div></details>`; }).join("")}
      <div class="savebar"><button class="btn btn-pri" id="sSave">حفظ كل الجلسات</button></div>`;
    const save = btn => {
      const n = cloneC(); n.sessions = {};
      SES.forEach(s => { const k = "s" + s.n + "_"; n.sessions[s.n] = { ar: val(k + "ar"), en: val(k + "en"), desc: val(k + "desc"), date: val(k + "date"), place: val(k + "place").trim(), slides: val(k + "slides").trim(), colab: val(k + "colab").trim(), rec: val(k + "rec").trim(), link: s.link || "", topics: val(k + "topics").split("\n").map(x => x.trim()).filter(Boolean), refs: parseLinks(val(k + "refs"), true), videos: parseLinks(val(k + "vids"), false) }; });
      return saveContent(n, btn);
    };
    $("#sSave").onclick = e => save(e.target);
    $$("[data-up]", b).forEach(btn => {
      const n = btn.dataset.up, fi = $("#s" + n + "_file"), st = $("#s" + n + "_upst");
      btn.onclick = () => fi.click();
      fi.onchange = async () => {
        const f = fi.files[0]; if (!f) return;
        if (!API()) { fi.value = ""; return toast("رفع الملفات يحتاج ربط السيرفر — ضعي رابطًا بدلًا منه"); }
        if (f.size > 25 * 1024 * 1024) { fi.value = ""; return toast("الحد الأقصى 25MB — ارفعيه على Drive وضعي الرابط"); }
        st.textContent = "جارٍ الرفع…"; btn.disabled = true;
        let r; try { r = await api("upload", { file: { name: f.name, type: f.type, data: await readB64(f) } }); } catch (e) { r = { ok: false }; }
        btn.disabled = false; fi.value = "";
        if (!r.ok) { st.textContent = r.err === "type" ? "نوع الملف غير مدعوم (pdf / pptx / …)" : "تعذّر الرفع"; return; }
        $("#s" + n + "_slides").value = r.url; st.textContent = "✓ رُفع وحُفظ";
        await save(null);
      };
    });
  }

  function stuDlg(st) {
    openDlg(`<h3>${st ? "تعديل متدرب" : "إضافة متدرب"}</h3>${inp("d_name", "الاسم", st ? st.name : "")}${inp("d_mail", "البريد", st ? st.email : "", 'dir="ltr"')}${inp("d_gh", "حساب GitHub", st ? st.github : "", 'dir="ltr"')}${inp("d_pts", "نقاط إضافية", st ? st.points : 0, 'dir="ltr" inputmode="numeric"')}${inp("d_code", "رمز الدخول", st ? st.code : "", 'dir="ltr"', st ? "غيّريه إن أردتِ" : "اتركيه فارغًا ليُنشأ تلقائيًا")}
      <div class="err" id="d_err" style="color:var(--bad);font-size:13px;min-height:1em"></div><div class="row"><button class="btn btn-pri" id="d_ok">حفظ</button><button class="btn" id="d_x">إلغاء</button></div>`);
    $("#d_x").onclick = closeDlg;
    $("#d_ok").onclick = async () => {
      const o = { name: val("d_name").trim().replace(/\s+/g, " "), email: val("d_mail").trim(), github: val("d_gh").trim().replace(/^@/, ""), points: Math.max(0, parseInt(val("d_pts")) || 0), code: val("d_code").trim() };
      if (!o.name) return ($("#d_err").textContent = "اكتبي الاسم");
      if (API()) {
        let r; try { r = await api("saveStudent", Object.assign({ oldName: st ? st.name : "" }, o)); } catch (e) { r = { ok: false }; }
        if (!r.ok) return ($("#d_err").textContent = r.err === "exists" ? "يوجد متدرب بنفس الاسم" : r.err === "mailexists" ? "هذا البريد مستخدم لمتدرب آخر" : "تعذّر الحفظ، حاولي مجددًا");
        await loadRemote();
      } else {
        const cur = st || { name: o.name, att: nulls(), hw: nulls(), tasks: {}, checkins: {} }; if (!st) STUDENTS.push(cur);
        Object.assign(cur, o); store.set("students", STUDENTS);
      }
      closeDlg(); renderAd(); toast("تم الحفظ ✓");
    };
  }
  function adPeople(b) {
    b.innerHTML = `<div class="card"><div class="card-top"><h3 style="margin:0">المتدربون (${STUDENTS.length})</h3>
      <div class="row-acts" style="margin:0"><button class="btn btn-sm" id="pRef">↻ تحديث</button><button class="btn btn-sm btn-pri" id="pAdd">+ إضافة متدرب</button></div></div>
      ${STUDENTS.length ? `<div class="tbl-wrap"><table class="tr"><thead><tr><th>الاسم</th><th>البريد</th><th>رمز الدخول</th><th>الحضور</th><th>المهام</th><th>XP</th><th></th></tr></thead><tbody>
      ${STUDENTS.map((s, i) => `<tr><td style="text-align:start">${esc(s.name)}</td><td dir="ltr">${esc(s.email || "—")}</td><td class="mono">${esc(s.code || "—")}</td><td>${pctOf(s.att)}%</td><td>${pctOf(s.hw)}%</td><td>${xpOf(s)}</td><td><button class="btn btn-sm" data-e="${i}">تعديل</button> <button class="btn btn-sm" data-d="${i}">حذف</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">لا يوجد متدربون بعد. شاركي رابط التسجيل (تبويب «الإعدادات») أو أضيفيهم يدويًا.</p>'}
      <p class="muted" style="font-size:13px;margin:12px 0 0">رمز الدخول يظهر للمدربـة والإدارة فقط. إن نسيه المتدرب يستطيع طلبه على بريده من شاشة الدخول.</p></div>`;
    $("#pAdd").onclick = () => stuDlg(null);
    $("#pRef").onclick = async () => { toast((await loadRemote()) ? "تم التحديث ✓" : "تعذّر التحديث"); renderAd(); };
    $$("[data-e]", b).forEach(x => x.onclick = () => stuDlg(STUDENTS[+x.dataset.e]));
    $$("[data-d]", b).forEach(x => x.onclick = () => {
      const st = STUDENTS[+x.dataset.d];
      openDlg(`<h3>حذف ${esc(st.name)}؟</h3><p class="muted">سيُحذف المتدرب مع كل حضوره ومهامه. لا يمكن التراجع.</p><div class="row"><button class="btn btn-pri" id="d_yes">نعم، احذفي</button><button class="btn" id="d_no">إلغاء</button></div>`);
      $("#d_no").onclick = closeDlg;
      $("#d_yes").onclick = async () => {
        if (API()) { try { const r = await api("deleteStudent", { name: st.name }); if (!r.ok) throw 0; await loadRemote(); } catch (e) { closeDlg(); return cloudFail(); } }
        else { STUDENTS = STUDENTS.filter(y => y !== st); store.set("students", STUDENTS); }
        closeDlg(); renderAd(); toast("تم الحذف");
      };
    });
  }

  function repData() {
    const asg = TK().assignments || [];
    const held = SES.map((_, i) => i).filter(i => STUDENTS.some(s => s.att[i] != null));
    const rk = STUDENTS.slice().sort((a, b) => xpOf(b) - xpOf(a));
    return STUDENTS.map(s => {
      const pres = held.filter(i => okV(s.att[i])).length, attP = held.length ? Math.round(pres / held.length * 100) : null;
      const hwDone = asg.filter(a => hwDoneFor(s, a)).length, hwMiss = asg.filter(a => dueLate(a) && !hwDoneFor(s, a)).length;
      const qv = Object.values(s.quiz || {}), qAvg = qv.length ? Math.round(qv.reduce((t, v) => t + v[0] / v[1], 0) / qv.length * 100) : null;
      const proj = SUBS.find(x => x.name === s.name && x.key === "p5");
      const last2 = held.slice(-2), gone = last2.length === 2 && last2.every(i => !okV(s.att[i]));
      const why = [];
      if (attP !== null && held.length >= 2 && attP < 60) why.push("حضور " + attP + "%");
      if (qAvg !== null && qAvg < 50) why.push("متوسط الاختبارات " + qAvg + "%");
      if (hwMiss) why.push(hwMiss + " مهمة لم تُسلَّم");
      return { s, attP, pres, held: held.length, hwDone, hwMiss, nAsg: asg.length, qAvg, qN: qv.length, proj, xp: xpOf(s), rank: rk.indexOf(s) + 1, badge: mainBadge(s), gone, weak: !gone && why.length > 0, why };
    });
  }
  function printHtml(title, inner) {
    const w = window.open("", "_blank"); if (!w) return toast("اسمحي بالنوافذ المنبثقة لإتمام الطباعة");
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#092F64;padding:24px;line-height:1.7}table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border:1px solid #c9d8ee;padding:6px 8px;text-align:center}th{background:#072971;color:#fff}h1{font-size:20px;margin:0 0 4px}h3{margin:18px 0 6px}.muted{color:#5a6f8f}svg,button{display:none}</style></head><body><h1>${esc(title)}</h1><p class="muted">${esc(S.name)} · ${esc(new Date().toLocaleDateString("ar-u-ca-gregory-nu-latn"))}</p>${inner}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 350);
  }
  function stuReportHtml(r) {
    const s = r.s, asg = TK().assignments || [];
    return `<table><tr><th>الترتيب</th><th>XP</th><th>الحضور</th><th>المهام</th><th>الاختبارات</th><th>المشروع</th><th>الوسام</th></tr><tr><td>${r.rank} من ${STUDENTS.length}</td><td>${r.xp}</td><td>${r.attP === null ? "—" : r.attP + "%"} (${r.pres}/${r.held})</td><td>${r.hwDone}/${r.nAsg}</td><td>${r.qN ? r.qAvg + "% · " + r.qN + " اختبار" : "—"}</td><td>${r.proj ? esc(r.proj.status) + (r.proj.points ? " · " + r.proj.points + " درجة" : "") : "لم يُسلَّم"}</td><td>${r.badge ? esc(r.badge.b.t) : "—"}</td></tr></table>
      <h3>الحضور</h3><table><tr>${SES.map(x => `<th>S${x.n}</th>`).join("")}</tr><tr>${SES.map((_, i) => `<td>${s.att[i] == null ? "·" : LBL.att[s.att[i]]}</td>`).join("")}</tr></table>
      <h3>المهام</h3><table><tr>${asg.map(a => `<th>مهمة ${a.week}</th>`).join("")}</tr><tr>${asg.map(a => { const v = s.hw[a.week * 2 - 1] ?? s.hw[a.week * 2 - 2]; return `<td>${v == null ? (dueLate(a) ? "لم يُسلَّم" : "·") : LBL.hw[v]}</td>`; }).join("")}</tr></table>
      <h3>الاختبارات (المحاولة الأولى)</h3><table><tr>${QSES.map(x => `<th>${x.n}</th>`).join("")}</tr><tr>${QSES.map(x => { const v = (s.quiz || {})[x.n]; return `<td>${v ? v[0] + "/" + v[1] : "—"}</td>`; }).join("")}</tr></table>
      ${r.why.length || r.gone ? `<h3>ملاحظات المتابعة</h3><p>${r.gone ? "⛔ منقطع: غاب عن آخر جلستين. " : ""}${esc(r.why.join(" · "))}</p>` : ""}`;
  }
  function exportAll() {
    const R = repData(), asg = TK().assignments || [], lab = (m, v) => v == null ? "" : (m[v] ?? v), d2 = iso => iso ? fmtDT(iso) : "";
    const sheets = [];
    sheets.push({ name: "التقرير الختامي", rows: [["المتدرب", "الترتيب", "الحضور %", "المهام المسلَّمة", "إجمالي المهام", "متوسط الاختبارات %", "عدد الاختبارات", "حالة المشروع", "درجة المشروع", "XP", "الوسام", "الحالة"]].concat(
      R.slice().sort((a, b) => a.rank - b.rank).map(r => [r.s.name, r.rank, r.attP ?? "", r.hwDone, r.nAsg, r.qAvg ?? "", r.qN, r.proj ? r.proj.status : "", r.proj ? r.proj.points : "", r.xp, r.badge ? r.badge.b.t : "", r.gone ? "منقطع" : r.weak ? "متعثر: " + r.why.join(" · ") : "منتظم"])) });
    sheets.push({ name: "المتدربون", rows: [["الاسم", "البريد", "GitHub", "تاريخ التسجيل", "نقاط إضافية", "XP"].concat(isStaff ? ["رمز الدخول"] : [])].concat(
      STUDENTS.map(s => [s.name, s.email, s.github, d2(s.joined), s.points, xpOf(s)].concat(isStaff ? [s.code] : []))) });
    sheets.push({ name: "الحضور", rows: [["المتدرب"].concat(SES.map(x => "الجلسة " + x.n + " — " + x.ar))].concat(STUDENTS.map(s => [s.name].concat(SES.map((_, i) => lab(LBL.att, s.att[i]))))) });
    sheets.push({ name: "المهام", rows: [["المتدرب"].concat(SES.map(x => "مهمة " + x.n))].concat(STUDENTS.map(s => [s.name].concat(SES.map((_, i) => lab(LBL.hw, s.hw[i]))))) });
    const qr = [["المتدرب", "الجلسة", "الدرجة", "من", "النسبة %", "الأسئلة الخاطئة"]];
    STUDENTS.forEach(s => Object.keys(s.quiz || {}).forEach(n => { const v = s.quiz[n], w = ((s.quizW || {})[n] || []).map(i => ((QZ[n] || [])[i] || {}).q || ("سؤال " + (i + 1))).join(" | "); qr.push([s.name, "الجلسة " + n, v[0], v[1], v[1] ? Math.round(v[0] / v[1] * 100) : "", w]); }));
    sheets.push({ name: "الاختبارات", rows: qr });
    sheets.push({ name: "التسليمات", rows: [["المتدرب", "المفتاح", "النوع", "الرابط", "ملاحظة المتدرب", "الحالة", "تعليق المدربـة", "النقاط", "وقت التسليم", "وقت التصحيح"]].concat(SUBS.map(x => [x.name, x.key, x.kind === "project" ? "مشروع" : "مهمة", x.link, x.note, x.status, x.comment, x.points, d2(x.at), d2(x.reviewedAt)])) });
    sheets.push({ name: "الاستفسارات", rows: [["المتدرب", "إلى", "الاستفسار", "وقت الاستفسار", "الرد", "من ردّ", "وقت الرد"]].concat(ASKS.map(x => [x.name, toName(x.to), x.q, d2(x.at), x.a, normAr(x.by), d2(x.aAt)])) });
    sheets.push({ name: "الإشعارات", rows: [["إلى", "العنوان", "النص", "الوقت"]].concat(NOTES.map(n => [n.to === "*" ? "الكل" : n.to, n.title, n.body, d2(n.at)])) });
    sheets.push({ name: "الأسئلة الشائعة", rows: [["السؤال", "الجواب"]].concat(FAQ().map(x => [x.q, x.a])) });
    sheets.push({ name: "الجلسات", rows: [["الجلسة", "العنوان", "العنوان بالإنجليزية", "التاريخ", "رابط الجلسة"]].concat(SES.map((x, i) => { const d = sessionDate(i); return [x.n, x.ar, x.en, d instanceof Date && !isNaN(d) ? d.toLocaleDateString("en-CA") : "", x.link || ""]; })) });
    xlsxDownload(sheets, "bootcamp-export-" + new Date().toLocaleDateString("en-CA") + ".xlsx");
    toast("تم تصدير كل بيانات المعسكر ✓");
  }
  function adReports(b) {
    if (!STUDENTS.length) { b.innerHTML = '<div class="card"><p class="muted" style="margin:0">لا يوجد متدربون بعد — تظهر التقارير بعد التسجيل.</p></div>'; return; }
    const R = repData(), avg = arr => { const a = arr.filter(x => x !== null && x !== undefined); return a.length ? Math.round(a.reduce((t, x) => t + x, 0) / a.length) : 0; };
    const gone = R.filter(r => r.gone), weak = R.filter(r => r.weak), asg = TK().assignments || [];
    const hwPct = R.length && asg.length ? Math.round(R.reduce((t, r) => t + r.hwDone, 0) / (R.length * asg.length) * 100) : 0;
    const qa = QSES.map(s => {
      const n = s.n, bank = QZ[n] || [], tk = STUDENTS.filter(st => (st.quiz || {})[n]); if (!tk.length) return null;
      return { n, s, takers: tk.length, avg: Math.round(tk.reduce((t, st) => t + st.quiz[n][0] / st.quiz[n][1], 0) / tk.length * 100),
        qs: bank.map((q, i) => { const wr = tk.filter(st => ((st.quizW || {})[n] || []).includes(i)).length; return { i, q: q.q, wr, pct: Math.round(wr / tk.length * 100) }; }) };
    }).filter(Boolean);
    const hardest = qa.flatMap(x => x.qs.map(q => Object.assign({ n: x.n }, q))).filter(q => q.wr).sort((a, b) => b.pct - a.pct).slice(0, 5);
    const held = SES.map((s, i) => ({ s, p: STUDENTS.filter(st => okV(st.att[i])).length, c: STUDENTS.filter(st => st.att[i] != null).length })).filter(x => x.c);
    const kpi = (l, v, cls = "", ic = "chart") => `<div class="kpi ${cls}"><i class="kpi-ic">${ico(ic)}</i><div><b>${v}</b><span>${l}</span></div></div>`;
    const col = (lab, pct, c, tip) => `<div class="vcol" title="${esc(tip)}"><b class="mono">${pct}%</b><div class="vbar"><i data-h="${pct}" style="--c:${c}"></i></div><small>${lab}</small></div>`;
    const okN = R.length - weak.length - gone.length;
    const lg = (c, l, n) => `<li><i style="background:${c}"></i>${l}<b class="mono">${n}</b></li>`;
    const hq = (t, pct, bad, extra = "") => `<div class="hq"><span class="hq-t">${extra}${t}</span><b class="mono">${pct}%</b><div class="bar ${bad ? "bad" : ""}"><i data-w="${pct}"></i></div></div>`;
    const sorted = R.slice().sort((a, b) => a.rank - b.rank);
    const table = withBtn => `<table class="tr rep"><thead><tr><th>المتدرب</th><th>الترتيب</th><th>الحضور</th><th>المهام</th><th>الاختبارات</th><th>المشروع</th><th>XP</th><th>الوسام</th>${withBtn ? "<th></th>" : ""}</tr></thead><tbody>
      ${sorted.map(r => `<tr class="${r.gone ? "r-bad" : r.weak ? "r-warn" : ""}"><td>${esc(r.s.name)}</td><td class="mono">${r.rank}</td><td class="mono">${r.attP === null ? "—" : r.attP + "%"}</td><td class="mono">${r.hwDone}/${r.nAsg}</td><td class="mono">${r.qN ? r.qAvg + "% (" + r.qN + ")" : "—"}</td><td>${r.proj ? esc(r.proj.status) + (r.proj.points ? " · " + r.proj.points : "") : "—"}</td><td class="mono">${r.xp}</td><td>${r.badge ? (withBtn ? badgeChip(r.badge, true) : esc(r.badge.b.t)) : "—"}</td>${withBtn ? `<td><button class="btn btn-sm" data-rep="${esc(r.s.name)}">تقرير</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
    b.innerHTML = `
      <div class="card" style="margin-bottom:18px"><div class="card-top"><div><h3 style="margin:0">${ico("layers")} تصدير كل بيانات المعسكر</h3><p class="muted" style="font-size:13.5px;margin:4px 0 0">ملف Excel واحد فيه: التقرير الختامي، المتدربون، الحضور، المهام، الاختبارات، التسليمات، الاستفسارات، الإشعارات، الأسئلة الشائعة، والجلسات.</p></div><button class="btn btn-pri" id="repAll" type="button">⬇ تصدير الكل (Excel)</button></div></div>
      <div class="kpis">${kpi("المتدربون", R.length, "k-deep", "users")}${kpi("متوسط الحضور", avg(R.map(r => r.attP)) + "%", "k-blue", "check")}${kpi("متوسط الاختبارات", avg(R.map(r => r.qAvg)) + "%", "k-cyan", "quiz")}${kpi("تسليم المهام", hwPct + "%", "k-green", "file")}${kpi("متعثرون", weak.length, "k-amber " + (weak.length ? "warn" : ""), "bolt")}${kpi("منقطعون", gone.length, "k-red " + (gone.length ? "bad" : ""), "flag")}</div>
      <div class="dash">
        <div class="card dcard d-att"><div class="dc-h"><h3>${ico("check")} الحضور لكل جلسة</h3><small class="muted">نسبة الحاضرين من كل المتدربين</small></div>
          ${held.length ? `<div class="vchart">${held.map(x => col("S" + x.s.n, Math.round(x.p / STUDENTS.length * 100), "var(--blue)", x.s.ar)).join("")}</div>` : '<p class="muted dc-empty">لم يُسجَّل حضور بعد.</p>'}</div>
        <div class="card dcard d-status"><div class="dc-h"><h3>${ico("users")} حالة المتدربين</h3></div>
          <div class="donut-wrap">${ringSvg([{ v: R.length ? okN / R.length : 0, c: "#10B981" }, { v: R.length ? weak.length / R.length : 0, c: "#FFD84D" }, { v: R.length ? gone.length / R.length : 0, c: "#EF4757" }], String(R.length), 150)}
          <ul class="legend">${lg("#10B981", "منتظمون", okN)}${lg("#FFD84D", "متعثرون", weak.length)}${lg("#EF4757", "منقطعون", gone.length)}</ul></div></div>
        <div class="card dcard d-quiz"><div class="dc-h"><h3>${ico("quiz")} متوسط الاختبارات لكل جلسة</h3><small class="muted">المحاولة الأولى</small></div>
          ${qa.length ? `<div class="vchart">${qa.map(x => col("S" + x.n, x.avg, x.avg >= 70 ? "#10B981" : x.avg >= 50 ? "#FFD84D" : "#EF4757", x.s.ar + " · " + x.takers + " متدرب")).join("")}</div>` : '<p class="muted dc-empty">لا نتائج اختبارات بعد.</p>'}</div>
      </div>
      <div class="grid g2 ra-grid">
        <div class="card ra warn"><h3>⚠️ متعثرون (${weak.length})</h3><p class="muted" style="font-size:13px;margin-top:-6px">حضور أقل من 60% أو متوسط اختبارات أقل من 50% أو مهمة فات موعدها.</p>${weak.length ? `<ul class="plain">${weak.map(r => `<li><b>${esc(r.s.name)}</b> — <span class="muted">${esc(r.why.join(" · "))}</span></li>`).join("")}</ul>` : '<p class="muted" style="margin:0">لا أحد حاليًا ✓</p>'}</div>
        <div class="card ra bad"><h3>⛔ منقطعون (${gone.length})</h3><p class="muted" style="font-size:13px;margin-top:-6px">غابوا عن آخر جلستين مسجّلتين.</p>${gone.length ? `<ul class="plain">${gone.map(r => `<li><b>${esc(r.s.name)}</b> <span class="muted">— حضور ${r.attP ?? 0}%</span></li>`).join("")}</ul>` : '<p class="muted" style="margin:0">لا أحد حاليًا ✓</p>'}</div>
      </div>
      <div class="card" style="margin-top:18px"><div class="card-top"><h3>${ico("chart")} التقرير الختامي لكل متدرب</h3><div class="row-acts" style="margin:0"><button class="btn btn-sm" id="repCsv">تصدير CSV</button><button class="btn btn-sm" id="repPrint">طباعة</button></div></div>
        <div class="tbl-wrap">${table(true)}</div></div>
      <div class="card" style="margin-top:18px"><h3>${ico("quiz")} تحليل نتائج الاختبارات</h3>
        ${hardest.length ? `<div class="hard"><h4>أكثر الأسئلة خطأً بين المتدربين</h4>${hardest.map(q => hq(esc(q.q), q.pct, true, `<span class="badge">جلسة ${q.n}</span>`)).join("")}</div>` : ""}
        ${qa.length ? qa.map(x => `<details class="acc"><summary><b>اختبار الجلسة ${x.n}</b> <small class="muted">· ${x.takers} متدرب · متوسط ${x.avg}%</small></summary><div class="acc-in">${x.qs.map(q => hq((q.i + 1) + ". " + esc(q.q), q.pct, q.pct >= 50)).join("") || '<p class="muted">لا أسئلة.</p>'}<small class="muted">النسبة = من أخطأ في السؤال من بين من حلّ الاختبار.</small></div></details>`).join("") : '<p class="muted">لا نتائج اختبارات بعد.</p>'}
        <p class="muted" style="font-size:12.5px;margin:10px 0 0">التحليل يعتمد على المحاولة الأولى لكل متدرب.</p></div>
      <div class="card" style="margin-top:18px"><h3>${ico("check")} تفاصيل الحضور لكل جلسة</h3>${held.length ? held.map(x => hq("الجلسة " + x.s.n + " — " + esc(x.s.ar), Math.round(x.p / STUDENTS.length * 100), false)).join("") : '<p class="muted">لم يُسجَّل حضور بعد.</p>'}</div>`;
    $$("[data-rep]", b).forEach(x => x.onclick = () => {
      const r = R.find(y => y.s.name === x.dataset.rep);
      openDlg(`<h3>التقرير الختامي — ${esc(r.s.name)}</h3><div class="rep-dlg">${stuReportHtml(r)}</div><div class="row"><button class="btn btn-pri" id="rpPrint">طباعة</button><button class="btn" id="rpX">إغلاق</button></div>`);
      dlg.classList.add("wide"); dlg.addEventListener("close", () => dlg.classList.remove("wide"), { once: true });
      $("#rpX").onclick = closeDlg; $("#rpPrint").onclick = () => printHtml("التقرير الختامي — " + r.s.name, stuReportHtml(r));
    });
    $("#repAll").onclick = exportAll;
    $("#repCsv").onclick = () => csvDownload([["المتدرب", "الترتيب", "الحضور %", "المهام", "متوسط الاختبارات %", "عدد الاختبارات", "المشروع", "درجة المشروع", "XP", "الوسام", "الحالة"],
      ...sorted.map(r => [r.s.name, r.rank, r.attP ?? "", r.hwDone + "/" + r.nAsg, r.qAvg ?? "", r.qN, r.proj ? r.proj.status : "", r.proj ? r.proj.points : "", r.xp, r.badge ? r.badge.b.t : "", r.gone ? "منقطع" : r.weak ? "متعثر: " + r.why.join(" · ") : "منتظم"])], "final-report.csv");
    $("#repPrint").onclick = () => printHtml("التقرير الختامي للمعسكر", table(false));
    animate();
  }

  async function adSettings(b) {
    const base = siteBase();
    b.innerHTML = `<div class="grid g2">
      <div class="card"><h3>${ico("lock")} رموز الدخول</h3><p class="muted" style="font-size:14px;margin-top:-6px">اكتبي رمزًا جديدًا (6 خانات على الأقل، والأفضل حروف وأرقام) ثم احفظي. اتركي الحقل فارغًا إن لم تريدي تغييره.</p>
        ${isTr ? inp("st_tp", "رمز دخول المدربـة الجديد", "", 'autocomplete="off" dir="ltr"') : ""}
        ${inp("st_ap", isTr ? "رمز دخول الإداري/ة" : "رمز دخولك الجديد", "", 'autocomplete="off" dir="ltr"', isTr ? "أعطيه للإداري/ة: صلاحياته مثل المدربـة ما عدا فتح وقفل الاختبارات والمهام والمشروع، وأقسام «الموقع والنصوص» و«الاختبارات والمهام» و«التسليمات»." : "رمز المدربـة لا يغيّره إلا هي.")}
        <button class="btn btn-pri" id="stPins" type="button">حفظ الرموز</button></div>
      <div class="card"><h3>${ico("mail")} البريد المرسل للمتدربين</h3>
        ${inp("st_mf", "بريد الإرسال", "", 'dir="ltr" autocomplete="off"', "تأكيد التسجيل، رمز الدخول، التذكير قبل الجلسة، التصحيح، والرد على الاستفسار")}${inp("st_mn", "اسم المرسل", "")}
        <div id="stMailInfo" class="muted info-box">جارٍ التحميل…</div>
        <div class="row-acts"><button class="btn btn-pri" id="stMail" type="button">حفظ</button><button class="btn btn-sm" id="stTest" type="button">رسالة تجريبية لهذا البريد</button></div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>${ico("bell")} التذكير التلقائي قبل الجلسة</h3><p style="font-size:14.5px">يُرسل لكل المتدربين (إشعار على الموقع + بريد) قبل كل جلسة بنصف ساعة، حسب التاريخ والساعة في «الموقع والنصوص»، ومعه رابط الجلسة إن وُجد.</p>
        <p id="stRem" class="muted">…</p><button class="btn btn-live" id="stTrig" type="button">تفعيل التذكير التلقائي</button></div>
      <div class="card"><h3>${ico("users")} الروابط التي ترسلينها للمتدربين</h3>
        <div class="fld"><label>رابط الموقع</label><input type="text" readonly dir="ltr" value="${esc(base)}" onfocus="this.select()"></div>
        <div class="fld"><label>رابط التسجيل المباشر</label><input type="text" readonly dir="ltr" value="${esc(base + "index.html?join=1")}" onfocus="this.select()"></div>
        <p style="font-size:14px;margin:0">${API() ? "✅ الموقع مربوط بـ Google Sheet." : "⚠️ غير مربوط بعد — الصقي رابط Apps Script في <code>api</code> داخل <code>js/data.js</code>."} ${API() ? '<button class="btn-link" id="pTest" type="button">اختبار الاتصال</button>' : ""}</p></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>يوم الجلسة</h3><ol class="steps"><li><span>افتحي «المتابعة» ← «الحضور» واختاري الجلسة ثم اضغطي <b>فتح التسجيل</b>.</span></li><li><span>اعرضي الرمز المكوّن من 4 أرقام على الشاشة (يتغيّر كل 5 دقائق).</span></li><li><span>يكتبه المتدرب من صفحته فيُسجَّل «حاضر» أو «متأخر» مع الوقت.</span></li><li><span>بعد الجلسة: «إغلاق التسجيل» ثم «غير المسجّلين ← غائب».</span></li></ol></div>`;
    const t = $("#pTest"); if (t) t.onclick = async () => { t.disabled = true; const ok = await loadRemote(); t.disabled = false; toast(ok ? "الاتصال سليم ✓ (" + STUDENTS.length + " متدرب)" : "⚠️ تعذّر الاتصال — راجعي رابط api"); };
    if (!API()) { $("#stMailInfo").textContent = "اربطي السيرفر أولًا لتفعيل البريد والرموز."; $$("#stPins,#stMail,#stTest,#stTrig").forEach(x => { x.disabled = true; }); return; }
    const call = async save => { try { return await api("settings", save ? { save } : {}); } catch (e) { return { ok: false }; } };
    const show = r => {
      if (!$("#stMailInfo")) return;
      if (!r.ok) { $("#stMailInfo").textContent = "تعذّر تحميل الإعدادات — تأكدي من نشر النسخة الجديدة من Code.gs."; return; }
      $("#st_mf").value = r.mailFrom || ""; $("#st_mn").value = r.mailName || "";
      const diff = r.sender && r.mailFrom && r.sender.toLowerCase() !== r.mailFrom.toLowerCase();
      $("#stMailInfo").innerHTML = `الرسائل تخرج من حساب Google الذي نشر السيرفر: <b dir="ltr">${esc(r.sender || "؟")}</b>${diff ? `<br>⚠️ يختلف عن بريد الإرسال: سيصل المتدرب من <span dir="ltr">${esc(r.sender)}</span>، وأي ردّ منه يذهب إلى <span dir="ltr">${esc(r.mailFrom)}</span>. لتصل الرسائل من <span dir="ltr">${esc(r.mailFrom)}</span> مباشرة انشري Apps Script من ذلك الحساب.` : " ✓"}${r.quota != null ? `<br>المتبقي من رسائل اليوم: <b>${r.quota}</b>` : ""}`;
      $("#stRem").innerHTML = r.reminder ? "✅ مفعّل — يعمل تلقائيًا." : "غير مفعّل بعد.";
      $("#stTrig").textContent = r.reminder ? "إعادة التفعيل" : "تفعيل التذكير التلقائي";
    };
    show(await call());
    $("#stPins").onclick = async e => {
      const save = {}, tp = val("st_tp").trim(), ap = val("st_ap").trim();
      if (tp) save.trainerPin = tp; if (ap) save.adminPin = ap;
      if (!tp && !ap) return toast("اكتبي رمزًا جديدًا أولًا");
      if (isAd && ap.length < 6) return toast("الرمز قصير — 6 خانات على الأقل");
      e.target.disabled = true; const r = await call(save); e.target.disabled = false;
      if (!r.ok) return toast(r.err === "short" ? "الرمز قصير — 6 خانات على الأقل" : r.err === "same" ? "رمز المدربـة ورمز الإداري/ة يجب أن يختلفا" : "⚠️ تعذّر الحفظ");
      if (r.newPin) { sess.pin = r.newPin; store.set("sess", sess); }
      $("#st_tp").value = ""; $("#st_ap").value = ""; toast("تم حفظ الرموز ✓" + (ap && isTr ? " — أعطي الرمز الجديد للإداري/ة" : ""));
    };
    $("#stMail").onclick = async e => {
      const mf = val("st_mf").trim(); if (mf && !/^\S+@\S+\.\S+$/.test(mf)) return toast("اكتبي بريدًا صحيحًا");
      e.target.disabled = true; const r = await call({ mailFrom: mf, mailName: val("st_mn").trim() }); e.target.disabled = false;
      if (!r.ok) return toast("⚠️ تعذّر الحفظ"); show(r); toast("تم الحفظ ✓");
    };
    $("#stTest").onclick = async e => {
      const to = val("st_mf").trim(); if (!/^\S+@\S+\.\S+$/.test(to)) return toast("اكتبي بريدًا صحيحًا");
      e.target.disabled = true; const r = await call({ testMail: to }); e.target.disabled = false;
      toast(r.ok && r.tested ? "أُرسلت الرسالة ✓ — تحقّقي من البريد" : "تعذّر الإرسال — " + (r.testErr || "راجعي صلاحيات Apps Script"));
    };
    $("#stTrig").onclick = async e => {
      e.target.disabled = true; let r; try { r = await api("installTriggers"); } catch (x) { r = { ok: false }; } e.target.disabled = false;
      if (!r.ok) return toast("تعذّر التفعيل — شغّلي الدالة setup مرة من محرر Apps Script");
      toast("تم تفعيل التذكير التلقائي ✓"); show(await call());
    };
  }

  /* كل صفحة html لها data-page يطابق مفتاحها هنا */
  const PAGES = {
    home: { t: "الرئيسية", html: pageHome, bind: bindHome },
    agenda: { t: "الأجندة", html: pageAgenda, bind: bindAgenda },
    tracker: { t: "المتابعة", html: pageTracker, bind: bindTracker },
    quiz: { t: "التمارين", html: pageQuiz, bind: bindQuiz },
    projects: { t: "المشروع", html: pageProjects, bind: bindProjects },
    faq: { t: "الاستفسارات", html: pageFaq, bind: bindFaq },
    admin: { t: "الإدارة", html: pageAdmin, bind: bindAdmin }
  };
  const NAV = [["index.html", "home", "الرئيسية"], ["agenda.html", "agenda", "الأجندة"], ["tracker.html", "tracker", "المتابعة"], ["quizzes.html", "quiz", "التمارين"], ["projects.html", "projects", "المشروع"], ["faq.html", "faq", "الاستفسارات"]];
  function drawNav() {
    const items = isStaff ? NAV.concat([["admin.html", "admin", "الإدارة"]]) : NAV;
    $("#nav").innerHTML = items.map(n => `<a href="${n[0]}${qs0()}" data-page="${n[1]}" ${n[1] === PAGE ? 'class="active" aria-current="page"' : ""}>${n[2]}</a>`).join("");
  }
  function applySite() {
    $$(".brand span:not(.brand-mark)").forEach(e => { e.textContent = S.shortName || S.name; });
    const ft = $("#footerTrainer"); if (ft) ft.textContent = S.presenter || S.trainer || "";
  }
  function render() {
    clearTimers();
    const p = PAGES[PAGE] || PAGES.home;
    $("#app").innerHTML = `<div class="page">${p.html()}</div>`;
    if (p.bind) p.bind();
    bindLocks(); bindLinks(); updateBell();
    document.title = p.t + " · " + S.name;
  }

  $("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
  $("#meChip").onclick = () => askMe();
  (async function boot() {
    if (API() && sess && sess.role === "trainee" && !sess.code) { store.del("sess"); sess = null; setRoles(); }
    drawNav();
    const cR = store.get("remote", null), cM = store.get("meData", null);
    const cache = isStaff ? ss.get("full") : cR;
    if (API() && cache && !(me && !cM) && !(PAGE === "quiz" && Q.get("s"))) {
      applyRemote(cache); if (!isStaff && cM && me) applyMe(cM);
      applySite();
      if (sess) applySess(); else { updateChip(); showGate(); }
      const snap = () => JSON.stringify(isStaff ? ss.get("full") : [store.get("remote", null), me ? store.get("meData", null) : null]);
      const before = snap();
      if (await loadRemote() && sess) {
        const a = document.activeElement, busy = (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || dlg.open || $("#gate");
        if (snap() !== before && !busy) { applySite(); updateChip(); drawNav(); render(); }
      }
      return;
    }
    if (API()) {
      $("#app").innerHTML = '<div class="container loading"><span></span><span></span><span></span></div>';
      if (!(await loadRemote())) {
        const c = store.get("remote", null); if (c && !isStaff) applyRemote(c);
        const m = store.get("meData", null); if (m && me) applyMe(m);
      }
    } else applyContent(store.get("content", {}));
    applySite();
    if (sess) applySess(); else { updateChip(); showGate(); }
  })();
})();
