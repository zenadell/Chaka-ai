// --- FIREBASE IMPORTS & CONFIG ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, updateDoc, getDocs, writeBatch, where, limit, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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
const auth = getAuth(app); // Firebase Auth instance

// --- PDF.js WORKER SETUP ---
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
}

// --- ✅ [MODIFIED] DOM ELEMENTS (Added Toast Container & Continue Button) ---
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
  
  clearHistoryBtn: document.getElementById('clear-history-btn'), // ID is same, but moved
  signOutBtn: document.getElementById('sign-out-btn'), // ID is same, but moved
  
  // ✅ [NEW] User Profile Elements
  userAvatar: document.getElementById('user-avatar'),
  userDisplayName: document.getElementById('user-display-name'),
  userEmail: document.getElementById('user-email'),
  userSettingsBtn: document.getElementById('user-settings-btn'),
  userSettingsPopup: document.getElementById('user-settings-popup'),
  themeText: document.getElementById('theme-text'),
  composerActionsBtn: document.getElementById('composer-actions-btn'),
  composerActionsPopup: document.getElementById('composer-actions-popup'),
  personalityList: document.getElementById('personality-list'),
  fileUploadWrapper: document.getElementById('file-upload-wrapper'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  statusRow: document.getElementById('status-row'),
  themeToggle: document.getElementById('theme-toggle'), // ID is same, but moved
  themeIcon: document.getElementById('theme-icon-popup'), // ✅ [MODIFIED] ID updated to new popup icon
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
  announcementPopup: document.getElementById('announcement-popup'),
  announcementMedia: document.getElementById('announcement-media'),
  announcementTitle: document.getElementById('announcement-title'),
  announcementDescription: document.getElementById('announcement-description'),
  announcementReadMoreBtn: document.getElementById('announcement-read-more-btn'),
  announcementCloseBtn: document.getElementById('announcement-close-btn'),
  announcementDetailsModal: document.getElementById('announcement-details-modal'),
  announcementDetailsContent: document.getElementById('announcement-details-content'),
  announcementDetailsCloseBtn: document.getElementById('announcement-details-close-btn'),
  exportModal: document.getElementById('export-modal'),
  exportPdfBtn: document.getElementById('export-pdf-btn'),
  exportTxtBtn: document.getElementById('export-txt-btn'),
  exportCloseBtn: document.getElementById('export-close-btn'),
  exportConfirmationModal: document.getElementById('export-confirmation-modal'),
  exportConfirmationMessage: document.getElementById('export-confirmation-message'),
  viewExportedFileBtn: document.getElementById('view-exported-file-btn'),
  // ✨ [CORRECTED] Changed ID to be unique.
  exportConfirmationContinueBtn: document.getElementById('export-continue-chat-btn'),
  // ✨ [MODIFIED] No longer using the full-screen loading modal for PDFs
  exportLoadingModal: document.getElementById('export-loading-modal'),
  exportLoadingText: document.getElementById('export-loading-text'),
  // ✨ [NEW] Toast notification container (requires HTML element)
  toastContainer: document.getElementById('toast-container'), 
};

// --- ✅ [NEW] CONSTANTS FOR LOADER & ICONS ---
const LOADER_SVG_ICON = `<svg class="toast-loader-svg" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
const PDF_LINK_LOADER_ICON = `<svg class="link-loader-svg" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
const PDF_LINK_SUCCESS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>`;
const PDF_LINK_ERROR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>`;


// --- ✅ [NEW] NON-BLOCKING TOAST NOTIFICATION SYSTEM ---
/**
 * Displays a non-blocking toast notification.
 * @param {object} options - The options for the toast.
 * @param {string} options.message - The message to display.
 * @param {string} [options.icon=''] - The SVG icon string.
 * @param {number} [options.duration=7000] - Duration in ms before auto-closing.
 * @param {string} [options.type='info'] - Type of toast ('info', 'error', 'success').
 */
function showToastNotification({ message, icon = '', duration = 8000, type = 'info' }) {
    if (!DOMElements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    // Added entering animation
    toast.classList.add('entering');

    toast.innerHTML = `
        ${icon ? `<div class="toast-icon">${icon}</div>` : ''}
        <div class="toast-message">${message}</div>
        <button class="toast-close-btn" title="Close">&times;</button>
    `;

    DOMElements.toastContainer.appendChild(toast);

    const close = () => {
        toast.classList.add('exiting');
        // I Remove the element after the exit animation completes
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    };

    toast.querySelector('.toast-close-btn').onclick = close;
    setTimeout(close, duration);

    // I Remove entering class after animation so it doesn't conflict with exiting
    toast.addEventListener('animationend', () => {
        toast.classList.remove('entering');
    }, { once: true });
}


// --- ✅ [MODIFIED] APPLICATION STATE (Added messageIdToExport) ---
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
  subtleNoteShown: false,
  announcementUnsub: null,
  currentAnnouncement: null,
  elementToExport: null,
  messageIdToExport: null, // ✨ [NEW] Store message ID for manual exports
  lastExportedFile: null, 
};

// --- ✨ [NEW] IN-SESSION CACHE FOR GENERATED FILES ---
const exportedFileCache = new Map();

// --- STATE FOR AUTOMATED API RETRY PROCESS ---
let autoRetryState = {
    isActive: false,
    stopRequested: false,
    requestPayload: null,
    botMessageElements: null
};
let fetchController;

// --- GLOBAL STATE FOR MULTIPLE FILE UPLOADS ---
let selectedFiles = []; 

// --- TTS (TEXT-TO-SPEECH) PLAYBACK STATE ---
let currentAudio = null;
let currentTtsButton = null;

// --- botConfig with TTS properties ---
let botConfig = {
  botName: "AI Bot",
  themeColor: "#4F46E5",
  allowFileUpload: false,
  apiKey: "",
  apiKeys: {},
  ttsApiKey: null,
  ttsVoiceId: "JBFqnCBsd6RMkjVDRZzb",
  persona: "",
  botBubbleColor: "",
  userBubbleColor: "linear-gradient(135deg, #10b981, #059669)",
  active: true,
  profileImage: "",
  showSubtleNotes: true,
  blockReminderNote: "",
  promptSuggestions: []
};

// --- ✨ [MODIFIED] Full-screen loading modal (Now only for TXT) ---
function showExportLoadingModal(message = 'Processing...') {
    if (!DOMElements.exportLoadingModal) return;
    DOMElements.exportLoadingText.textContent = message;
    DOMElements.exportLoadingModal.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
}

function hideExportLoadingModal() {
    if (!DOMElements.exportLoadingModal) return;
    DOMElements.exportLoadingModal.classList.add('hidden');
    const isAnotherModalOpen = !DOMElements.exportConfirmationModal.classList.contains('hidden');
    if (!isAnotherModalOpen) {
      DOMElements.overlay.classList.remove('show');
    }
}

// --- EXPORT CONFIRMATION LOGIC ---
function showExportConfirmationModal(fileType, fileUrl) {
    if (!DOMElements.exportConfirmationModal) return;

    state.lastExportedFile = { type: fileType, url: fileUrl };
    DOMElements.exportConfirmationMessage.textContent = `${fileType} file has been successfully created.`;
    DOMElements.exportConfirmationModal.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
}

function hideExportConfirmationModal() {
    if (!DOMElements.exportConfirmationModal) return;
    
    // ✨ [REMOVED] Blob URLs are no longer stored here long-term
    // Cloudinary URLs don't need to be revoked.
    state.lastExportedFile = null;
    DOMElements.exportConfirmationModal.classList.add('hidden');

    const isAnotherModalOpen = !DOMElements.personalityPreviewModal.classList.contains('hidden') ||
                               !document.getElementById('continuation-modal').classList.contains('hidden') ||
                               !DOMElements.welcomeTourModal.classList.contains('hidden') ||
                               !DOMElements.announcementPopup.classList.contains('hidden') ||
                               !DOMElements.exportModal.classList.contains('hidden');
    if (!isAnotherModalOpen) {
        DOMElements.overlay.classList.remove('show');
    }
}


// --- ✅ [MODIFIED] EXPORT/DOWNLOAD LOGIC ---
function showExportModal(contentElement, messageId = null) {
    state.elementToExport = contentElement;
    state.messageIdToExport = messageId; // ✨ [NEW] Store message ID
    DOMElements.exportModal.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
}

function hideExportModal() {
    state.elementToExport = null;
    state.messageIdToExport = null; // ✨ [NEW] Clear message ID
    DOMElements.exportModal.classList.add('hidden');
    const isAnotherModalOpen = !DOMElements.personalityPreviewModal.classList.contains('hidden') ||
                               !document.getElementById('continuation-modal').classList.contains('hidden') ||
                               !DOMElements.welcomeTourModal.classList.contains('hidden') ||
                               !DOMElements.announcementPopup.classList.contains('hidden');
    if (!isAnotherModalOpen) {
        DOMElements.overlay.classList.remove('show');
    }
}

// TXT export remains largely the same as it's fast.
async function exportAsTxt(contentElement, triggerDownload = true) {
    if (!contentElement) return null;
    showExportLoadingModal('Generating TXT...'); // Uses fast modal
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const textContent = contentElement.innerText || contentElement.textContent;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        if (triggerDownload) {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chat-export.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up blob URL after download
        }
        
        hideExportModal();
        return url; 
    } catch (error) {
        console.error("TXT export process failed:", error);
        alert("Sorry, there was an error creating the text file.");
        return null;
    } finally {
        hideExportLoadingModal();
    }
}


// this is for my web search ability

/**
 * ✅ [MODIFIED] It now Performs a web search using the Serper.dev API.
 * @param {string} query The search query.
 * @param {string} apiKey The Serper API key.
 * @returns {Promise<string>} A formatted string of search results or an error message.
 */
async function performWebSearch(query, apiKey) {
    console.log(`Performing web search for: "${query}"`);
    
    if (!apiKey) {
        console.error("Web search failed: Serper API key is missing.");
        return `[INTERNAL_ERROR] The web search failed because the API key is not configured.`;
    }
    
    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: query })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Serper API Error Response:", errorBody);
            throw new Error(`Serper API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.organic || data.organic.length === 0) {
            return "No good search results found.";
        }
        
        // Format the results cleanly for chaka AI model 
        let formattedResults = "Here are the web search results:\n\n";
        data.organic.slice(0, 5).forEach((result, index) => {
            formattedResults += `[Result ${index + 1}]\n`;
            formattedResults += `Title: ${result.title}\n`;
            formattedResults += `Link: ${result.link}\n`;
            formattedResults += `Snippet: ${result.snippet}\n\n`;
        });
        
        return formattedResults;

    } catch (error) {
        console.error("Web search failed:", error);
        return `[INTERNAL_ERROR] The web search failed with the error: ${error.message}`;
    }
}





/**
 * ✅ [UPDATED] IT Generates a PDF, uploads it to Cloudinary for persistence, caches it, and returns the URL.
 * @param {HTMLElement} contentElement The element to export.
 * @param {string|null} messageId The ID of the message for caching purposes.
 * @returns {Promise<string>} The permanent Cloudinary URL of the generated PDF.
 */
async function exportAsPdf(contentElement, messageId = null) {
    if (!contentElement) {
        throw new Error("Content element for PDF export not found.");
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const { jsPDF } = window.jspdf;
        const theme = DOMElements.body.dataset.theme;
        const originalBg = contentElement.parentElement.style.backgroundColor;
        const originalColor = contentElement.style.color;
        
        if (theme === 'dark') {
            contentElement.parentElement.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-dark');
            contentElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary-dark');
        } else {
            contentElement.parentElement.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-light');
            contentElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary-light');
        }
        
        const canvas = await html2canvas(contentElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: (theme === 'dark' ? '#303030' : '#faf9f7'),
            onclone: (doc) => {
                doc.querySelectorAll('.message-content a').forEach(link => {
                    link.style.color = '#4f46e5'; 
                });
            }
        });

        contentElement.parentElement.style.backgroundColor = originalBg;
        contentElement.style.color = originalColor;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        const blob = pdf.output('blob');
        const pdfFile = new File([blob], `chat-export-${Date.now()}.pdf`, { type: 'application/pdf' });

        // Upload to Cloudinary to get a permanent URL, specifying 'raw' for non-media files.
        const url = await uploadFileToCloudinary(pdfFile, 'raw');
        
        // Cache the permanent URL against the message ID.
        if (messageId) {
            exportedFileCache.set(messageId, url);
        }
        
        return url; // Return the permanent URL on success
        
    } catch (err) {
        console.error("PDF export process failed:", err);
        throw err;
    }
}


// --- ANNOUNCEMENT LOGIC ---
function closeAnnouncementModals() {
    if (DOMElements.announcementPopup) DOMElements.announcementPopup.classList.add('hidden');
    if (DOMElements.announcementDetailsModal) DOMElements.announcementDetailsModal.classList.add('hidden');
    
    const isAnotherModalOpen = !DOMElements.personalityPreviewModal.classList.contains('hidden') ||
                               !document.getElementById('continuation-modal').classList.contains('hidden') ||
                               !DOMElements.exportModal.classList.contains('hidden') || 
                               !DOMElements.exportConfirmationModal.classList.contains('hidden') || 
                               !DOMElements.welcomeTourModal.classList.contains('hidden');
    if (!isAnotherModalOpen) {
        DOMElements.overlay.classList.remove('show');
    }
}
function showAnnouncementDetails(announcement) {
    if (!DOMElements.announcementDetailsModal || !announcement) return;
    DOMElements.announcementDetailsContent.innerHTML = marked.parse(announcement.fullContent || 'No details available.');
    DOMElements.announcementDetailsModal.classList.remove('hidden');
    if (DOMElements.announcementPopup) DOMElements.announcementPopup.classList.add('hidden');
    DOMElements.overlay.classList.add('show');
}
function showAnnouncementPopup(announcement) {
    if (!DOMElements.announcementPopup || !announcement) return;
    state.currentAnnouncement = announcement;

    DOMElements.announcementTitle.textContent = announcement.title || 'Announcement';
    DOMElements.announcementDescription.textContent = announcement.description || '';

    DOMElements.announcementMedia.innerHTML = '';
    let mediaElement;
    if (announcement.mediaType === 'video' && announcement.mediaUrl) {
        mediaElement = document.createElement('video');
        mediaElement.src = announcement.mediaUrl;
        mediaElement.autoplay = true;
        mediaElement.muted = true;
        mediaElement.loop = true;
        mediaElement.playsInline = true;
    } else if (announcement.mediaType === 'image' && announcement.mediaUrl) {
        mediaElement = document.createElement('img');
        mediaElement.src = announcement.mediaUrl;
        mediaElement.alt = announcement.title || 'Announcement Image';
    }
    
    if (mediaElement) {
        DOMElements.announcementMedia.appendChild(mediaElement);
        DOMElements.announcementMedia.classList.remove('hidden');
    } else {
        DOMElements.announcementMedia.classList.add('hidden');
    }
    DOMElements.announcementPopup.classList.remove('hidden');
    DOMElements.overlay.classList.add('show');
}
function handleAnnouncementData(announcement) {
    if (!announcement || !announcement.isActive || !announcement.id) {
        return;
    }
    const shownThisSession = sessionStorage.getItem('announcementShownThisSession') === announcement.id;
    if (shownThisSession) {
        return;
    }
    const viewCountKey = `announcement_views_${announcement.id}`;
    let viewCount = parseInt(localStorage.getItem(viewCountKey) || '0');
    if (viewCount >= 3) {
        return;
    }
    setTimeout(() => {
        showAnnouncementPopup(announcement);
        viewCount++;
        localStorage.setItem(viewCountKey, viewCount.toString());
        sessionStorage.setItem('announcementShownThisSession', announcement.id);
    }, 5000);
}
function initAnnouncementListener() {
    if (state.announcementUnsub) state.announcementUnsub();

    const announcementRef = doc(db, 'announcements', 'latest');
    state.announcementUnsub = onSnapshot(announcementRef, (docSnap) => {
        if (docSnap.exists()) {
            handleAnnouncementData(docSnap.data());
        }
    }, (error) => {
        console.error("Error listening to announcements:", error);
    });
}


// --- API KEY MANAGEMENT ---
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

// --- LIVE STATUS REPORTING ---
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

// --- UTILITIES ---
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


// --- API STATUS UI HELPER ---
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

// --- ✅ [MODIFIED] UPLOAD GENERIC FILE TO CLOUDINARY ---
async function uploadFileToCloudinary(file, resourceType = 'auto') {
    const CLOUDINARY_CLOUD_NAME = "dvjs45kft";
    const CLOUDINARY_UPLOAD_PRESET = "vevapvkv";
    // Use the generic 'upload' endpoint which auto-detects resource type
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to upload to Cloudinary.');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw error;
    }
}


// --- FILE INPUT MANAGEMENT FUNCTIONS ---
function checkSendButtonState() {
    if (autoRetryState.isActive) {
        toggleSendButtonState('stop', false);
        return;
    }

    const hasText = DOMElements.messageInput.value.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;
    const isUploading = selectedFiles.some(f => f.status === 'uploading');
    const hasCompletedFiles = selectedFiles.some(f => f.status === 'completed');

    if (isUploading) {
        toggleSendButtonState('send', true); // Disable send button
        DOMElements.statusRow.textContent = "Uploading files...";
    } else {
        if (DOMElements.statusRow.textContent === "Uploading files...") {
            const failedUploads = selectedFiles.filter(f => f.status === 'error').length;
            DOMElements.statusRow.textContent = failedUploads > 0 ? `⚠️ ${failedUploads} file(s) failed to upload.` : "Uploads complete.";
        }
        
        if (hasText || hasCompletedFiles) {
            toggleSendButtonState('send', false);
        } else {
            toggleSendButtonState('mic', false);
        }
    }
}

function updateFilePreviewStatus(fileId, status, data = {}) {
    const fileElement = document.getElementById(`file-preview-${fileId}`);
    if (!fileElement) return;

    fileElement.classList.remove('uploading', 'completed', 'error');
    const existingOverlay = fileElement.querySelector('.file-preview-overlay');
    if (existingOverlay) existingOverlay.remove();

    fileElement.classList.add(status);

    if (status === 'uploading') {
        const overlay = document.createElement('div');
        overlay.className = 'file-preview-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        fileElement.appendChild(overlay);
    } else if (status === 'completed') {
        const overlay = document.createElement('div');
        overlay.className = 'file-preview-overlay';
        overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.06-1.06L11.25 12.44l-1.72-1.72a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l3.75-3.75Z" clip-rule="evenodd" /></svg>`;
        fileElement.appendChild(overlay);
    } else if (status === 'error') {
        const overlay = document.createElement('div');
        overlay.className = 'file-preview-overlay';
        overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" /></svg>`;
        fileElement.appendChild(overlay);
        fileElement.title = `Error: ${data.message}`;
    }
}

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
    checkSendButtonState();
}

function resetFileInput() {
    selectedFiles = [];
    const filePreviewContainer = document.getElementById('file-preview-container');
    const fileUploadInput = document.getElementById('file-upload');

    if (filePreviewContainer) filePreviewContainer.innerHTML = '';
    if (fileUploadInput) fileUploadInput.value = '';

    updateFileInputUI();
    checkSendButtonState();
}

// --- THEME & UI HELPERS  ---
const applyTheme = (theme) => {
  DOMElements.body.dataset.theme = theme;
  localStorage.setItem('chatTheme', theme);
  const isDark = theme === 'dark';
  
  // ✅ [MODIFIED] Update new icon container and text label
  if (DOMElements.themeIcon) {
    DOMElements.themeIcon.innerHTML = isDark
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;
  }
  if (DOMElements.themeText) {
    DOMElements.themeText.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
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

// --- applyConfigToUI ---
const applyConfigToUI = () => {
  DOMElements.chatTitle.textContent = botConfig.botName || 'AI Bot';
  DOMElements.botAvatar.src = botConfig.profileImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  document.documentElement.style.setProperty('--accent-light', botConfig.themeColor || '#4F46E5');
  document.documentElement.style.setProperty('--accent-dark', botConfig.themeColor ? `${botConfig.themeColor}aa` : '#818CF8');
  DOMElements.composerActionsBtn.style.display = botConfig.allowFileUpload ? 'flex' : 'none';
  DOMElements.statusRow.textContent = !botConfig.active ? '⚠️ Bot is deactivated by admin' : '';
  DOMElements.sendBtn.disabled = false;
};

// --- TEXT-TO-SPEECH (TTS) FUNCTIONS ---
function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ''; 
        URL.revokeObjectURL(currentAudio.src);
        currentAudio = null;
    }
    if (currentTtsButton) {
        currentTtsButton.classList.remove('loading', 'playing');
        currentTtsButton = null;
    }
}

async function playTextAsSpeech(text, buttonElement) {
    if (!botConfig.ttsApiKey) {
        console.error("API key is not configured.");
        alert("Text-to-speech functionality is not set up by my creator.");
        return;
    }

    if (buttonElement === currentTtsButton && currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play();
        } else {
            currentAudio.pause();
        }
        return;
    }

    stopCurrentAudio();

    currentTtsButton = buttonElement;
    currentTtsButton.classList.add('loading');

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${botConfig.ttsVoiceId}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': botConfig.ttsApiKey,
            },
            body: JSON.stringify({
                text: text.replace(/!\[[^\]]*\]\([^)]*\)/g, ''),
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            let errorMsg = 'Failed to generate audio from the service.';
            try {
                const errorData = await response.json();
                if (errorData.detail && errorData.detail.message) {
                    errorMsg = errorData.detail.message;
                } else if (typeof errorData.detail === 'string') {
                    errorMsg = errorData.detail;
                } else {
                    errorMsg = `HTTP Error: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMsg = `HTTP Error: ${response.status} ${response.statusText}`;
            }
            if (errorMsg.toLowerCase().includes("unusual activity") || errorMsg.toLowerCase().includes("free tier usage disabled")) {
                alert("This page says: Unusual activity detected. Free Tier usage disabled. This can happen when using a proxy/VPN or due to browser security restrictions. Please try disabling any VPN or contact the administrator.");
                throw new Error("ElevenLabs API usage disabled.");
            }
            throw new Error(errorMsg);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        currentAudio = new Audio(audioUrl);

        currentAudio.onplay = () => {
            currentTtsButton.classList.remove('loading');
            currentTtsButton.classList.add('playing');
        };
        currentAudio.onpause = () => {
            currentTtsButton.classList.remove('playing');
        };
        currentAudio.onended = () => {
            stopCurrentAudio();
        };

        currentAudio.play();

    } catch (error) {
        console.error('Text-to-Speech Error:', error);
        if (error.message.includes("Failed to fetch")) {
             alert("Could not play audio: The request was blocked. This is often due to a network issue or browser security (CORS) policy. Please check your connection or contact the administrator.");
        } else if (!error.message.includes("ElevenLabs API usage disabled")) {
            alert(`Could not play audio: ${error.message}`);
        }
        stopCurrentAudio();
    }
}


// --- HELPER FUNCTIONS FOR CHAT CONTINUATION ---
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

// --- PERSONALITY VIDEO PREVIEW LOGIC ---
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

// --- Function to mark a personality as seen by the user ---
async function markPersonalityAsSeen(personalityId) {
    if (!state.userId || !personalityId) return;
    try {
        const userRef = doc(db, 'users', state.userId);
        await updateDoc(userRef, {
            seenPersonalities: arrayUnion(personalityId)
        });
    } catch (error) {
        if (error.code === 'not-found' || error.message.includes("No document to update")) {
             await setDoc(doc(db, 'users', state.userId), {
                seenPersonalities: [personalityId]
             }, { merge: true });
        } else {
            console.error("Failed to mark personality as seen:", error);
        }
    }
}

// --- PERSONALITY SELECTION LOGIC ---
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
                
                DOMElements.composerActionsPopup.classList.remove('show');
                DOMElements.composerActionsBtn.classList.remove('active');
                
                try {
                    const personalityDoc = await getDoc(doc(db, 'personalities', id));
                    if (!personalityDoc.exists()) {
                        console.error("Selected personality does not exist.");
                        DOMElements.overlay.classList.remove('show');
                        return;
                    }
                    const fullPersonalityData = personalityDoc.data();
                    
                    const userDoc = await getDoc(doc(db, 'users', state.userId));
                    const seenPersonalities = userDoc.exists() ? userDoc.data().seenPersonalities || [] : [];
                    
                    const shouldShowPreview = fullPersonalityData.videoUrl && !seenPersonalities.includes(id);
                    
                    let userWantsToSwitch = true;
                    if (shouldShowPreview) {
                        userWantsToSwitch = await showPersonalityPreview({
                            name: fullPersonalityData.name, 
                            videoUrl: fullPersonalityData.videoUrl
                        });
                    }

                    if (!userWantsToSwitch) {
                        DOMElements.overlay.classList.remove('show');
                        return;
                    }

                    if (shouldShowPreview) {
                        await markPersonalityAsSeen(id);
                    }

                    const lastSessionId = await findLastSessionForPersonality(id);
                    
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

                } catch (error) {
                    console.error("Error handling personality selection:", error);
                    DOMElements.overlay.classList.remove('show');
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


// --- CORE LOGIC & SESSION MANAGEMENT ---
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
  const out = { blocked: false, warned: false, warningsCount: 0, matchedTrigger: null };
  const msg = sanitize(text);
  if (!msg) return out;

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

// --- ✅ [CORRECTED] loadConfigLive ---
function loadConfigLive() {
  if (state.configPromise) return state.configPromise;
  state.configPromise = (async () => {
    const cfgRef = doc(db, 'config', 'global');
    const applyCfg = (data) => {
      Object.assign(botConfig, data || {});
      botConfig.allowFileUpload = parseBool(botConfig.allowFileUpload);
      botConfig.apiKeys = botConfig.apiKeys || {};
      
      const ttsKeyEntry = Object.values(botConfig.apiKeys).find(k => k && k.type === 'tts' && k.enabled !== false);
      botConfig.ttsApiKey = ttsKeyEntry ? ttsKeyEntry.key : null;
      botConfig.ttsVoiceId = ttsKeyEntry ? ttsKeyEntry.voiceId || 'JBFqnCBsd6RMkjVDRZzb' : 'JBFqnCBsd6RMkjVDRZzb';

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
    // ✅ NEWLY FIXED: IT NOW returns the actual config object, not the promise itself.
    return botConfig;
  })();
  return state.configPromise;
}

// --- subscribeSessions ---
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

// --- ✅ [MODIFIED] subscribeMessages ---
function subscribeMessages() {
  if (!state.sessionId) return;
  if (state.messagesUnsub) state.messagesUnsub();
  const q = query(collection(db, 'chats', state.userId, state.sessionId), orderBy('createdAt', 'asc'));
  state.messagesUnsub = onSnapshot(q, snap => {
    stopCurrentAudio();
    const container = DOMElements.chatMessages;
    container.querySelectorAll('.streaming').forEach(el => el.remove());
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
      
      let processedText = msg.text || '';
      
      const placeholderRegex = /\[IMAGE_PLACEHOLDER_PROMPT:"([^"]+)"\]/g;
      const imageRegex = /!\[Image for prompt: "([^"]+)"\]\(([^)]+)\)/g;

      processedText = processedText.replace(placeholderRegex, (match, promptText) => {
          return `<div class="image-placeholder">
                      <div class="spinner"></div>
                      <p>Generating image...</p>
                  </div>`;
      });

      processedText = processedText.replace(imageRegex, (match, promptText, imageUrl) => {
          return `<p style="margin-bottom: 8px;">Here's the image for: <strong>${promptText}</strong></p>
                  <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">
                      <img src="${imageUrl}" alt="Generated image for ${promptText}" class="message-image-attachment">
                  </a>`;
      });
      
      if (typeof marked !== 'undefined') {
        marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        content.innerHTML = marked.parse(processedText);
      } else {
        content.textContent = processedText;
      }
      
      el.appendChild(content);

      if (msg.imageUrls && msg.imageUrls.length > 0) {
        const imagesContainer = document.createElement('div');
        const count = msg.imageUrls.length;
        imagesContainer.className = `message-images-container images-count-${Math.min(count, 5)}`;
        if (count > 5) {
            imagesContainer.classList.add('images-count-many');
        }

        msg.imageUrls.forEach(url => {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          const img = document.createElement('img');
          img.src = url;
          img.className = 'message-image-attachment';
          img.loading = 'lazy';
          link.appendChild(img);
          imagesContainer.appendChild(link);
        });
        
        if (content.innerHTML.trim()) {
          content.prepend(imagesContainer);
        } else {
          content.appendChild(imagesContainer);
        }
      }
      
      const hasTextContent = (msg.text || '').trim().length > 0;
      if (msg.sender === 'bot' && hasTextContent && !imageRegex.test(msg.text) && !placeholderRegex.test(msg.text)) {
          
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'message-actions-container';

        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'tts-btn';
        ttsBtn.title = 'Listen to message';
        ttsBtn.innerHTML = `
          <span class="play-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"></path></svg></span>
          <span class="pause-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg></span>
          <span class="spinner"></span>
        `;
        ttsBtn.onclick = () => playTextAsSpeech(msg.text, ttsBtn);
        el.appendChild(ttsBtn);

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
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.title = 'Download message';
        downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 15.586l-4.293-4.293-1.414 1.414L12 18.414l5.707-5.707-1.414-1.414L12 15.586z"/><path d="M12 4a.999.999 0 00-1 1v10.586l-1.707-1.707-1.414 1.414L12 18.414l4.121-4.121-1.414-1.414L13 15.586V5a.999.999 0 00-1-1z"/></svg>`;
        downloadBtn.onclick = () => {
          const messageElement = downloadBtn.closest('.message[data-message-id]');
          if (messageElement) {
              showExportModal(messageElement.querySelector('.message-content'), messageElement.dataset.messageId);
          }
        };
        el.appendChild(downloadBtn);
      }
      
      // ✨ [NEW LOGIC] Check cache to set initial state of PDF download links after rendering
      const pdfLinksInContent = content.querySelectorAll('a[data-export-pdf-id]');
      pdfLinksInContent.forEach(pdfLink => {
          const linkMessageId = pdfLink.getAttribute('data-export-pdf-id');
          if (exportedFileCache.has(linkMessageId)) {
              const url = exportedFileCache.get(linkMessageId);
              pdfLink.dataset.status = 'completed';
              pdfLink.innerHTML = `${PDF_LINK_SUCCESS_ICON} Open PDF`;
              pdfLink.href = url;
              pdfLink.target = '_blank';
          }
      });

      if(msg.sender==='user'&&botConfig.userBubbleColor) el.style.background = botConfig.userBubbleColor;
      if(msg.sender==='bot'&&botConfig.botBubbleColor) el.style.background = botConfig.botBubbleColor;
      messageGroup.appendChild(el);
    });
    container.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch(e){} });
    addCopyButtons();
    
    container.querySelectorAll('.message-content a').forEach(a => {
        if (!a.hasAttribute('data-export-pdf-id')) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
    });
    
    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch((err) => console.error('MathJax final typeset error:', err));
    }
  }, err => console.error('Messages snapshot error', err));
}

// --- USER TRACKING & OTHER SESSION MANAGEMENT ---
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


async function ensureUser(authUser){
  // ✅ [MODIFIED] Populate user profile UI
  const placeholderAvatar = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  if (DOMElements.userAvatar) DOMElements.userAvatar.src = authUser.photoURL || placeholderAvatar;
  if (DOMElements.userDisplayName) DOMElements.userDisplayName.textContent = authUser.displayName || 'New User';
  if (DOMElements.userEmail) DOMElements.userEmail.textContent = authUser.email;
  // --- End of UI Population ---

  const ref = doc(db, 'users', authUser.uid);
  const s = await getDoc(ref);
  const trackingData = await trackUserLocationAndDevice();

  if (!s.exists()) {
    const initialData = {
      email: authUser.email,
      displayName: authUser.displayName || 'New User',
      photoURL: authUser.photoURL || null,
      blocked: false, 
      createdAt: serverTimestamp(), 
      lastSeen: serverTimestamp(),
      activityStatus: 'Active', 
      ...(trackingData || {})
    };
    await setDoc(ref, initialData);
  } else {
    const updateData = {
      lastSeen: serverTimestamp(), 
      activityStatus: 'Active', 
      // Update photoURL and displayName if they've changed since last login
      photoURL: authUser.photoURL || s.data().photoURL || null,
      displayName: authUser.displayName || s.data().displayName || 'New User',
      ...(trackingData || {})
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

// --- toggleSendButtonState ---
function toggleSendButtonState(buttonState, isDisabled = false) {
    const btn = DOMElements.sendBtn;
    const icons = {
        mic: btn.querySelector('.mic-icon'),
        send: btn.querySelector('.send-icon'),
        stop: btn.querySelector('.stop-icon'),
        spinner: btn.querySelector('.spinner')
    };

    for (const icon in icons) {
        if (icons[icon]) icons[icon].style.display = 'none';
    }
    btn.disabled = isDisabled;

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


// --- cancellableWait ---
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

// --- stopApiRequestLoop ---
function stopApiRequestLoop() {
    if (autoRetryState.isActive) {
        autoRetryState.stopRequested = true;
        if (fetchController) {
            fetchController.abort();
        }
        console.log("User requested to stop the API request loop.");
    }
}

// --- makeApiRequest ---
async function makeApiRequest(requestBody, apiKey, abortSignal) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?key=${encodeURIComponent(apiKey)}`;
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

    const chatMessages = DOMElements.chatMessages;
    let autoScrollEnabled = (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 100);

    const renderLoop = () => {
        if (contentUpdated) {
            botMessageContent.innerHTML = marked.parse(accumulatedBotReply + '<span class="typing-cursor"></span>');
            
            if (window.MathJax) {
                MathJax.typesetPromise([botMessageContent]).catch((err) => console.error('MathJax streaming typeset error:', err));
            }

            if (autoScrollEnabled) {
                if (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 100) {
                    scrollToBottom('auto');
                } else {
                    autoScrollEnabled = false;
                }
            }
            contentUpdated = false;
        }

        if (!streamFinished) {
            requestAnimationFrame(renderLoop);
        } else {
            const finalHtml = marked.parse(accumulatedBotReply);
            botMessageContent.innerHTML = finalHtml;
            if (window.MathJax) {
                MathJax.typesetPromise([botMessageContent]).catch((err) => console.error('MathJax final typeset error:', err));
            }
            botMessageContent.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch(e){} });
            addCopyButtons();
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
                let jsonString = line.substring(line.indexOf(':') + 1).trim();
                if (jsonString.endsWith(',')) {
                    jsonString = jsonString.slice(0, -1);
                }
                try {
                    accumulatedBotReply += JSON.parse(jsonString);
                    contentUpdated = true;
                } catch (e) {
                    console.warn("Could not parse stream line as JSON:", jsonString, e);
                }
            }
        }
    }
    return accumulatedBotReply;
}

// --- cleanupAfterLoop ---
function cleanupAfterLoop() {
    autoRetryState.isActive = false;
    checkSendButtonState();
}

// --- generateAndReplaceImage ---
async function generateAndReplaceImage(prompt, messageId, originalText) {
    const messageDocRef = doc(db, 'chats', state.userId, state.sessionId, messageId);
    try {
        const imageUrl = await handleImageGenerationWithCloudinary(prompt);
        const imageMarkdown = `![Image for prompt: "${prompt}"](${imageUrl})`;
        const placeholder = `[IMAGE_PLACEHOLDER_PROMPT:"${prompt}"]`;
        const newText = originalText.replace(placeholder, imageMarkdown);
        
        await updateDoc(messageDocRef, { text: newText });

    } catch (error) {
        console.error("Async image generation/replacement failed:", error);
        const errorMessage = `⚠️ Sorry, I couldn't create that image. Reason: ${error.message}`;
        const placeholder = `[IMAGE_PLACEHOLDER_PROMPT:"${prompt}"]`;
        const newText = originalText.replace(placeholder, errorMessage);

        await updateDoc(messageDocRef, { text: newText });
    }
}


// new updated executeApiRequestLoop FUNCTION
async function executeApiRequestLoop() {
    autoRetryState.isActive = true;
    autoRetryState.stopRequested = false;
    fetchController = new AbortController();
    toggleSendButtonState('stop', false);

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
        botMessageGroup.remove(); // Removed the temporary streaming message

        // --- ✅ [MODIFIED] LOGIC TO HANDLE TOOL USE (SEARCH, IMAGES, EXPORTS) ---
        
        // This regex now makes the quotes optional, fixing the issue.
        const searchCommandRegex = /\[search:\s*"?([\s\S]+?)"?\]/i; 
        const imageCommandRegex = /(\[|\()\s*"?generate(?:_|\s|;)?image"?'?\s*[:\s]+"?([\s\S]*?)"?\s*(\]|\))/is;
        const exportCommandRegex = /\[export_as:\s*"?(pdf|txt)"?\s*\]/i;

        const searchMatch = finalAccumulatedReply.match(searchCommandRegex);
        const imageMatch = finalAccumulatedReply.match(imageCommandRegex);
        const exportMatch = finalAccumulatedReply.match(exportCommandRegex);

        if (searchMatch && searchMatch[1]) {
            // --- 1. HANDLE WEB SEARCH REQUEST ---
            const searchQuery = searchMatch[1].trim(); // Trim any extra whitespace
            
            // Find the enabled Serper API key from the config
            const serperApiKeyEntry = Object.values(botConfig.apiKeys || {}).find(k => k.type === 'search' && k.enabled !== false);
            const serperApiKey = serperApiKeyEntry ? serperApiKeyEntry.key : null;

            if (!serperApiKey) {
                const errorText = "My apologies, my web search tool is not configured. An administrator needs to add a Serper.dev API key in the admin panel.";
                await addDoc(collection(db, 'chats', state.userId, state.sessionId), { 
                    text: errorText, sender: 'bot', createdAt: new Date() 
                });
                cleanupAfterLoop();
                return; // Stop processing
            }

            showApiStatus(`🔎 Searching the web for "${searchQuery}"...`, -1);
            const searchResults = await performWebSearch(searchQuery, serperApiKey);
            showApiStatus('🧠 Thinking with new information...', -1);

            // I  Added the search results to the conversation history for the next API call
            const searchResultsForHistory = {
                role: 'user', // pretend it's from the user to provide context
                parts: [{ text: `[SEARCH_RESULTS]\n${searchResults}` }]
            };
            
            // Re-run the API loop with the added context
            autoRetryState.requestPayload.contents.push(searchResultsForHistory);
            
            // Re-add a temporary bot message for the final streaming response
            const finalBotMessageGroup = document.createElement('div');
            finalBotMessageGroup.className = 'message-group bot streaming';
            const finalBotMessageEl = document.createElement('div');
            finalBotMessageEl.className = 'message bot';
            if(botConfig.botBubbleColor) finalBotMessageEl.style.background = botConfig.botBubbleColor;
            const finalBotMessageContent = document.createElement('div');
            finalBotMessageContent.className = 'message-content';
            finalBotMessageContent.innerHTML = '<span class="typing-cursor"></span>';
            finalBotMessageEl.appendChild(finalBotMessageContent);
            finalBotMessageGroup.appendChild(finalBotMessageEl);
            DOMElements.chatMessages.appendChild(finalBotMessageGroup);
            scrollToBottom('smooth');

            autoRetryState.botMessageElements = {
                botMessageGroup: finalBotMessageGroup,
                botMessageEl: finalBotMessageEl,
                botMessageContent: finalBotMessageContent
            };
            
            // This is a recursive call to get the final answer
            await executeApiRequestLoop(); 
            return; // IMPORTANT

        } else if (exportMatch) {
            // --- 2. HANDLE EXPORT REQUEST ---
            const fileType = exportMatch[1].toLowerCase();
            const contentToExport = finalAccumulatedReply.replace(exportCommandRegex, '').trim();

            const messageDocRef = await addDoc(collection(db, 'chats', state.userId, state.sessionId), { 
                text: contentToExport, 
                sender: 'bot', 
                createdAt: new Date() 
            });
            const newMessageId = messageDocRef.id;

            const fileTypeText = fileType.toUpperCase();
            let downloadLinkMarkdown = '';
            
            if (fileType === 'txt') {
                const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(contentToExport)}`;
                downloadLinkMarkdown = `\n\n<a href="${dataUri}" class="download-link" download="chat-export.txt"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.586l-4.293-4.293-1.414 1.414L12 18.414l5.707-5.707-1.414-1.414L12 15.586z"/><path d="M12 4a.999.999 0 00-1 1v10.586l-1.707-1.707-1.414 1.414L12 18.414l4.121-4.121-1.414-1.414L13 15.586V5a.999.999 0 00-1-1z"/></svg>Download ${fileTypeText}</a>`;
            } else if (fileType === 'pdf') {
                downloadLinkMarkdown = `\n\n<a href="javascript:void(0);" class="download-link download-link-pdf" data-export-pdf-id="${newMessageId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.586l-4.293-4.293-1.414 1.414L12 18.414l5.707-5.707-1.414-1.414L12 15.586z"/><path d="M12 4a.999.999 0 00-1 1v10.586l-1.707-1.707-1.414 1.414L12 18.414l4.121-4.121-1.414-1.414L13 15.586V5a.999.999 0 00-1-1z"/></svg>Download ${fileTypeText}</a>`;
            }

            await updateDoc(messageDocRef, {
                text: contentToExport + downloadLinkMarkdown
            });

        } else if (imageMatch && imageMatch[2]) {
            // --- 3. HANDLE IMAGE REQUEST  ---
            let prompt = imageMatch[2].trim();
            if ((prompt.startsWith('"') && prompt.endsWith('"')) || (prompt.startsWith("'") && prompt.endsWith("'"))) {
                prompt = prompt.substring(1, prompt.length - 1);
            }

            const placeholder = `[IMAGE_PLACEHOLDER_PROMPT:"${prompt}"]`;
            const combinedText = finalAccumulatedReply.replace(imageMatch[0], placeholder).trim();

            const messageDocRef = await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
                text: combinedText, sender: 'bot', createdAt: new Date()
            });

            generateAndReplaceImage(prompt, messageDocRef.id, combinedText);

        } else {
            // --- 4. HANDLE NORMAL RESPONSE ---
            await addDoc(collection(db, 'chats', state.userId, state.sessionId), { 
                text: finalAccumulatedReply, sender: 'bot', createdAt: new Date() 
            });
        }
    } else {
        const botMessageContent = botMessageGroup.querySelector('.message-content');
        let errorMessage = autoRetryState.stopRequested 
            ? 'Request stopped.'
            : "⚠️ Oops! Something went wrong. Please try again.";
        
        const retryButtonHTML = `
            <button class="retry-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v.001" /></svg>
                Retry
            </button>`;

        botMessageContent.innerHTML = `<p>${errorMessage}</p>${retryButtonHTML}`;
        
        const retryBtn = botMessageContent.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                botMessageContent.innerHTML = '<span class="typing-cursor"></span>';
                botMessageGroup.classList.add('streaming');
                executeApiRequestLoop(); 
            };
        }
        
        botMessageGroup.classList.remove('streaming');
    }

    cleanupAfterLoop();
}





// --- sendMessage ---
async function sendMessage() {
    const text = sanitize(DOMElements.messageInput.value);

    if (autoRetryState.isActive) return;
    
    const completedFiles = selectedFiles.filter(f => f.status === 'completed');
    if (!text && completedFiles.length === 0) return;

    toggleSendButtonState('stop', false);
    DOMElements.statusRow.textContent = '';
    DOMElements.messageInput.value = '';
    autosize(DOMElements.messageInput);

    const filesToSend = [...selectedFiles];
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

        const userMessageParts = [{ text }];
        let uploadedImageUrls = [];
        let attachedFilesForFirestore = [];
        let textForTriggerCheck = text;

        const imageFiles = filesToSend.filter(f => f.file.type.startsWith('image/') && f.status === 'completed');
        const otherFiles = filesToSend.filter(f => !f.file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            uploadedImageUrls = imageFiles.map(f => f.url);
            const base64Promises = imageFiles.map(f => parseImageFile(f.file));
            const base64Images = await Promise.all(base64Promises);
            base64Images.forEach((base64, index) => {
                userMessageParts.push({ inline_data: { mime_type: imageFiles[index].file.type, data: base64 } });
            });
        }

        for (const fileWrapper of otherFiles) {
             const file = fileWrapper.file;
             let content = '';
             let fileTypeLabel = 'FILE';
             if (file.type.startsWith('text/')) {
                 content = await parseTextFile(file);
                 fileTypeLabel = 'TEXT FILE';
             } else if (file.type === 'application/pdf') {
                 content = await parsePdfFile(file);
                 fileTypeLabel = 'PDF';
             }
             userMessageParts[0].text += `\n\n--- ${fileTypeLabel}: ${file.name} ---\n${content}\n--- END ${fileTypeLabel} ---`;
             if (content) {
                attachedFilesForFirestore.push({
                    name: file.name,
                    type: file.type,
                    content: content
                });
             }
        }
        textForTriggerCheck = userMessageParts[0].text;

        const handleResult = await handleUserMessage(textForTriggerCheck);
        if (handleResult.blocked) {
            cleanupAfterLoop();
            return;
        }

        await saveFirstMessageTitleIfNeeded(text || (uploadedImageUrls.length > 0 ? "Chat with images" : "New Chat"));
        await addDoc(collection(db, 'chats', state.userId, state.sessionId), {
            text: text,
            sender: 'user',
            createdAt: new Date(),
            imageUrls: uploadedImageUrls,
            attachedFiles: attachedFilesForFirestore
        });

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

                      // newly updated system instructions 
        const systemInstruction = {
            role: 'user',
            parts: [{
                text: `${activePersonaInstructions}\n\n---**SYSTEM INSTRUCTIONS:**\n` +
                "1.  **Formatting:** ALWAYS use Markdown for formatting. For links, use standard Markdown `[Link Text](URL)`.\n" +
                "2.  **Equations:** Use LaTeX for math. Inline: `$E=mc^2$`. Block: `$$...$$`.\n" +
                "3.  **Image Generation:** To generate an image, response MUST start with `[generate_image: \"A detailed description\"]` on the very first line, followed by a message on the next.\n" +
                "4.  **Exporting Content:** If the user asks to download or export the content you are about to generate, you MUST respond with two parts on separate lines: first, the content itself, and second, the command `[export_as: \"pdf\"]` or `[export_as: \"txt\"]`. The command MUST be on the last line.\n" +
                // --- ✅ [MODIFIED] INSTRUCTIONS FOR WEB SEARCH ---
                "5.  **Web Search is Your Tool for Facts:** You have a web search tool. If the user asks for **any** factual information you don't know, especially anything that is recent or time-sensitive, you **MUST** use it. This includes news, weather, real-time data, current exchange rates, or **the current date/time**. Your entire response must be ONLY the command: `[search: your concise search query here]`. Do not try to answer from your own knowledge if it's outdated.\n" +
                "   - User asks: 'Who won the last AFCON?' You respond: `[search: who won the last Africa Cup of Nations]`\n" +
                "   - User asks: 'What is the current dollar to naira rate?' You respond: `[search: current dollar to naira exchange rate]`\n" +
                "   - User asks: 'What is today's date?' You respond: `[search: current date]`\n" +
                "6.  **Using Search Results:** After you request a search, you will receive results prefixed with `[SEARCH_RESULTS]`. You MUST use this new information to answer the user's original question comprehensively."
            }]
        };



        const imageMarkdownRegex = /!\[Image for prompt: "([^"]+)"\]\(([^)]+)\)/;
        const historyContents = snaps.docs.map(d => {
            const data = d.data();
            const role = data.sender === 'user' ? 'user' : 'model';
            let messageText = data.text || '';
            
            if (data.imageUrls && data.imageUrls.length > 0) {
                const imageUrlsText = data.imageUrls.map(url => `[Reference Image provided by user: ${url}]`).join('\n');
                messageText += `\n${imageUrlsText}`;
            }

            if (data.attachedFiles && Array.isArray(data.attachedFiles)) {
                data.attachedFiles.forEach(file => {
                    const fileTypeLabel = file.type === 'application/pdf' ? 'PDF' : (file.type.startsWith('text/') ? 'TEXT FILE' : 'FILE');
                    messageText += `\n\n--- ${fileTypeLabel}: ${file.name} ---\n${content}\n--- END ${fileTypeLabel} ---`;
                });
            }

            const imageMatch = messageText.match(imageMarkdownRegex);
            if (role === 'model' && imageMatch) {
                const prompt = imageMatch[1];
                const imageUrl = imageMatch[2];
                messageText = `[System: You have successfully generated an image for the prompt "${prompt}". The image is available at this URL: ${imageUrl}. The user can see it now. You can describe the image or ask if they want modifications.]`;
            }
            
            if (d.id === snaps.docs[snaps.docs.length - 1].id && role === 'user') {
                 return { role, parts: userMessageParts };
            }
            
            return { role, parts: [{ text: messageText.trim() }] };
        });
        
        autoRetryState.requestPayload = { contents: [systemInstruction, {role: 'model', parts: [{text: "Understood."}]}, ...historyContents] };
        autoRetryState.botMessageElements = { botMessageGroup, botMessageEl, botMessageContent };

        executeApiRequestLoop();

    } catch (err) {
        console.error('sendMessage preparation error', err);
        DOMElements.statusRow.textContent = '⚠️ Error: ' + (err.message || 'Could not prepare message.');
        cleanupAfterLoop();
    }
}


// --- ✅ [MODIFIED] handleImageGenerationWithCloudinary ---
async function handleImageGenerationWithCloudinary(prompt) {
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
        
        // The generic uploader expects a File or Blob, not a base64 string.
        // I'm keeping this specific fetch logic for base64 uploads.
        const CLOUDINARY_CLOUD_NAME = "dvjs45kft";
        const CLOUDINARY_UPLOAD_PRESET = "vevapvkv";
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const formData = new FormData();
        formData.append('file', `data:image/png;base64,${imageBase64}`);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const cloudinaryResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
        });

        if (!cloudinaryResponse.ok) {
            throw new Error('Failed to upload the generated image.');
        }

        const cloudinaryData = await cloudinaryResponse.json();
        return cloudinaryData.secure_url;

    } catch (error) {
        console.error("Image generation process failed:", error);
        throw error;
    }
}

// --- SESSION MANAGEMENT & EVENT LISTENERS ---
function startNewChat(){
  stopCurrentAudio();
  exportedFileCache.clear();
  state.sessionId=crypto.randomUUID();
  localStorage.setItem('chatSessionId',state.sessionId);
  state.firstMessageSaved=false;
  subscribeMessages();
  checkSessionWasPreviouslyBlocked().catch(()=>{});
  document.querySelectorAll('.session-item.active').forEach(el=>el.classList.remove('active'));
}
function loadSessionById(id){
  stopCurrentAudio();
  exportedFileCache.clear();
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
  checkSendButtonState();
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
  
  const hasText = DOMElements.messageInput.value.trim().length > 0;
  const hasCompletedFiles = selectedFiles.some(f => f.status === 'completed');
  
  if (hasText || hasCompletedFiles) {
      sendMessage();
  } else if (!hasText && selectedFiles.length === 0 && recognition) {
      recognition.start();
  }
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

// --- NEW USER TOUR LOGIC ---
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
            text: 'Use this button to switch between different chaka personalities or to upload a file for the chaka to read.'
        },
        {
            element: '#message-input',
            title: 'Start Talking!',
            text: 'Type your message here and press the send button. That\'s it! Enjoy your chat with chaka 😌.'
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

// --- Function to check if the tour should be offered ---
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

// --- SIGN OUT FUNCTION ---
async function signOutUser() {
  if (!confirm('Are you sure you want to sign out?')) return;
  try {
    stopCurrentAudio();
    await signOut(auth);
    console.log("User signed out successfully.");
  } catch (error) {
    console.error("Sign out error:", error);
    alert("Failed to sign out. Please try again.");
  }
}

// --- ✅ [MODIFIED] INIT FUNCTION ---
const init = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      DOMElements.body.style.opacity = 1;
      state.userId = user.uid;

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

      await ensureUser(user).catch(e => console.error('ensureUser failed', e));
      await checkAndStartTour();
      initAnnouncementListener();
      subscribeSessions();
      
      if (state.sessionId) {
        const snap = await getDoc(doc(db,'sessions',state.userId,'items',state.sessionId));
        state.firstMessageSaved = snap.exists();
        subscribeMessages();
        await checkSessionWasPreviouslyBlocked();
      } else {
        startNewChat();
      }
      
      // (also updated inside init function)
      DOMElements.overlay.addEventListener('click', () => {
          DOMElements.sidebar.classList.remove('open');
          DOMElements.composerActionsPopup.classList.remove('show');
          DOMElements.composerActionsBtn.classList.remove('active');
          
          // ✅ [NEW] Close user settings popup
          DOMElements.userSettingsPopup.classList.remove('show');
          DOMElements.userSettingsBtn.classList.remove('active');
          
          DOMElements.overlay.classList.remove('show');
          DOMElements.welcomeTourModal.classList.add('hidden');
          closeAnnouncementModals();
          hideExportModal();
          hideExportConfirmationModal(); 
      }); 
      // This is the end of the overlay listener
      
      // ✅ [FIX] I ADDED THIS BLOCK BACK for the mobile menu button
      DOMElements.menuBtn.addEventListener('click', () => {
        DOMElements.sidebar.classList.toggle('open');
        DOMElements.overlay.classList.toggle('show');
        
        // Ensure popups are closed when opening sidebar
        DOMElements.composerActionsPopup.classList.remove('show');
        DOMElements.composerActionsBtn.classList.remove('active');
        DOMElements.userSettingsPopup.classList.remove('show');
        DOMElements.userSettingsBtn.classList.remove('active');
      });
      // --- END FIX ---

      // ✅ [NEW] Event Listener for User Settings Popup
      DOMElements.userSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpening = !DOMElements.userSettingsBtn.classList.contains('active');
        DOMElements.userSettingsPopup.classList.toggle('show', isOpening);
        DOMElements.userSettingsBtn.classList.toggle('active', isOpening);
        DOMElements.overlay.classList.toggle('show', isOpening);
        
        // Close composer popup if it's open
        DOMElements.composerActionsPopup.classList.remove('show');
        DOMElements.composerActionsBtn.classList.remove('active');
      });

      
      // THIS IS MY NEW CORRECTED BLOCK
  const handleNewChat = () => {
      startNewChat();
      if (window.innerWidth <= 900) {
          DOMElements.sidebar.classList.remove('open');
          DOMElements.overlay.classList.remove('show');
      }
  };
  DOMElements.newChatSidebarBtn.addEventListener('click', handleNewChat);
  DOMElements.clearHistoryBtn.addEventListener('click', clearHistory);
  DOMElements.signOutBtn.addEventListener('click', signOutUser);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

DOMElements.messageInput.addEventListener('keydown', (e) => {
  if (!isMobile) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      DOMElements.sendBtn.click();
    }
  }
});

     
      // ✅ [MODIFIED] Use event delegation for dynamic export links with status handling
      DOMElements.chatMessages.addEventListener('click', async (e) => {
          const pdfLink = e.target.closest('a[data-export-pdf-id]');
          if (!pdfLink) return;

          e.preventDefault();
          const messageId = pdfLink.getAttribute('data-export-pdf-id');
          const currentStatus = pdfLink.dataset.status;

          if (currentStatus === 'processing') {
              return; // Ignore clicks while processing
          }

          // If already completed, just open the cached version.
          if (exportedFileCache.has(messageId)) {
              window.open(exportedFileCache.get(messageId), '_blank');
              return;
          }

          // Set processing state (for initial click or retry)
          pdfLink.dataset.status = 'processing';
          pdfLink.innerHTML = `${PDF_LINK_LOADER_ICON} Generating...`;
          
          const messageElement = pdfLink.closest('.message[data-message-id]')?.querySelector('.message-content');
          
          if (messageElement) {
              try {
                  showToastNotification({
                      message: "PDF generation is in progress. You'll be notified when it is complete.",
                      icon: LOADER_SVG_ICON,
                      duration: 8000
                  });

                  const fileUrl = await exportAsPdf(messageElement, messageId);
                  
                  pdfLink.dataset.status = 'completed';
                  pdfLink.innerHTML = `${PDF_LINK_SUCCESS_ICON} Open PDF`;
                  pdfLink.href = fileUrl;
                  pdfLink.target = '_blank';

                  showExportConfirmationModal('PDF', fileUrl);

              } catch (error) {
                  console.error("PDF generation from link failed:", error);
                  pdfLink.dataset.status = 'failed';
                  pdfLink.innerHTML = `${PDF_LINK_ERROR_ICON} Retry Generation`;

                  showToastNotification({
                      message: `Sorry, could not create the PDF. Error: ${error.message || 'Unknown reason.'}`,
                      type: 'error',
                      duration: 10000
                  });
              }
          } else {
              pdfLink.dataset.status = 'failed';
              pdfLink.innerHTML = `${PDF_LINK_ERROR_ICON} Error`;
              showToastNotification({
                  message: "Could not find the original message to export.",
                  type: 'error'
              });
          }
      });
      
      DOMElements.chatMessages.addEventListener('scroll', () => {
        const isScrolledUp = DOMElements.chatMessages.scrollHeight - DOMElements.chatMessages.scrollTop - DOMElements.chatMessages.clientHeight > 200;
        DOMElements.scrollToBottomBtn.classList.toggle('visible', isScrolledUp);
      });
      DOMElements.scrollToBottomBtn.addEventListener('click', () => scrollToBottom('smooth'));
      const composerObserver = new ResizeObserver(entries => { document.documentElement.style.setProperty('--composer-height', `${entries[0].target.offsetHeight}px`); });
      
      // (updated inside init function)
      composerObserver.observe(DOMElements.composer);
      DOMElements.composerActionsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpening = !DOMElements.composerActionsBtn.classList.contains('active');
          DOMElements.composerActionsPopup.classList.toggle('show', isOpening);
          DOMElements.composerActionsBtn.classList.toggle('active', isOpening);
          DOMElements.overlay.classList.toggle('show', isOpening);

          // ✅ [NEW] Close user settings popup
          DOMElements.userSettingsPopup.classList.remove('show');
          DOMElements.userSettingsBtn.classList.remove('active');
      });


      if (DOMElements.announcementCloseBtn) DOMElements.announcementCloseBtn.addEventListener('click', closeAnnouncementModals);
      if (DOMElements.announcementDetailsCloseBtn) DOMElements.announcementDetailsCloseBtn.addEventListener('click', closeAnnouncementModals);
      if (DOMElements.announcementReadMoreBtn) {
          DOMElements.announcementReadMoreBtn.addEventListener('click', () => {
              if (state.currentAnnouncement) {
                  showAnnouncementDetails(state.currentAnnouncement);
              }
          });
      }

      // ✅ [MODIFIED] Handle manual exports differently for PDF vs. TXT
      const handleManualExport = async (exportFn) => {
          hideExportModal(); // Hide selection modal first
          const element = state.elementToExport;
          const messageId = state.messageIdToExport;

          if (exportFn === exportAsPdf) {
              showToastNotification({
                  message: "PDF generation is in progress...",
                  icon: LOADER_SVG_ICON,
                  duration: 8000
              });
              try {
                  const url = await exportAsPdf(element, messageId);
                  showExportConfirmationModal('PDF', url);
              } catch (error) {
                  showToastNotification({
                      message: "Sorry, there was an error creating the PDF.",
                      type: 'error',
                      duration: 10000
                  });
              }
          } else {
              // For TXT, keep the fast, blocking behavior
              const url = await exportFn(element, true);
              if (url) {
                  showExportConfirmationModal('TXT', url);
              }
          }
      };

      if(DOMElements.exportPdfBtn) DOMElements.exportPdfBtn.addEventListener('click', () => handleManualExport(exportAsPdf));
      if(DOMElements.exportTxtBtn) DOMElements.exportTxtBtn.addEventListener('click', () => handleManualExport(exportAsTxt));
      if(DOMElements.exportCloseBtn) DOMElements.exportCloseBtn.addEventListener('click', hideExportModal);

      if(DOMElements.viewExportedFileBtn) {
          DOMElements.viewExportedFileBtn.addEventListener('click', () => {
              if (state.lastExportedFile && state.lastExportedFile.url) {
                  window.open(state.lastExportedFile.url, '_blank');
              }
              hideExportConfirmationModal();
          });
      }
       if(DOMElements.exportConfirmationContinueBtn) {
         DOMElements.exportConfirmationContinueBtn.addEventListener('click', hideExportConfirmationModal);
       }

      const fileUploadInput = document.getElementById('file-upload');
      const filePreviewContainer = document.getElementById('file-preview-container');
      
      // ✅ [MODIFIED] uploadAndProcessFile to use the generic uploader
      async function uploadAndProcessFile(fileId, file) {
          const fileObject = selectedFiles.find(f => f.id === fileId);
          if (!fileObject) return;

          try {
              fileObject.status = 'uploading';
              updateFilePreviewStatus(fileId, 'uploading');
              checkSendButtonState();
              
              // Specify 'image' as the resource type for user-uploaded images
              const url = await uploadFileToCloudinary(file, 'image');
              
              fileObject.status = 'completed';
              fileObject.url = url;
              updateFilePreviewStatus(fileId, 'completed');

          } catch (error) {
              fileObject.status = 'error';
              fileObject.error = error.message;
              updateFilePreviewStatus(fileId, 'error', { message: error.message });
          } finally {
              checkSendButtonState();
          }
      }

      if (fileUploadInput) {
        fileUploadInput.addEventListener('change', (e) => {
          DOMElements.composerActionsPopup.classList.remove('show');
          DOMElements.composerActionsBtn.classList.remove('active');
          DOMElements.overlay.classList.remove('show');

          for (const file of e.target.files) {
            const fileId = Date.now() + Math.random();
            const newFileObject = { 
                id: fileId, 
                file: file, 
                status: 'pending',
                url: null,
                error: null
            };
            selectedFiles.push(newFileObject);

            const item = document.createElement('div');
            item.className = 'file-preview-item';
            item.id = `file-preview-${fileId}`;

            let preview;
            if (file.type.startsWith('image/')) {
              preview = document.createElement('img');
              preview.className = 'file-preview-thumbnail';
              preview.src = URL.createObjectURL(file);
              preview.onload = () => URL.revokeObjectURL(preview.src);
            } else {
              preview = document.createElement('div');
              preview.className = 'file-preview-icon';
              preview.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V8.188a2.625 2.625 0 0 0-.77-1.851l-4.439-4.44a2.625 2.625 0 0 0-1.851-.77H5.625ZM15 3.375v3.75h3.75a.375.375 0 0 1-.11.26l-4.44 4.439a.375.375 0 0 1-.26.11h-3.75A.375.375 0 0 1 9.75 11.5v-3.75a.375.375 0 0 1 .11-.26l4.44-4.44a.375.375 0 0 1 .26-.11Z"/></svg>`;
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

            if (file.type.startsWith('image/')) {
                uploadAndProcessFile(fileId, file);
            } else {
                newFileObject.status = 'completed';
                checkSendButtonState();
            }
          }
          
          e.target.value = '';
          updateFileInputUI();
        });
      }

      checkSendButtonState();

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

    } else {
      localStorage.removeItem('chatSessionId');
      localStorage.removeItem('selectedPersonalityId');
      window.location.replace('auth.html');
    }
  });
};

init();
