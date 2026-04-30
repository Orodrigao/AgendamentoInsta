// =============================================
// PANE & SALUTE — AGENDADOR DE POSTS
// =============================================

const state = {
  mode: 'manual',
  copyApproved: false,
  approvedCopy: '',
  imageFile: null,
};

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setDefaultDate();
  loadHistory();
});

function setDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  document.getElementById('post-date').value = d.toISOString().split('T')[0];
}

// =====================
// SETTINGS
// =====================
function saveSettings() {
  const fields = ['buffer-key', 'cloudinary-cloud', 'cloudinary-preset', 'buffer-instagram', 'buffer-facebook'];
  fields.forEach(id => {
    const val = document.getElementById(id).value.trim();
    if (val) localStorage.setItem('ps_' + id, val);
  });
  showStatus('schedule-status', 'success', '✓ Configurações salvas com sucesso.');
}

function loadSettings() {
  const fields = ['buffer-key', 'cloudinary-cloud', 'cloudinary-preset', 'buffer-instagram', 'buffer-facebook'];
  fields.forEach(id => {
    const val = localStorage.getItem('ps_' + id);
    if (val) document.getElementById(id).value = val;
  });
}

function toggleSettings() {
  const p = document.getElementById('settings-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function toggleHistory() {
  const h = document.getElementById('history-section');
  h.style.display = h.style.display === 'none' ? 'block' : 'none';
}

// Busca os canais disponíveis no Buffer para mostrar os IDs
async function loadBufferChannels() {
  const key = localStorage.getItem('ps_buffer-key');
  if (!key) {
    document.getElementById('channels-list').innerHTML = '⚠️ Salve a chave do Buffer primeiro.';
    return;
  }

  document.getElementById('channels-list').innerHTML = '⏳ Buscando canais...';

  try {
    const res = await fetch('/api/buffer?action=profiles&access_token=' + encodeURIComponent(key));
    const profiles = await res.json();

    if (!Array.isArray(profiles)) {
      document.getElementById('channels-list').innerHTML = '⚠️ Erro ao buscar. Verifique a chave do Buffer.';
      return;
    }

    if (profiles.length === 0) {
      document.getElementById('channels-list').innerHTML = 'Nenhuma conta conectada no Buffer.';
      return;
    }

    const html = profiles.map(p =>
      `<div style="padding:6px 0; border-bottom:1px solid var(--borda);">
        <strong>${p.service}</strong> — ${p.service_username || p.formatted_username || ''}
        <br><code style="font-size:11px; background:#f0f0ec; padding:2px 6px; border-radius:4px;">${p.id}</code>
        <button onclick="copyToClipboard('${p.id}')" style="margin-left:8px; font-size:11px; border:none; background:none; cursor:pointer; color:var(--cinza); text-decoration:underline;">copiar ID</button>
      </div>`
    ).join('');

    document.getElementById('channels-list').innerHTML =
      '<div style="font-weight:500; margin-bottom:8px;">Suas contas no Buffer:</div>' + html +
      '<p style="margin-top:10px; font-size:12px; color:var(--cinza);">Cole os IDs nos campos acima.</p>';

  } catch(e) {
    document.getElementById('channels-list').innerHTML = '⚠️ Falha ao conectar com o Buffer.';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => alert('ID copiado: ' + text));
}

// =====================
// IMAGE UPLOAD
// =====================
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  state.imageFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('upload-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('upload-area').classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

async function uploadToCloudinary() {
  if (!state.imageFile) return null;

  const cloud = localStorage.getItem('ps_cloudinary-cloud');
  const preset = localStorage.getItem('ps_cloudinary-preset');

  if (!cloud || !preset) {
    showStatus('schedule-status', 'error', '⚠️ Configure o Cloud Name e o Preset do Cloudinary nas configurações.');
    return null;
  }

  const fd = new FormData();
  fd.append('file', state.imageFile);
  fd.append('upload_preset', preset);

  try {
    const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const res = await fetch(url, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    showStatus('schedule-status', 'error', '⚠️ Erro no upload da imagem: ' + (data.error?.message || 'desconhecido'));
    return null;
  } catch(e) {
    showStatus('schedule-status', 'error', '⚠️ Falha ao conectar com Cloudinary.');
    return null;
  }
}

// =====================
// MODO (manual / claude)
// =====================
function setMode(mode) {
  state.mode = mode;
  state.copyApproved = false;
  document.getElementById('copy-preview-section').style.display = 'none';

  document.getElementById('tab-manual').classList.toggle('active', mode === 'manual');
  document.getElementById('tab-claude').classList.toggle('active', mode === 'claude');
  document.getElementById('mode-manual').style.display = mode === 'manual' ? 'block' : 'none';
  document.getElementById('mode-claude').style.display = mode === 'claude' ? 'block' : 'none';

  resetApproveBtn();
}

// =====================
// GERAÇÃO DE COPY COM CLAUDE
// =====================
async function generateCopy() {
  const instruction = document.getElementById('claude-instruction').value.trim();
  if (!instruction) {
    alert('Escreva uma instrução antes de gerar.');
    return;
  }

  setLoading('generate', true);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: `Você é o copywriter da Pane & Salute, padaria artesanal e pizzaria em Caxias do Sul, RS — 12 anos de mercado, referência regional.

Diretrizes para copy:
- Tom: acolhedor, artesanal, autêntico. Nunca genérico ou exagerado.
- Máximo 3-4 linhas para Instagram/Facebook
- Use 1-2 emojis no máximo
- Inclua call-to-action natural quando fizer sentido
- Lojas: Julio de Castilhos, Jardim América, Exposição
- NÃO inclua hashtags
- Responda SOMENTE com o texto do post, sem aspas, sem explicações.`,
        messages: [{ role: 'user', content: instruction }]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      showCopyPreview(data.content[0].text.trim());
    } else {
      alert('Erro ao gerar copy. Tente novamente.');
    }
  } catch(e) {
    alert('Falha na conexão com a API Claude.');
  } finally {
    setLoading('generate', false);
  }
}

function showCopyPreview(text) {
  document.getElementById('copy-preview-text').textContent = text;
  document.getElementById('copy-preview-section').style.display = 'block';
  document.getElementById('copy-edit-area').style.display = 'none';
  document.getElementById('copy-box').style.display = 'block';
  state.copyApproved = false;
  resetApproveBtn();
}

function editCopy() {
  document.getElementById('copy-edit-text').value = document.getElementById('copy-preview-text').textContent;
  document.getElementById('copy-edit-area').style.display = 'block';
  document.getElementById('copy-box').style.display = 'none';
}

function saveCopyEdit() {
  const t = document.getElementById('copy-edit-text').value.trim();
  if (!t) return;
  document.getElementById('copy-preview-text').textContent = t;
  document.getElementById('copy-box').style.display = 'block';
  document.getElementById('copy-edit-area').style.display = 'none';
  state.copyApproved = false;
  resetApproveBtn();
}

function approveCopy() {
  state.approvedCopy = document.getElementById('copy-preview-text').textContent;
  state.copyApproved = true;
  const btn = document.getElementById('btn-approve');
  btn.textContent = '✓ Copy aprovada!';
  btn.style.background = 'var(--sucesso)';
  btn.style.color = 'white';
}

function rejectCopy() {
  state.copyApproved = false;
  document.getElementById('copy-preview-section').style.display = 'none';
  resetApproveBtn();
  document.getElementById('claude-instruction').focus();
}

function resetApproveBtn() {
  const btn = document.getElementById('btn-approve');
  if (btn) {
    btn.textContent = '✓ Aprovar e continuar';
    btn.style.background = '';
    btn.style.color = '';
  }
}

// =====================
// PLATAFORMAS
// =====================
function togglePlatform(btn) {
  btn.classList.toggle('selected');
}

function getSelectedPlatforms() {
  return Array.from(document.querySelectorAll('.platform-btn.selected'))
    .map(b => b.dataset.platform);
}

// =====================
// AGENDAMENTO
// =====================
async function schedulePost() {
  // Validações
  const platforms = getSelectedPlatforms();
  if (platforms.length === 0) {
    showStatus('schedule-status', 'error', '⚠️ Selecione ao menos uma plataforma.');
    return;
  }

  let postText = '';
  if (state.mode === 'manual') {
    postText = document.getElementById('manual-text').value.trim();
    if (!postText) {
      showStatus('schedule-status', 'error', '⚠️ O texto do post está vazio.');
      return;
    }
  } else {
    if (!state.copyApproved) {
      showStatus('schedule-status', 'error', '⚠️ Aprove a copy gerada antes de agendar.');
      return;
    }
    postText = state.approvedCopy;
  }

  const date = document.getElementById('post-date').value;
  const time = document.getElementById('post-time').value;
  if (!date || !time) {
    showStatus('schedule-status', 'error', '⚠️ Defina data e horário.');
    return;
  }

  const bufferKey = localStorage.getItem('ps_buffer-key');
  if (!bufferKey) {
    showStatus('schedule-status', 'error', '⚠️ Adicione sua chave do Buffer nas configurações.');
    return;
  }

  // Montar IDs de contas
  const profileIds = [];
  if (platforms.includes('instagram')) {
    const id = localStorage.getItem('ps_buffer-instagram');
    if (id) profileIds.push(id);
  }
  if (platforms.includes('facebook')) {
    const id = localStorage.getItem('ps_buffer-facebook');
    if (id) profileIds.push(id);
  }

  if (profileIds.length === 0) {
    showStatus('schedule-status', 'error', '⚠️ Nenhum ID de conta Buffer configurado. Use "Buscar IDs do Buffer" nas configurações.');
    return;
  }

  setLoading('schedule', true);
  showStatus('schedule-status', 'info', '⏳ Enviando imagem para o Cloudinary...');

  // Upload imagem
  let imageUrl = null;
  if (state.imageFile) {
    imageUrl = await uploadToCloudinary();
    if (!imageUrl) { setLoading('schedule', false); return; }
  }

  showStatus('schedule-status', 'info', '⏳ Agendando no Buffer...');

  const scheduledAt = Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);

  try {
    // Buffer via proxy /api/buffer
    const body = {
      action: 'schedule',
      access_token: bufferKey,
      text: postText,
      scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
      profile_ids: profileIds,
    };
    if (imageUrl) body.media_photo = imageUrl;

    const res = await fetch('/api/buffer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok && (data.success || data.updates)) {
      const dt = new Date(`${date}T${time}:00`);
      const formatted = dt.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      showStatus('schedule-status', 'success', `✓ Post agendado com sucesso para ${formatted}!`);
      saveHistory({ text: postText, platforms, date, time, imageUrl });
      resetForm();
    } else {
      const msg = data.message || data.error || JSON.stringify(data);
      showStatus('schedule-status', 'error', '⚠️ Erro do Buffer: ' + msg);
    }
  } catch(e) {
    showStatus('schedule-status', 'error', '⚠️ Falha ao conectar com Buffer. Verifique sua chave.');
  } finally {
    setLoading('schedule', false);
  }
}

// =====================
// HISTÓRICO
// =====================
function saveHistory(entry) {
  const history = JSON.parse(localStorage.getItem('ps_history') || '[]');
  history.unshift({ ...entry, id: Date.now() });
  if (history.length > 50) history.splice(50);
  localStorage.setItem('ps_history', JSON.stringify(history));
  loadHistory();
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('ps_history') || '[]');
  const el = document.getElementById('history-list');
  if (history.length === 0) {
    el.innerHTML = '<p class="history-empty">Nenhum post agendado ainda.</p>';
    return;
  }
  el.innerHTML = history.map(h => `
    <div class="history-item">
      <div>${h.text.substring(0, 120)}${h.text.length > 120 ? '...' : ''}</div>
      <div class="meta">
        <span>${h.platforms.join(' + ')}</span>
        <span>${h.date} às ${h.time}</span>
      </div>
    </div>
  `).join('');
}

// =====================
// HELPERS
// =====================
function resetForm() {
  document.getElementById('manual-text').value = '';
  document.getElementById('claude-instruction').value = '';
  document.getElementById('copy-preview-section').style.display = 'none';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'block';
  document.getElementById('upload-area').classList.remove('has-image');
  document.getElementById('image-input').value = '';
  state.imageFile = null;
  state.copyApproved = false;
  resetApproveBtn();
}

function showStatus(id, type, text) {
  const el = document.getElementById(id);
  el.className = 'status-msg ' + type;
  el.innerHTML = text;
  if (type === 'success') setTimeout(() => el.style.display = 'none', 6000);
}

function setLoading(ctx, on) {
  if (ctx === 'generate') {
    document.getElementById('spinner-generate').style.display = on ? 'inline-block' : 'none';
    document.getElementById('btn-generate-label').textContent = on ? 'Gerando...' : '✨ Gerar Copy com IA';
    document.getElementById('btn-generate').disabled = on;
  } else {
    document.getElementById('spinner-schedule').style.display = on ? 'inline-block' : 'none';
    document.getElementById('btn-schedule-label').textContent = on ? 'Agendando...' : '📤 Agendar no Buffer';
    document.getElementById('btn-schedule').disabled = on;
  }
}
