// ---------- JAVASCRIPT IS COMPLETELY UNCHANGED AS REQUESTED (EXTENDED, NON-BREAKING) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, where,
  serverTimestamp, updateDoc, getDocs, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
// ---------- CONFIG ----------
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const ADMIN_UID = 'oQ2VYs9ZRONR2lqhcUWM1OocKpl1';
// ---------- DOM REFS ----------
const appEl = document.getElementById('app');
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const toastContainer = document.getElementById('toastContainer');

const views = ['dashboard','moderation','persona','apikeys','config','users','sessions','chats','logs'];
const pageTitle = document.getElementById('pageTitle');
const adminStatus = document.getElementById('adminStatus');
const adminEmail = document.getElementById('adminEmail');
const navButtons = document.querySelectorAll('.nav button[data-view]');

// dashboard refs
const totalUsersEl = document.getElementById('totalUsers');
const totalSessionsEl = document.getElementById('totalSessions');
const recentList = document.getElementById('recentList');

// moderation refs
const blockedUsersList = document.getElementById('blocked-users-list');
const blockedSessionsList = document.getElementById('blocked-sessions-list');

// persona
const personaText = document.getElementById('personaText');
const savePersonaBtn = document.getElementById('savePersona');
const restorePersonaBtn = document.getElementById('restorePersona');

// apikeys
const apiKeysList = document.getElementById('apiKeysList');
const newKeyType = document.getElementById('newKeyType');
const newKeyInput = document.getElementById('newKeyInput');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');

// config
const cfgBotName = document.getElementById('cfgBotName');
const cfgAllowFile = document.getElementById('cfgAllowFile');
const cfgBotBubble = document.getElementById('cfgBotBubble');
const cfgUserBubble = document.getElementById('cfgUserBubble');
const cfgTheme = document.getElementById('cfgTheme');
const cfgActive = document.getElementById('cfgActive');
const profileImageFile = document.getElementById('profileImageFile');
const uploadProfileBtn = document.getElementById('uploadProfileBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const toggleActiveBtn = document.getElementById('toggleActiveBtn');
const saveQuickConfig = document.getElementById('saveQuickConfig');
// users
const usersList = document.getElementById('usersList');

// sessions
const sessionsUserSelect = document.getElementById('sessionsUserSelect');
const sessionsList = document.getElementById('sessionsList');
const sessionMessages = document.getElementById('sessionMessages');
// live chats
const liveUserSelect = document.getElementById('liveUserSelect');
const liveSessionSelect = document.getElementById('liveSessionSelect');
const watchBtn = document.getElementById('watchBtn');
const liveChatArea = document.getElementById('liveChatArea');
// logs
const logsList = document.getElementById('logsList');

const signOutBtn = document.getElementById('signOutBtn');

// ---------- STATE ----------
let currentView = 'dashboard';
let configUnsub = null;
let usersUnsub = null;
let chatsUnsub = null;
let latestConfig = null;
let sessionsUnsubs = [];
// ---------- UI HELPERS ----------
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function withLoader(button, asyncFn) {
  const originalContent = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<div class="loader"></div>`;
  try {
    await asyncFn();
  } catch (error) {
    console.error("Operation failed:", error);
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

function showView(name){
  currentView = name;
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  pageTitle.textContent = capitalized;
  document.title = `Temple AI — ${capitalized}`;
  views.forEach(v => {
      const viewEl = document.getElementById('view-' + v);
      if (viewEl) {
        viewEl.classList.toggle('hidden', v !== name);
      }
  });
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === name));
}
navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
// ---------- AUTH ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.submitter;
  await withLoader(button, async () => {
    try {
      await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    } catch (err) {
      showToast('Sign-in failed: ' + err.message, 'error');
    }
  });
});
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (user.uid !== ADMIN_UID) {
      adminStatus.textContent = 'Not authorized';
      adminEmail.textContent = 'Unauthorized';
      await signOut(auth);
      showToast('You are not the configured admin.', 'error');
      loginScreen.classList.remove('hidden');
      appEl.classList.add('loading');
      return;
    }
    adminStatus.textContent = 'Signed in as';
    adminEmail.textContent = user.email || user.uid;
    loginScreen.classList.add('hidden');
    appEl.classList.remove('loading');
  
    initAdmin();
  } else {
    adminStatus.textContent = 'Not signed in';
    adminEmail.textContent = '--';
    loginScreen.classList.remove('hidden');
    appEl.classList.add('loading');
  }
});
signOutBtn.addEventListener('click', async () => { await signOut(auth); location.reload(); });

// ---------- CORE LOGIC ----------

async function initAdmin(){
  injectTriggersAndSubtleNoteControls();
  subscribeConfig();
  subscribeUsers();
  subscribeLogs();
  subscribeModeration();
  showView('dashboard');
  getAllSessionsCount().catch(()=>{});
  refreshRecentActivity().catch(()=>{});
  setInterval(() => {
    getAllSessionsCount().catch(()=>{});
    refreshRecentActivity().catch(()=>{});
  }, 10000);
}

function injectTriggersAndSubtleNoteControls() {
    const viewConfig = document.getElementById('view-config');
    if (!viewConfig) return;
    const card = viewConfig.querySelector('.card');
    if (!card) return;
    if (document.getElementById('moderation-controls-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'moderation-controls-wrapper';
    wrapper.className = 'card';
    wrapper.style.marginTop = '1.5rem';
    wrapper.innerHTML = `
        <div class="card-header"><h3>Moderation / Triggers</h3><p class="small" style="margin-top:0.25rem">Manage trigger phrases, warnings, and subtle reminder notes.</p></div>
        <h4>Triggers</h4>
        <div id="triggersList" class="list" style="max-height: 280px; margin-bottom: 1.5rem; overflow-y: auto;"></div>
        <button id="addTriggerBtn" class="btn ghost" style="margin-bottom: 2rem;">Add Trigger</button>
        <h4>Subtle Notes</h4>
        <div class="form-group">
            <label class="row" style="cursor:pointer"><input id="subtle-toggle" type="checkbox" style="width:auto; margin-right: 0.5rem;"> Show subtle 
 reminder notes</label>
        </div>
        <div class="form-group">
            <label for="reminder-input">Block reminder note</label>
            <textarea id="reminder-input" placeholder="E.g. Note: you were previously blocked for violating policy..."></textarea>
        </div>
    `;
    card.parentNode.appendChild(wrapper);

    document.getElementById('addTriggerBtn').addEventListener('click', async () => {
        const phrase = prompt("Enter trigger phrase:");
        if (!phrase) return;
        const action = prompt("Action? (warn/block)", "warn");
        const newTrigger = { phrase, action: action === "block" ? "block" : "warn", enabled: true };
        const configRef = doc(db, "config", "global");
        const snap = await getDoc(configRef);
        const existing = snap.exists() ? snap.data().triggerPhrases || [] : [];
        await setDoc(configRef, { triggerPhrases: [...existing, newTrigger] }, { merge: true });
        showToast('Trigger added!');
    });
    document.getElementById('subtle-toggle').onchange = async () => {
        await updateDoc(doc(db, "config", "global"), { showSubtleNotes: document.getElementById('subtle-toggle').checked });
    };
    document.getElementById('reminder-input').onchange = async () => {
        await updateDoc(doc(db, "config", "global"), { blockReminderNote: document.getElementById('reminder-input').value });
    };
}

function subscribeModeration() {
  const usersQuery = query(collection(db, "users"), where("blocked", "==", true));
  onSnapshot(usersQuery, (snap) => {
    blockedUsersList.innerHTML = "";
    if (snap.empty) {
      blockedUsersList.innerHTML = '<div class="small" style="padding: 1rem">No blocked users found. ✅</div>';
      return;
    }
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const el = document.createElement("div");
      el.className = 'card';
      el.style.marginBottom = '1rem';
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; 
 flex-wrap: wrap; gap: 1rem;">
          <div style="word-break: break-all;">
            <strong>${docSnap.id}</strong>
            <div class="small">Reason: ${data.blockReason || "Blocked by admin"}</div>
          </div>
          <button class="btn ghost danger">Unblock</button>
        </div>`;
      el.querySelector('button').onclick = () => toggleUserBlock(docSnap.id, false);
      blockedUsersList.appendChild(el);
    });
  });
  subscribeBlockedSessions();
}

function subscribeBlockedSessions() {
    sessionsUnsubs.forEach(unsub => unsub());
    sessionsUnsubs = [];
    const allUsersRef = collection(db, "users");
    onSnapshot(allUsersRef, (usersSnap) => {
        let allBlockedSessions = [];
        const promises = usersSnap.docs.map(userDoc => {
            const sessionsCol = collection(db, "sessions", userDoc.id, "items");
            const q = query(sessionsCol, where("blocked", "==", true));
            return getDocs(q).then(sessionsSnap => {
                sessionsSnap.forEach(sessionDoc => {
    
                    allBlockedSessions.push({
                        userId: userDoc.id,
                        sessionId: sessionDoc.id,
                        data: sessionDoc.data(),
         
                       ref: sessionDoc.ref
                    });
                });
            });
        });
        Promise.all(promises).then(() => renderBlockedSessions(allBlockedSessions));
    });
}

function renderBlockedSessions(sessions) {
    blockedSessionsList.innerHTML = "";
    if (sessions.length === 0) {
        blockedSessionsList.innerHTML = '<div class="small" style="padding: 1rem">No blocked sessions found. ✅</div>';
        return;
    }
    sessions.forEach(s => {
        const el = document.createElement("div");
        el.className = 'card'; el.style.marginBottom = '1rem';
        el.innerHTML = `
           <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 1rem;">
             <div style="word-break: break-all;">
               <strong>${s.sessionId}</strong>
          
             <div class="small">User: ${s.userId}</div>
               <div class="small">Reason: ${s.data.blockReason || "Triggered"}</div>
             </div>
             <button class="btn ghost danger">Unblock</button>
           </div>`;
        el.querySelector('button').onclick = async () => {
           await updateDoc(s.ref, { blocked: false });
     
           showToast('Session unblocked.');
        };
        blockedSessionsList.appendChild(el);
    });
}

function subscribeConfig(){
  const ref = doc(db, 'config', 'global');
  if (configUnsub) configUnsub();
  configUnsub = onSnapshot(ref, snap => {
    if (!snap.exists()) { latestConfig = {}; return; }
    latestConfig = snap.data();
    cfgBotName.value = latestConfig.botName || '';
    cfgAllowFile.value = latestConfig.allowFileUpload ? 'true' : 'false';
    cfgBotBubble.value = latestConfig.botBubbleColor || '';
    cfgUserBubble.value = latestConfig.userBubbleColor || '';
    cfgTheme.value = latestConfig.themeColor || '';
    cfgActive.value = (latestConfig.active !== false) ? 'true' : 'false';
    personaText.value = latestConfig.persona || '';
    toggleActiveBtn.textContent = (latestConfig.active !== false) ? 'Deactivate Bot' : 'Activate Bot';
  
    renderApiKeys(latestConfig.apiKeys || {});

    const triggerListEl = document.getElementById('triggersList');
    if (triggerListEl) {
        triggerListEl.innerHTML = "";
        (latestConfig.triggerPhrases || []).forEach((t, i) => {
            const item = document.createElement("div");
            item.className = 'card'; item.style.padding = '0.75rem 1rem';
            item.style.marginBottom = '0.5rem';
            item.innerHTML = `<div style="display:flex; justify-content: space-between; align-items: center;">
                <div><strong>${t.phrase}</strong> <code style="font-size: 0.75rem; padding: 2px 4px;">${t.action}</code></div>
                <button class="btn ghost danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">❌</button>
              </div>`;
            item.querySelector('button').onclick = async () => {
                const updated = (latestConfig.triggerPhrases || []).filter((_, idx) => idx !== i);
                await updateDoc(ref, { triggerPhrases: updated });
            };
            triggerListEl.appendChild(item);
        });
    }
    const subtleToggleEl = document.getElementById('subtle-toggle');
    if(subtleToggleEl) subtleToggleEl.checked = !!latestConfig.showSubtleNotes;
    const reminderInputEl = document.getElementById('reminder-input');
    if(reminderInputEl) reminderInputEl.value = latestConfig.blockReminderNote || "";
  });
}

async function saveConfig(){
  const ref = doc(db, 'config', 'global');
  const obj = {
    botName: cfgBotName.value.trim(),
    allowFileUpload: cfgAllowFile.value === 'true',
    botBubbleColor: cfgBotBubble.value.trim(),
    userBubbleColor: cfgUserBubble.value.trim(),
    themeColor: cfgTheme.value.trim(),
    active: cfgActive.value === 'true'
  };
  try {
    await setDoc(ref, obj, { merge: true });
    showToast('Settings saved!');
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}
saveConfigBtn.addEventListener('click', (e) => withLoader(e.currentTarget, saveConfig));
toggleActiveBtn.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const ref = doc(db, 'config', 'global');
  const current = (latestConfig && latestConfig.active !== false);
  await setDoc(ref, { active: !current }, { merge: true });
  showToast(`Bot ${!current ? 'activated' : 'deactivated'}.`);
}));
saveQuickConfig.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const ref = doc(db, 'config', 'global');
  await setDoc(ref, { themeColor: cfgTheme.value.trim() }, { merge: true });
  showToast('Theme saved!');
}));
uploadProfileBtn.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const f = profileImageFile.files[0];
  if (!f) { showToast('Select an image.', 'error'); return; }
  const path = `admin-assets/profile-${Date.now()}-${f.name}`;
  const r = storageRef(storage, path);
  const snap = await uploadBytes(r, f);
  const url = await getDownloadURL(snap.ref);
  const ref = doc(db, 'config', 'global');
  await setDoc(ref, { profileImage: url }, { merge: true });
  showToast('Image uploaded!');
}));
savePersonaBtn.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const ref = doc(db, 'config', 'global');
  await setDoc(ref, { persona: personaText.value }, { merge: true });
  showToast('Persona saved!');
}));
restorePersonaBtn.addEventListener('click', () => { personaText.value = ''; });

function renderApiKeys(obj){
  apiKeysList.innerHTML = '';
  Object.entries(obj || {}).forEach(([id, k])=>{
    const row = document.createElement('div');
    row.className = 'api-row';
    row.innerHTML = `<input type="text" value="${(k.key||'')}" readonly />
      <select data-id-type="${id}"><option>text</option><option>image</option><option>tts</option><option>code</option></select>
      <label class="row" style="cursor:pointer"><input type="checkbox" data-enabled="${id}" ${k.enabled!==false? 'checked':''}/> enabled</label>
      <button data-del="${id}" class="btn ghost danger">Delete</button>`;
    apiKeysList.appendChild(row);
    row.querySelector('select').value = k.type || 'text';
    row.querySelector(`[data-del]`).addEventListener('click', () => removeApiKey(id));
    row.querySelector(`[data-enabled]`).addEventListener('change', (e) => toggleApiKeyEnabled(id, e.target.checked));
  });
}

addApiKeyBtn.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const type = newKeyType.value;
  const key = newKeyInput.value.trim();
  if (!key) { showToast('Key cannot be empty.', 'error'); return; }
  const id = 'k_' + Date.now();
  const ref = doc(db, 'config', 'global');
  const update = {};
  update[`apiKeys.${id}`] = { key, type, enabled: true };
  await updateDoc(ref, update).catch(async () => { await setDoc(ref, update, { merge: true }); });
  newKeyInput.value = '';
  showToast('API Key added.');
}));
async function removeApiKey(id){
  if (!confirm('Delete this API key?')) return;
  const ref = doc(db, 'config', 'global');
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const cfg = snap.data() || {};
  if (!cfg.apiKeys || !cfg.apiKeys[id]) return;
  delete cfg.apiKeys[id];
  await setDoc(ref, { apiKeys: cfg.apiKeys }, { merge: true });
  showToast('API Key removed.', 'error');
}

async function toggleApiKeyEnabled(id, enabled){
  const ref = doc(db, 'config', 'global');
  const update = {};
  update[`apiKeys.${id}.enabled`] = enabled;
  await updateDoc(ref, update);
  showToast(`Key ${enabled ? 'enabled' : 'disabled'}.`);
}

function subscribeUsers(){
  const ref = collection(db, 'users');
  if (usersUnsub) usersUnsub();
  usersUnsub = onSnapshot(ref, snap => {
    usersList.innerHTML = '';
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    totalUsersEl.textContent = users.length;
    users.forEach(u => {
      const el = document.createElement('div');
      el.className = 'card user-card';

      // --- MODIFICATION START ---
      // Get all the data points from the user object
      const flagUrl = u.flagUrl || ''; // Assuming you might add this to your tracking script later
      const city = u.city || 'N/A';
      const region = u.region || 'N/A';
      const country = u.country || 'N/A';
      const ip = u.ip || 'N/A';
      const os = u.os || 'N/A';
      const browser = u.browser || 'N/A';
      const network = u.network || u.isp || u.organization || 'N/A'; // Prioritize the new 'network' field
      const lastSeen = u.lastSeen ? new Date(u.lastSeen.seconds*1000).toLocaleString() : 'Never';
      
      // Get the NEW data points
      const activityStatus = u.activityStatus || 'N/A';
      const connection = u.connection || 'N/A';
      const latitude = u.latitude || 'N/A';
      const longitude = u.longitude || 'N/A';
      
      el.innerHTML = `
        <div class="user-card-header">
            <div class="user-info">
                ${flagUrl ? `<img src="${flagUrl}" alt="country flag" class="user-flag">` : `<div class="user-flag" style="width: 24px; height: 18px; background: #eee;"></div>`}
                <code class="user-id" title="Click to copy">${u.id}</code>
            </div>
            <div class="user-actions">
                <button data-id="${u.id}" class="btn ghost">Sessions</button>
                <button data-block="${u.id}" class="btn ${u.blocked ? 'danger' : 'ghost'}">${u.blocked ? 'Unblock' : 'Block'}</button>
            </div>
        </div>
        <div class="user-card-details">
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="detail-value">${activityStatus}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location</span>
                <span class="detail-value">${city}, ${region}, ${country}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">IP Address</span>
                <span class="detail-value">${ip}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Device</span>
                <span class="detail-value">${os} / ${browser}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Network / Carrier</span>
                <span class="detail-value">${network}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Connection</span>
                <span class="detail-value">${connection}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Coordinates</span>
                <span class="detail-value">${latitude}, ${longitude}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Last Seen</span>
                <span class="detail-value">${lastSeen}</span>
            </div>
        </div>`;
      // --- MODIFICATION END ---
      
      usersList.appendChild(el);
      
      const userIdEl = el.querySelector('.user-id');
      userIdEl.addEventListener('click', () => {
          navigator.clipboard.writeText(u.id);
          showToast('User ID copied!');
      });
      el.querySelector('[data-id]').addEventListener('click', () => {
        showView('sessions');
        openUserSessions(u.id);
      });
      el.querySelector('[data-block]').addEventListener('click', () => toggleUserBlock(u.id, !u.blocked));
    });
    refreshUserSelects(users.map(x => x.id));
  });
}

async function toggleUserBlock(uid, block){
  if (!confirm(`Are you sure you want to ${block ? 'block' : 'unblock'} this user?`)) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { blocked: block, blockedAt: block ? serverTimestamp() : null }, { merge: true });
  try {
    const snaps = await getDocs(collection(db, 'sessions', uid, 'items'));
    const batch = writeBatch(db);
    snaps.forEach(snap => {
      batch.update(snap.ref, { blocked: block, blockedByAdmin: block, blockReason: block ? 'Blocked by admin' : null });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Session metadata update failed', e);
  }
  showToast(`User ${block ? 'blocked' : 'unblocked'}.`);
}

async function openUserSessions(uid){
  sessionsList.innerHTML = 'Loading...';
  sessionMessages.innerHTML = '';
  sessionsUserSelect.value = uid;
  const snaps = await getDocs(collection(db, 'sessions', uid, 'items'));
  sessionsList.innerHTML = '';
  if (snaps.empty) { sessionsList.innerHTML = '<div class="small">No sessions.</div>'; return; }
  snaps.forEach(s => {
    const d = s.data();
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${d.title||'Untitled'}</strong><div class="small">${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleString() : ''}</div></div><div class="row"><button data-sid="${s.id}" class="btn">Open</button><button data-del="${s.id}" class="btn ghost danger">Delete</button></div></div>`;
    sessionsList.appendChild(el);
    el.querySelector('[data-sid]').addEventListener('click', () => loadSessionForUser(uid, s.id));
    el.querySelector('[data-del]').addEventListener('click', () => deleteSession(uid, s.id));
  });
}

async function loadSessionForUser(uid, sid){
  sessionMessages.innerHTML = 'Loading...';
  const snaps = await getDocs(query(collection(db, 'chats', uid, sid), orderBy('createdAt','asc')));
  sessionMessages.innerHTML = '';
  snaps.forEach(m => {
    const mm = m.data();
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<div><strong>${mm.sender}</strong><div class="small">${mm.text}</div><div class="small">${mm.createdAt ? new Date(mm.createdAt.seconds*1000).toLocaleString() : ''}</div></div>`;
    sessionMessages.appendChild(el);
  });
}

async function deleteSession(uid, sid){
  if (!confirm('Delete session?')) return;
  await deleteDoc(doc(db, 'sessions', uid, 'items', sid));
  showToast('Session deleted.', 'error');
  openUserSessions(uid);
}

function refreshUserSelects(userIds){
  [sessionsUserSelect, liveUserSelect].forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">Select user</option>';
    userIds.forEach(u => {
      const o = document.createElement('option');
      o.value = u; o.textContent = u; sel.appendChild(o);
    });
    if(userIds.includes(currentVal)) sel.value = currentVal;
  });
}
sessionsUserSelect.addEventListener('change', (e) => e.target.value && openUserSessions(e.target.value));

liveUserSelect.addEventListener('change', async (e) => {
  const uid = e.target.value;
  liveSessionSelect.innerHTML = '';
  if (!uid) return;
  const snaps = await getDocs(collection(db, 'sessions', uid, 'items'));
  snaps.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.data().title || s.id;
    liveSessionSelect.appendChild(o);
  });
});
watchBtn.addEventListener('click', (e) => withLoader(e.currentTarget, async () => {
  const uid = liveUserSelect.value;
  const sid = liveSessionSelect.value;
  if (!uid || !sid) { showToast('Select user and session.', 'error'); return; }
  if (chatsUnsub) chatsUnsub();
  liveChatArea.innerHTML = 'Starting live view...';
  chatsUnsub = onSnapshot(query(collection(db, 'chats', uid, sid), orderBy('createdAt', 'asc')), snap => {
    liveChatArea.innerHTML = '';
    if (snap.empty) { liveChatArea.innerHTML = '<div class="small">No messages.</div>'; }
    snap.forEach(m => {
      const mm = m.data();
      const el = document.createElement('div');
      
      el.className = 'card';
      el.innerHTML = `<div><strong>${mm.sender}</strong><div class="small">${mm.text}</div><div class="small">${mm.createdAt ? new Date(mm.createdAt.seconds*1000).toLocaleString() : ''}</div></div>`;
      liveChatArea.appendChild(el);
    });
    liveChatArea.scrollTop = liveChatArea.scrollHeight;
  });
}));
function subscribeLogs(){
  const ref = doc(db, 'config', 'global');
  onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    const li = document.createElement('div');
    li.className = 'card';
    li.textContent = 'config/global updated at ' + new Date().toLocaleString();
    logsList.prepend(li);
    if (logsList.children.length > 50) logsList.removeChild(logsList.lastChild);
  });
}

async function getAllSessionsCount(){
  try {
    const us = await getDocs(collection(db, 'users'));
    let total = 0;
    for (const u of us.docs) {
      const snaps = await getDocs(collection(db, 'sessions', u.id, 'items'));
      total += snaps.size;
    }
    totalSessionsEl.textContent = total;
  } catch (e) { console.warn('count sessions failed', e);
  }
}

async function refreshRecentActivity(){
  recentList.innerHTML = '';
  const us = await getDocs(query(collection(db, 'users'), orderBy('lastSeen', 'desc'),));
  us.forEach(u => {
    const data = u.data();
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${u.id}</strong><div class="small">Last seen: ${data.lastSeen ? new Date(data.lastSeen.seconds*1000).toLocaleString() : 'N/A'}</div></div><div><span style="background:var(--bg); padding:0.25rem 0.5rem; border-radius:99px; font-size:0.75rem; border:1px solid var(--border-default)">${data.blocked ? 'Blocked' : 'Active'}</span></div></div>`;
    recentList.appendChild(el);
  });
}
