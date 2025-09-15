
// --- FIREBASE IMPORTS & CONFIG (UNCHANGED) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, updateDoc, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyCBBm3pHDVgUYs2BTzwVwtTwC-cOAFjKWo",
  authDomain: "chakachaka-e672a.firebaseapp.com",
  projectId: "chakachaka-e672a",
  storageBucket: "chakachaka-e672a.firebasestorage.app",
  messagingSenderId: "226377707807",
  appId: "1:226377707807:web:08f207a259c4e75ab8402a",
  measurementId: "G-14NQJL3Q1J"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM ELEMENTS (UNCHANGED FROM ORIGINAL) ---
const DOMElements = {
  body: document.body,
  sidebar: document.getElementById('sidebar'),
  sessionList: document.getElementById('session-list'),
  menuBtn: document.getElementById('menu-btn'),
  overlay: document.getElementById('overlay'),
  chatTitle: document.getElementById('chat-title'),
  botAvatar: document.getElementById('bot-avatar'),
  chatMessages: document.getElementById('chat-messages'),
  composer: document.getElementById('composer'),
  scrollToBottomBtn: document.getElementById('scroll-to-bottom'),
  newChatSidebarBtn: document.getElementById('new-chat-sidebar-btn'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  fileUploadWrapper: document.getElementById('file-upload-wrapper'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  statusRow: document.getElementById('status-row'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon')
};
// --- APPLICATION STATE (UNCHANGED) ---
let state = {
  userId: null,
  sessionId: null,
  firstMessageSaved: false,
  sessionsUnsub: null,
  messagesUnsub: null,
  configPromise: null,
  currentTheme: localStorage.getItem('chatTheme') || 'light',
  triggers: [],
  triggerUnsub: null,
  sessionWasPreviouslyBlocked: false,
  subtleNoteShown: false
};
let botConfig = {
  botName: "AI Bot",
  themeColor: "#4F46E5",
  allowFileUpload: false,
  apiKey: "",
  apiKeys: {},
  persona: "",
  botBubbleColor: "",
  userBubbleColor: "linear-gradient(135deg, #10b981, #059669)",
  active: true,
  profileImage: "",
  showSubtleNotes: true,
  blockReminderNote: ""
};
// --- UTILITIES (UNCHANGED) ---
const sanitize = (s) => typeof s === 'string' ? s.trim() : '';
const autosize = (el) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 150)}px`; };
const parseBool = (v) => v === true || v === 'true';
const scrollToBottom = (behavior = 'auto') => { DOMElements.chatMessages.scrollTo({ top: DOMElements.chatMessages.scrollHeight, behavior }); };
const readUploadedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// --- THEME & UI HELPERS (UNCHANGED) ---
const applyTheme = (theme) => {
  DOMElements.body.dataset.theme = theme;
  localStorage.setItem('chatTheme', theme);
const isDark = theme === 'dark';
  DOMElements.themeIcon.innerHTML = isDark
    ?
`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;
};
DOMElements.themeToggle.addEventListener('click', () => { state.currentTheme = state.currentTheme === 'light' ? 'dark' : 'light'; applyTheme(state.currentTheme); });
const showTypingIndicator = (show) => {
  let indicator = DOMElements.chatMessages.querySelector('.typing-indicator');
if (show && !indicator) {
    indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    DOMElements.chatMessages.appendChild(indicator);
    scrollToBottom('smooth');
} else if (!show && indicator) {
    indicator.remove();
  }
};
const addCopyButtons = () => {
  DOMElements.chatMessages.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;
    const code = pre.querySelector('code');
    if (!code) return;
    const button = document.createElement('button');
    button.className = 'copy-code-btn';
    button.textContent = 'Copy';
    button.onclick = () => { navigator.clipboard.writeText(code.textContent); button.textContent = 'Copied!'; setTimeout(() => { button.textContent = 'Copy'; }, 2000); };
    pre.appendChild(button);
  });
};
const applyConfigToUI = () => {
  DOMElements.chatTitle.textContent = botConfig.botName || 'AI Bot';
  DOMElements.botAvatar.src = botConfig.profileImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
document.documentElement.style.setProperty('--accent-light', botConfig.themeColor || '#4F46E5');
  document.documentElement.style.setProperty('--accent-dark', botConfig.themeColor ? `${botConfig.themeColor}aa` : '#818CF8');
  DOMElements.fileUploadWrapper.style.display = botConfig.allowFileUpload ? 'flex' : 'none';
DOMElements.statusRow.textContent = !botConfig.active ? '⚠️ Under maintenance. Don't bother!' : '';
  DOMElements.sendBtn.disabled = false;
};
// --- CORE LOGIC (UNCHANGED) ---
function findMatchingTrigger(message) {
  if (!message) return null;
  const txt = String(message);
const triggers = state.triggers || [];
  for (const t of triggers) {
    if (!t || t.enabled === false) continue;
const phrase = (t.phrase || '');
    if (typeof phrase !== 'string' || phrase.trim() === '') continue;
try {
      if (t.useRegex) {
        const flags = typeof t.regexFlags === 'string' ?
t.regexFlags : 'i';
        const re = new RegExp(phrase, flags);
        if (re.test(txt)) return t;
} else {
        if (txt.toLowerCase().includes(phrase.toLowerCase())) return t;
}
    } catch (err) {
      console.warn('trigger regex invalid', t, err);
      continue;
}
  }
  return null;
}
async function warnUser(trigger) {
  const uRef = doc(db, 'users', state.userId);
let warnings = 0;
  try {
    const uSnap = await getDoc(uRef);
if (uSnap.exists()) warnings = (uSnap.data().warnings || 0);
    warnings += 1;
await setDoc(uRef, { warnings, lastWarningAt: serverTimestamp() }, { merge: true });
} catch (err) {
    console.warn('warnUser: failed updating warnings', err);
}
  try {
    const sRef = doc(db, 'sessions', state.userId, 'items', state.sessionId);
    const sSnap = await getDoc(sRef);
const sessionWarnings = sSnap.exists() ? (sSnap.data().warnings || 0) + 1 : 1;
await setDoc(sRef, { warnings: sessionWarnings }, { merge: true });
} catch (e) {
    console.warn('warnUser: failed updating session warnings', e);
  }
  return warnings;
}
async function blockUser(trigger) {
  const reason = trigger?.reason || trigger?.phrase || 'Triggered block phrase';
try {
    await setDoc(doc(db, 'users', state.userId), {
      blocked: true,
      blockedBy: 'bot',
      blockReason: reason,
      blockedAt: serverTimestamp()
    }, { merge: true });
} catch (err) {
    console.warn('blockUser: set user failed', err);
}
  try {
    const sRef = doc(db, 'sessions', state.userId, 'items', state.sessionId);
await setDoc(sRef, { blocked: true, blockedBy: 'bot', blockReason: reason, wasBlocked: true, lastBlockedAt: serverTimestamp() }, { merge: true });
} catch (e) {
    console.warn('blockUser: set session failed', e);
  }
  state.sessionWasPreviouslyBlocked = true;
  state.subtleNoteShown = false;
}
async function addSubtleNoteToSession(note) {
  if (!note) return;
  try {
    const sRef = doc(db, 'sessions', state.userId, 'items', state.sessionId);
await setDoc(sRef, { lastSubtleNote: { text: note, createdAt: serverTimestamp() } }, { merge: true });
} catch (e) {
    console.warn('addSubtleNoteToSession failed', e);
}
}
async function handleUserMessage(text) {
  const out = { saved: false, blocked: false, warned: false, warningsCount: 0, matchedTrigger: null };
const msg = sanitize(text);
  if (!msg) return out;
  await saveFirstMessageTitleIfNeeded(msg);
  try {
    const check = await isUserOrSessionBlocked();
if (check.blocked) {
      out.blocked = true;
      return out;
}
  } catch (e) {
    console.warn('pre-save block check failed', e);
}
  try {
    await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
      text: msg,
      sender: 'user',
      createdAt: new Date()
    });
out.saved = true;
  } catch (err) {
    console.warn('handleUserMessage: failed to save user message', err);
}
  try {
    const matched = findMatchingTrigger(msg);
if (matched) {
      out.matchedTrigger = matched;
if (matched.action === 'block') {
        await blockUser(matched);
        out.blocked = true;
} else if (matched.action === 'warn') {
        const warnings = await warnUser(matched);
out.warned = true;
        out.warningsCount = warnings;
        const maxWarn = (typeof matched.maxWarnings === 'number') ?
matched.maxWarnings : (matched.maxWarnings ? Number(matched.maxWarnings) : 3);
        if (warnings >= (maxWarn || 3)) {
          await blockUser(matched);
out.blocked = true;
        }
      }
    }
  } catch (e) {
    console.warn('handleUserMessage: trigger processing failed', e);
}
  return out;
}
function loadConfigLive() {
  if (state.configPromise) return state.configPromise;
state.configPromise = (async () => {
    const cfgRef = doc(db, 'config', 'global');
    const applyCfg = (data) => {
      Object.assign(botConfig, data || {});
      botConfig.allowFileUpload = parseBool(botConfig.allowFileUpload);
      botConfig.apiKeys = botConfig.apiKeys || {};
      if (typeof botConfig.apiKey === 'string') botConfig.apiKey = botConfig.apiKey.trim();
      if (Array.isArray(data?.triggerPhrases)) {
        state.triggers = data.triggerPhrases.map(t => {
          if (!t || typeof t.phrase !== 'string') return null;
          return { ...t, phrase: t.phrase };
        }).filter(Boolean);
      } else {
        state.triggers = [];
      }
      botConfig.showSubtleNotes = parseBool(data?.showSubtleNotes ?? data?.subtleNotesEnabled ?? botConfig.showSubtleNotes);
      botConfig.blockReminderNote = (typeof data?.blockReminderNote === 'string') ? data.blockReminderNote : (data?.blockReminderNote || botConfig.blockReminderNote);
    };
    try {
    
  const snap = await getDoc(cfgRef);
      if (snap.exists()) {
        applyCfg(snap.data());
        applyConfigToUI();
}
    } catch (err) {
      console.warn('loadConfigLive initial read error', err);
}
    if (state.triggerUnsub) {
      try { state.triggerUnsub();
} catch(e){}
      state.triggerUnsub = null;
}
    state.triggerUnsub = onSnapshot(cfgRef, snap => {
      if (!snap.exists()) return;
      applyCfg(snap.data());
      applyConfigToUI();
    }, err => {
      console.error('config snapshot err', err);
    });
return botConfig;
  })();
  return state.configPromise;
}
function subscribeSessions() {
  if (state.sessionsUnsub) state.sessionsUnsub();
  DOMElements.sessionList.innerHTML = Array(5).fill('<div class="skeleton"></div>').join('');
const q = query(collection(db, 'sessions', state.userId, 'items'), orderBy('createdAt', 'desc'));
  state.sessionsUnsub = onSnapshot(q, s => {
    DOMElements.sessionList.innerHTML = '';
    if (s.empty) {
      DOMElements.sessionList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:0.9rem;">No chat history.</p>';
      return;
    }
    s.forEach(d => {
      const i = document.createElement('div');
      i.className = 'session-item';
      i.dataset.id = d.id;
      if (d.id === state.sessionId) i.classList.add('active');
      const data = d.data();
      i.innerHTML = `<div class="session-title">${sanitize(data.title)||'Untitled Chat'}</div><div class="session-meta">${data.createdAt?new Date(data.createdAt.seconds*1000).toLocaleDateString():''}</div>`;
      i.onclick = () => loadSessionById(d.id);
      DOMElements.sessionList.appendChild(i);
    });
  }, e => {
    console.error('Sessions snapshot error', e);
    DOMElements.sessionList.innerHTML = '<p>Error loading history.</p>';
  });
}
function subscribeMessages() {
  if (!state.sessionId) return;
  if (state.messagesUnsub) state.messagesUnsub();
  const q = query(collection(db, 'chats', state.userId, state.sessionId), orderBy('createdAt', 'asc'));
  state.messagesUnsub = onSnapshot(q, snap => {
    const container = DOMElements.chatMessages;
    container.innerHTML = '';
    if (snap.empty) {
      container.innerHTML = `<div id="welcome-screen">
          <dotlottie-wc src="https://lottie.host/21d66b08-a3d6-4708-9843-5eacc664e174/Oxfbcz3F2M.lottie" style="width: 300px;height: 300px" speed="1" autoplay loop></dotlottie-wc>
          <h3>${botConfig.botName}</h3>
          <p>Beware! I'll roast you! I'm not for the weak❗</p>
        </div>`;
      return;
    }
    
    const messages = snap.docs.map(doc => doc.data());
    let lastSender = null, messageGroup = null;
    messages.forEach(msg => {
      if (msg.sender !== lastSender) {
        messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${msg.sender}`;
        container.appendChild(messageGroup);
        lastSender = msg.sender;
      }
      const el = document.createElement('div');
      el.className = `message ${msg.sender}`;

      
      const content = document.createElement('div');
content.className = 'message-content';

// ✅ Format text like ChatGPT: Markdown, paragraphs, code highlighting
if (typeof marked !== 'undefined') {
  // Convert Markdown → HTML with GFM + line breaks
  const rawHTML = marked.parse(msg.text || '', { gfm: true, breaks: true });
  content.innerHTML = rawHTML;

  // Highlight code blocks (same as ChatGPT)
  content.querySelectorAll('pre code').forEach(block => {
    try { hljs.highlightElement(block); } catch (e) {}
  });
} else {
  content.textContent = msg.text || '';
}
el.appendChild(content);

      
      // ✅ MODIFICATION: Add copy button to bot messages
      if (msg.sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-message-btn';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>`;
        copyBtn.title = 'Copy text';
        copyBtn.onclick = (e) => {
            navigator.clipboard.writeText(msg.text);
            e.target.closest('button').innerHTML = `<span>Copied!</span>`;
            setTimeout(() => {
                e.target.closest('button').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>`;
            }, 2000);
        };
        el.appendChild(copyBtn);
      }
      
      if(msg.sender==='user'&&botConfig.userBubbleColor) el.style.background = botConfig.userBubbleColor;
      if(msg.sender==='bot'&&botConfig.botBubbleColor) el.style.background = botConfig.botBubbleColor;
      messageGroup.appendChild(el);
    });
    container.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch(e){} });
    addCopyButtons();
    scrollToBottom();
  }, err => console.error('Messages snapshot error', err));
}
function parseUserAgent(ua) {
    const parser = {};
    const regex = {
        os: /(Windows|Mac OS|Android|iOS|Linux)/,
        browser: /(Chrome|Firefox|Safari|Edge|MSIE|Trident)/,
        device: /(Mobile|Tablet|iPad)/
    };
    parser.os = ua.match(regex.os) ? ua.match(regex.os)[0] : 'Unknown OS';
    parser.browser = ua.match(regex.browser) ? ua.match(regex.browser)[0] : 'Unknown Browser';
    parser.device = ua.match(regex.device) ? 'Mobile' : 'Desktop';
    if (parser.browser === 'Trident' || parser.browser === 'MSIE') parser.browser = 'Internet Explorer';
    return parser;
}

// --- USER TRACKING (UNCHANGED) ---
async function trackUserLocationAndDevice() {
    try {
        const locationResponse = await fetch('https://ipapi.co/json/');
        if (!locationResponse.ok) throw new Error(`HTTP error! status: ${locationResponse.status}`);
        const locationData = await locationResponse.json();
        const deviceInfo = parseUserAgent(navigator.userAgent);
        let connectionType = 'Unknown';
        if (navigator.connection) {
            const { effectiveType } = navigator.connection;
            const connectionMap = { 'wifi': 'Wi-Fi', 'cellular': 'Mobile Data', 'ethernet': 'Ethernet', 'bluetooth': 'Bluetooth', 'wimax': 'WiMAX', 'other': 'Other', 'slow-2g': 'Mobile Data (Slow 2G)', '2g': 'Mobile Data (2G)', '3g': 'Mobile Data (3G)', '4g': 'Mobile Data (4G)'};
            connectionType = connectionMap[effectiveType] || `Mobile Data (${effectiveType})`;
        }
        return {
            ip: locationData.ip, city: locationData.city, region: locationData.region,
            country: locationData.country_name, latitude: locationData.latitude, longitude: locationData.longitude,
            network: locationData.org || 'Unknown', connection: connectionType,
            userAgent: navigator.userAgent, ...deviceInfo
        };
    } catch (error) {
        console.error('Error tracking user location/device:', error);
        const deviceInfo = parseUserAgent(navigator.userAgent);
        return { userAgent: navigator.userAgent, ...deviceInfo };
    }
}

async function ensureUser(){
  const ref = doc(db, 'users', state.userId);
  const trackingData = await trackUserLocationAndDevice();
  const s = await getDoc(ref);
  if (!s.exists()) {
    const initialData = {
      blocked: false, createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
      activityStatus: 'Active', ...(trackingData || {})
    };
    await setDoc(ref, initialData);
  } else {
    const updateData = {
      lastSeen: serverTimestamp(), activityStatus: 'Active', ...(trackingData || {})
    };
    await updateDoc(ref, updateData).catch(() => {});
  }
}
async function ensureSessionMetadataOnFirstMsg(sid, msg){
  const ref=doc(db,'sessions',state.userId,'items',sid);
  const s = await getDoc(ref);
  if(!s.exists()){
    await setDoc(ref,{title:msg||'New Chat',createdAt:serverTimestamp(),updatedAt:serverTimestamp(), warnings: 0, wasBlocked: false}, { merge: true });
  } else {
    const d = s.data();
    if((!d.title||d.title==='New Chat') && msg){
      await updateDoc(ref,{title:msg,updatedAt:serverTimestamp()}).catch(()=>{});
    }
  }
}
async function saveFirstMessageTitleIfNeeded(text){
  if(!state.sessionId){
    state.sessionId = crypto.randomUUID();
    localStorage.setItem('chatSessionId', state.sessionId);
    subscribeMessages();
  }
  if(!state.firstMessageSaved){
    await ensureSessionMetadataOnFirstMsg(state.sessionId, text);
    state.firstMessageSaved = true;
  }
  try { await updateDoc(doc(db,'sessions',state.userId,'items',state.sessionId),{updatedAt:serverTimestamp()});
  } catch(_) {}
}
async function checkSessionWasPreviouslyBlocked() {
  try {
    if (!state.userId || !state.sessionId) {
      state.sessionWasPreviouslyBlocked = false; state.subtleNoteShown = false;
      return;
    }
    const s = await getDoc(doc(db,'sessions',state.userId,'items',state.sessionId));
    if (s.exists()) {
      const d = s.data();
      state.sessionWasPreviouslyBlocked = !!(d.wasBlocked || d.blocked);
      state.subtleNoteShown = false;
    } else {
      state.sessionWasPreviouslyBlocked = false; state.subtleNoteShown = false;
    }
  } catch (e) { console.warn('checkSessionWasPreviouslyBlocked error', e); }
}
async function isUserOrSessionBlocked(){
  try {
    const u = await getDoc(doc(db,'users',state.userId));
    if(u.exists() && u.data().blocked === true) return { blocked: true, reason: 'user' };
    const s = await getDoc(doc(db,'sessions',state.userId,'items',state.sessionId));
    if(s.exists() && (s.data().blocked === true || s.data().blockedByAdmin)) return { blocked: true, reason: 'session' };
  } catch(e) { console.warn('Block check error', e); }
  return { blocked: false };
}
async function sendMessage() {
  const text = sanitize(DOMElements.messageInput.value);
  if (!text) return;

  DOMElements.sendBtn.disabled = true;
  DOMElements.sendBtn.classList.add('loading');
  DOMElements.statusRow.textContent = '';
  showTypingIndicator(true);
  try {
    await loadConfigLive();
    if (!botConfig.active) {
      await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ This bot has been deactivated by admin.', sender: 'bot', createdAt: new Date() });
      return;
    }
    const uSnapPre = await getDoc(doc(db, 'users', state.userId));
    if (uSnapPre.exists() && uSnapPre.data().blocked === true) {
      await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ Yo lil ass has been blocked by chaka.', sender: 'bot', createdAt: new Date() });
      return;
    }
    
    const handleResult = await handleUserMessage(text);
    if (handleResult && handleResult.blocked && !handleResult.matchedTrigger) return;
    const snaps = await getDocs(query(collection(db, 'chats', state.userId, state.sessionId), orderBy('createdAt', 'asc')));
    const historyLines = snaps.docs.map(d => `${d.data().sender === 'user' ? 'User' : 'Bot'}: ${d.data().text || ''}`).join('\n');
    
         // ✅ // ✅ MODIFICATION START: Inject Markdown formatting instructions into the persona
    const formattingInstructions = `
---
**SYSTEM INSTRUCTIONS:**
provide clear, readable, and well-structured answers.
ALWAYS format your responses using Markdown. This is mandatory.
- Use headings, bullet points (using '-' or '*'), and numbered lists for organization.
- Use bold text ('**text**') to highlight key terms.
- Use code blocks ('\`\`\`') for any code snippets.
- Ensure there are proper paragraph breaks (a blank line between paragraphs) for longer explanations, proper tab spacing.
---
`;
    const personaWithInstructions = `${formattingInstructions}\n${botConfig.persona || ''}`;
    const personaPart = `${personaWithInstructions}\n\n[Conversation History]\n`;
    // ✅ MODIFICATION END
    const finalPrompt = `${personaPart}${historyLines}\nBot:`;

    let apiKeyToUse = null;
    if (botConfig.apiKeys?.text?.key && botConfig.apiKeys.text.enabled !== false) {
      apiKeyToUse = botConfig.apiKeys.text.key.trim();
    } else if (typeof botConfig.apiKey === 'string' && botConfig.apiKey.trim()) {
      apiKeyToUse = botConfig.apiKey.trim();
    }
    if (!apiKeyToUse) {
      await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ Bot API key missing. Ask admin to set it.', sender: 'bot', createdAt: new Date() });
      DOMElements.statusRow.textContent = 'API key missing';
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKeyToUse)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: finalPrompt }] }] })
    });
    const data = await res.json();
    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I didn’t understand.';
    await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: botReply, sender: 'bot', createdAt: new Date() });
    if (state.sessionWasPreviouslyBlocked && botConfig.showSubtleNotes && botConfig.blockReminderNote && !state.subtleNoteShown) {
      try { await addSubtleNoteToSession(botConfig.blockReminderNote); } catch (e) {}
      state.subtleNoteShown = true;
    }
  } catch (err) {
    console.error('sendMessage error', err);
    DOMElements.statusRow.textContent = `Error: ${err.message || 'Unknown'}`;
    try {
      if (state.sessionId) { await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ Error: ' + (err.message || 'Unknown error'), sender: 'bot', createdAt: new Date() }); }
    } catch (e) { console.warn('failed to log error message', e); }
  } finally {
    showTypingIndicator(false);
    DOMElements.sendBtn.disabled = false;
    DOMElements.sendBtn.classList.remove('loading');
    if (botConfig.active !== false) DOMElements.statusRow.textContent = '';
    DOMElements.messageInput.value = '';
    DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function startNewChat(){
  state.sessionId=crypto.randomUUID();
  localStorage.setItem('chatSessionId',state.sessionId);
  state.firstMessageSaved=false;
  subscribeMessages();
  checkSessionWasPreviouslyBlocked().catch(()=>{});
  document.querySelectorAll('.session-item.active').forEach(el=>el.classList.remove('active'));
}
function loadSessionById(id){
  state.sessionId=id;
  localStorage.setItem('chatSessionId',id);
  state.firstMessageSaved=true;
  subscribeMessages();
  checkSessionWasPreviouslyBlocked().catch(()=>{});
  document.querySelectorAll('.session-item.active').forEach(el=>el.classList.remove('active'));
  const el=DOMElements.sessionList.querySelector(`.session-item[data-id="${id}"]`);
  if(el)el.classList.add('active');
  if(window.innerWidth<=900){DOMElements.sidebar.classList.remove('open');DOMElements.overlay.classList.remove('show');}
}
async function clearHistory(){
  if(!confirm('Clear chat history? This cannot be undone.'))return;
  try{
    const ref=collection(db,'sessions',state.userId,'items');
    const snaps=await getDocs(ref);
    const batch=writeBatch(db);
    snaps.forEach(doc=>batch.delete(doc.ref));
    await batch.commit();
    DOMElements.sessionList.innerHTML='';
    startNewChat();
  }catch(err){console.error('Clear history error:',err);alert(`Failed: ${err.message}`);}
}

// --- DYNAMIC MIC/SEND BUTTON & VOICE INPUT (UNCHANGED) ---
const micIcon = DOMElements.sendBtn.querySelector('.mic-icon');
const sendIcon = DOMElements.sendBtn.querySelector('.send-icon');
let recognition;
DOMElements.messageInput.addEventListener('input', () => {
  autosize(DOMElements.messageInput);
  const text = DOMElements.messageInput.value.trim();
  if (text) {
    micIcon.style.display = 'none';
    sendIcon.style.display = 'block';
    DOMElements.sendBtn.title = 'Send';
  } else {
    micIcon.style.display = 'block';
    sendIcon.style.display = 'none';
    DOMElements.sendBtn.title = 'Record Voice';
  }
});
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onstart = () => {
    DOMElements.sendBtn.classList.add('listening');
    DOMElements.statusRow.textContent = "🎤 Listening...";
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    DOMElements.messageInput.value = transcript;
    DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  };
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    DOMElements.statusRow.textContent = "⚠️ Mic error: " + event.error;
  };
  recognition.onend = () => {
    DOMElements.sendBtn.classList.remove('listening');
    if (DOMElements.statusRow.textContent === "🎤 Listening...") DOMElements.statusRow.textContent = "";
    const msg = DOMElements.messageInput.value.trim();
    if (msg) sendMessage();
  };
}
DOMElements.sendBtn.addEventListener('click', () => {
  if (DOMElements.sendBtn.classList.contains('listening')) {
      if(recognition) recognition.stop();
      return;
  }
  const text = DOMElements.messageInput.value.trim();
  if (text) sendMessage();
  else if (recognition) recognition.start();
});

// --- USER ACTIVITY TRACKING (UNCHANGED) ---
async function updateUserStatusInFirestore(status) {
    if (!state.userId || !db) return;
    try {
        const userRef = doc(db, 'users', state.userId);
        await updateDoc(userRef, { activityStatus: status, lastSeen: serverTimestamp() });
    } catch (e) {
        console.warn("Could not update user status", e);
    }
}
let inactivityTimer;
const inactivityTimeout = 60000;
function setUserActive() {
    updateUserStatusInFirestore('Active');
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(setUserInactive, inactivityTimeout);
}
function setUserInactive() { updateUserStatusInFirestore('Inactive'); }
const resetActivityEvents = ['mousemove', 'keypress', 'scroll', 'click', 'DOMContentLoaded'];
resetActivityEvents.forEach(event => document.addEventListener(event, setUserActive));
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearTimeout(inactivityTimer);
        updateUserStatusInFirestore('Away');
    } else {
        setUserActive();
    }
});
window.addEventListener('beforeunload', () => { updateUserStatusInFirestore('Offline'); });

// EVENTS & INIT (UNCHANGED)
const init = async () => {
  state.userId = localStorage.getItem('chatUserId') || crypto.randomUUID();
  localStorage.setItem('chatUserId', state.userId);
  state.sessionId = localStorage.getItem('chatSessionId') || null;
  applyTheme(state.currentTheme);
  try { 
    await loadConfigLive(); 
    DOMElements.sendBtn.disabled = false;
  } catch (err) { 
    console.warn('Config load failed:', err); 
    DOMElements.statusRow.textContent = `Bot config failed: ${err.message}`;
    DOMElements.sendBtn.disabled = false; 
  }
  await ensureUser().catch(e => console.error('ensureUser failed', e));
  subscribeSessions();
  if (state.sessionId) {
    const snap = await getDoc(doc(db,'sessions',state.userId,'items',state.sessionId));
    state.firstMessageSaved = snap.exists();
    subscribeMessages();
    await checkSessionWasPreviouslyBlocked();
  } else {
    startNewChat();
  }
  DOMElements.menuBtn.addEventListener('click', () => { DOMElements.sidebar.classList.toggle('open'); DOMElements.overlay.classList.toggle('show'); });
  DOMElements.overlay.addEventListener('click', () => { DOMElements.sidebar.classList.remove('open'); DOMElements.overlay.classList.remove('show'); });
  const handleNewChat = () => { startNewChat(); if (window.innerWidth<=900) { DOMElements.sidebar.classList.remove('open'); DOMElements.overlay.classList.remove('show'); } };
  DOMElements.newChatSidebarBtn.addEventListener('click', handleNewChat);
  DOMElements.clearHistoryBtn.addEventListener('click', clearHistory);
  DOMElements.messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); DOMElements.sendBtn.click(); } });
  DOMElements.chatMessages.addEventListener('scroll', () => {
    const isScrolledUp = DOMElements.chatMessages.scrollHeight - DOMElements.chatMessages.scrollTop - DOMElements.chatMessages.clientHeight > 200;
    DOMElements.scrollToBottomBtn.classList.toggle('visible', isScrolledUp);
  });
  DOMElements.scrollToBottomBtn.addEventListener('click', () => scrollToBottom('smooth'));
  const composerObserver = new ResizeObserver(entries => { document.documentElement.style.setProperty('--composer-height', `${entries[0].target.offsetHeight}px`); });
  composerObserver.observe(DOMElements.composer);

  // FILE UPLOAD LOGIC (UNCHANGED)
  const fileUploadInput = document.getElementById('file-upload');
  DOMElements.fileUploadWrapper.addEventListener('click', () => { fileUploadInput.click(); });
  fileUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusMsg = document.createElement('div');
    statusMsg.className = 'message-group user';
    statusMsg.innerHTML = `<div class="message user" style="opacity: 0.7;">📄 Uploading ${file.name}...</div>`;
    DOMElements.chatMessages.appendChild(statusMsg);
    scrollToBottom('smooth');
    try {
      const text = await readUploadedFile(file);
      statusMsg.remove();
      await saveFirstMessageTitleIfNeeded(`File: ${file.name}`);
      await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
        text: `📄 **File Uploaded: ${file.name}**\n\n---\n\n${text.slice(0, 1500)}...`,
        sender: 'user',
        createdAt: new Date()
      });
      DOMElements.messageInput.value = `Summarize the key points from the document I just uploaded, named "${file.name}".`;
      sendMessage();
    } catch (err) {
      console.error("File upload and read failed", err);
      statusMsg.remove();
      await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
        text: `⚠️ Failed to read file: ${err.message}`,
        sender: 'bot',
        createdAt: new Date()
      });
    } finally {
      e.target.value = '';
    }
  });
  DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
};

// Start the application
init();
