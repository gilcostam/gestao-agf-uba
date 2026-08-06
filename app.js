/* ===== Config ===== */
const STORAGE_KEY = 'sappp_records_v1';
const REF_DATE = new Date(2024, 0, 1); // data-âncora fixa para o cálculo do rodízio
const CAT_LABELS = {
  'ATENDIMENTO AO CLIENTE': 'Atendimento ao Cliente',
  'INTERNO': 'Interno',
  'ORGANIZAÇÃO': 'Organização'
};

/* ===== Rotina de rodízio (round-robin entre categorias, para variar todo dia) ===== */
function buildRotationOrder() {
  const byCat = {};
  CHECKLIST_ITEMS.forEach(it => {
    (byCat[it.cat] = byCat[it.cat] || []).push(it.id);
  });
  const cats = Object.keys(byCat); // segue a ordem de primeira aparição no arquivo
  const order = [];
  let i = 0;
  let remaining = CHECKLIST_ITEMS.length;
  while (remaining > 0) {
    cats.forEach(c => {
      if (byCat[c][i] !== undefined) {
        order.push(byCat[c][i]);
        remaining--;
      }
    });
    i++;
  }
  return order;
}
const ROTATION_ORDER = buildRotationOrder();

function itemById(id) {
  return CHECKLIST_ITEMS.find(it => it.id === id);
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / ms);
}

function rotationItemIdForDate(dateStr) {
  const d = parseDate(dateStr);
  const diff = daysBetween(REF_DATE, d);
  const idx = ((diff % ROTATION_ORDER.length) + ROTATION_ORDER.length) % ROTATION_ORDER.length;
  return ROTATION_ORDER[idx];
}

/* ===== Data utils ===== */
function todayStr() {
  const d = new Date();
  return formatDate(d);
}
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDateBR(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ===== Persistência ===== */
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function getRecord(dateStr) {
  return loadRecords()[dateStr] || null;
}
function setRecord(dateStr, data) {
  const records = loadRecords();
  records[dateStr] = data;
  saveRecords(records);
}

/* ===== Navegação por módulos (Verificação / Equipe / Prospecção / Produtos) ===== */
const MODULES = ['verificacao', 'equipe', 'prospeccao', 'produtos'];
document.getElementById('primaryNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.primary-btn');
  if (!btn) return;
  activateModule(btn.dataset.module);
});

function activateModule(name) {
  MODULES.forEach(m => {
    document.getElementById('module-' + m).classList.toggle('hidden', m !== name);
    document.querySelector(`.primary-btn[data-module="${m}"]`).classList.toggle('active', m === name);
  });
  document.getElementById('tabsVerificacao').classList.toggle('hidden', name !== 'verificacao');
  document.getElementById('tabsProspeccao').classList.toggle('hidden', name !== 'prospeccao');
  document.getElementById('tabsProdutos').classList.toggle('hidden', name !== 'produtos');

  if (name === 'equipe') renderEquipe();
  if (name === 'prospeccao') activateProspTab(currentProspTab);
  if (name === 'produtos') activateProdutosTab(currentProdTab);
}

/* ===== Navegação por abas (módulo Verificação) ===== */
const tabs = ['hoje', 'pendencias', 'historico', 'relatorio', 'lista'];
document.getElementById('tabsVerificacao').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  activateTab(btn.dataset.tab);
});

function activateTab(name) {
  tabs.forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
    document.querySelector(`.tab-btn[data-tab="${t}"]`).classList.toggle('active', t === name);
  });
  if (name === 'hoje') renderHoje();
  if (name === 'pendencias') renderPendencias();
  if (name === 'historico') renderHistorico();
  if (name === 'relatorio') renderRelatorio();
  if (name === 'lista') renderLista();
}

/* ===== Cabeçalho ===== */
function renderHeader() {
  const d = new Date();
  const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('todayDateLabel').textContent = label;
}

function updatePendBadge() {
  const records = loadRecords();
  const count = Object.values(records).filter(r => r.status === 'nao_conforme' && !r.resolved).length;
  const el = document.getElementById('pendCount');
  el.textContent = count > 0 ? count : '';
  el.style.display = count > 0 ? 'inline-block' : 'none';
}

/* ===== TAB: HOJE ===== */
let hojeSelectedItemId = null; // item em edição/seleção manual (não confirmado ainda)
let hojeEditMode = false;

function renderHoje() {
  const date = todayStr();
  const existing = getRecord(date);
  const defaultItemId = rotationItemIdForDate(date);

  if (hojeSelectedItemId === null) {
    hojeSelectedItemId = existing ? existing.itemId : defaultItemId;
  }
  hojeEditMode = existing ? hojeEditMode : true;

  const item = itemById(hojeSelectedItemId);
  const card = document.getElementById('hojeCard');

  let html = '';

  if (existing && !hojeEditMode) {
    const tagClass = existing.status;
    const tagText = { conforme: 'Conforme', nao_conforme: 'Não conforme', na: 'Não se aplica' }[existing.status];
    html += `<div class="saved-banner ${existing.status === 'nao_conforme' ? 'nc' : (existing.status === 'na' ? 'na' : '')}">
      <span>Verificação de hoje já registrada: <strong>${tagText}</strong></span>
      <button class="link-btn" id="btnEditarHoje">Editar</button>
    </div>`;
  }

  html += `
    <div class="item-header">
      <span class="cat-pill">${CAT_LABELS[item.cat]}</span>
      <span class="peso-pill">Peso ${item.peso}</span>
    </div>
    <div class="item-question">${escapeHtml(item.question.split('\n')[0])}</div>
    <div class="item-aspect">${escapeHtml((item.question.split('\n')[1] || ''))}</div>
    <details class="forma">
      <summary>Como avaliar este item</summary>
      <div class="forma-body">${escapeHtml(item.forma)}</div>
      <div class="ref-line">Referência normativa: ${escapeHtml(item.ref || '—')}</div>
    </details>
  `;

  if (!existing || hojeEditMode) {
    const st = (existing && hojeEditMode) ? existing.status : null;
    html += `
      <div class="status-row" id="statusRow">
        <button class="status-btn conforme ${st === 'conforme' ? 'selected' : ''}" data-status="conforme">✔ Conforme</button>
        <button class="status-btn nao_conforme ${st === 'nao_conforme' ? 'selected' : ''}" data-status="nao_conforme">✘ Não conforme</button>
        <button class="status-btn na ${st === 'na' ? 'selected' : ''}" data-status="na">— Não se aplica</button>
      </div>
      <div class="nc-form ${st === 'nao_conforme' ? 'show' : ''}" id="ncForm">
        <label class="field-label">O que foi encontrado de errado?</label>
        <textarea id="obsField" placeholder="Descreva a não conformidade observada...">${existing ? escapeHtml(existing.observacao || '') : ''}</textarea>
        <label class="field-label">Plano de ação (o que será feito para corrigir)</label>
        <textarea id="planoField" placeholder="Ex: recolocar cartaz atualizado, orientar equipe, solicitar manutenção...">${existing ? escapeHtml(existing.planoAcao || '') : ''}</textarea>
        <label class="field-label">Prazo para correção</label>
        <input type="date" id="prazoField" value="${existing && existing.prazo ? existing.prazo : ''}">
      </div>
      <button class="save-btn" id="btnSalvarHoje">Salvar verificação de hoje</button>

      <div class="pick-other">
        <button class="link-btn" id="btnPickOther">Verificar outro item da lista hoje</button>
        <select id="pickOtherSelect" style="display:none;"></select>
      </div>
    `;
  }

  card.innerHTML = html;

  if (existing && !hojeEditMode) {
    document.getElementById('btnEditarHoje').addEventListener('click', () => {
      hojeEditMode = true;
      renderHoje();
    });
    return;
  }

  let selectedStatus = (existing && hojeEditMode) ? existing.status : null;

  document.getElementById('statusRow').addEventListener('click', (e) => {
    const btn = e.target.closest('.status-btn');
    if (!btn) return;
    selectedStatus = btn.dataset.status;
    document.querySelectorAll('#statusRow .status-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('ncForm').classList.toggle('show', selectedStatus === 'nao_conforme');
  });

  document.getElementById('btnSalvarHoje').addEventListener('click', () => {
    if (!selectedStatus) {
      alert('Selecione o status: Conforme, Não conforme ou Não se aplica.');
      return;
    }
    let observacao = '', planoAcao = '', prazo = '';
    if (selectedStatus === 'nao_conforme') {
      observacao = document.getElementById('obsField').value.trim();
      planoAcao = document.getElementById('planoField').value.trim();
      prazo = document.getElementById('prazoField').value;
      if (!observacao) {
        alert('Descreva o que foi encontrado de errado antes de salvar.');
        return;
      }
    }
    const record = {
      itemId: hojeSelectedItemId,
      status: selectedStatus,
      observacao, planoAcao, prazo,
      resolved: selectedStatus === 'nao_conforme' ? false : true,
      resolvedAt: null,
      timestamp: new Date().toISOString()
    };
    setRecord(date, record);
    hojeEditMode = false;
    hojeSelectedItemId = null;
    updatePendBadge();
    renderHoje();
  });

  const pickBtn = document.getElementById('btnPickOther');
  const pickSelect = document.getElementById('pickOtherSelect');
  populateItemSelect(pickSelect, hojeSelectedItemId);
  pickBtn.addEventListener('click', () => {
    pickSelect.style.display = pickSelect.style.display === 'none' ? 'block' : 'none';
  });
  pickSelect.addEventListener('change', () => {
    hojeSelectedItemId = Number(pickSelect.value);
    renderHoje();
  });
}

function populateItemSelect(select, currentId) {
  select.innerHTML = CHECKLIST_ITEMS.map(it =>
    `<option value="${it.id}" ${it.id === currentId ? 'selected' : ''}>${CAT_LABELS[it.cat]} #${it.num} — ${it.question.split('\n')[0].slice(0, 60)}</option>`
  ).join('');
}

/* ===== TAB: PENDÊNCIAS ===== */
function renderPendencias() {
  const records = loadRecords();
  const list = Object.entries(records)
    .filter(([date, r]) => r.status === 'nao_conforme' && !r.resolved)
    .sort((a, b) => {
      const pa = a[1].prazo || '9999-99-99';
      const pb = b[1].prazo || '9999-99-99';
      return pa.localeCompare(pb);
    });

  const container = document.getElementById('pendList');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma não conformidade em aberto. 🎉</div>';
    return;
  }

  container.innerHTML = list.map(([date, r]) => {
    const item = itemById(r.itemId);
    const overdue = r.prazo && r.prazo < todayStr();
    return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cat-pill">${CAT_LABELS[item.cat]}</span>
          <span class="status-tag nao_conforme">Não conforme</span>
        </div>
        <div class="list-item-question">${escapeHtml(item.question.split('\n')[0])}</div>
        <div class="meta-line"><strong>Verificado em:</strong> ${formatDateBR(date)}</div>
        <div class="meta-line"><strong>Problema:</strong> ${escapeHtml(r.observacao || '—')}</div>
        <div class="meta-line"><strong>Plano de ação:</strong> ${escapeHtml(r.planoAcao || '—')}</div>
        <div class="meta-line" style="${overdue ? 'color:#d93025;font-weight:700;' : ''}">
          <strong>Prazo:</strong> ${r.prazo ? formatDateBR(r.prazo) : 'não definido'} ${overdue ? '(atrasado)' : ''}
        </div>
        <button class="resolve-btn" data-date="${date}">Marcar como resolvido</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const records = loadRecords();
      records[date].resolved = true;
      records[date].resolvedAt = todayStr();
      saveRecords(records);
      updatePendBadge();
      renderPendencias();
    });
  });
}

/* ===== TAB: HISTÓRICO ===== */
function renderHistorico() {
  const catFilter = document.getElementById('filtroCategoria').value;
  const statusFilter = document.getElementById('filtroStatus').value;
  const records = loadRecords();

  const list = Object.entries(records)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .filter(([date, r]) => {
      const item = itemById(r.itemId);
      if (catFilter && item.cat !== catFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });

  const container = document.getElementById('histList');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum registro encontrado.</div>';
    return;
  }

  container.innerHTML = list.map(([date, r]) => {
    const item = itemById(r.itemId);
    const tagText = { conforme: 'Conforme', nao_conforme: 'Não conforme', na: 'N/A' }[r.status];
    return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cat-pill">${CAT_LABELS[item.cat]}</span>
          <span class="status-tag ${r.status}">${tagText}</span>
        </div>
        <div class="list-item-question">${escapeHtml(item.question.split('\n')[0])}</div>
        <div class="meta-line"><strong>Data:</strong> ${formatDateBR(date)} · <strong>Peso:</strong> ${item.peso}</div>
        ${r.status === 'nao_conforme' ? `<div class="meta-line"><strong>Situação:</strong> ${r.resolved ? `Resolvido em ${formatDateBR(r.resolvedAt)}` : 'Em aberto'}</div>` : ''}
      </div>
    `;
  }).join('');
}

document.getElementById('filtroCategoria').addEventListener('change', renderHistorico);
document.getElementById('filtroStatus').addEventListener('change', renderHistorico);

/* ===== TAB: RELATÓRIO ===== */
function renderRelatorio() {
  const dias = Number(document.getElementById('periodoRelatorio').value);
  const records = loadRecords();
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const limiteStr = formatDate(limite);

  const entries = Object.entries(records).filter(([date]) => dias >= 9999 || date >= limiteStr);

  const total = entries.length;
  const conformes = entries.filter(([, r]) => r.status === 'conforme').length;
  const naoConformes = entries.filter(([, r]) => r.status === 'nao_conforme').length;
  const nas = entries.filter(([, r]) => r.status === 'na').length;
  const base = conformes + naoConformes;
  const pctConformidade = base > 0 ? Math.round((conformes / base) * 100) : 0;

  let html = `
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${total}</div><div class="lbl">Verificações</div></div>
      <div class="stat-box"><div class="num" style="color:var(--verde)">${conformes}</div><div class="lbl">Conformes</div></div>
      <div class="stat-box"><div class="num" style="color:var(--vermelho)">${naoConformes}</div><div class="lbl">Não conformes</div></div>
      <div class="stat-box"><div class="num">${pctConformidade}%</div><div class="lbl">Índice de conformidade</div></div>
    </div>
  `;

  html += '<h2 style="font-size:15px;">Conformidade por categoria</h2>';
  Object.keys(CAT_LABELS).forEach(cat => {
    const catEntries = entries.filter(([, r]) => itemById(r.itemId).cat === cat);
    const catBase = catEntries.filter(([, r]) => r.status !== 'na').length;
    const catConf = catEntries.filter(([, r]) => r.status === 'conforme').length;
    const pct = catBase > 0 ? Math.round((catConf / catBase) * 100) : null;
    html += `
      <div class="bar-row">
        <div class="bar-label"><span>${CAT_LABELS[cat]}</span><span>${pct === null ? 'sem dados' : pct + '%'} (${catEntries.length} verificações)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct || 0}%; background:${pct !== null && pct < 70 ? 'var(--vermelho)' : 'var(--verde)'}"></div></div>
      </div>
    `;
  });

  const pendentes = Object.values(records).filter(r => r.status === 'nao_conforme' && !r.resolved).length;
  html += `<p class="muted" style="margin-top:16px;">Não conformidades em aberto no momento: <strong>${pendentes}</strong>. Veja a aba "Pendências".</p>`;

  document.getElementById('relatorioBody').innerHTML = html;
}

document.getElementById('periodoRelatorio').addEventListener('change', renderRelatorio);

/* ===== TAB: LISTA COMPLETA ===== */
function renderLista(filter) {
  filter = (filter || document.getElementById('buscaLista').value || '').toLowerCase();
  const container = document.getElementById('listaCompleta');
  let html = '';

  Object.keys(CAT_LABELS).forEach(cat => {
    const items = CHECKLIST_ITEMS.filter(it => it.cat === cat && matchesFilter(it, filter));
    if (items.length === 0) return;
    html += `<div class="li-cat-title">${CAT_LABELS[cat]}</div>`;
    items.forEach(it => {
      html += `
        <div class="li-item">
          <div class="li-item-top">
            <span class="li-num">#${it.num}</span>
            <span class="peso-pill">Peso ${it.peso}</span>
          </div>
          <div class="li-question">${escapeHtml(it.question)}</div>
          <details class="forma">
            <summary>Como avaliar</summary>
            <div class="forma-body">${escapeHtml(it.forma)}</div>
            <div class="ref-line">Referência: ${escapeHtml(it.ref || '—')}</div>
          </details>
        </div>
      `;
    });
  });

  container.innerHTML = html || '<div class="empty-state">Nenhum item encontrado.</div>';
}
function matchesFilter(it, filter) {
  if (!filter) return true;
  return (it.question + ' ' + it.forma).toLowerCase().includes(filter);
}
document.getElementById('buscaLista').addEventListener('input', (e) => renderLista(e.target.value));

/* ===================================================================
   MÓDULO: EQUIPE (cadastro de funcionários)
   =================================================================== */
const FUNC_STORAGE_KEY = 'sappp_funcionarios_v1';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadFuncionarios() {
  try { return JSON.parse(localStorage.getItem(FUNC_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveFuncionarios(list) {
  localStorage.setItem(FUNC_STORAGE_KEY, JSON.stringify(list));
}

function renderEquipe() {
  document.getElementById('btnAddFuncionario').onclick = () => {
    const nome = document.getElementById('funcNome').value.trim();
    const cargo = document.getElementById('funcCargo').value;
    const celular = document.getElementById('funcCelular').value.trim();
    if (!nome) { alert('Informe o nome do funcionário.'); return; }
    const list = loadFuncionarios();
    list.push({ id: genId(), nome, cargo, celular, ativo: true, criadoEm: todayStr() });
    saveFuncionarios(list);
    document.getElementById('funcNome').value = '';
    document.getElementById('funcCelular').value = '';
    renderFuncionariosList();
  };
  document.getElementById('filtroCargoEquipe').onchange = renderFuncionariosList;
  renderFuncionariosList();
}

function renderFuncionariosList() {
  const cargoFiltro = document.getElementById('filtroCargoEquipe').value;
  const list = loadFuncionarios()
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .filter(f => !cargoFiltro || f.cargo === cargoFiltro);

  const container = document.getElementById('funcionariosList');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum funcionário cadastrado ainda.</div>';
    return;
  }

  container.innerHTML = list.map(f => `
    <div class="list-item">
      <div class="list-item-top">
        <span class="cargo-badge">${escapeHtml(f.cargo)}</span>
        ${f.ativo ? '' : '<span class="inativo-tag">Inativo</span>'}
      </div>
      <div class="list-item-question">${escapeHtml(f.nome)}</div>
      ${f.celular ? `<div class="meta-line">Celular: ${escapeHtml(f.celular)}</div>` : ''}
      <div class="meta-line">Cadastrado em ${formatDateBR(f.criadoEm)}</div>
      <div class="func-actions">
        <button class="small-btn" data-action="toggle" data-id="${f.id}">${f.ativo ? 'Marcar inativo' : 'Reativar'}</button>
        <button class="small-btn danger" data-action="delete" data-id="${f.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = loadFuncionarios();
      const f = list.find(x => x.id === btn.dataset.id);
      f.ativo = !f.ativo;
      saveFuncionarios(list);
      renderFuncionariosList();
    });
  });
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Excluir este funcionário? Leads já vinculados a ele não serão apagados.')) return;
      const list = loadFuncionarios().filter(x => x.id !== btn.dataset.id);
      saveFuncionarios(list);
      renderFuncionariosList();
    });
  });
}

function populateFuncionarioSelect(select, opts) {
  opts = opts || {};
  const list = loadFuncionarios()
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .filter(f => opts.onlyAtivos ? f.ativo : true);
  let html = '';
  if (opts.allowEmpty) html += `<option value="">${opts.emptyLabel || 'Selecione'}</option>`;
  html += list.map(f => `<option value="${f.id}">${escapeHtml(f.nome)} (${escapeHtml(f.cargo)})</option>`).join('');
  select.innerHTML = html;
}

/* ===================================================================
   MÓDULO: PROSPECÇÃO (leads e ranking)
   =================================================================== */
const LEADS_STORAGE_KEY = 'sappp_leads_v1';
const ETAPAS = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'envio_guilherme', label: 'Envio do lead para o Guilherme' },
  { key: 'cadastro_correios', label: 'Cadastro nos Correios' },
  { key: 'contrato_assinado', label: 'Contrato assinado' }
];
function etapaLabel(key) {
  const e = ETAPAS.find(x => x.key === key);
  return e ? e.label : key;
}

function loadLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveLeads(list) {
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(list));
}

const PROSP_TABS = ['leads', 'novolead', 'ranking'];
let currentProspTab = 'leads';
document.getElementById('tabsProspeccao').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  activateProspTab(btn.dataset.subtab);
});

function activateProspTab(name) {
  currentProspTab = name;
  PROSP_TABS.forEach(t => {
    document.getElementById('sub-' + t).classList.toggle('hidden', t !== name);
    document.querySelector(`#tabsProspeccao .tab-btn[data-subtab="${t}"]`).classList.toggle('active', t === name);
  });
  if (name === 'leads') renderLeadsList();
  if (name === 'novolead') renderNovoLeadForm();
  if (name === 'ranking') renderRanking();
}

function renderNovoLeadForm() {
  populateFuncionarioSelect(document.getElementById('leadFuncionario'), {
    allowEmpty: true, emptyLabel: 'Selecione o responsável', onlyAtivos: true
  });
  document.getElementById('btnAddLead').onclick = () => {
    const razaoSocial = document.getElementById('leadRazaoSocial').value.trim();
    const cnpj = document.getElementById('leadCnpj').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const endereco = document.getElementById('leadEndereco').value.trim();
    const celular = document.getElementById('leadCelular').value.trim();
    const funcionarioId = document.getElementById('leadFuncionario').value;

    if (!razaoSocial) { alert('Informe a razão social.'); return; }
    if (!funcionarioId) { alert('Selecione o funcionário responsável pela prospecção.'); return; }

    const hoje = todayStr();
    const list = loadLeads();
    list.push({
      id: genId(),
      razaoSocial, cnpj, email, endereco, celular, funcionarioId,
      etapa: 'prospeccao',
      historico: [{ etapa: 'prospeccao', data: hoje }],
      criadoEm: hoje
    });
    saveLeads(list);

    ['leadRazaoSocial', 'leadCnpj', 'leadEmail', 'leadEndereco', 'leadCelular'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('leadFuncionario').selectedIndex = 0;
    activateProspTab('leads');
  };
}

function renderLeadsList() {
  populateFuncionarioSelect(document.getElementById('filtroFuncionarioLead'), {
    allowEmpty: true, emptyLabel: 'Todos os funcionários'
  });
  document.getElementById('filtroEtapaLead').onchange = renderLeadsListInner;
  document.getElementById('filtroFuncionarioLead').onchange = renderLeadsListInner;
  document.getElementById('buscaLead').oninput = renderLeadsListInner;
  renderLeadsListInner();
}

function renderLeadsListInner() {
  const etapaF = document.getElementById('filtroEtapaLead').value;
  const funcF = document.getElementById('filtroFuncionarioLead').value;
  const busca = document.getElementById('buscaLead').value.toLowerCase();

  const leads = loadLeads()
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .filter(l => {
      if (etapaF && l.etapa !== etapaF) return false;
      if (funcF && l.funcionarioId !== funcF) return false;
      if (busca && !((l.razaoSocial || '') + ' ' + (l.cnpj || '')).toLowerCase().includes(busca)) return false;
      return true;
    });

  const container = document.getElementById('leadsList');
  if (leads.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum lead encontrado.</div>';
    return;
  }

  const funcionarios = loadFuncionarios();
  container.innerHTML = leads.map(l => {
    const func = funcionarios.find(f => f.id === l.funcionarioId);
    return `
    <div class="list-item">
      <div class="list-item-top">
        <span class="cat-pill">${escapeHtml(func ? func.nome : 'Sem responsável')}</span>
        <span class="status-tag ${l.etapa}">${etapaLabel(l.etapa)}</span>
      </div>
      <div class="list-item-question">${escapeHtml(l.razaoSocial)}</div>
      ${l.cnpj ? `<div class="meta-line">CNPJ: ${escapeHtml(l.cnpj)}</div>` : ''}
      ${l.celular ? `<div class="meta-line">Celular: ${escapeHtml(l.celular)}</div>` : ''}
      ${l.email ? `<div class="meta-line">E-mail: ${escapeHtml(l.email)}</div>` : ''}
      ${l.endereco ? `<div class="meta-line">Endereço: ${escapeHtml(l.endereco)}</div>` : ''}
      <div class="meta-line">Criado em ${formatDateBR(l.criadoEm)}</div>
      <div class="lead-etapa-control">
        <select class="leadEtapaSelect" data-id="${l.id}">
          ${ETAPAS.map(e => `<option value="${e.key}" ${e.key === l.etapa ? 'selected' : ''}>${e.label}</option>`).join('')}
        </select>
        <input type="date" class="leadEtapaDate" data-id="${l.id}" value="${todayStr()}">
        <button class="small-btn" data-action="atualizar-etapa" data-id="${l.id}">Atualizar etapa</button>
      </div>
      <button class="link-btn" data-action="excluir-lead" data-id="${l.id}" style="margin-top:8px;">Excluir lead</button>
    </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="atualizar-etapa"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const select = container.querySelector(`.leadEtapaSelect[data-id="${id}"]`);
      const dateInput = container.querySelector(`.leadEtapaDate[data-id="${id}"]`);
      const novaEtapa = select.value;
      const data = dateInput.value || todayStr();
      const list = loadLeads();
      const lead = list.find(x => x.id === id);
      lead.etapa = novaEtapa;
      lead.historico.push({ etapa: novaEtapa, data });
      saveLeads(list);
      renderLeadsListInner();
    });
  });
  container.querySelectorAll('[data-action="excluir-lead"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
      const list = loadLeads().filter(x => x.id !== btn.dataset.id);
      saveLeads(list);
      renderLeadsListInner();
    });
  });
}

/* ===== Ranking mensal ===== */
function renderRanking() {
  const monthInput = document.getElementById('mesRanking');
  if (!monthInput.value) {
    const d = new Date();
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  monthInput.onchange = renderRankingInner;
  renderRankingInner();
}

function renderRankingInner() {
  const mes = document.getElementById('mesRanking').value; // formato YYYY-MM
  const leads = loadLeads();
  const funcionarios = loadFuncionarios();

  const assinadosNoMes = [];
  leads.forEach(l => {
    (l.historico || []).forEach(h => {
      if (h.etapa === 'contrato_assinado' && h.data && h.data.startsWith(mes)) {
        assinadosNoMes.push({ lead: l, data: h.data });
      }
    });
  });
  const totalAssinados = assinadosNoMes.length;

  const porFuncionarioAssinados = {};
  assinadosNoMes.forEach(({ lead }) => {
    porFuncionarioAssinados[lead.funcionarioId] = (porFuncionarioAssinados[lead.funcionarioId] || 0) + 1;
  });

  const leadsProspectadosNoMes = leads.filter(l => l.criadoEm && l.criadoEm.startsWith(mes));
  const porFuncionarioProspectados = {};
  leadsProspectadosNoMes.forEach(l => {
    porFuncionarioProspectados[l.funcionarioId] = (porFuncionarioProspectados[l.funcionarioId] || 0) + 1;
  });

  const ranking = funcionarios
    .map(f => ({
      funcionario: f,
      assinados: porFuncionarioAssinados[f.id] || 0,
      prospectados: porFuncionarioProspectados[f.id] || 0
    }))
    .filter(r => r.assinados > 0 || r.prospectados > 0)
    .sort((a, b) => b.assinados - a.assinados || b.prospectados - a.prospectados);

  let html = `
    <div class="stat-grid">
      <div class="stat-box"><div class="num" style="color:var(--verde)">${totalAssinados}</div><div class="lbl">Contratos assinados no mês</div></div>
      <div class="stat-box"><div class="num">${leadsProspectadosNoMes.length}</div><div class="lbl">Leads prospectados no mês</div></div>
    </div>
  `;

  if (ranking.length === 0) {
    html += '<div class="empty-state">Nenhum dado de prospecção para este mês.</div>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    html += ranking.map((r, i) => `
      <div class="rank-row">
        <div class="rank-pos">${medals[i] || (i + 1)}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.funcionario.nome)}</div>
          <div class="rank-cargo">${escapeHtml(r.funcionario.cargo)} · ${r.prospectados} lead(s) prospectado(s) no mês</div>
        </div>
        <div>
          <div class="rank-count">${r.assinados}</div>
          <div class="rank-count-lbl">assinados</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('rankingBody').innerHTML = html;
}

/* ===================================================================
   MÓDULO: PRODUTOS (vendas de terceiros e ranking por pontos)
   =================================================================== */
const VENDAS_STORAGE_KEY = 'sappp_vendas_v1';

function loadVendas() {
  try { return JSON.parse(localStorage.getItem(VENDAS_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveVendas(list) {
  localStorage.setItem(VENDAS_STORAGE_KEY, JSON.stringify(list));
}
function produtoById(id) {
  return PRODUCTS.find(p => p.id === id);
}
function findVendaRegistro(funcionarioId, data) {
  return loadVendas().find(v => v.funcionarioId === funcionarioId && v.data === data) || null;
}
function vendaTotalPontos(venda) {
  return Object.entries(venda.itens || {}).reduce((sum, [prodId, qty]) => {
    const p = produtoById(prodId);
    return sum + (p ? p.pontos * qty : 0);
  }, 0);
}
function vendaTotalItens(venda) {
  return Object.values(venda.itens || {}).reduce((sum, qty) => sum + qty, 0);
}

const PROD_TABS = ['registrar', 'vendasmes', 'ranking'];
let currentProdTab = 'registrar';
document.getElementById('tabsProdutos').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  activateProdutosTab(btn.dataset.subtab);
});

function activateProdutosTab(name) {
  currentProdTab = name;
  PROD_TABS.forEach(t => {
    document.getElementById('prod-' + t).classList.toggle('hidden', t !== name);
    document.querySelector(`#tabsProdutos .tab-btn[data-subtab="${t}"]`).classList.toggle('active', t === name);
  });
  if (name === 'registrar') renderRegistrarVendas();
  if (name === 'vendasmes') renderVendasMes();
  if (name === 'ranking') renderRankingProdutos();
}

/* ===== Aba: Registrar vendas do dia ===== */
function renderRegistrarVendas() {
  populateFuncionarioSelect(document.getElementById('vendaFuncionario'), {
    allowEmpty: true, emptyLabel: 'Selecione o funcionário', onlyAtivos: true
  });
  const dataInput = document.getElementById('vendaData');
  if (!dataInput.value) dataInput.value = todayStr();

  function renderProdutosInputs() {
    const funcionarioId = document.getElementById('vendaFuncionario').value;
    const data = dataInput.value;
    const existing = funcionarioId && data ? findVendaRegistro(funcionarioId, data) : null;
    document.getElementById('vendaProdutosList').innerHTML = PRODUCTS.map(p => `
      <div class="prod-qty-row">
        <div class="prod-qty-info">
          <span class="prod-nome">${escapeHtml(p.nome)}</span>
          <span class="prod-pontos">${p.pontos} ponto(s) cada</span>
        </div>
        <input type="number" min="0" class="prod-qty-input" data-produto="${p.id}" value="${existing && existing.itens[p.id] ? existing.itens[p.id] : 0}">
      </div>
    `).join('');
  }
  renderProdutosInputs();
  document.getElementById('vendaFuncionario').onchange = renderProdutosInputs;
  dataInput.onchange = renderProdutosInputs;

  document.getElementById('btnSalvarVendas').onclick = () => {
    const funcionarioId = document.getElementById('vendaFuncionario').value;
    const data = dataInput.value;
    if (!funcionarioId) { alert('Selecione o funcionário.'); return; }
    if (!data) { alert('Selecione a data.'); return; }

    const itens = {};
    let algumaVenda = false;
    document.querySelectorAll('.prod-qty-input').forEach(inp => {
      const qty = Number(inp.value) || 0;
      if (qty > 0) { itens[inp.dataset.produto] = qty; algumaVenda = true; }
    });

    const list = loadVendas();
    const idx = list.findIndex(v => v.funcionarioId === funcionarioId && v.data === data);
    if (!algumaVenda) {
      if (idx >= 0) list.splice(idx, 1);
    } else if (idx >= 0) {
      list[idx].itens = itens;
      list[idx].atualizadoEm = new Date().toISOString();
    } else {
      list.push({ id: genId(), funcionarioId, data, itens, criadoEm: new Date().toISOString() });
    }
    saveVendas(list);
    alert('Vendas registradas com sucesso!');
  };
}

/* ===== Aba: Vendas do mês ===== */
function populateProdutoSelect(select) {
  select.innerHTML = '<option value="">Todos os produtos</option>' +
    PRODUCTS.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');
}

function renderVendasMes() {
  const mesInput = document.getElementById('mesVendas');
  if (!mesInput.value) {
    const d = new Date();
    mesInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  populateFuncionarioSelect(document.getElementById('filtroFuncionarioVenda'), {
    allowEmpty: true, emptyLabel: 'Todos os funcionários'
  });
  populateProdutoSelect(document.getElementById('filtroProdutoVenda'));
  mesInput.onchange = renderVendasMesInner;
  document.getElementById('filtroFuncionarioVenda').onchange = renderVendasMesInner;
  document.getElementById('filtroProdutoVenda').onchange = renderVendasMesInner;
  renderVendasMesInner();
}

function renderVendasMesInner() {
  const mes = document.getElementById('mesVendas').value;
  const funcF = document.getElementById('filtroFuncionarioVenda').value;
  const prodF = document.getElementById('filtroProdutoVenda').value;
  const funcionarios = loadFuncionarios();

  const list = loadVendas()
    .filter(v => v.data && v.data.startsWith(mes))
    .filter(v => !funcF || v.funcionarioId === funcF)
    .filter(v => !prodF || (v.itens && v.itens[prodF] > 0))
    .sort((a, b) => b.data.localeCompare(a.data));

  const container = document.getElementById('vendasMesList');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma venda registrada neste período.</div>';
    return;
  }

  container.innerHTML = list.map(v => {
    const func = funcionarios.find(f => f.id === v.funcionarioId);
    const itensTxt = Object.entries(v.itens || {}).map(([prodId, qty]) => {
      const p = produtoById(prodId);
      return `${p ? p.nome : prodId} x${qty} (${p ? p.pontos * qty : 0} pts)`;
    }).join(', ');
    return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cat-pill">${escapeHtml(func ? func.nome : 'Funcionário removido')}</span>
          <span class="pts-tag">${vendaTotalPontos(v)} pts</span>
        </div>
        <div class="meta-line"><strong>Data:</strong> ${formatDateBR(v.data)}</div>
        <div class="meta-line"><strong>Produtos:</strong> ${escapeHtml(itensTxt)}</div>
      </div>
    `;
  }).join('');
}

/* ===== Aba: Ranking de vendas ===== */
function renderRankingProdutos() {
  const mesInput = document.getElementById('mesRankingProdutos');
  if (!mesInput.value) {
    const d = new Date();
    mesInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  mesInput.onchange = renderRankingProdutosInner;
  renderRankingProdutosInner();
}

function renderRankingProdutosInner() {
  const mes = document.getElementById('mesRankingProdutos').value;
  const vendas = loadVendas().filter(v => v.data && v.data.startsWith(mes));
  const funcionarios = loadFuncionarios();

  const porFuncionario = {};
  let totalPontosGeral = 0;
  let totalItensGeral = 0;
  vendas.forEach(v => {
    const pontos = vendaTotalPontos(v);
    const itens = vendaTotalItens(v);
    totalPontosGeral += pontos;
    totalItensGeral += itens;
    if (!porFuncionario[v.funcionarioId]) porFuncionario[v.funcionarioId] = { pontos: 0, itens: 0 };
    porFuncionario[v.funcionarioId].pontos += pontos;
    porFuncionario[v.funcionarioId].itens += itens;
  });

  const ranking = funcionarios
    .map(f => ({
      funcionario: f,
      pontos: (porFuncionario[f.id] || {}).pontos || 0,
      itens: (porFuncionario[f.id] || {}).itens || 0
    }))
    .filter(r => r.pontos > 0 || r.itens > 0)
    .sort((a, b) => b.pontos - a.pontos || b.itens - a.itens);

  let html = `
    <div class="stat-grid">
      <div class="stat-box"><div class="num" style="color:var(--verde)">${totalPontosGeral}</div><div class="lbl">Pontos no mês</div></div>
      <div class="stat-box"><div class="num">${totalItensGeral}</div><div class="lbl">Produtos vendidos</div></div>
    </div>
  `;

  if (ranking.length === 0) {
    html += '<div class="empty-state">Nenhuma venda registrada neste mês.</div>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    html += ranking.map((r, i) => `
      <div class="rank-row">
        <div class="rank-pos">${medals[i] || (i + 1)}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.funcionario.nome)}</div>
          <div class="rank-cargo">${escapeHtml(r.funcionario.cargo)} · ${r.itens} produto(s) vendido(s)</div>
        </div>
        <div>
          <div class="rank-count">${r.pontos}</div>
          <div class="rank-count-lbl">pontos</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('rankingProdutosBody').innerHTML = html;
}

/* ===== Utils ===== */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

/* ===== Init ===== */
renderHeader();
updatePendBadge();
renderHoje();
