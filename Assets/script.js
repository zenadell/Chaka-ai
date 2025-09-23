// --- FIREBASE IMPORTS & CONFIG (UNCHANGED) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, updateDoc, getDocs, writeBatch, where, limit
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

// --- ⭐ DOM ELEMENTS (UNCHANGED) ---
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
  composerActionsBtn: document.getElementById('composer-actions-btn'),
  composerActionsPopup: document.getElementById('composer-actions-popup'),
  personalityList: document.getElementById('personality-list'),
  fileUploadWrapper: document.getElementById('file-upload-wrapper'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  statusRow: document.getElementById('status-row'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon')
};

// --- ⭐ APPLICATION STATE (UNCHANGED) ---
let state = {
  userId: null,
  sessionId: null,
  selectedPersonalityId: null,
  defaultPersonalityId: null,
  personalitiesUnsub: null,
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

// --- ⭐ STATE FOR AUTOMATED API RETRY PROCESS (UNCHANGED from previous version) ---
let autoRetryState = {
    isActive: false,
    stopRequested: false,
    requestPayload: null,
    botMessageElements: null
};
let fetchController;

// --- GLOBAL STATE FOR FILE UPLOAD (UNCHANGED) ---
let selectedFile = null;
let fileContentForNextMessage = '';

// --- resetFileInput FUNCTION (UNCHANGED) ---
function resetFileInput() {
  selectedFile = null;
  const filePreviewContainer = document.getElementById('file-preview-container');
  const filePreviewName = document.getElementById('file-preview-name');
  const fileUploadInput = document.getElementById('file-upload');

  if (filePreviewContainer) {
      filePreviewContainer.style.display = 'none';
      DOMElements.composer.classList.remove('file-attached');
  }
  if (filePreviewName) filePreviewName.textContent = '';
  if (fileUploadInput) fileUploadInput.value = '';

  DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
}


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

// --- ⭐ API KEY MANAGEMENT (UNCHANGED from previous version) ---
const apiKeyManager = {
    keys: [],
    currentIndex: 0,
    usageTimestamps: new Map(),
    initialize(apiKeysConfig) {
        this.keys = Object.entries(apiKeysConfig || {})
            .filter(([, val]) => val && val.type === 'text' && val.enabled !== false && val.key)
            .map(([id, val]) => ({ id, key: val.key.trim() }));
        this.usageTimestamps.clear();
        this.keys.forEach(k => this.usageTimestamps.set(k.id, []));
        if (this.currentIndex >= this.keys.length) this.currentIndex = 0;
        console.log(`API Key Manager Initialized/Updated with ${this.keys.length} keys.`);
    },
    getCurrentKey() {
        if (this.keys.length === 0) return null;
        return { ...this.keys[this.currentIndex], index: this.currentIndex };
    },
    switchToNextKey() {
        if (this.keys.length === 0) return null;
        const oldIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.warn(`Switched API key from index ${oldIndex} to ${this.currentIndex}.`);
        return this.getCurrentKey();
    },
    recordUsage(keyId) {
        if (!this.usageTimestamps.has(keyId)) return;
        const now = Date.now();
        const timestamps = this.usageTimestamps.get(keyId);
        timestamps.push(now);
        const sixtySecondsAgo = now - 60000;
        this.usageTimestamps.set(keyId, timestamps.filter(ts => ts > sixtySecondsAgo));
    },
    getUsageInfo(keyId) {
        if (!this.usageTimestamps.has(keyId)) return { count: 0, isRateLimited: false, timeLeft: 0 };
        const now = Date.now();
        const sixtySecondsAgo = now - 60000;
        const timestamps = this.usageTimestamps.get(keyId).filter(ts => ts > sixtySecondsAgo);
        const count = timestamps.length;
        const isRateLimited = count >= 5;
        let timeLeft = 0;
        if (isRateLimited) {
            const oldestTimestampInWindow = timestamps[0];
            timeLeft = Math.ceil((oldestTimestampInWindow + 60000 - now) / 1000);
        }
        return { count, isRateLimited, timeLeft: Math.max(0, timeLeft) };
    }
};

// --- UTILITIES (UNCHANGED) ---
const sanitize = (s) => typeof s === 'string' ? s.trim() : '';
const autosize = (el) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 150)}px`; };
const parseBool = (v) => v === true || v === 'true';
const scrollToBottom = (behavior = 'auto') => { DOMElements.chatMessages.scrollTo({ top: DOMElements.chatMessages.scrollHeight, behavior }); };
const parseFileContent = (file) => {
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

// --- applyConfigToUI (UNCHANGED) ---
const applyConfigToUI = () => {
  DOMElements.chatTitle.textContent = botConfig.botName || 'AI Bot';
  DOMElements.botAvatar.src = botConfig.profileImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  document.documentElement.style.setProperty('--accent-light', botConfig.themeColor || '#4F46E5');
  document.documentElement.style.setProperty('--accent-dark', botConfig.themeColor ? `${botConfig.themeColor}aa` : '#818CF8');

  DOMElements.composerActionsBtn.style.display = botConfig.allowFileUpload ? 'flex' : 'none';

  DOMElements.statusRow.textContent = !botConfig.active ? '⚠️ Bot is deactivated by admin' : '';
  DOMElements.sendBtn.disabled = false;
};


// --- ✅ [CORRECTED] HELPER FUNCTIONS FOR CHAT CONTINUATION (UNCHANGED FROM YOUR SCRIPT) ---
async function findLastSessionForPersonality(personalityId) {
    if (!state.userId || !personalityId) return null;
    try {
        const sessionsRef = collection(db, 'sessions', state.userId, 'items');
        const q = query(
            sessionsRef,
            where('personalityId', '==', personalityId),
            orderBy('updatedAt', 'desc'),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error finding last session for personality:", error);
        return null;
    }
}

function showContinuationPrompt(personalityId, lastSessionId) {
    const modal = document.getElementById('continuation-modal');
    const continueBtn = document.getElementById('continue-chat-btn');
    const newChatBtn = document.getElementById('new-chat-modal-btn');
    const cancelBtn = document.getElementById('cancel-modal-btn');

    modal.classList.remove('hidden');

    const updateStateAndUI = () => {
        state.selectedPersonalityId = personalityId;
        localStorage.setItem('selectedPersonalityId', personalityId);
        
        document.querySelectorAll('.personality-item.active').forEach(el => el.classList.remove('active'));
        const newItem = DOMElements.personalityList.querySelector(`.personality-item[data-id="${personalityId}"]`);
        if (newItem) newItem.classList.add('active');
    };

    const cleanup = () => {
        modal.classList.add('hidden');
        DOMElements.overlay.classList.remove('show');
        modal.removeEventListener('click', overlayClickHandler);
    };

    const continueHandler = () => {
        updateStateAndUI();
        loadSessionById(lastSessionId);
        cleanup();
    };

    const newChatHandler = () => {
        updateStateAndUI();
        startNewChat(); 
        cleanup();
    };
    
    const cancelHandler = () => {
        cleanup();
    };

    const overlayClickHandler = (event) => {
        if (event.target === modal) {
            cancelHandler();
        }
    };
    
    continueBtn.addEventListener('click', continueHandler, { once: true });
    newChatBtn.addEventListener('click', newChatHandler, { once: true });
    cancelBtn.addEventListener('click', cancelHandler, { once: true });
    
    modal.addEventListener('click', overlayClickHandler);
}

// --- ✅ [CORRECTED] PERSONALITY SELECTION LOGIC (UNCHANGED FROM YOUR SCRIPT) ---
function subscribeAndDisplayPersonalities() {
    if (state.personalitiesUnsub) state.personalitiesUnsub();

    const personalitiesCol = collection(db, 'personalities');
    const q = query(personalitiesCol, orderBy('createdAt', 'desc'));

    state.personalitiesUnsub = onSnapshot(q, (personalitySnapshot) => {
        const oldDefaultId = state.defaultPersonalityId;
        const currentSelectedId = state.selectedPersonalityId;

        DOMElements.personalityList.innerHTML = '';
        let newDefaultPersonalityId = null;

        if (personalitySnapshot.empty) {
            DOMElements.personalityList.innerHTML = '<p class="no-personalities">No personalities available.</p>';
            state.defaultPersonalityId = null;
            state.selectedPersonalityId = null;
            localStorage.removeItem('selectedPersonalityId');
            return;
        }

        personalitySnapshot.forEach((docSnap) => {
            const personality = docSnap.data();
            const id = docSnap.id;

            if (personality.isDefault) {
                newDefaultPersonalityId = id;
            }

            const item = document.createElement('div');
            item.className = 'personality-item';
            item.dataset.id = id;
            item.innerHTML = `
                <img src="${personality.avatar || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${sanitize(personality.name)}" class="personality-avatar">
                <div class="personality-info">
                    <div class="personality-name">${sanitize(personality.name) || 'Unnamed'}</div>
                    <div class="personality-description">${sanitize(personality.description) || 'No description'}</div>
                </div>`;
            
            item.addEventListener('click', async () => {
                if (state.selectedPersonalityId === id) {
                    DOMElements.composerActionsPopup.classList.remove('show');
                    DOMElements.composerActionsBtn.classList.remove('active');
                    DOMElements.overlay.classList.remove('show');
                    return;
                }

                const lastSessionId = await findLastSessionForPersonality(id);

                DOMElements.composerActionsPopup.classList.remove('show');
                DOMElements.composerActionsBtn.classList.remove('active');
                
                if (lastSessionId) {
                    showContinuationPrompt(id, lastSessionId);
                } else {
                    DOMElements.overlay.classList.remove('show');

                    state.selectedPersonalityId = id;
                    localStorage.setItem('selectedPersonalityId', id);
                    document.querySelectorAll('.personality-item.active').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    
                    startNewChat();
                }
            });
            DOMElements.personalityList.appendChild(item);
        });

        state.defaultPersonalityId = newDefaultPersonalityId;

        if (currentSelectedId === oldDefaultId || currentSelectedId === null) {
            state.selectedPersonalityId = newDefaultPersonalityId;
            if (newDefaultPersonalityId) {
                localStorage.setItem('selectedPersonalityId', newDefaultPersonalityId);
            } else {
                localStorage.removeItem('selectedPersonalityId');
            }
        }

        document.querySelectorAll('.personality-item.active').forEach(el => el.classList.remove('active'));
        if (state.selectedPersonalityId) {
            const activeItem = DOMElements.personalityList.querySelector(`.personality-item[data-id="${state.selectedPersonalityId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }, (error) => {
        console.error("Error subscribing to personalities:", error);
        DOMElements.personalityList.innerHTML = '<p class="no-personalities">Error loading personalities.</p>';
    });
}


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

// --- ✅ [MODIFIED] loadConfigLive FUNCTION ---
function loadConfigLive() {
  if (state.configPromise) return state.configPromise;
state.configPromise = (async () => {
    const cfgRef = doc(db, 'config', 'global');
    const applyCfg = (data) => {
      Object.assign(botConfig, data || {});
      botConfig.allowFileUpload = parseBool(botConfig.allowFileUpload);
      botConfig.apiKeys = botConfig.apiKeys || {};

      apiKeyManager.initialize(botConfig.apiKeys);

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

// --- subscribeMessages (UNCHANGED) ---
function subscribeMessages() {
  if (!state.sessionId) return;
  if (state.messagesUnsub) state.messagesUnsub();
  const q = query(collection(db, 'chats', state.userId, state.sessionId), orderBy('createdAt', 'asc'));
  state.messagesUnsub = onSnapshot(q, snap => {
    const container = DOMElements.chatMessages;

    container.querySelectorAll('.streaming').forEach(el => el.remove());

    container.innerHTML = '';
    if (snap.empty) {
      const suggestions = [
          { title: 'Explain a concept', prompt: 'Explain the concept of quantum entanglement like I\'m five.', icon: '🧠' },
          { title: 'Write a story', prompt: 'Write a short, gritty, noir-style story set in Lagos.', icon: '✍️' },
          { title: 'Plan a trip', prompt: 'Plan a 3-day itinerary for a first-time visitor to Abuja.', icon: '✈️' },
          { title: 'Debug some code', prompt: 'What is wrong with this Javascript code? \n\nfunction (){ \n  const x = 1;\n  if(true) {\n    const x = 2;\n  }\n  return x;\n}', icon: '💻' }
      ];

      const suggestionButtonsHTML = suggestions.map(s =>
        `<button class="prompt-suggestion-btn" data-prompt="${sanitize(s.prompt)}">
          <span class="prompt-title">${s.title}</span>
        </button>`
      ).join('');

      container.innerHTML = `<div id="welcome-screen">
          <dotlottie-wc src="https://lottie.host/21d66b08-a3d6-4708-9843-5eacc664e174/Oxfbcz3F2M.lottie" style="width: 300px;height: 300px" speed="1" autoplay loop></dotlottie-wc>
          <h3>How can I help you today?</h3>
          <div class="prompt-suggestions">
            ${suggestionButtonsHTML}
          </div>
        </div>`;

      container.querySelectorAll('.prompt-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const promptText = e.currentTarget.dataset.prompt;
          DOMElements.messageInput.value = promptText;
          DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          sendMessage();
        });
      });
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

      if (typeof marked !== 'undefined') {
        marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        const rawHTML = marked.parse(msg.text || '');
        content.innerHTML = rawHTML;
      } else {
        content.textContent = msg.text || '';
      }

      el.appendChild(content);

      if (msg.sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-message-btn';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>`;
        copyBtn.title = 'Copy text';
        copyBtn.onclick = (e) => {
            navigator.clipboard.writeText(msg.text);
            const button = e.target.closest('button');
            button.innerHTML = `<span>Copied!</span>`;
            setTimeout(() => {
                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>`;
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

// --- ✅ [MODIFIED] SESSION METADATA NOW SAVES PERSONALITY ID (UNCHANGED FROM YOUR SCRIPT) ---
async function ensureSessionMetadataOnFirstMsg(sid, msg){
  const ref=doc(db,'sessions',state.userId,'items',sid);
  const s = await getDoc(ref);
  if(!s.exists()){
    await setDoc(ref,{
        title: msg || 'New Chat',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        warnings: 0, 
        wasBlocked: false,
        personalityId: state.selectedPersonalityId
    }, { merge: true });
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

// --- ✅ [HEAVILY MODIFIED] sendMessage AND NEW HELPER FUNCTIONS ---

/**
 * [NEW] Toggles the state of the send button (Mic, Send, Stop).
 * @param {'mic' | 'send' | 'stop'} state - The target state.
 */
function toggleSendButtonState(buttonState) {
    const btn = DOMElements.sendBtn;
    const icons = {
        mic: btn.querySelector('.mic-icon'),
        send: btn.querySelector('.send-icon'),
        stop: btn.querySelector('.stop-icon'),
    };
    
    for (const icon in icons) {
        if (icons[icon]) icons[icon].style.display = 'none';
    }
    btn.disabled = false;

    switch (buttonState) {
        case 'mic':
            if (icons.mic) icons.mic.style.display = 'block';
            btn.title = 'Record Voice';
            break;
        case 'send':
            if (icons.send) icons.send.style.display = 'block';
            btn.title = 'Send';
            break;
        case 'stop':
            if (icons.stop) icons.stop.style.display = 'block';
            btn.title = 'Stop Generating';
            break;
    }
}

/**
 * [NEW] Creates a cancellable promise that waits for a specified duration.
 * It also updates the UI with a countdown message.
 * @param {number} duration - The wait duration in milliseconds.
 * @param {string} [countdownMessage] - The message to display with the countdown.
 * @returns {Promise<boolean>} A promise that resolves to true if stopped by the user, false otherwise.
 */
function cancellableWait(duration, countdownMessage = '') {
    return new Promise(resolve => {
        let timeLeft = Math.ceil(duration / 1000);
        const updateCountdown = () => {
            if (countdownMessage) {
                DOMElements.statusRow.textContent = `${countdownMessage} ${timeLeft}...`;
            }
        };

        if (countdownMessage) updateCountdown();
        
        const interval = setInterval(() => {
            if (autoRetryState.stopRequested) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(true); // Stopped
            }
            timeLeft--;
            if (countdownMessage) updateCountdown();
        }, 1000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            if (!autoRetryState.stopRequested) {
                resolve(false); // Not stopped
            }
        }, duration);
    });
}


/**
 * [NEW] Immediately stops the automated API request loop.
 */
function stopApiRequestLoop() {
    if (autoRetryState.isActive) {
        autoRetryState.stopRequested = true;
        if (fetchController) {
            fetchController.abort(); // Abort any in-flight fetch request
        }
        console.log("User requested to stop the API request loop.");
    }
}

/**
 * [NEW] Core API fetch and stream processing logic.
 * @param {object} requestBody - The full body for the fetch request.
 * @param {string} apiKey - The API key to use for this request.
 * @param {AbortSignal} abortSignal - The signal to abort the fetch request.
 * @returns {Promise<string>} The accumulated bot reply.
 */
async function makeApiRequest(requestBody, apiKey, abortSignal) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortSignal
    });

    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'API request failed';
        try {
            errorMessage = JSON.parse(errorText)?.error?.message || errorMessage;
        } catch (e) {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    
    const { botMessageContent } = autoRetryState.botMessageElements;
    let accumulatedBotReply = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
        if (abortSignal.aborted) {
            reader.cancel();
            throw new Error("Request stopped by user.");
        }
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('"text":')) {
                const textPart = line.substring(line.indexOf(':') + 2).replace(/",?$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
                accumulatedBotReply += textPart;
                if (botMessageContent) {
                  botMessageContent.innerHTML = marked.parse(accumulatedBotReply + '<span class="typing-cursor"></span>');
                  scrollToBottom('smooth');
                }
            }
        }
    }
    return accumulatedBotReply;
}

/**
 * [NEW] Cleans up the UI and state after the request loop finishes (success, fail, or stop).
 */
function cleanupAfterLoop() {
    autoRetryState.isActive = false;
    const text = DOMElements.messageInput.value.trim();
    if (text || selectedFile) {
        toggleSendButtonState('send');
    } else {
        toggleSendButtonState('mic');
    }
    fileContentForNextMessage = '';
}

/**
 * [NEW & IMPROVED] The main automated loop for sending a request with a master timeout.
 */
async function executeApiRequestLoop() {
    autoRetryState.isActive = true;
    autoRetryState.stopRequested = false;
    fetchController = new AbortController();
    toggleSendButtonState('stop');

    const MASTER_TIMEOUT = 90000; // 1.5 minutes
    const startTime = Date.now();
    let finalAccumulatedReply = '';
    let success = false;
    
    while (Date.now() - startTime < MASTER_TIMEOUT && !autoRetryState.stopRequested) {
        // This inner loop cycles through all available keys once.
        const keyCount = apiKeyManager.keys.length;
        if (keyCount === 0) {
            DOMElements.statusRow.textContent = "No API keys available. Searching for new keys...";
            if (await cancellableWait(10000)) break;
            continue; // Re-start the while loop to check for new keys again
        }

        let keyCycleCompleted = false;
        for (let i = 0; i < keyCount; i++) {
            if (autoRetryState.stopRequested) break;

            const currentKeyInfo = apiKeyManager.getCurrentKey();
            
            // ATTEMPT 1: Initial Request
            DOMElements.statusRow.textContent = `Contacting server with Key #${currentKeyInfo.index + 1}...`;
            try {
                finalAccumulatedReply = await makeApiRequest(autoRetryState.requestPayload, currentKeyInfo.key, fetchController.signal);
                success = true;
                break;
            } catch (err) {
                if (err.name === 'AbortError') break;
                console.error(`Initial attempt on key #${currentKeyInfo.index + 1} failed: ${err.message}`);
            }

            if (autoRetryState.stopRequested) break;

            // ATTEMPT 2: Network Retry (Same Key)
            if (await cancellableWait(5000, `Connection issue? Retrying with Key #${currentKeyInfo.index + 1} in`)) break;
            
            try {
                finalAccumulatedReply = await makeApiRequest(autoRetryState.requestPayload, currentKeyInfo.key, fetchController.signal);
                success = true;
                break;
            } catch (err) {
                if (err.name === 'AbortError') break;
                console.error(`Retry attempt on key #${currentKeyInfo.index + 1} failed: ${err.message}`);
            }

            if (autoRetryState.stopRequested) break;

            // Both attempts failed, switch to the next key for the next iteration.
            apiKeyManager.switchToNextKey();
            if (i === keyCount - 1) {
                keyCycleCompleted = true; // We've tried all keys in the current list
            }
        }

        if (success || autoRetryState.stopRequested) {
            break; // Exit the main while-loop
        }

        // If a full cycle of all known keys has failed, wait before starting over.
        if (keyCycleCompleted) {
            if (await cancellableWait(10000, `All keys are busy. Re-checking for an available key in`)) break;
        }
    }

    // --- Finalize based on outcome ---
    const { botMessageContent, botMessageGroup } = autoRetryState.botMessageElements;
    if (success) {
        apiKeyManager.recordUsage(apiKeyManager.getCurrentKey().id);
        DOMElements.statusRow.textContent = '';
        botMessageContent.innerHTML = marked.parse(finalAccumulatedReply);
        botMessageContent.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch (e) {} });
        addCopyButtons();
        await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: finalAccumulatedReply, sender: 'bot', createdAt: new Date() });
    } else {
        if (autoRetryState.stopRequested) {
            DOMElements.statusRow.textContent = 'Request stopped by user.';
            botMessageGroup.remove();
        } else {
            const finalErrorMsg = "⚠️ Could not get your request. The server took too long to respond. Please try again later.";
            DOMElements.statusRow.textContent = finalErrorMsg;
            botMessageContent.innerHTML = finalErrorMsg;
            if (state.sessionId) {
                await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: finalErrorMsg, sender: 'bot', createdAt: new Date() });
            }
        }
    }
    
    cleanupAfterLoop();
}


/**
 * [MODIFIED] This function now only PREPARES the request and then starts the automated loop.
 */
async function sendMessage() {
  if (autoRetryState.isActive) return;

  const text = sanitize(DOMElements.messageInput.value);
  if (!text && !selectedFile) return;

  toggleSendButtonState('stop');
  DOMElements.statusRow.textContent = '';
  DOMElements.messageInput.value = '';
  DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));

  let userMessageToSave = text;
  
  try {
      if (selectedFile) {
          DOMElements.statusRow.textContent = `Processing file...`;
          try {
              fileContentForNextMessage = await parseFileContent(selectedFile);
          } catch (err) {
              console.error('File parsing failed:', err);
              DOMElements.statusRow.textContent = `Error reading file: ${err.message}`;
              resetFileInput();
              cleanupAfterLoop();
              return;
          }
          userMessageToSave = text ? `📄 **File Uploaded: ${selectedFile.name}**\n\n${text}` : `📄 **File Uploaded: ${selectedFile.name}**`;
          resetFileInput();
      }

      await loadConfigLive();
      if (!botConfig.active) {
          await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ Dude! I am Under maintenance . Do not bother bitch.', sender: 'bot', createdAt: new Date() });
          cleanupAfterLoop();
          return;
      }
      const uSnapPre = await getDoc(doc(db, 'users', state.userId));
      if (uSnapPre.exists() && uSnapPre.data().blocked === true) {
          await addDoc(collection(db, 'chats', state.userId, state.sessionId), { text: '⚠️ This user has been blocked by admin.', sender: 'bot', createdAt: new Date() });
          cleanupAfterLoop();
          return;
      }

      const handleResult = await handleUserMessage(userMessageToSave);
      if (handleResult && handleResult.blocked && !handleResult.matchedTrigger) {
          cleanupAfterLoop();
          return;
      }
      
      const botMessageGroup = document.createElement('div');
      botMessageGroup.className = 'message-group bot streaming';
      const botMessageEl = document.createElement('div');
      botMessageEl.className = 'message bot';
      if(botConfig.botBubbleColor) botMessageEl.style.background = botConfig.botBubbleColor;
      const botMessageContent = document.createElement('div');
      botMessageContent.className = 'message-content';
      botMessageContent.innerHTML = '<span class="typing-cursor"></span>';
      botMessageEl.appendChild(botMessageContent);
      botMessageGroup.appendChild(botMessageEl);
      DOMElements.chatMessages.querySelector('#welcome-screen')?.remove();
      DOMElements.chatMessages.appendChild(botMessageGroup);
      scrollToBottom('smooth');

      const snaps = await getDocs(query(collection(db, 'chats', state.userId, state.sessionId), orderBy('createdAt', 'asc')));
      let activePersonaInstructions = '';
      if (state.selectedPersonalityId) {
          const personaDoc = await getDoc(doc(db, 'personalities', state.selectedPersonalityId));
          if (personaDoc.exists()) activePersonaInstructions = personaDoc.data().persona || '';
      }
      if (!activePersonaInstructions) activePersonaInstructions = botConfig.persona || '';
      
      // ✅ SYNTAX CORRECTION from previous version is maintained here
      const systemInstruction = { role: 'user', parts: [{ text: `${activePersonaInstructions}\n\n---**SYSTEM INSTRUCTIONS:**\nprovide clear, readable, and well-structured answers. ALWAYS format your responses using Markdown. This is mandatory.\n- Use headings, bullet points, and numbered lists.\n- Use bold text for key terms.\n- Use code blocks for code snippets.\n---` }] };
      const contents = snaps.docs.map(d => ({ role: d.data().sender === 'user' ? 'user' : 'model', parts: [{ text: d.data().text }] }));
      
      if (fileContentForNextMessage) {
          const lastMessage = contents[contents.length - 1];
          if (lastMessage && lastMessage.role === 'user') lastMessage.parts[0].text = `[File: "${selectedFile?.name}"]\n---FILE CONTENT---\n${fileContentForNextMessage}\n---END FILE CONTENT---\n\nUser's Message: "${lastMessage.parts[0].text}"`;
      }
      
      autoRetryState.requestPayload = { contents: [systemInstruction, {role: 'model', parts: [{text: "Understood."}]}, ...contents] };
      autoRetryState.botMessageElements = { botMessageGroup, botMessageEl, botMessageContent };
      
      executeApiRequestLoop();

  } catch (err) {
      console.error('sendMessage preparation error', err);
      DOMElements.statusRow.textContent = '⚠️ Error: ' + (err.message || 'Could not prepare message.');
      cleanupAfterLoop();
  }
}

// --- ⭐ SESSION MANAGEMENT (UNCHANGED) ---
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

// --- ✅ [MODIFIED] DYNAMIC MIC/SEND BUTTON & VOICE INPUT ---
let recognition;
DOMElements.messageInput.addEventListener('input', () => {
  autosize(DOMElements.messageInput);
  if (autoRetryState.isActive) return;

  const text = DOMElements.messageInput.value.trim();
  if (text || selectedFile) {
    toggleSendButtonState('send');
  } else {
    toggleSendButtonState('mic');
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
  if (autoRetryState.isActive) {
      stopApiRequestLoop();
      return;
  }

  if (DOMElements.sendBtn.classList.contains('listening')) {
      if(recognition) recognition.stop();
      return;
  }
  const text = DOMElements.messageInput.value.trim();
  if (text || selectedFile) sendMessage();
  else if (recognition) recognition.start();
});

// --- USER ACTIVITY TRACKING (UNCHANGED) ---
async function updateUserStatusInFirestore(status) {
    if (!state.userId || !db) return;
    try {
        const userRef = doc(db, 'users', state.userId);
        await setDoc(userRef, {
            activityStatus: status,
            lastSeen: serverTimestamp()
        }, { merge: true });
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

// --- ⭐ INIT FUNCTION (UNCHANGED) ---
const init = async () => {
  state.userId = localStorage.getItem('chatUserId') || crypto.randomUUID();
  localStorage.setItem('chatUserId', state.userId);
  state.sessionId = localStorage.getItem('chatSessionId') || null;
  state.selectedPersonalityId = localStorage.getItem('selectedPersonalityId') || null;

  applyTheme(state.currentTheme);
  try {
    await loadConfigLive();
    subscribeAndDisplayPersonalities();
    DOMElements.sendBtn.disabled = false;
  } catch (err) {
    console.warn('Config/Personality load failed:', err);
    DOMElements.statusRow.textContent = `Bot init failed: ${err.message}`;
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

  // --- EVENT LISTENERS (UNCHANGED) ---
  DOMElements.menuBtn.addEventListener('click', () => {
    DOMElements.sidebar.classList.toggle('open');
    DOMElements.overlay.classList.toggle('show');
  });

  DOMElements.overlay.addEventListener('click', () => {
      DOMElements.sidebar.classList.remove('open');
      DOMElements.composerActionsPopup.classList.remove('show');
      DOMElements.composerActionsBtn.classList.remove('active');
      DOMElements.overlay.classList.remove('show');
  });

  const handleNewChat = () => {
      startNewChat();
      if (window.innerWidth<=900) {
        DOMElements.sidebar.classList.remove('open');
        DOMElements.overlay.classList.remove('show');
      }
  };
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

  DOMElements.composerActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpening = !DOMElements.composerActionsBtn.classList.contains('active');
      DOMElements.composerActionsPopup.classList.toggle('show', isOpening);
      DOMElements.composerActionsBtn.classList.toggle('active', isOpening);
      DOMElements.overlay.classList.toggle('show', isOpening);
  });

  const fileUploadInput = document.getElementById('file-upload');
  const filePreviewContainer = document.getElementById('file-preview-container');
  const filePreviewName = document.getElementById('file-preview-name');
  const filePreviewCancel = document.getElementById('file-preview-cancel');

  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedFile = file;

      DOMElements.composerActionsPopup.classList.remove('show');
      DOMElements.composerActionsBtn.classList.remove('active');
      DOMElements.overlay.classList.remove('show');

      DOMElements.composer.prepend(filePreviewContainer);
      DOMElements.composer.classList.add('file-attached');

      if (filePreviewName) filePreviewName.textContent = file.name;
      if (filePreviewContainer) filePreviewContainer.style.display = 'flex';

      e.target.value = '';
      DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  if (filePreviewCancel) {
    filePreviewCancel.addEventListener('click', () => {
      resetFileInput();
    });
  }

  DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
};

init();
