/* ============================================================
   HEROES SENIOR SOFTBALL — Photo Picker
   Shared utility for uploading / selecting player photos via
   Supabase Storage (bucket: "player-photos").

   Requires: data.js loaded first  (_getClient() must exist)
   Exposes:
     HeroesPhotos.uploadPhoto(file, teamId, playerId) → { url, path } | { error }
     HeroesPhotos.getTeamGallery(teamId) → [{ name, url, path }]
     window.showPhotoPickerModal({ currentUrl, teamId, playerId, onSave })

   Storage layout:
     player-photos/
       {teamId}/
         {playerId}-{timestamp}.{ext}

   Bucket must be created in Supabase dashboard as a PUBLIC bucket
   with RLS:  select = public,  insert/update = authenticated.
   ============================================================ */

'use strict';

// ── Storage helpers ───────────────────────────────────────────

const HeroesPhotos = {

  /**
   * uploadPhoto(file, teamId, playerId)
   * Uploads an image to the player-photos bucket.
   * Returns { url, path } on success or { error } on failure.
   */
  async uploadPhoto(file, teamId, playerId) {
    const sb = (typeof _getClient === 'function') ? _getClient() : null;
    if (!sb) return { error: { message: 'Storage service unavailable.' } };

    const ext  = (file.name.split('.').pop() || 'jpg')
                   .toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const safe = (String(playerId || 'unknown')).replace(/[^a-z0-9_-]/gi, '');
    const path = `${teamId}/${safe}-${Date.now()}.${ext}`;

    const { error } = await sb.storage.from('player-photos').upload(path, file, {
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });
    if (error) return { error };

    const { data: { publicUrl } } = sb.storage.from('player-photos').getPublicUrl(path);
    return { url: publicUrl, path };
  },

  /**
   * getTeamGallery(teamId)
   * Lists all photos in the team's storage folder, newest first.
   * Returns array of { name, url, path }.
   */
  async getTeamGallery(teamId) {
    const sb = (typeof _getClient === 'function') ? _getClient() : null;
    if (!sb) return [];

    const { data, error } = await sb.storage
      .from('player-photos')
      .list(teamId, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

    if (error || !data) return [];

    return data
      .filter(f => f.name && !f.name.startsWith('.') && f.id)
      .map(f => {
        const path = `${teamId}/${f.name}`;
        const { data: { publicUrl } } = sb.storage
          .from('player-photos')
          .getPublicUrl(path);
        return { name: f.name, url: publicUrl, path };
      });
  },
};


// ── Photo Picker Modal ────────────────────────────────────────
// Module-level state — only one picker open at a time.
let _ppState = null;

function _ppClose() {
  document.getElementById('pp-overlay')?.remove();
  _ppState = null;
}

function _ppSetBtn(id, enabled) {
  const el = document.getElementById(id);
  if (!el) return;
  el.disabled       = !enabled;
  el.style.opacity  = enabled ? '1' : '0.45';
  el.style.cursor   = enabled ? 'pointer' : 'not-allowed';
}

// Switch between Upload and Gallery tabs
window._ppSwitchTab = function(tab) {
  ['upload', 'gallery'].forEach(t => {
    const panel = document.getElementById(`pp-panel-${t}`);
    const btn   = document.getElementById(`pp-tab-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.classList.toggle('pp-tab-on', t === tab);
  });
  if (tab === 'gallery' && _ppState && !_ppState._galleryLoaded) {
    _ppLoadGallery();
  }
};

// Load team gallery into the grid
async function _ppLoadGallery() {
  if (!_ppState) return;
  _ppState._galleryLoaded = true;

  const grid   = document.getElementById('pp-gallery-grid');
  const status = document.getElementById('pp-gallery-status');
  if (!grid || !status) return;

  const { teamId } = _ppState;
  if (!teamId) {
    status.textContent   = 'No team selected — cannot load gallery.';
    status.style.display = '';
    return;
  }

  status.textContent   = 'Loading gallery…';
  status.style.display = '';
  grid.innerHTML       = '';

  const photos = await HeroesPhotos.getTeamGallery(teamId);
  status.style.display = 'none';

  if (!photos.length) {
    grid.innerHTML = `
      <p style="color:#aaa;font-size:13px;text-align:center;padding:24px 0;grid-column:1/-1">
        No photos in this team's gallery yet.<br>Upload the first one!
      </p>`;
    return;
  }

  grid.innerHTML = photos.map(p => `
    <div class="pp-gthumb" data-gp-url="${p.url}" onclick="window._ppSelectGallery('${p.url}')">
      <img src="${p.url}" loading="lazy" alt=""
           onerror="this.closest('.pp-gthumb').style.display='none'">
    </div>`).join('');
}

// User clicks a gallery thumbnail
window._ppSelectGallery = function(url) {
  if (!_ppState) return;
  _ppState._selectedUrl = url;
  _ppState._previewFile = null;
  document.querySelectorAll('.pp-gthumb').forEach(el => {
    el.classList.toggle('pp-gthumb-sel', el.dataset.gpUrl === url);
  });
  const notice = document.getElementById('pp-gallery-notice');
  if (notice) notice.style.display = '';
  _ppSetBtn('pp-use-btn', true);
};

// Upload the chosen file to Supabase Storage
window._ppDoUpload = async function() {
  if (!_ppState?._previewFile) return;
  const errEl = document.getElementById('pp-upload-err');
  const btn   = document.getElementById('pp-upload-btn');
  if (!btn) return;

  btn.disabled    = true;
  btn.textContent = '⏳ Uploading…';
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  const { teamId, playerId } = _ppState;
  const { url, error } = await HeroesPhotos.uploadPhoto(
    _ppState._previewFile,
    teamId    || 'general',
    playerId  || 'unknown'
  );

  if (error) {
    if (errEl) {
      errEl.textContent = error.message?.includes('not found')
        ? 'Storage bucket "player-photos" not found. Create it in Supabase dashboard.'
        : (error.message || 'Upload failed. Check storage permissions.');
      errEl.style.display = '';
    }
    btn.disabled    = false;
    btn.textContent = '📤 Upload & Use This Photo';
    return;
  }

  // Uploaded — auto-apply
  _ppState._selectedUrl = url;
  _ppState._previewFile = null;
  btn.textContent = '✓ Uploaded!';
  window._ppUseSelected();
};

// Confirm & apply the selected photo
window._ppUseSelected = function() {
  if (!_ppState?._selectedUrl) return;
  const { _selectedUrl: url, onSave } = _ppState;
  _ppClose();
  if (typeof onSave === 'function') onSave(url);
};

/**
 * showPhotoPickerModal(opts)
 * Opens the photo picker.
 *
 * opts:
 *   currentUrl  — existing photo URL (shown as current preview)
 *   teamId      — Storage folder name, e.g. "50s-aaa"
 *   playerId    — used in the stored filename
 *   onSave(url) — called when the user confirms a selection
 */
window.showPhotoPickerModal = function(opts) {
  const { currentUrl = '', teamId = '', playerId = '', onSave } = opts || {};

  // Remove any existing picker
  document.getElementById('pp-overlay')?.remove();

  // Init state
  _ppState = {
    currentUrl, teamId, playerId, onSave,
    _selectedUrl: null, _previewFile: null, _galleryLoaded: false,
  };

  const thumbHtml = currentUrl
    ? `<img src="${currentUrl}" style="width:100%;height:100%;object-fit:cover"
            onerror="this.parentElement.innerHTML='<span style=font-size:28px;color:#ccc>👤</span>'">`
    : `<span style="font-size:28px;color:#ccc">👤</span>`;

  const overlay = document.createElement('div');
  overlay.id    = 'pp-overlay';
  overlay.innerHTML = `
<div class="pp-backdrop">
  <div class="pp-modal" role="dialog" aria-modal="true" aria-label="Player Photo Picker">
    <!-- Header -->
    <div class="pp-header">
      <div>
        <div class="pp-eyebrow">PLAYER PHOTO</div>
        <div class="pp-title">Upload or Select Photo</div>
      </div>
      <button class="pp-close" onclick="_ppClose()" aria-label="Close">✕</button>
    </div>

    <!-- Tabs -->
    <div class="pp-tabs">
      <button id="pp-tab-upload"  class="pp-tab pp-tab-on" onclick="_ppSwitchTab('upload')">📤 UPLOAD NEW</button>
      <button id="pp-tab-gallery" class="pp-tab"           onclick="_ppSwitchTab('gallery')">🖼 TEAM GALLERY</button>
    </div>

    <!-- Body -->
    <div class="pp-body">

      <!-- Upload panel -->
      <div id="pp-panel-upload">
        <div class="pp-preview-row">
          <div class="pp-preview-circle">${thumbHtml}</div>
          <div class="pp-preview-lbl">${currentUrl ? 'Current photo' : 'No photo set'}</div>
        </div>
        <label for="pp-file-input" class="pp-dropzone" id="pp-dropzone">
          <span class="pp-dropzone-icon">📷</span>
          <strong>Click to choose a photo</strong>
          <span class="pp-dropzone-hint">JPG, PNG or WEBP — max 5 MB</span>
          <input id="pp-file-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none">
        </label>
        <div id="pp-upload-err" class="pp-err" style="display:none"></div>
        <button id="pp-upload-btn" class="pp-act-btn" onclick="_ppDoUpload()" disabled
                style="opacity:.45;cursor:not-allowed">
          📤 Upload &amp; Use This Photo
        </button>
      </div>

      <!-- Gallery panel -->
      <div id="pp-panel-gallery" style="display:none">
        <div id="pp-gallery-status" style="text-align:center;padding:20px;color:#aaa;font-size:13px">
          Loading gallery…
        </div>
        <div id="pp-gallery-grid" class="pp-gallery-grid"></div>
        <div id="pp-gallery-notice" class="pp-gallery-notice" style="display:none">
          ✓ Photo selected — click "Use This Photo" below
        </div>
      </div>

    </div><!-- /body -->

    <!-- Footer -->
    <div class="pp-footer">
      <button class="pp-btn-sec" onclick="_ppClose()">Cancel</button>
      <button id="pp-use-btn" class="pp-btn-pri" onclick="_ppUseSelected()" disabled
              style="opacity:.45;cursor:not-allowed">
        Use This Photo
      </button>
    </div>
  </div>
</div>

<style>
/* ── Photo Picker Modal CSS ──────────────────────────────── */
.pp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;
  display:flex;align-items:center;justify-content:center;padding:16px}
.pp-modal{background:#fff;border-radius:12px;width:100%;max-width:520px;
  max-height:90vh;overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 24px 60px rgba(0,0,0,.45)}

/* header */
.pp-header{display:flex;align-items:center;justify-content:space-between;
  padding:18px 20px 14px;border-bottom:1px solid #e5e7eb}
.pp-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.2px;color:#aaa;margin-bottom:2px}
.pp-title{font-size:17px;font-weight:800;color:#111}
.pp-close{background:none;border:none;font-size:20px;cursor:pointer;color:#888;
  padding:4px 8px;line-height:1;border-radius:4px}
.pp-close:hover{background:#f3f4f6;color:#111}

/* tabs */
.pp-tabs{display:flex;border-bottom:1px solid #e5e7eb;padding:0 12px}
.pp-tab{padding:10px 16px;font-size:12px;font-weight:800;letter-spacing:.5px;
  border:none;border-bottom:3px solid transparent;background:none;cursor:pointer;
  color:#888;transition:color .15s,border-color .15s}
.pp-tab-on{color:#C8102E;border-bottom-color:#C8102E}

/* body */
.pp-body{padding:20px;overflow-y:auto;flex:1}

/* current preview */
.pp-preview-row{display:flex;flex-direction:column;align-items:center;margin-bottom:16px}
.pp-preview-circle{width:80px;height:80px;border-radius:50%;overflow:hidden;
  background:#f3f4f6;border:3px solid #e5e7eb;
  display:flex;align-items:center;justify-content:center;margin-bottom:6px}
.pp-preview-lbl{font-size:11px;color:#aaa}

/* drop zone */
.pp-dropzone{display:block;border:2px dashed #d1d5db;border-radius:8px;
  padding:22px 16px;text-align:center;cursor:pointer;
  transition:border-color .2s,background .2s;margin-bottom:12px;
  font-size:13px;font-weight:600;color:#374151}
.pp-dropzone:hover{border-color:#C8102E;background:#fff5f5}
.pp-dropzone-icon{font-size:32px;display:block;margin-bottom:8px}
.pp-dropzone-hint{display:block;font-size:11px;color:#9ca3af;margin-top:4px;font-weight:400}

/* buttons */
.pp-act-btn{width:100%;padding:10px 16px;background:#C8102E;color:#fff;border:none;
  border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .15s}
.pp-act-btn:hover:not(:disabled){opacity:.88}
.pp-err{color:#dc2626;font-size:12px;margin-bottom:8px;line-height:1.4}

/* gallery */
.pp-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.pp-gthumb{aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;
  border:3px solid transparent;transition:border-color .15s,transform .1s}
.pp-gthumb:hover{transform:scale(1.05);border-color:#fca5a5}
.pp-gthumb-sel{border-color:#C8102E!important}
.pp-gthumb img{width:100%;height:100%;object-fit:cover;display:block}
.pp-gallery-notice{margin-top:12px;padding:10px 14px;background:#f0fdf4;
  border:1px solid #bbf7d0;border-radius:6px;font-size:12px;color:#15803d;text-align:center}

/* footer */
.pp-footer{display:flex;gap:10px;padding:14px 20px;border-top:1px solid #e5e7eb}
.pp-btn-sec{flex:1;padding:10px;border:1px solid #d1d5db;border-radius:6px;
  background:#fff;cursor:pointer;font-weight:600;font-size:13px}
.pp-btn-sec:hover{background:#f9fafb}
.pp-btn-pri{flex:2;padding:10px;background:#C8102E;color:#fff;border:none;
  border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .15s}
.pp-btn-pri:hover:not(:disabled){opacity:.88}

/* photo widget used in forms */
.ph-widget{display:flex;align-items:center;gap:12px}
.ph-widget-thumb{width:56px;height:56px;border-radius:50%;overflow:hidden;
  background:#f3f4f6;border:2px solid #e5e7eb;flex-shrink:0;
  display:flex;align-items:center;justify-content:center}
.ph-widget-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ph-widget-right{flex:1;min-width:0}
.ph-widget-url{font-size:11px;color:#9ca3af;margin-bottom:6px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ph-widget-btns{display:flex;gap:6px;flex-wrap:wrap}

@media(max-width:480px){
  .pp-modal{max-height:96vh;border-radius:10px 10px 0 0;align-self:flex-end}
  .pp-backdrop{align-items:flex-end;padding:0}
  .pp-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(72px,1fr))}
}
</style>`;

  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.querySelector('.pp-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) _ppClose();
  });

  // File-input change handler
  overlay.querySelector('#pp-file-input').addEventListener('change', function() {
    const file  = this.files?.[0];
    const errEl = document.getElementById('pp-upload-err');
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (errEl) { errEl.textContent = 'File too large — max 5 MB.'; errEl.style.display = ''; }
      return;
    }
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

    _ppState._previewFile = file;
    _ppState._selectedUrl = null;

    // Update circle preview with local data-URL
    const reader = new FileReader();
    reader.onload = evt => {
      const circle = document.querySelector('.pp-preview-circle');
      if (circle) circle.innerHTML =
        `<img src="${evt.target.result}" style="width:100%;height:100%;object-fit:cover">`;
      const lbl = document.querySelector('.pp-preview-lbl');
      if (lbl) lbl.textContent = 'Selected (not yet uploaded)';
    };
    reader.readAsDataURL(file);

    // Update drop-zone label
    const dz = document.getElementById('pp-dropzone');
    if (dz) {
      const strong = dz.querySelector('strong');
      if (strong) {
        const name = file.name;
        strong.textContent = name.length > 36 ? name.slice(0, 34) + '…' : name;
      }
    }

    _ppSetBtn('pp-upload-btn', true);
    _ppSetBtn('pp-use-btn', false);
  });
};
