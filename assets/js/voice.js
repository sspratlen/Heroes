// ════════════════════════════════════════════════════
//  HEROES VOICE ASSISTANT  —  assets/js/voice.js
//  Requires: data.js (loadData, getTeamRecord) loaded first
//  Uses: Web Speech API (SpeechRecognition + SpeechSynthesis)
//        Anthropic Claude API (claude-haiku-4-5, direct browser call)
// ════════════════════════════════════════════════════

const HeroesVoice = (() => {
  'use strict';

  // ── Config ──────────────────────────────────────────
  const MODEL      = 'claude-haiku-4-5';
  const MAX_TOKENS = 512;
  const MAX_HISTORY = 10;   // messages to retain in context window

  // ── State ───────────────────────────────────────────
  let apiKey      = '';
  let recognition = null;
  let synth       = window.speechSynthesis;
  let isListening = false;
  let history     = [];   // [{role, content}]
  let msgList     = null;
  let micBtn      = null;
  let statusEl    = null;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSpeech = !!SpeechRec;
  const hasSynth  = !!synth;

  // ── System Prompt ────────────────────────────────────
  function buildSystemPrompt() {
    try {
      const d     = loadData();
      const today = new Date().toLocaleDateString('en-US',
        { weekday:'long', year:'numeric', month:'long', day:'numeric' });

      const teams = d.teams.map(t => {
        const rec    = getTeamRecord(t.id);
        const roster = d.players.filter(p => p.active && p.teams.includes(t.id));
        return `• ${t.name} (${t.division} Div, Mgr: ${t.manager||'TBD'}) — Record: ${rec.wins}W-${rec.losses}L${rec.ties?'-'+rec.ties+'T':''}, ${roster.length} players`;
      }).join('\n');

      const now      = new Date();
      const upcoming = d.games
        .filter(g => new Date(g.date+'T12:00:00') >= now && !g.result)
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map(g => {
          const t = d.teams.find(x => x.id === g.teamId);
          return `  ${g.date}: ${t?.name||g.teamId} vs ${g.opponent}${g.location?' @ '+g.location:''}`;
        }).join('\n') || '  None scheduled';

      const recent = d.games
        .filter(g => g.result)
        .sort((a,b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map(g => {
          const t = d.teams.find(x => x.id === g.teamId);
          const score = (g.runsScored != null && g.runsAllowed != null)
            ? ` (${g.runsScored}-${g.runsAllowed})` : '';
          return `  ${g.date}: ${t?.name||g.teamId} ${g.result}${score} vs ${g.opponent}`;
        }).join('\n') || '  No recorded results';

      const events = d.events
        .filter(e => e.status === 'upcoming' || e.status === 'active')
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(0, 4)
        .map(e => `  ${e.date}: ${e.name} @ ${e.location}`)
        .join('\n') || '  None upcoming';

      return `You are the Heroes Senior Softball assistant — a friendly, knowledgeable voice AI for the Heroes SSB organization in Omaha, NE.

Today is ${today}.

TEAMS:
${teams}

UPCOMING GAMES:
${upcoming}

RECENT RESULTS:
${recent}

UPCOMING EVENTS & TOURNAMENTS:
${events}

GUIDELINES:
- Keep answers short and natural for voice (2–4 sentences).
- Be enthusiastic and supportive of Heroes SSB.
- Quote specific numbers from the data above when asked.
- If information isn't in the data, say so honestly.
- Speak conversationally — no bullet lists or markdown.`;
    } catch {
      return `You are the Heroes Senior Softball assistant for Heroes SSB in Omaha, NE.
Be friendly, concise, and supportive. Keep answers short for voice playback.`;
    }
  }

  // ── Claude API ───────────────────────────────────────
  async function askClaude(userText) {
    if (!apiKey) {
      return "I need an API key to work. Tap the gear icon to add your Anthropic key.";
    }

    history.push({ role: 'user', content: userText });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-use': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(),
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        history.pop();
        if (res.status === 401) return "That API key doesn't seem to be valid. Check your settings.";
        return `Sorry, I hit a snag: ${err.error?.message || res.statusText}`;
      }

      const data  = await res.json();
      const reply = data.content?.[0]?.text || "I didn't catch that — try again?";
      history.push({ role: 'assistant', content: reply });
      return reply;
    } catch (e) {
      history.pop();
      return "Connection error. Please check your internet and try again.";
    }
  }

  // ── Speech Synthesis ─────────────────────────────────
  function speak(text) {
    if (!hasSynth) return;
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 1.02;
    utt.pitch = 1.0;
    // Prefer a natural local English voice
    const voices    = synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha'))
                   || voices.find(v => v.lang === 'en-US' && v.localService)
                   || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    setStatus('Speaking…');
    utt.onend = utt.onerror = () => setStatus('');
    synth.speak(utt);
  }

  // ── Speech Recognition ───────────────────────────────
  function startListening() {
    if (!hasSpeech || isListening) return;
    synth.cancel();
    recognition        = new SpeechRec();
    recognition.lang   = 'en-US';
    recognition.continuous    = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('hv-listening');
      setStatus('Listening…');
    };

    recognition.onresult = async (e) => {
      const text = e.results[0][0].transcript.trim();
      stopListening();
      if (!text) return;
      addMsg('user', text);
      setStatus('Thinking…');
      micBtn.disabled = true;
      const reply = await askClaude(text);
      micBtn.disabled = false;
      addMsg('assistant', reply);
      speak(reply);
    };

    recognition.onerror = (e) => {
      stopListening();
      if (e.error !== 'no-speech') addMsg('system', `Mic error: ${e.error}`);
    };

    recognition.onend = () => stopListening();
    recognition.start();
  }

  function stopListening() {
    isListening = false;
    micBtn?.classList.remove('hv-listening');
    try { recognition?.stop(); } catch {}
    if (statusEl?.textContent === 'Listening…') setStatus('');
  }

  // ── UI helpers ───────────────────────────────────────
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function addMsg(role, text) {
    if (!msgList) return;
    const div = document.createElement('div');
    div.className = `hv-msg hv-msg-${role}`;
    div.textContent = text;
    msgList.appendChild(div);
    msgList.scrollTop = msgList.scrollHeight;
  }

  // ── Key storage ──────────────────────────────────────
  function loadKey() {
    apiKey = localStorage.getItem('heroes_voice_key') || window.HEROES_API_KEY || '';
  }
  function saveKey(k) {
    apiKey = k.trim();
    if (apiKey) localStorage.setItem('heroes_voice_key', apiKey);
    else localStorage.removeItem('heroes_voice_key');
  }

  // ── CSS injection ────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('hv-styles')) return;
    const s = document.createElement('style');
    s.id = 'hv-styles';
    s.textContent = `
      /* ── FAB (floating action button) ── */
      #hv-fab {
        position:fixed; bottom:28px; right:28px; z-index:9000;
        width:54px; height:54px; border-radius:50%;
        background:var(--red,#C8102E); color:#fff;
        border:none; cursor:pointer; font-size:22px;
        box-shadow:0 4px 24px rgba(200,16,46,.45);
        display:flex; align-items:center; justify-content:center;
        transition:transform .18s, box-shadow .18s, background .18s;
        line-height:1;
      }
      #hv-fab:hover { transform:scale(1.09); box-shadow:0 6px 32px rgba(200,16,46,.55); }
      #hv-fab.open  { background:#111; box-shadow:0 4px 24px rgba(0,0,0,.35); }

      /* ── Panel ── */
      #hv-panel {
        position:fixed; bottom:94px; right:28px; z-index:9000;
        width:340px;
        background:#fff; border-radius:18px;
        box-shadow:0 8px 48px rgba(0,0,0,.18);
        display:flex; flex-direction:column; overflow:hidden;
        opacity:0; transform:translateY(14px) scale(.97);
        transition:opacity .2s, transform .2s;
        pointer-events:none;
      }
      #hv-panel.hv-open { opacity:1; transform:none; pointer-events:auto; }

      /* ── Header ── */
      .hv-header {
        background:var(--red,#C8102E); color:#fff;
        padding:13px 16px; display:flex; align-items:center; gap:10px;
        flex-shrink:0;
      }
      .hv-header-icon  { font-size:18px; }
      .hv-header-title { flex:1; font-size:14px; font-weight:800; letter-spacing:.3px; }
      .hv-header-gear  {
        background:none; border:none; color:rgba(255,255,255,.75);
        font-size:15px; cursor:pointer; padding:3px 6px; border-radius:6px;
        transition:background .15s, color .15s;
      }
      .hv-header-gear:hover { background:rgba(255,255,255,.18); color:#fff; }

      /* ── Message list ── */
      #hv-msgs {
        flex:1; overflow-y:auto; padding:14px 14px 6px;
        display:flex; flex-direction:column; gap:9px;
        min-height:130px; max-height:280px;
        scroll-behavior:smooth;
      }
      .hv-msg {
        max-width:84%; padding:9px 13px; border-radius:14px;
        font-size:13px; line-height:1.55; word-break:break-word;
      }
      .hv-msg-user      { background:var(--red,#C8102E); color:#fff; align-self:flex-end; border-bottom-right-radius:3px; }
      .hv-msg-assistant { background:#f1f5f9; color:#1e293b; align-self:flex-start; border-bottom-left-radius:3px; }
      .hv-msg-system    { font-size:11px; color:#94a3b8; text-align:center; align-self:center; font-style:italic; }

      /* ── Bottom bar ── */
      .hv-bottom {
        border-top:1px solid #e2e8f0; padding:10px 12px;
        display:flex; align-items:center; gap:8px; flex-shrink:0;
      }
      #hv-text-input {
        flex:1; border:1px solid #e2e8f0; border-radius:22px;
        padding:8px 14px; font-size:13px; outline:none;
        font-family:inherit; transition:border-color .15s;
        min-width:0;
      }
      #hv-text-input:focus { border-color:var(--red,#C8102E); }
      #hv-send {
        width:34px; height:34px; flex-shrink:0; border-radius:50%;
        background:#1e293b; color:#fff;
        border:none; cursor:pointer; font-size:13px;
        display:flex; align-items:center; justify-content:center;
        transition:background .15s;
      }
      #hv-send:hover:not(:disabled) { background:var(--red,#C8102E); }
      #hv-send:disabled { opacity:.45; cursor:not-allowed; }

      /* ── Mic button ── */
      #hv-mic {
        width:36px; height:36px; flex-shrink:0; border-radius:50%;
        background:var(--red,#C8102E); color:#fff;
        border:none; cursor:pointer; font-size:15px;
        display:flex; align-items:center; justify-content:center;
        transition:transform .15s, background .15s;
      }
      #hv-mic:hover:not(:disabled) { transform:scale(1.1); }
      #hv-mic:disabled { opacity:.45; cursor:not-allowed; }
      #hv-mic.hv-listening {
        background:#16a34a;
        animation:hv-pulse 1.3s ease-in-out infinite;
      }
      @keyframes hv-pulse {
        0%,100% { box-shadow:0 0 0 0 rgba(22,163,74,.5); }
        55%      { box-shadow:0 0 0 9px rgba(22,163,74,.0); }
      }
      .hv-no-speech #hv-mic { display:none; }

      /* ── Status text ── */
      #hv-status {
        font-size:11px; color:#94a3b8; font-style:italic;
        padding:0 14px 8px; flex-shrink:0; min-height:18px;
      }

      /* ── Settings overlay ── */
      #hv-settings {
        position:absolute; inset:0; background:#fff; border-radius:18px;
        padding:18px; display:flex; flex-direction:column; gap:14px;
        opacity:0; pointer-events:none; transition:opacity .18s; z-index:1;
      }
      #hv-settings.hv-open { opacity:1; pointer-events:auto; }
      .hvs-back {
        background:none; border:none; color:#64748b; font-size:13px;
        cursor:pointer; text-align:left; padding:0; font-family:inherit;
      }
      .hvs-back:hover { color:#1e293b; }
      .hvs-title { font-size:15px; font-weight:800; color:#1e293b; }
      .hvs-label { font-size:11px; font-weight:800; text-transform:uppercase;
                   letter-spacing:.5px; color:#64748b; margin-bottom:5px; }
      #hv-key-input {
        width:100%; border:1px solid #e2e8f0; border-radius:8px;
        padding:9px 12px; font-size:13px; font-family:monospace;
        box-sizing:border-box; outline:none;
      }
      #hv-key-input:focus { border-color:var(--red,#C8102E); }
      .hvs-hint { font-size:12px; color:#94a3b8; line-height:1.55; }
      .hvs-hint a { color:var(--red,#C8102E); }
      .hvs-save {
        background:var(--red,#C8102E); color:#fff; border:none; border-radius:9px;
        padding:10px 16px; font-size:13px; font-weight:700; cursor:pointer;
        font-family:inherit;
      }
      .hvs-save:hover { opacity:.9; }
      .hvs-danger { background:none; border:none; color:#ef4444; font-size:12px;
                    cursor:pointer; text-align:left; font-family:inherit; padding:0; }
      .hvs-danger:hover { text-decoration:underline; }

      /* ── Mobile ── */
      @media(max-width:420px) {
        #hv-panel { right:12px; left:12px; width:auto; bottom:84px; }
        #hv-fab   { bottom:18px; right:18px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Build DOM ────────────────────────────────────────
  function buildUI() {
    // FAB
    const fab = document.createElement('button');
    fab.id    = 'hv-fab';
    fab.title = 'Heroes Voice Assistant';
    fab.innerHTML = '🎙️';
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'hv-panel';
    if (!hasSpeech) panel.classList.add('hv-no-speech');
    panel.innerHTML = `
      <div class="hv-header">
        <span class="hv-header-icon">⚾</span>
        <span class="hv-header-title">Heroes Assistant</span>
        <button class="hv-header-gear" id="hv-open-gear" title="Settings">⚙️</button>
      </div>
      <div id="hv-msgs"></div>
      <div id="hv-status"></div>
      <div class="hv-bottom">
        <input id="hv-text-input" type="text" placeholder="Ask anything about Heroes…" autocomplete="off" />
        <button id="hv-send" title="Send">➤</button>
        <button id="hv-mic"  title="Speak">🎙️</button>
      </div>

      <div id="hv-settings">
        <button class="hvs-back" id="hv-close-gear">← Back</button>
        <div class="hvs-title">Assistant Settings</div>
        <div>
          <div class="hvs-label">Anthropic API Key</div>
          <input id="hv-key-input" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false" />
          <p class="hvs-hint" style="margin-top:6px">
            Get a free key at
            <a href="https://console.anthropic.com/keys" target="_blank">console.anthropic.com</a>.
            Stored in your browser only.
          </p>
        </div>
        <button class="hvs-save" id="hv-save-key">Save Key</button>
        <button class="hvs-danger" id="hv-clear-chat">Clear conversation</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Grab refs
    msgList  = panel.querySelector('#hv-msgs');
    statusEl = panel.querySelector('#hv-status');
    micBtn   = panel.querySelector('#hv-mic');

    // ── Event wiring ──
    micBtn.addEventListener('click', () => {
      if (isListening) stopListening();
      else startListening();
    });

    const textInput = panel.querySelector('#hv-text-input');
    const sendBtn   = panel.querySelector('#hv-send');

    async function handleSend() {
      const text = textInput.value.trim();
      if (!text) return;
      textInput.value = '';
      addMsg('user', text);
      setStatus('Thinking…');
      sendBtn.disabled = true;
      micBtn.disabled  = true;
      const reply = await askClaude(text);
      sendBtn.disabled = false;
      micBtn.disabled  = false;
      addMsg('assistant', reply);
      setStatus('');
      speak(reply);
    }

    sendBtn.addEventListener('click', handleSend);
    textInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

    panel.querySelector('#hv-open-gear').addEventListener('click', openSettings);
    panel.querySelector('#hv-close-gear').addEventListener('click', closeSettings);

    panel.querySelector('#hv-save-key').addEventListener('click', () => {
      saveKey(panel.querySelector('#hv-key-input').value);
      closeSettings();
      addMsg('system', apiKey ? '✅ API key saved.' : 'Key cleared.');
    });

    panel.querySelector('#hv-clear-chat').addEventListener('click', () => {
      history = [];
      msgList.innerHTML = '';
      closeSettings();
      addMsg('system', 'Conversation cleared.');
    });

    // Welcome
    const welcome = hasSpeech
      ? '👋 Hi! Tap 🎙️ to ask me anything about the Heroes, or type below.'
      : '👋 Hi! Type a question about the Heroes below.';
    addMsg('system', welcome);

    // Prompt for key if missing
    if (!apiKey) {
      setTimeout(() => addMsg('system', '⚙️ Tap the gear to add your Anthropic API key.'), 600);
    }
  }

  function togglePanel() {
    const panel = document.getElementById('hv-panel');
    const fab   = document.getElementById('hv-fab');
    const opening = !panel.classList.contains('hv-open');
    panel.classList.toggle('hv-open', opening);
    fab.classList.toggle('open', opening);
    fab.innerHTML = opening ? '✕' : '🎙️';
    if (!opening) { stopListening(); synth.cancel(); }
  }

  function openSettings() {
    const s = document.getElementById('hv-settings');
    const k = document.getElementById('hv-key-input');
    if (apiKey) k.value = apiKey;
    s.classList.add('hv-open');
  }

  function closeSettings() {
    document.getElementById('hv-settings').classList.remove('hv-open');
  }

  // ── Init ─────────────────────────────────────────────
  function init() {
    // Wait until fonts / layout are ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _boot);
    } else {
      _boot();
    }
  }

  function _boot() {
    loadKey();
    injectStyles();
    buildUI();
    // Preload voices (Chrome lazy-loads them)
    if (hasSynth) synth.getVoices();
  }

  return { init };
})();

HeroesVoice.init();
