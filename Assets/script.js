// --- FIREBASE IMPORTS & CONFIG (UNCHANGED) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, updateDoc, getDocs, writeBatch, where, limit, arrayUnion
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

// --- PDF.js WORKER SETUP (UNCHANGED) ---
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
}


// --- DOM ELEMENTS (UNCHANGED) ---
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
  themeIcon: document.getElementById('theme-icon'),
  apiStatusRow: document.getElementById('api-status-row'),
  personalityPreviewModal: document.getElementById('personality-preview-modal'),
  previewPersonalityName: document.getElementById('preview-personality-name'),
  previewVideo: document.getElementById('preview-video'),
  confirmPersonalitySwitchBtn: document.getElementById('confirm-personality-switch-btn'),
  cancelPersonalitySwitchBtn: document.getElementById('cancel-personality-switch-btn'),
  tourOverlay: document.getElementById('tour-overlay'),
  tourSpotlight: document.querySelector('.tour-spotlight'),
  tourTooltip: document.querySelector('.tour-tooltip'),
  tourTitle: document.getElementById('tour-title'),
  tourText: document.getElementById('tour-text'),
  tourPrevBtn: document.getElementById('tour-prev-btn'),
  tourNextBtn: document.getElementById('tour-next-btn'),
  tourFinishBtn: document.getElementById('tour-finish-btn'),
  tourStepCounter: document.getElementById('tour-step-counter'),
  welcomeTourModal: document.getElementById('welcome-tour-modal'),
  startTourBtn: document.getElementById('start-tour-btn'),
  skipTourBtn: document.getElementById('skip-tour-btn'),
};

// --- APPLICATION STATE (UNCHANGED) ---
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

// --- STATE FOR AUTOMATED API RETRY PROCESS (UNCHANGED) ---
let autoRetryState = {
    isActive: false,
    stopRequested: false,
    requestPayload: null,
    botMessageElements: null
};
let fetchController;

// --- GLOBAL STATE FOR MULTIPLE FILE UPLOADS (UNCHANGED) ---
let selectedFiles = []; 

// --- botConfig (UNCHANGED) ---
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
  blockReminderNote: "",
  promptSuggestions: []
};

// --- API KEY MANAGEMENT (UNCHANGED) ---
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

// --- LIVE STATUS REPORTING (UNCHANGED) ---
async function updateLiveStatus(keyId) {
    if (!db) return;
    try {
        const configRef = doc(db, 'config', 'global');
        const updatePayload = {
            'liveStatus.activeApiKeyId': keyId,
            [`liveStatus.apiKeyUsage.${keyId}`]: serverTimestamp()
        };
        await updateDoc(configRef, updatePayload);
    } catch (e) {
        console.warn("Could not update live API key status", e);
    }
}
async function reportKeyFailure(keyId) {
    if (!db) return;
    try {
        const configRef = doc(db, 'config', 'global');
        await updateDoc(configRef, {
            [`liveStatus.apiKeyFailures.${keyId}`]: serverTimestamp()
        });
    } catch (e) { console.warn("Could not report key failure", e); }
}

// --- UTILITIES (UNCHANGED) ---
const sanitize = (s) => typeof s === 'string' ? s.trim() : '';
const autosize = (el) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 150)}px`; };
const parseBool = (v) => v === true || v === 'true';
const scrollToBottom = (behavior = 'auto') => { DOMElements.chatMessages.scrollTo({ top: DOMElements.chatMessages.scrollHeight, behavior }); };

const parseTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const parseImageFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const parsePdfFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!window.pdfjsLib) {
        return reject(new Error("PDF.js library is not loaded."));
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const pdfData = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(fullText);
      } catch (error) {
        console.error("Error parsing PDF: ", error);
        reject('Could not read the content of the PDF file.');
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};


// --- API STATUS UI HELPER (UNCHANGED) ---
let apiStatusTimer;
function showApiStatus(message, duration = 4000) {
    if (!DOMElements.apiStatusRow) return;
    clearTimeout(apiStatusTimer);
    DOMElements.apiStatusRow.textContent = message;
    DOMElements.apiStatusRow.classList.remove('hidden');
    if (duration > 0) {
        apiStatusTimer = setTimeout(() => {
            DOMElements.apiStatusRow.classList.add('hidden');
        }, duration);
    }
}


// --- FILE INPUT MANAGEMENT FUNCTIONS (UNCHANGED) ---
function updateFileInputUI() {
    const filePreviewContainer = document.getElementById('file-preview-container');
    const hasFiles = selectedFiles.length > 0;

    filePreviewContainer.style.display = hasFiles ? 'flex' : 'none';
    DOMElements.composer.classList.toggle('file-attached', hasFiles);

    DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function removeFile(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id !== fileId);
    const fileElement = document.getElementById(`file-preview-${fileId}`);
    if (fileElement) {
        fileElement.remove();
    }
    updateFileInputUI();
}

function resetFileInput() {
    selectedFiles = [];
    const filePreviewContainer = document.getElementById('file-preview-container');
    const fileUploadInput = document.getElementById('file-upload');

    if (filePreviewContainer) filePreviewContainer.innerHTML = '';
    if (fileUploadInput) fileUploadInput.value = '';

    updateFileInputUI();
}


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


// --- HELPER FUNCTIONS FOR CHAT CONTINUATION (UNCHANGED) ---
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
    const cancelBtn = modal.querySelector('.modal-close-btn');
    modal.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
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
    const cancelHandler = () => { cleanup(); };
    continueBtn.addEventListener('click', continueHandler, { once: true });
    newChatBtn.addEventListener('click', newChatHandler, { once: true });
    cancelBtn.addEventListener('click', cancelHandler, { once: true });
}

// --- PERSONALITY VIDEO PREVIEW LOGIC (UNCHANGED) ---
async function showPersonalityPreview(personality) {
    DOMElements.previewPersonalityName.textContent = `Preview: ${personality.name}`;
    DOMElements.previewVideo.src = personality.videoUrl;
    DOMElements.personalityPreviewModal.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
    DOMElements.previewVideo.play().catch(e => console.warn("Video autoplay failed:", e));

    return new Promise((resolve) => {
        const cleanup = (result) => {
            DOMElements.personalityPreviewModal.classList.add('hidden');
            DOMElements.previewVideo.pause();
            DOMElements.previewVideo.src = '';
            
            DOMElements.confirmPersonalitySwitchBtn.onclick = null;
            DOMElements.cancelPersonalitySwitchBtn.onclick = null;
            DOMElements.personalityPreviewModal.querySelector('.modal-close-btn').onclick = null;

            resolve(result);
        };
        
        DOMElements.confirmPersonalitySwitchBtn.onclick = () => cleanup(true);
        DOMElements.cancelPersonalitySwitchBtn.onclick = () => cleanup(false);
        DOMElements.personalityPreviewModal.querySelector('.modal-close-btn').onclick = () => cleanup(false);
    });
}

// --- ✅ [MODIFIED] Function to mark a personality as seen by the user ---
async function markPersonalityAsSeen(personalityId) {
    if (!state.userId || !personalityId) return;
    try {
        const userRef = doc(db, 'users', state.userId);
        // Atomically add the new personalityId to the 'seenPersonalities' array.
        // This is more robust than reading, modifying, and writing the array back.
        await updateDoc(userRef, {
            seenPersonalities: arrayUnion(personalityId)
        });
    } catch (error) {
        // If updateDoc fails (e.g., the document or field doesn't exist),
        // fall back to setDoc with merge to ensure the field is created.
        if (error.code === 'not-found' || error.message.includes("No document to update")) {
             await setDoc(doc(db, 'users', state.userId), {
                seenPersonalities: [personalityId]
             }, { merge: true });
        } else {
            console.error("Failed to mark personality as seen:", error);
        }
    }
}

// --- ✅ [MODIFIED] PERSONALITY SELECTION LOGIC ---
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

            // --- RE-ENGINEERED EVENT LISTENER LOGIC ---
            item.addEventListener('click', async () => {
                // If this personality is already active, just close the popup and do nothing.
                if (state.selectedPersonalityId === id) {
                    DOMElements.composerActionsPopup.classList.remove('show');
                    DOMElements.composerActionsBtn.classList.remove('active');
                    DOMElements.overlay.classList.remove('show');
                    return;
                }
                
                // Close the personality list immediately for a smoother UI experience.
                DOMElements.composerActionsPopup.classList.remove('show');
                DOMElements.composerActionsBtn.classList.remove('active');
                
                try {
                    // Fetch all necessary data upfront for efficiency.
                    const personalityDoc = await getDoc(doc(db, 'personalities', id));
                    if (!personalityDoc.exists()) {
                        console.error("Selected personality does not exist.");
                        DOMElements.overlay.classList.remove('show');
                        return;
                    }
                    const fullPersonalityData = personalityDoc.data();
                    
                    const userDoc = await getDoc(doc(db, 'users', state.userId));
                    const seenPersonalities = userDoc.exists() ? userDoc.data().seenPersonalities || [] : [];
                    
                    // Determine if the video preview is required.
                    const shouldShowPreview = fullPersonalityData.videoUrl && !seenPersonalities.includes(id);
                    
                    let userWantsToSwitch = true;
                    if (shouldShowPreview) {
                        // Show the preview and wait for the user's decision.
                        userWantsToSwitch = await showPersonalityPreview({
                            name: fullPersonalityData.name, 
                            videoUrl: fullPersonalityData.videoUrl
                        });
                    }

                    // If the user cancels the switch from the preview, halt the process.
                    if (!userWantsToSwitch) {
                        DOMElements.overlay.classList.remove('show');
                        return;
                    }

                    // --- If we reach this point, the user has confirmed the switch. ---

                    // If the preview was shown and confirmed, permanently mark it as seen.
                    if (shouldShowPreview) {
                        await markPersonalityAsSeen(id);
                    }

                    // Check for a previous chat session with this personality.
                    const lastSessionId = await findLastSessionForPersonality(id);
                    
                    if (lastSessionId) {
                        // If a session exists, prompt the user to continue or start over.
                        showContinuationPrompt(id, lastSessionId);
                    } else {
                        // If no session exists, start a new chat immediately.
                        DOMElements.overlay.classList.remove('show');
                        state.selectedPersonalityId = id;
                        localStorage.setItem('selectedPersonalityId', id);
                        document.querySelectorAll('.personality-item.active').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        startNewChat();
                    }

                } catch (error) {
                    console.error("Error handling personality selection:", error);
                    // Ensure the UI is in a clean state in case of an error.
                    DOMElements.overlay.classList.remove('show');
                }
            });

            DOMElements.personalityList.appendChild(item);
        });

        // Update default and selected personality state
        state.defaultPersonalityId = newDefaultPersonalityId;
        if (currentSelectedId === oldDefaultId || currentSelectedId === null) {
            state.selectedPersonalityId = newDefaultPersonalityId;
            if (newDefaultPersonalityId) {
                localStorage.setItem('selectedPersonalityId', newDefaultPersonalityId);
            } else {
                localStorage.removeItem('selectedPersonalityId');
            }
        }

        // Update the active class in the UI
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


// --- CORE LOGIC & SESSION MANAGEMENT (UNCHANGED) ---
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

// --- loadConfigLive (UNCHANGED) ---
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
      botConfig.promptSuggestions = Array.isArray(data?.promptSuggestions) ? data.promptSuggestions : [];
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
      try { state.triggerUnsub(); } catch(e){}
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

// --- subscribeSessions (UNCHANGED) ---
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

    const wasAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

    container.innerHTML = '';
    if (snap.empty) {
        const suggestions = (botConfig.promptSuggestions || []).slice(0, 6);
        let suggestionButtonsHTML = '';
        if (suggestions.length > 0) {
            suggestionButtonsHTML = suggestions.map(s =>
                `<button class="prompt-suggestion-btn" data-prompt="${sanitize(s.prompt)}">
                    <span class="prompt-title">${s.icon || ''} ${s.title}</span>
                </button>`
            ).join('');
        }
        container.innerHTML = `<div id="welcome-screen">
            <dotlottie-wc src="https://lottie.host/21d66b08-a3d6-4708-9843-5eacc664e174/Oxfbcz3F2M.lottie" style="width: 300px;height: 300px" speed="1" autoplay loop></dotlottie-wc>
            <h3>How can I help you today?</h3>
            ${suggestions.length > 0 ? `<div class="prompt-suggestions">${suggestionButtonsHTML}</div>` : ''}
            </div>`;
        container.querySelectorAll('.prompt-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptText = e.currentTarget.dataset.prompt;
                DOMElements.messageInput.value = promptText;
                DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));
                DOMElements.sendBtn.click();
            });
        });
        return;
    }

    const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      el.dataset.messageId = msg.id;

      const content = document.createElement('div');
      content.className = 'message-content';

      const imageRegex = /!\[Image for prompt: "([^"]+)"\]\(([^)]+)\)/;
      const imageMatch = (msg.text || '').match(imageRegex);
      const placeholderRegex = /^\[IMAGE_PLACEHOLDER_PROMPT:"([^"]+)"\]$/;
      const placeholderMatch = (msg.text || '').match(placeholderRegex);

      if (msg.sender === 'bot' && imageMatch) {
          const promptText = imageMatch[1];
          const imageUrl = imageMatch[2];
          content.innerHTML = `
              <p style="margin-bottom: 8px;">Here's the image for: <strong>${promptText}</strong></p>
              <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">
                  <img src="${imageUrl}" alt="Generated image for ${promptText}">
              </a>
          `;
      } else if (msg.sender === 'bot' && placeholderMatch) {
          const promptText = placeholderMatch[1];
          content.innerHTML = `
              <div class="image-placeholder">
                  <div class="spinner"></div>
                  <p>Generating an image of: <strong>${promptText}</strong></p>
              </div>`;
      } else {
          if (typeof marked !== 'undefined') {
            marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
            const rawHTML = marked.parse(msg.text || '');
            content.innerHTML = rawHTML;
          } else {
            content.textContent = msg.text || '';
          }
      }

      el.appendChild(content);

      if (msg.sender === 'bot' && !imageMatch && !placeholderMatch) {
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
    if (wasAtBottom) {
      scrollToBottom();
    }
  }, err => console.error('Messages snapshot error', err));
}

// --- USER TRACKING & OTHER SESSION MANAGEMENT (UNCHANGED) ---
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

// --- toggleSendButtonState (UNCHANGED) ---
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

// --- cancellableWait (UNCHANGED) ---
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
                resolve(true);
            }
            timeLeft--;
            if (countdownMessage) updateCountdown();
        }, 1000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            if (!autoRetryState.stopRequested) {
                resolve(false);
            }
        }, duration);
    });
}

// --- stopApiRequestLoop (UNCHANGED) ---
function stopApiRequestLoop() {
    if (autoRetryState.isActive) {
        autoRetryState.stopRequested = true;
        if (fetchController) {
            fetchController.abort();
        }
        console.log("User requested to stop the API request loop.");
    }
}

// --- makeApiRequest with Interruptible Auto-Scroll (UNCHANGED) ---
async function makeApiRequest(requestBody, apiKey, abortSignal) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${encodeURIComponent(apiKey)}`;
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

    let contentUpdated = false;
    let streamFinished = false;

    // Initialize auto-scroll check at the beginning of the stream
    const chatMessages = DOMElements.chatMessages;
    let autoScrollEnabled = (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 100);

    const renderLoop = () => {
        if (contentUpdated) {
            // Render content first
            botMessageContent.innerHTML = marked.parse(accumulatedBotReply + '<span class="typing-cursor"></span>');
            
            // Handle interruptible scrolling
            if (autoScrollEnabled) {
                // Re-check if the user is still near the bottom before scrolling
                if (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 100) {
                    scrollToBottom('auto'); // Use 'auto' for instant scrolling during streaming
                } else {
                    // User has scrolled up, so disable auto-scrolling for the rest of this message
                    autoScrollEnabled = false;
                }
            }
            contentUpdated = false;
        }

        if (!streamFinished) {
            requestAnimationFrame(renderLoop);
        } else {
            // Final render to remove the typing cursor
            botMessageContent.innerHTML = marked.parse(accumulatedBotReply);
            addCopyButtons(); // Re-apply copy buttons to the final content
            // Perform one final, smooth scroll if auto-scroll was never interrupted
            if (autoScrollEnabled) {
                scrollToBottom('smooth');
            }
        }
    };
    requestAnimationFrame(renderLoop);

    while (true) {
        if (abortSignal.aborted) {
            streamFinished = true;
            reader.cancel();
            throw new Error("Request stopped by user.");
        }
        const { value, done } = await reader.read();
        if (done) {
            streamFinished = true;
            break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('"text":')) {
                const textPart = line.substring(line.indexOf(':') + 2).replace(/",?$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
                accumulatedBotReply += textPart;
                contentUpdated = true;
            }
        }
    }
    return accumulatedBotReply;
}

// --- cleanupAfterLoop (UNCHANGED) ---
function cleanupAfterLoop() {
    autoRetryState.isActive = false;
    const text = DOMElements.messageInput.value.trim();
    if (text || selectedFiles.length > 0) {
        toggleSendButtonState('send');
    } else {
        toggleSendButtonState('mic');
    }
}

// --- generateAndReplaceImage (UNCHANGED) ---
async function generateAndReplaceImage(prompt, placeholderDocId) {
    try {
        const imageUrl = await handleImageGenerationWithCloudinary(prompt);
        const botMessageToSave = `![Image for prompt: "${prompt}"](${imageUrl})`;
        
        const placeholderDocRef = doc(db, 'chats', state.userId, state.sessionId, placeholderDocId);
        await updateDoc(placeholderDocRef, {
            text: botMessageToSave
        });
    } catch (error) {
        console.error("Async image generation/replacement failed:", error);
        const errorMessage = `⚠️ Sorry, I couldn't create that image. Reason: ${error.message}`;
        
        const placeholderDocRef = doc(db, 'chats', state.userId, state.sessionId, placeholderDocId);
        await updateDoc(placeholderDocRef, {
            text: errorMessage
        });
    }
}


// --- executeApiRequestLoop (UNCHANGED) ---
async function executeApiRequestLoop() {
    autoRetryState.isActive = true;
    autoRetryState.stopRequested = false;
    fetchController = new AbortController();
    toggleSendButtonState('stop');

    const MASTER_TIMEOUT = 90000;
    const startTime = Date.now();
    let finalAccumulatedReply = '';
    let success = false;

    while (Date.now() - startTime < MASTER_TIMEOUT && !autoRetryState.stopRequested) {
        const keyCount = apiKeyManager.keys.length;
        if (keyCount === 0) {
            showApiStatus("⚠️ No API keys available. Retrying...", -1); 
            if (await cancellableWait(10000)) break;
            continue;
        }

        for (let i = 0; i < keyCount; i++) {
            if (autoRetryState.stopRequested) break;

            const currentKeyInfo = apiKeyManager.getCurrentKey();
            await updateLiveStatus(currentKeyInfo.id);
            showApiStatus(`⚡️ Using API Key #${currentKeyInfo.index + 1}...`, -1);

            try {
                finalAccumulatedReply = await makeApiRequest(autoRetryState.requestPayload, currentKeyInfo.key, fetchController.signal);
                success = true;
                break; 
            } catch (err) {
                if (err.name === 'AbortError') break; 
                console.error(`Attempt on key #${currentKeyInfo.index + 1} failed: ${err.message}`);
                await reportKeyFailure(currentKeyInfo.id);
            }

            if (autoRetryState.stopRequested) break;
            
            const nextKeyInfo = apiKeyManager.switchToNextKey();
            if (nextKeyInfo) {
                showApiStatus(`Key #${currentKeyInfo.index + 1} failed. Switching to Key #${nextKeyInfo.index + 1}...`, 2000);
                if (await cancellableWait(2000)) break;
            }
        }

        if (success || autoRetryState.stopRequested) {
            break; 
        }
    }

    const { botMessageGroup } = autoRetryState.botMessageElements;
    DOMElements.apiStatusRow.classList.add('hidden'); 
    DOMElements.statusRow.textContent = '';
    
    if (success) {
        apiKeyManager.recordUsage(apiKeyManager.getCurrentKey().id);
        botMessageGroup.remove();
        
        const imageCommandRegex = /\[\s*"?'?generate_image'?"?\s*[:\s]+"?([\s\S]*?)"?\s*\]/s;
        const match = finalAccumulatedReply.match(imageCommandRegex);
        
        if (match && match[1]) {
            const followUpText = finalAccumulatedReply.replace(match[0], '').trim();
            let prompt = match[1].trim();
            if ((prompt.startsWith('"') && prompt.endsWith('"')) || (prompt.startsWith("'") && prompt.endsWith("'"))) {
                prompt = prompt.substring(1, prompt.length - 1);
            }

            if (followUpText) {
                await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
                    text: followUpText, sender: 'bot', createdAt: new Date()
                });
            }

            const placeholderText = `[IMAGE_PLACEHOLDER_PROMPT:"${prompt}"]`;
            const placeholderDocRef = await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
                text: placeholderText, sender: 'bot', createdAt: new Date()
            });

            generateAndReplaceImage(prompt, placeholderDocRef.id);

        } else {
            await addDoc(collection(db, 'chats', state.userId, state.sessionId), { 
                text: finalAccumulatedReply, sender: 'bot', createdAt: new Date() 
            });
        }
    } else {
        if (autoRetryState.stopRequested) {
            DOMElements.statusRow.textContent = 'Request stopped by user.';
            botMessageGroup.remove();
        } else {
            const finalErrorMsg = "⚠️ Could not get your request. The server took too long to respond. Please try again later.";
            DOMElements.statusRow.textContent = finalErrorMsg;
            botMessageGroup.querySelector('.message-content').innerHTML = finalErrorMsg;
            botMessageGroup.classList.remove('streaming'); 
        }
    }

    cleanupAfterLoop();
}

// --- sendMessage (UNCHANGED) ---
async function sendMessage() {
    const text = sanitize(DOMElements.messageInput.value);

    if (autoRetryState.isActive) return;
    if (!text && selectedFiles.length === 0) return;

    toggleSendButtonState('stop');
    DOMElements.statusRow.textContent = '';
    DOMElements.messageInput.value = '';
    autosize(DOMElements.messageInput);

    const filesToProcess = [...selectedFiles];
    resetFileInput();

    try {
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

        let userMessageForUI = text;
        let fileSummaryForUI = '';
        const userMessageParts = [{ text }];

        if (filesToProcess.length > 0) {
            DOMElements.statusRow.textContent = `Processing ${filesToProcess.length} file(s)...`;
            for (const fileWrapper of filesToProcess) {
                const file = fileWrapper.file;
                let content = '';
                let fileTypeLabel = 'FILE';
                let status = 'unreadable';

                if (file.type.startsWith('image/')) {
                    const base64 = await parseImageFile(file);
                    userMessageParts.push({ inline_data: { mime_type: file.type, data: base64 } });
                    fileSummaryForUI += `🖼️ ${file.name}\n`;
                    status = 'processed_visual'; // Special status for images
                } else if (file.type.startsWith('text/')) {
                    content = await parseTextFile(file);
                    fileTypeLabel = 'TEXT FILE';
                    status = 'processed_text';
                    fileSummaryForUI += `📄 ${file.name}\n`;
                } else if (file.type === 'application/pdf') {
                    content = await parsePdfFile(file);
                    fileTypeLabel = 'PDF';
                    status = 'processed_text';
                    fileSummaryForUI += `📄 ${file.name}\n`;
                } else {
                    fileSummaryForUI += `❓ ${file.name}\n`; // File type is not processable
                }

                if (status === 'processed_text') {
                    userMessageParts[0].text += `\n\n--- ${fileTypeLabel}: ${file.name} ---\n${content}\n--- END ${fileTypeLabel} ---`;
                } else if (status === 'unreadable') {
                    userMessageParts[0].text += `\n\n[System note: User uploaded a file named "${file.name}" of type "${file.type || 'unknown'}", but its content cannot be read.]`;
                }
            }
            userMessageForUI = fileSummaryForUI.trim() + (text ? `\n\n${text}` : '');
        }
        DOMElements.statusRow.textContent = ``;

        const handleResult = await handleUserMessage(userMessageForUI);
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

        const systemInstruction = {
            role: 'user',
            parts: [{
                text: `${activePersonaInstructions}\n\n---**SYSTEM INSTRUCTIONS:**\n` +
                "You have a tool to generate images. To use it, you MUST respond with the special command `[generate_image: A detailed description of the image to create]`. **After you output this command, you MUST provide a follow-up message on a new line describing the image you've just requested.** The system will handle displaying the image and your text comment separately. For example, if the user says 'make a picture of a dragon', your entire response should be:\n`[generate_image: A majestic fantasy dragon with shimmering scales, breathing fire, perched on a mountain peak]`\nOf course! Here is the image of the majestic dragon you asked for. It's perched high on a mountain, breathing a plume of fire." +
                "\n\nFor all other requests, provide clear, readable, and well-structured answers. ALWAYS format your responses using Markdown. This is mandatory.\n- Use headings, bullet points, and numbered lists.\n- Use bold text for key terms.\n- Use code blocks for code snippets.\n---"
            }]
        };

        const imageMarkdownRegex = /!\[Image for prompt: "([^"]+)"\]\(([^)]+)\)/;
        const historyContents = snaps.docs.map(d => {
            const data = d.data();
            const role = data.sender === 'user' ? 'user' : 'model';
            let messageText = data.text;
            
            const imageMatch = messageText.match(imageMarkdownRegex);
            if (role === 'model' && imageMatch) {
                const prompt = imageMatch[1];
                const imageUrl = imageMatch[2];
                messageText = `[System: You have successfully generated an image for the prompt "${prompt}". The image is available at this URL: ${imageUrl}. The user can see it now. You can describe the image or ask if they want modifications.]`;
            }
            
            return { role, parts: [{ text: messageText }] };
        });
        
        if (historyContents.length > 0) {
            historyContents[historyContents.length - 1].parts = userMessageParts;
        }
        
        autoRetryState.requestPayload = { contents: [systemInstruction, {role: 'model', parts: [{text: "Understood."}]}, ...historyContents] };
        autoRetryState.botMessageElements = { botMessageGroup, botMessageEl, botMessageContent };

        executeApiRequestLoop();

    } catch (err) {
        console.error('sendMessage preparation error', err);
        DOMElements.statusRow.textContent = '⚠️ Error: ' + (err.message || 'Could not prepare message.');
        cleanupAfterLoop();
    }
}


// --- handleImageGenerationWithCloudinary (UNCHANGED) ---
async function handleImageGenerationWithCloudinary(prompt) {
    const CLOUDINARY_CLOUD_NAME = "dvjs45kft";
    const CLOUDINARY_UPLOAD_PRESET = "vevapvkv";
    let stabilityApiKey = '';

    try {
        const configSnap = await getDoc(doc(db, 'config', 'global'));
        if (configSnap.exists()) {
            const apiKeys = configSnap.data().apiKeys || {};
            const imageKeyEntry = Object.values(apiKeys).find(k => k.type === 'image' && k.enabled !== false);
            if (imageKeyEntry && imageKeyEntry.key) {
                stabilityApiKey = imageKeyEntry.key;
            }
        }
        if (!stabilityApiKey) {
            throw new Error("No enabled Image API key found from my end.");
        }

        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = 'https://api.stability.ai';
        const apiKey = stabilityApiKey;

        const response = await fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                steps: 30,
                samples: 1,
            }),
        });

        if (!response.ok) {
            let errorDetails = `(Status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorDetails = errorData.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetails = response.statusText;
            }
            throw new Error(`The image service returned an error: ${errorDetails}`);
        }

        const responseJSON = await response.json();
        const imageBase64 = responseJSON.artifacts[0].base64;

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const formData = new FormData();
        formData.append('file', `data:image/png;base64,${imageBase64}`);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const cloudinaryResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
        });

        if (!cloudinaryResponse.ok) {
            throw new Error('Failed to upload the image.');
        }

        const cloudinaryData = await cloudinaryResponse.json();
        return cloudinaryData.secure_url;

    } catch (error) {
        console.error("Image generation process failed:", error);
        throw error;
    }
}

// --- SESSION MANAGEMENT & EVENT LISTENERS (UNCHANGED) ---
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
let recognition;
DOMElements.messageInput.addEventListener('input', () => {
  autosize(DOMElements.messageInput);
  if (autoRetryState.isActive) return;
  const text = DOMElements.messageInput.value.trim();
  if (text || selectedFiles.length > 0) {
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
  if (text || selectedFiles.length > 0) sendMessage();
  else if (recognition) recognition.start();
});
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

// --- NEW USER TOUR LOGIC (UNCHANGED) ---
const tourManager = {
    steps: [
        {
            element: '#sidebar',
            title: 'Welcome to Chaka!',
            text: 'This is your chat history sidebar. All your conversations will be saved here for easy access.'
        },
        {
            element: '#new-chat-sidebar-btn',
            title: 'Start a New Chat',
            text: 'Click here anytime to start a fresh conversation.'
        },
        {
            element: '#composer-actions-btn',
            title: 'Personalities & Files',
            text: 'Use this button to switch between different AI personalities or to upload a file for the AI to read.'
        },
        {
            element: '#message-input',
            title: 'Start Talking!',
            text: 'Type your message here and press the send button. That\'s it! Enjoy your chat.'
        }
    ],
    currentStep: 0,
    start() { 
        DOMElements.tourOverlay.classList.remove('hidden');
        this.currentStep = 0;
        this.showStep(this.currentStep);
    },
    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;
        
        this.currentStep = index;
        const step = this.steps[index];
        const targetElement = document.querySelector(step.element);
        
        if (window.innerWidth <= 900) {
            const isSidebarStep = step.element === '#sidebar' || step.element === '#new-chat-sidebar-btn';
            if (isSidebarStep) {
                DOMElements.sidebar.classList.add('open');
            } else {
                DOMElements.sidebar.classList.remove('open');
            }
        }

        DOMElements.tourTitle.textContent = step.title;
        DOMElements.tourText.textContent = step.text;
        DOMElements.tourStepCounter.textContent = `${index + 1} / ${this.steps.length}`;
        
        setTimeout(() => {
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                
                if (rect.width === 0 && rect.height === 0) {
                    this.end();
                    return;
                }
                
                DOMElements.tourSpotlight.style.width = `${rect.width + 16}px`;
                DOMElements.tourSpotlight.style.height = `${rect.height + 16}px`;
                DOMElements.tourSpotlight.style.top = `${rect.top - 8}px`;
                DOMElements.tourSpotlight.style.left = `${rect.left - 8}px`;

                const rLeft = rect.left - 8;
                const rTop = rect.top - 8;
                const rRight = rect.right + 8;
                const rBottom = rect.bottom + 8;

                const clipPathPolygon = `polygon(
                    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                    ${rLeft}px ${rTop}px,
                    ${rLeft}px ${rBottom}px,
                    ${rRight}px ${rBottom}px,
                    ${rRight}px ${rTop}px,
                    ${rLeft}px ${rTop}px
                )`;
                DOMElements.tourOverlay.style.clipPath = clipPathPolygon;

                const tooltipEl = DOMElements.tourTooltip;
                const tooltipRect = tooltipEl.getBoundingClientRect();

                if ((window.innerHeight - rect.bottom) > tooltipRect.height + 20) {
                    tooltipEl.style.top = `${rect.bottom + 10}px`;
                    tooltipEl.style.transform = 'translateY(0)';
                }
                else if (rect.top > tooltipRect.height + 20) {
                    tooltipEl.style.top = `${rect.top - 10}px`;
                    tooltipEl.style.transform = 'translateY(-100%)';
                }
                else {
                    tooltipEl.style.top = `50%`;
                    tooltipEl.style.transform = 'translateY(-50%)';
                }

                let leftPos = rect.left;
                if (leftPos + tooltipRect.width > window.innerWidth) {
                    leftPos = window.innerWidth - tooltipRect.width - 20;
                }
                tooltipEl.style.left = `${Math.max(20, leftPos)}px`;
            }
        }, 350); 
        
        DOMElements.tourPrevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
        DOMElements.tourNextBtn.style.display = index === this.steps.length - 1 ? 'none' : 'inline-flex';
        DOMElements.tourFinishBtn.style.display = index === this.steps.length - 1 ? 'inline-flex' : 'none';
    },
    next() { this.showStep(this.currentStep + 1); },
    prev() { this.showStep(this.currentStep - 1); },
    async end() { 
        DOMElements.tourOverlay.classList.add('hidden');
        if (window.innerWidth <= 900) {
            DOMElements.sidebar.classList.remove('open');
        }
        DOMElements.tourOverlay.style.clipPath = '';
        if (state.userId) {
            try {
                const userRef = doc(db, 'users', state.userId);
                await setDoc(userRef, { tourCompleted: true }, { merge: true });
            } catch (error) {
                console.error("Failed to save tour completion status:", error);
            }
        }
    }
};

// --- Function to check if the tour should be offered (UNCHANGED) ---
async function checkAndStartTour() {
    if (!state.userId) return;
    try {
        const userRef = doc(db, 'users', state.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && !userSnap.data().tourCompleted) {
            setTimeout(() => {
                DOMElements.welcomeTourModal.classList.remove('hidden');
                DOMElements.overlay.classList.add('show');
            }, 5000);
        }
    } catch (error) {
        console.error("Error checking tour status:", error);
    }
}


// --- INIT FUNCTION (UNCHANGED) ---
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
  
  await checkAndStartTour();

  subscribeSessions();
  if (state.sessionId) {
    const snap = await getDoc(doc(db,'sessions',state.userId,'items',state.sessionId));
    state.firstMessageSaved = snap.exists();
    subscribeMessages();
    await checkSessionWasPreviouslyBlocked();
  } else {
    startNewChat();
  }
  DOMElements.menuBtn.addEventListener('click', () => {
    DOMElements.sidebar.classList.toggle('open');
    DOMElements.overlay.classList.toggle('show');
  });
  DOMElements.overlay.addEventListener('click', () => {
      DOMElements.sidebar.classList.remove('open');
      DOMElements.composerActionsPopup.classList.remove('show');
      DOMElements.composerActionsBtn.classList.remove('active');
      DOMElements.overlay.classList.remove('show');
      DOMElements.welcomeTourModal.classList.add('hidden');
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

  // --- Multi-File Input Logic (UNCHANGED) ---
  const fileUploadInput = document.getElementById('file-upload');
  const filePreviewContainer = document.getElementById('file-preview-container');
  
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', (e) => {
      DOMElements.composerActionsPopup.classList.remove('show');
      DOMElements.composerActionsBtn.classList.remove('active');
      DOMElements.overlay.classList.remove('show');

      for (const file of e.target.files) {
        const fileId = Date.now() + Math.random();
        selectedFiles.push({ id: fileId, file: file });

        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.id = `file-preview-${fileId}`;

        let preview;
        if (file.type.startsWith('image/')) {
          preview = document.createElement('img');
          preview.className = 'file-preview-thumbnail';
          preview.src = URL.createObjectURL(file);
          preview.onload = () => URL.revokeObjectURL(preview.src); // Clean up memory
        } else {
          preview = document.createElement('div');
          preview.className = 'file-preview-icon';
          // Check if file is readable (text or pdf) vs unreadable
          if (file.type.startsWith('text/') || file.type === 'application/pdf') {
            preview.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V8.188a2.625 2.625 0 0 0-.77-1.851l-4.439-4.44a2.625 2.625 0 0 0-1.851-.77H5.625ZM15 3.375v3.75h3.75a.375.375 0 0 1-.11.26l-4.44 4.439a.375.375 0 0 1-.26.11h-3.75A.375.375 0 0 1 9.75 11.5v-3.75a.375.375 0 0 1 .11-.26l4.44-4.44a.375.375 0 0 1 .26-.11Z"/></svg>`;
          } else {
            preview.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.824 0-1.488.664-1.488 1.488s.664 1.488 1.488 1.488 1.488-.664 1.488-1.488-.664-1.488-1.488-1.488Zm-1.875 8.313a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /></svg>`;
          }
        }
        
        const name = document.createElement('span');
        name.className = 'file-preview-name';
        name.textContent = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove file';
        removeBtn.onclick = () => removeFile(fileId);

        item.appendChild(preview);
        item.appendChild(name);
        item.appendChild(removeBtn);
        filePreviewContainer.appendChild(item);
      }
      
      e.target.value = '';
      updateFileInputUI();
    });
  }

  DOMElements.messageInput.dispatchEvent(new Event('input', { bubbles: true }));

  DOMElements.tourNextBtn.addEventListener('click', () => tourManager.next());
  DOMElements.tourPrevBtn.addEventListener('click', () => tourManager.prev());
  DOMElements.tourFinishBtn.addEventListener('click', () => tourManager.end());
  
  DOMElements.startTourBtn.addEventListener('click', () => {
      DOMElements.welcomeTourModal.classList.add('hidden');
      DOMElements.overlay.classList.remove('show');
      tourManager.start();
  });
  DOMElements.skipTourBtn.addEventListener('click', () => {
      DOMElements.welcomeTourModal.classList.add('hidden');
      DOMElements.overlay.classList.remove('show');
      tourManager.end();
  });
};

init();
