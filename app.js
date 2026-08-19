/* ===== Config ===== */
const STORAGE_KEY = 'sappp_records_v1';
const REF_DATE = new Date(2024, 0, 1); // data-âncora fixa para o cálculo do rodízio
const CAT_LABELS = {
  'ATENDIMENTO AO CLIENTE': 'Atendimento ao Cliente',
  'INTERNO': 'Interno',
  'ORGANIZAÇÃO': 'Organização'
};

/* ===== Supabase ===== */
const SUPABASE_URL = 'https://wxbtuaxieeasnxismotz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YnR1YXhpZWVhc254aXNtb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzk3MjEsImV4cCI6MjEwMTYxNTcyMX0.WV7-_X5SrcCjRc724sj1eQShR7ijhRhjud_8_cl2iOs';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MIGRATION_FLAG = 'sappp_migrated_to_supabase_v1';

// Sincroniza uma coleção completa (mesmo padrão "carregar tudo -> mutar -> salvar tudo" usado no resto do app):
// apaga no Supabase o que não está mais na lista local e faz upsert do restante.
async function syncFullTable(table, rows, idField) {
  try {
    const { data: existing, error: fetchError } = await sb.from(table).select(idField);
    if (fetchError) { console.error(`Erro ao consultar ${table} no Supabase:`, fetchError); return; }
    const currentIds = new Set(rows.map(r => String(r[idField])));
    const idsToDelete = (existing || []).map(r => r[idField]).filter(id => !currentIds.has(String(id)));
    if (idsToDelete.length > 0) {
      const { error: delError } = await sb.from(table).delete().in(idField, idsToDelete);
      if (delError) console.error(`Erro ao excluir registros em ${table}:`, delError);
    }
    if (rows.length > 0) {
      const { error: upsertError } = await sb.from(table).upsert(rows, { onConflict: idField });
      if (upsertError) console.error(`Erro ao salvar em ${table}:`, upsertError);
    }
  } catch (e) {
    console.error(`Falha ao sincronizar ${table} com Supabase:`, e);
  }
}

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
let _records = {};
function loadRecords() {
  return _records;
}
function saveRecords(records) {
  _records = records;
  syncFullTable('verificacoes', recordsToRows(records), 'data');
}
function recordsToRows(records) {
  return Object.entries(records).map(([date, r]) => ({
    data: date,
    item_id: r.itemId,
    status: r.status,
    observacao: r.observacao || '',
    plano_acao: r.planoAcao || '',
    prazo: r.prazo || null,
    resolved: !!r.resolved,
    resolved_at: r.resolvedAt || null,
    registrado_em: r.timestamp || new Date().toISOString()
  }));
}
function rowsToRecords(rows) {
  return rows.reduce((acc, row) => {
    acc[row.data] = {
      itemId: row.item_id,
      status: row.status,
      observacao: row.observacao || '',
      planoAcao: row.plano_acao || '',
      prazo: row.prazo || '',
      resolved: !!row.resolved,
      resolvedAt: row.resolved_at || null,
      timestamp: row.registrado_em
    };
    return acc;
  }, {});
}
function getRecord(dateStr) {
  return loadRecords()[dateStr] || null;
}
function setRecord(dateStr, data) {
  const records = loadRecords();
  records[dateStr] = data;
  saveRecords(records);
}

/* ===== Navegação por módulos (Verificação / Equipe / Prospecção / Produtos / Cursos) ===== */
const MODULES = ['verificacao', 'equipe', 'prospeccao', 'produtos', 'cursos', 'comissoes', 'relatorios'];
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
  document.getElementById('tabsCursos').classList.toggle('hidden', name !== 'cursos');

  if (name === 'equipe') renderEquipe();
  if (name === 'prospeccao') activateProspTab(currentProspTab);
  if (name === 'produtos') activateProdutosTab(currentProdTab);
  if (name === 'cursos') activateCursosTab(currentCursoTab);
  if (name === 'comissoes') renderComissoes();
  if (name === 'relatorios') activateRelatoriosModule();
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

let _funcionarios = [];
function loadFuncionarios() {
  return _funcionarios;
}
function saveFuncionarios(list) {
  _funcionarios = list;
  syncFullTable('funcionarios', funcionariosToRows(list), 'id');
}
function funcionariosToRows(list) {
  return list.map(f => ({
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    celular: f.celular || '',
    ativo: !!f.ativo,
    criado_em: f.criadoEm
  }));
}
function rowsToFuncionarios(rows) {
  return rows.map(r => ({
    id: r.id,
    nome: r.nome,
    cargo: r.cargo,
    celular: r.celular || '',
    ativo: !!r.ativo,
    criadoEm: r.criado_em
  }));
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
  { key: 'contrato_assinado', label: 'Contrato assinado' },
  { key: 'postando_agf', label: 'Começou a postar na AGF' }
];
/* Leads que já chegam com contrato pulam o envio para o Guilherme e seguem
   direto para "Começou a postar na AGF" em vez do fluxo normal. */
const ETAPAS_COM_CONTRATO_KEYS = ['prospeccao', 'postando_agf'];
const ETAPAS_SEM_CONTRATO_KEYS = ['prospeccao', 'envio_guilherme', 'cadastro_correios', 'contrato_assinado'];
function etapasParaLead(lead) {
  const keys = lead.temContrato ? ETAPAS_COM_CONTRATO_KEYS : ETAPAS_SEM_CONTRATO_KEYS;
  return ETAPAS.filter(e => keys.includes(e.key));
}
function etapaLabel(key) {
  const e = ETAPAS.find(x => x.key === key);
  return e ? e.label : key;
}

/* Envio do lead por WhatsApp para o Guilherme */
const WHATSAPP_GUILHERME = '5532984452535'; // (32) 98445-2535, com código do país (55)
function buildLeadWhatsAppUrl(lead, funcionarioNome) {
  const linhas = [
    'Novo lead para prospecção:',
    '',
    `Razão social: ${lead.razaoSocial}`
  ];
  if (lead.cnpj) linhas.push(`CNPJ: ${lead.cnpj}`);
  if (lead.email) linhas.push(`E-mail: ${lead.email}`);
  if (lead.endereco) linhas.push(`Endereço: ${lead.endereco}`);
  if (lead.celular) linhas.push(`Celular: ${lead.celular}`);
  linhas.push(`Responsável: ${funcionarioNome || 'Não informado'}`);
  linhas.push(`Data: ${formatDateBR(lead.criadoEm)}`);
  const texto = encodeURIComponent(linhas.join('\n'));
  return `https://wa.me/${WHATSAPP_GUILHERME}?text=${texto}`;
}

let _leads = [];
function loadLeads() {
  return _leads;
}
function saveLeads(list) {
  _leads = list;
  syncFullTable('leads', leadsToRows(list), 'id');
}
function leadsToRows(list) {
  return list.map(l => ({
    id: l.id,
    razao_social: l.razaoSocial,
    cnpj: l.cnpj || '',
    email: l.email || '',
    endereco: l.endereco || '',
    celular: l.celular || '',
    funcionario_id: l.funcionarioId || null,
    etapa: l.etapa,
    tem_contrato: !!l.temContrato,
    historico: l.historico || [],
    criado_em: l.criadoEm,
    faturamento_contrato: (l.faturamentoContrato != null && l.faturamentoContrato !== '') ? l.faturamentoContrato : null,
    faturamento_postagem: (l.faturamentoPostagem != null && l.faturamentoPostagem !== '') ? l.faturamentoPostagem : null
  }));
}
function rowsToLeads(rows) {
  return rows.map(r => ({
    id: r.id,
    razaoSocial: r.razao_social,
    cnpj: r.cnpj || '',
    email: r.email || '',
    endereco: r.endereco || '',
    celular: r.celular || '',
    funcionarioId: r.funcionario_id || '',
    etapa: r.etapa,
    temContrato: !!r.tem_contrato,
    historico: r.historico || [],
    criadoEm: r.criado_em,
    faturamentoContrato: r.faturamento_contrato != null ? r.faturamento_contrato : null,
    faturamentoPostagem: r.faturamento_postagem != null ? r.faturamento_postagem : null
  }));
}

/* Faturamento do 1º mês (comissão de 5%): a data inicial é a data em que o lead
   chegou na etapa terminal do seu fluxo (contrato assinado OU começou a postar na AGF).
   O valor só costuma ser lançado depois de 30 dias, mas o campo fica sempre disponível. */
function dataInicialFaturamento(lead) {
  if (lead.etapa === 'contrato_assinado') {
    const h = (lead.historico || []).find(x => x.etapa === 'contrato_assinado');
    return h ? h.data : null;
  }
  if (lead.etapa === 'postando_agf') {
    const h = (lead.historico || []).find(x => x.etapa === 'postando_agf');
    return h ? h.data : null;
  }
  return null;
}
function addDias(dataStr, dias) {
  const d = parseDate(dataStr);
  d.setDate(d.getDate() + dias);
  return formatDate(d);
}
function renderFaturamentoBox(l) {
  const dataInicial = dataInicialFaturamento(l);
  if (!dataInicial) return '';
  const campo = l.etapa === 'contrato_assinado' ? 'faturamentoContrato' : 'faturamentoPostagem';
  const valor = l[campo];
  const dataLiberacao = addDias(dataInicial, 30);
  const disponivel = todayStr() >= dataLiberacao;
  return `
    <div class="faturamento-box">
      <div class="faturamento-box-header">💰 Comissão de 5% sobre o faturamento do 1º mês</div>
      <div class="meta-line">Data inicial (${l.etapa === 'contrato_assinado' ? 'contrato assinado' : 'começou a postar na AGF'}): <strong>${formatDateBR(dataInicial)}</strong></div>
      <div class="meta-line">${disponivel ? 'Já pode lançar o faturamento do 1º mês.' : `Lançar o faturamento a partir de ${formatDateBR(dataLiberacao)} (30 dias após a data inicial).`}</div>
      ${(valor != null && valor !== '') ? `<div class="meta-line">Faturamento informado: <strong>${formatBRL(valor)}</strong> · comissão de 5%: <strong>${formatBRL(valor * 0.05)}</strong></div>` : ''}
      <div class="lead-etapa-control">
        <input type="number" step="0.01" min="0" class="leadFaturamentoInput" data-id="${l.id}" data-campo="${campo}" placeholder="Faturamento do 1º mês (R$)" value="${(valor != null && valor !== '') ? valor : ''}">
        <button class="small-btn" data-action="salvar-faturamento" data-id="${l.id}" data-campo="${campo}">Salvar faturamento</button>
      </div>
    </div>
  `;
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
    const temContrato = document.getElementById('leadTemContrato').checked;

    if (!razaoSocial) { alert('Informe a razão social.'); return; }
    if (!funcionarioId) { alert('Selecione o funcionário responsável pela prospecção.'); return; }

    const hoje = todayStr();
    const novoLead = {
      id: genId(),
      razaoSocial, cnpj, email, endereco, celular, funcionarioId, temContrato,
      etapa: 'prospeccao',
      historico: [{ etapa: 'prospeccao', data: hoje }],
      criadoEm: hoje
    };
    const list = loadLeads();
    list.push(novoLead);
    saveLeads(list);

    ['leadRazaoSocial', 'leadCnpj', 'leadEmail', 'leadEndereco', 'leadCelular'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('leadFuncionario').selectedIndex = 0;
    document.getElementById('leadTemContrato').checked = false;
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

let editingLeadId = null;

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

  const funcionarios = loadFuncionarios().slice().sort((a, b) => a.nome.localeCompare(b.nome));
  container.innerHTML = leads.map(l => {
    const func = funcionarios.find(f => f.id === l.funcionarioId);
    if (l.id === editingLeadId) {
      return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cat-pill">${escapeHtml(func ? func.nome : 'Sem responsável')}</span>
          <span class="status-tag ${l.etapa}">${etapaLabel(l.etapa)}</span>
        </div>
        <label class="field-label">Razão social</label>
        <input type="text" class="leadEditRazaoSocial" data-id="${l.id}" value="${escapeHtml(l.razaoSocial)}">
        <label class="field-label">CNPJ</label>
        <input type="text" class="leadEditCnpj" data-id="${l.id}" value="${escapeHtml(l.cnpj || '')}">
        <label class="field-label">E-mail</label>
        <input type="text" class="leadEditEmail" data-id="${l.id}" value="${escapeHtml(l.email || '')}">
        <label class="field-label">Endereço</label>
        <input type="text" class="leadEditEndereco" data-id="${l.id}" value="${escapeHtml(l.endereco || '')}">
        <label class="field-label">Celular</label>
        <input type="text" class="leadEditCelular" data-id="${l.id}" value="${escapeHtml(l.celular || '')}">
        <label class="field-label">Funcionário responsável</label>
        <select class="leadEditFuncionario" data-id="${l.id}">
          ${funcionarios.map(f => `<option value="${f.id}" ${f.id === l.funcionarioId ? 'selected' : ''}>${escapeHtml(f.nome)} (${escapeHtml(f.cargo)})</option>`).join('')}
        </select>
        <label class="curso-check-row">
          <input type="checkbox" class="leadEditTemContrato" data-id="${l.id}" ${l.temContrato ? 'checked' : ''}>
          <span>Cliente já tem contrato com a ECT (não precisa enviar para o Guilherme)</span>
        </label>
        <div style="margin-top:10px; display:flex; gap:12px; align-items:center;">
          <button class="save-btn" data-action="salvar-edicao" data-id="${l.id}" style="width:auto; padding:8px 16px;">Salvar edição</button>
          <button class="link-btn" data-action="cancelar-edicao" data-id="${l.id}">Cancelar</button>
        </div>
      </div>
      `;
    }
    return `
    <div class="list-item">
      <div class="list-item-top">
        <span class="cat-pill">${escapeHtml(func ? func.nome : 'Sem responsável')}</span>
        ${l.temContrato ? '<span class="cat-pill" style="background:var(--verde)">Já tem contrato</span>' : ''}
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
          ${etapasParaLead(l).map(e => `<option value="${e.key}" ${e.key === l.etapa ? 'selected' : ''}>${e.label}</option>`).join('')}
        </select>
        <input type="date" class="leadEtapaDate" data-id="${l.id}" value="${todayStr()}">
        <button class="small-btn" data-action="atualizar-etapa" data-id="${l.id}">Atualizar etapa</button>
      </div>
      ${renderFaturamentoBox(l)}
      <div style="margin-top:8px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        ${l.temContrato ? '' : `<button class="small-btn whatsapp-btn" data-action="enviar-whatsapp" data-id="${l.id}">Enviar para o Guilherme (WhatsApp)</button>`}
        <button class="small-btn" data-action="editar-lead" data-id="${l.id}">Editar</button>
        <button class="link-btn" data-action="excluir-lead" data-id="${l.id}">Excluir lead</button>
      </div>
    </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="enviar-whatsapp"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = loadLeads();
      const lead = list.find(x => x.id === btn.dataset.id);
      if (!lead) return;
      const func = funcionarios.find(f => f.id === lead.funcionarioId);
      window.open(buildLeadWhatsAppUrl(lead, func ? func.nome : ''), '_blank');

      // Avança automaticamente a etapa para "Envio do lead para o Guilherme",
      // mas só se o lead ainda estiver na etapa inicial (não regride etapas mais avançadas).
      if (lead.etapa === 'prospeccao') {
        lead.etapa = 'envio_guilherme';
        lead.historico.push({ etapa: 'envio_guilherme', data: todayStr() });
        saveLeads(list);
        renderLeadsListInner();
      }
    });
  });
  container.querySelectorAll('[data-action="editar-lead"]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingLeadId = btn.dataset.id;
      renderLeadsListInner();
    });
  });
  container.querySelectorAll('[data-action="cancelar-edicao"]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingLeadId = null;
      renderLeadsListInner();
    });
  });
  container.querySelectorAll('[data-action="salvar-edicao"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const razaoSocial = container.querySelector(`.leadEditRazaoSocial[data-id="${id}"]`).value.trim();
      const cnpj = container.querySelector(`.leadEditCnpj[data-id="${id}"]`).value.trim();
      const email = container.querySelector(`.leadEditEmail[data-id="${id}"]`).value.trim();
      const endereco = container.querySelector(`.leadEditEndereco[data-id="${id}"]`).value.trim();
      const celular = container.querySelector(`.leadEditCelular[data-id="${id}"]`).value.trim();
      const funcionarioId = container.querySelector(`.leadEditFuncionario[data-id="${id}"]`).value;
      const temContrato = container.querySelector(`.leadEditTemContrato[data-id="${id}"]`).checked;

      if (!razaoSocial) { alert('Informe a razão social.'); return; }

      const list = loadLeads();
      const lead = list.find(x => x.id === id);
      Object.assign(lead, { razaoSocial, cnpj, email, endereco, celular, funcionarioId, temContrato });

      // Se a etapa atual não existe mais no fluxo correspondente (ex.: mudou "tem contrato"
      // depois que o lead já estava em "Envio para o Guilherme"), volta para Prospecção.
      const chavesValidas = (temContrato ? ETAPAS_COM_CONTRATO_KEYS : ETAPAS_SEM_CONTRATO_KEYS);
      if (!chavesValidas.includes(lead.etapa)) {
        lead.etapa = 'prospeccao';
        lead.historico.push({ etapa: 'prospeccao', data: todayStr() });
      }

      saveLeads(list);
      editingLeadId = null;
      renderLeadsListInner();
    });
  });
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
  container.querySelectorAll('[data-action="salvar-faturamento"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const campo = btn.dataset.campo;
      const input = container.querySelector(`.leadFaturamentoInput[data-id="${id}"][data-campo="${campo}"]`);
      const valor = parseFloat((input.value || '').replace(',', '.'));
      if (isNaN(valor) || valor < 0) { alert('Informe um valor de faturamento válido.'); return; }
      const list = loadLeads();
      const lead = list.find(x => x.id === id);
      lead[campo] = valor;
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
  const postagensNoMes = [];
  leads.forEach(l => {
    (l.historico || []).forEach(h => {
      if (!h.data || !h.data.startsWith(mes)) return;
      if (h.etapa === 'contrato_assinado') assinadosNoMes.push({ lead: l, data: h.data });
      if (h.etapa === 'postando_agf') postagensNoMes.push({ lead: l, data: h.data });
    });
  });
  const totalAssinados = assinadosNoMes.length;

  const porFuncionarioAssinados = {};
  const clientesAssinadosPorFuncionario = {};
  assinadosNoMes.forEach(({ lead }) => {
    porFuncionarioAssinados[lead.funcionarioId] = (porFuncionarioAssinados[lead.funcionarioId] || 0) + 1;
    (clientesAssinadosPorFuncionario[lead.funcionarioId] = clientesAssinadosPorFuncionario[lead.funcionarioId] || []).push(lead.razaoSocial);
  });

  const clientesPostagemPorFuncionario = {};
  postagensNoMes.forEach(({ lead }) => {
    (clientesPostagemPorFuncionario[lead.funcionarioId] = clientesPostagemPorFuncionario[lead.funcionarioId] || []).push(lead.razaoSocial);
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
      prospectados: porFuncionarioProspectados[f.id] || 0,
      clientesAssinados: clientesAssinadosPorFuncionario[f.id] || [],
      clientesPostagem: clientesPostagemPorFuncionario[f.id] || []
    }))
    .filter(r => r.assinados > 0 || r.prospectados > 0 || r.clientesPostagem.length > 0)
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
          ${r.clientesAssinados.length > 0 ? `<div class="meta-line">Contratos assinados: ${r.clientesAssinados.map(escapeHtml).join(', ')}</div>` : ''}
          ${r.clientesPostagem.length > 0 ? `<div class="meta-line">Começaram a postar na AGF: ${r.clientesPostagem.map(escapeHtml).join(', ')}</div>` : ''}
        </div>
        <div>
          <div class="rank-count">${r.assinados}</div>
          <div class="rank-count-lbl">assinados</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('rankingBody').innerHTML = html;

  const funcById = {};
  funcionarios.forEach(f => { funcById[f.id] = f; });
  let detalheHtml = '';
  if (leadsProspectadosNoMes.length === 0) {
    detalheHtml = '<div class="empty-state">Nenhum cliente prospectado neste mês.</div>';
  } else {
    const leadsOrdenados = [...leadsProspectadosNoMes].sort((a, b) => (a.razaoSocial || '').localeCompare(b.razaoSocial || ''));
    detalheHtml = leadsOrdenados.map(l => {
      const func = funcById[l.funcionarioId];
      return `
        <div class="rank-row">
          <div class="rank-info">
            <div class="rank-name">${escapeHtml(l.razaoSocial)}</div>
            <div class="rank-cargo">Responsável: ${func ? escapeHtml(func.nome) : 'N/A'}</div>
          </div>
          <div>
            <div class="rank-count-lbl">${escapeHtml(etapaLabel(l.etapa))}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('rankingDetalheBody').innerHTML = detalheHtml;
}

/* ===================================================================
   MÓDULO: PRODUTOS (vendas de terceiros e ranking por pontos)
   =================================================================== */
const VENDAS_STORAGE_KEY = 'sappp_vendas_v1';

let _vendas = [];
function loadVendas() {
  return _vendas;
}
function saveVendas(list) {
  _vendas = list;
  syncFullTable('vendas', vendasToRows(list), 'id');
}
function vendasToRows(list) {
  return list.map(v => ({
    id: v.id,
    funcionario_id: v.funcionarioId,
    data: v.data,
    itens: v.itens || {},
    criado_em: v.criadoEm || new Date().toISOString(),
    atualizado_em: v.atualizadoEm || null
  }));
}
function rowsToVendas(rows) {
  return rows.map(r => ({
    id: r.id,
    funcionarioId: r.funcionario_id,
    data: r.data,
    itens: r.itens || {},
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em
  }));
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

const PROD_TABS = ['registrar', 'metas', 'vendasmes', 'ranking', 'sextabonus'];
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
  if (name === 'metas') renderMetas();
  if (name === 'vendasmes') renderVendasMes();
  if (name === 'ranking') renderRankingProdutos();
  if (name === 'sextabonus') renderSextaBonus();
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

/* ===== Aba: Metas mensais de produtos ===== */
const METAS_STORAGE_KEY = 'sappp_metas_v1';
let _metas = {};
function loadMetas() {
  return _metas;
}
function saveMetasData(data) {
  _metas = data;
  syncFullTable('metas', metasToRows(data), 'mes');
}
function metasToRows(data) {
  return Object.entries(data).map(([mes, itens]) => ({ mes, itens: itens || {} }));
}
function rowsToMetas(rows) {
  return rows.reduce((acc, r) => {
    acc[r.mes] = r.itens || {};
    return acc;
  }, {});
}

function renderMetas() {
  const mesInput = document.getElementById('mesMetas');
  if (!mesInput.value) {
    const d = new Date();
    mesInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  mesInput.onchange = renderMetasInner;
  renderMetasInner();
}

function renderMetasInner() {
  const mes = document.getElementById('mesMetas').value;
  const metas = loadMetas();
  const metasDoMes = metas[mes] || {};

  const vendidoPorProduto = {};
  loadVendas().filter(v => v.data && v.data.startsWith(mes)).forEach(v => {
    Object.entries(v.itens || {}).forEach(([prodId, qty]) => {
      vendidoPorProduto[prodId] = (vendidoPorProduto[prodId] || 0) + qty;
    });
  });

  const container = document.getElementById('metasList');
  container.innerHTML = PRODUCTS.map(p => {
    const meta = metasDoMes[p.id] || 0;
    const vendido = vendidoPorProduto[p.id] || 0;
    const pct = meta > 0 ? Math.min(100, Math.round((vendido / meta) * 100)) : 0;
    const atingiu = meta > 0 && vendido >= meta;
    return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cat-pill">${escapeHtml(p.nome)}</span>
          <span class="pts-tag">${vendido} vendido(s)</span>
        </div>
        <label class="field-label">Meta do mês (unidades)</label>
        <input type="number" min="0" class="meta-qty-input" data-produto="${p.id}" value="${meta || ''}" placeholder="Sem meta definida">
        ${meta > 0 ? `
        <div class="bar-row">
          <div class="bar-label"><span>Progresso</span><span>${pct}%${atingiu ? ' · meta atingida ✔' : ''}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${atingiu ? 'var(--verde)' : 'var(--azul)'}"></div></div>
        </div>` : '<p class="muted" style="margin:6px 0 0;">Defina uma meta para acompanhar o progresso.</p>'}
      </div>
    `;
  }).join('');

  document.getElementById('btnSalvarMetas').onclick = () => {
    const metasAtualizadas = {};
    document.querySelectorAll('.meta-qty-input').forEach(inp => {
      const qty = Number(inp.value) || 0;
      if (qty > 0) metasAtualizadas[inp.dataset.produto] = qty;
    });
    const all = loadMetas();
    all[mes] = metasAtualizadas;
    saveMetasData(all);
    alert('Metas salvas com sucesso!');
    renderMetasInner();
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
  const porFuncionarioProduto = {};
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

    if (!porFuncionarioProduto[v.funcionarioId]) porFuncionarioProduto[v.funcionarioId] = {};
    Object.entries(v.itens || {}).forEach(([prodId, qty]) => {
      if (!qty) return;
      porFuncionarioProduto[v.funcionarioId][prodId] = (porFuncionarioProduto[v.funcionarioId][prodId] || 0) + qty;
    });
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

  let detalheHtml = '';
  if (ranking.length === 0) {
    detalheHtml = '<div class="empty-state">Nenhuma venda registrada neste mês.</div>';
  } else {
    detalheHtml = ranking.map(r => {
      const produtosFunc = porFuncionarioProduto[r.funcionario.id] || {};
      const linhas = Object.entries(produtosFunc)
        .filter(([, qty]) => qty > 0)
        .map(([prodId, qty]) => {
          const p = produtoById(prodId);
          const nome = p ? p.nome : prodId;
          return `${escapeHtml(nome)}: ${qty} un.`;
        })
        .join(' · ');
      return `
        <div class="rank-row">
          <div class="rank-info">
            <div class="rank-name">${escapeHtml(r.funcionario.nome)}</div>
            ${linhas ? `<div class="meta-line">${linhas}</div>` : '<div class="meta-line">Nenhum produto vendido neste mês.</div>'}
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('rankingProdutosDetalheBody').innerHTML = detalheHtml;
}

/* ===== Aba: Bônus de Sexta (Heineken) ===== */
const PRODUTOS_BONUS_SEXTA = ['jequiti', 'seguro', 'plano_odontologico', 'chip_correios_celular'];

function renderSextaBonus() {
  const mesInput = document.getElementById('mesSextaBonus');
  if (!mesInput.value) {
    const d = new Date();
    mesInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  mesInput.onchange = renderSextaBonusInner;
  renderSextaBonusInner();
}

function renderSextaBonusInner() {
  const mes = document.getElementById('mesSextaBonus').value;
  const [ano, mesNum] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, mesNum, 0).getDate();

  const sextas = [];
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(ano, mesNum - 1, dia);
    if (d.getDay() === 5) sextas.push(formatDate(d));
  }

  const vendas = loadVendas();
  const funcionarios = loadFuncionarios();
  const hoje = todayStr();

  if (sextas.length === 0) {
    document.getElementById('sextaBonusBody').innerHTML = '<div class="empty-state">Nenhuma sexta-feira neste mês.</div>';
    return;
  }

  let totalLatoes = 0;

  const cardsHtml = sextas.map(sexta => {
    const vendasDoDia = vendas.filter(v => v.data === sexta);
    const vencedoresMap = {};
    vendasDoDia.forEach(v => {
      Object.entries(v.itens || {}).forEach(([prodId, qty]) => {
        if (!qty || !PRODUTOS_BONUS_SEXTA.includes(prodId)) return;
        if (!vencedoresMap[v.funcionarioId]) vencedoresMap[v.funcionarioId] = new Set();
        vencedoresMap[v.funcionarioId].add(prodId);
      });
    });

    const vencedores = Object.entries(vencedoresMap).map(([funcId, prodsSet]) => {
      const func = funcionarios.find(f => f.id === funcId);
      const nomes = Array.from(prodsSet).map(pid => {
        const p = produtoById(pid);
        return p ? p.nome : pid;
      });
      return { nome: func ? func.nome : 'Ex-funcionário', produtos: nomes };
    }).sort((a, b) => a.nome.localeCompare(b.nome));

    totalLatoes += vencedores.length;

    const futura = sexta > hoje;
    const dataBr = formatDateBR(sexta);

    let corpo;
    if (futura) {
      corpo = `<div class="sexta-vazio">⏳ Essa sexta ainda vai chegar... quem vai beber Heineken?</div>`;
    } else if (vencedores.length === 0) {
      corpo = `<div class="sexta-vazio">😅 Ninguém vendeu chip, Jequiti, seguro ou plano odontológico. A Heineken ficou geladinha esperando!</div>`;
    } else {
      corpo = `<div class="sexta-vencedores">` + vencedores.map(v => `
        <div class="sexta-vencedor">
          <span class="sexta-vencedor-icone">🍺</span>
          <div>
            <div class="sexta-vencedor-nome">${escapeHtml(v.nome)}</div>
            <div class="sexta-vencedor-produtos">${escapeHtml(v.produtos.join(' · '))}</div>
          </div>
        </div>
      `).join('') + `</div>`;
    }

    return `
      <div class="sexta-card ${futura ? 'sexta-card-futura' : (vencedores.length ? 'sexta-card-ganhou' : '')}">
        <div class="sexta-card-header">
          <span>🎉 Sexta, ${escapeHtml(dataBr)}</span>
          ${!futura && vencedores.length ? `<span class="sexta-card-badge">${vencedores.length} latão(ões)</span>` : ''}
        </div>
        ${corpo}
      </div>
    `;
  }).join('');

  const resumoHtml = `
    <div class="stat-grid">
      <div class="stat-box"><div class="num" style="color:var(--verde)">${totalLatoes}</div><div class="lbl">Latões de Heineken no mês 🍺</div></div>
      <div class="stat-box"><div class="num">${sextas.length}</div><div class="lbl">Sexta(s) no mês</div></div>
    </div>
  `;

  document.getElementById('sextaBonusBody').innerHTML = resumoHtml + cardsHtml;
}

/* ===================================================================
   MÓDULO: CURSOS OBRIGATÓRIOS (progresso de capacitação por funcionário)
   =================================================================== */
const CURSOS_PROGRESSO_KEY = 'sappp_cursos_progresso_v1';
const TIPO_LABELS = { preliminar: 'Preliminares (antes de assumir a função)', complementar: 'Complementares (até 90 dias)' };

let _cursosProgresso = {};
function loadCursosProgresso() {
  return _cursosProgresso;
}
function saveCursosProgresso(data) {
  _cursosProgresso = data;
  syncFullTable('cursos_progresso', cursosProgressoToRows(data), 'funcionario_id');
}
function cursosProgressoToRows(data) {
  return Object.entries(data).map(([funcionarioId, cursos]) => ({ funcionario_id: funcionarioId, cursos: cursos || {} }));
}
function rowsToCursosProgresso(rows) {
  return rows.reduce((acc, r) => {
    acc[r.funcionario_id] = r.cursos || {};
    return acc;
  }, {});
}
function cursosDoCargo(cargo) {
  return CURSOS_POR_CARGO[cargo] || [];
}

const CURSO_TABS = ['equipe', 'catalogo', 'chaves'];
let currentCursoTab = 'equipe';
document.getElementById('tabsCursos').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  activateCursosTab(btn.dataset.subtab);
});

function activateCursosTab(name) {
  currentCursoTab = name;
  CURSO_TABS.forEach(t => {
    document.getElementById('curso-' + t).classList.toggle('hidden', t !== name);
    document.querySelector(`#tabsCursos .tab-btn[data-subtab="${t}"]`).classList.toggle('active', t === name);
  });
  if (name === 'equipe') renderCursosEquipe();
  if (name === 'catalogo') renderCursosCatalogo();
  if (name === 'chaves') renderCursosChaves();
}

/* ===== Aba: Progresso da equipe ===== */
function renderCursosEquipe() {
  const funcionarios = loadFuncionarios()
    .filter(f => f.ativo && cursosDoCargo(f.cargo).length > 0)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const progresso = loadCursosProgresso();
  const container = document.getElementById('cursosEquipeList');

  if (funcionarios.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum funcionário com capacitação obrigatória cadastrado. Auxiliares Gerais e Estagiários não possuem cursos obrigatórios.</div>';
    return;
  }

  container.innerHTML = funcionarios.map(f => {
    const cursos = cursosDoCargo(f.cargo);
    const feitos = progresso[f.id] || {};
    const concluidos = cursos.filter(c => feitos[c.id]).length;
    const pct = Math.round((concluidos / cursos.length) * 100);
    const checklistHtml = ['preliminar', 'complementar'].map(tipo => {
      const doTipo = cursos.filter(c => c.tipo === tipo);
      if (doTipo.length === 0) return '';
      return `<div class="curso-tipo-title">${TIPO_LABELS[tipo]}</div>` +
        doTipo.map(c => `
          <label class="curso-check-row">
            <input type="checkbox" data-func="${f.id}" data-curso="${c.id}" ${feitos[c.id] ? 'checked' : ''}>
            <span>${escapeHtml(c.nome)}</span>
            <span class="curso-ch">${c.ch}h</span>
          </label>
        `).join('');
    }).join('');

    return `
      <div class="list-item">
        <div class="list-item-top">
          <span class="cargo-badge">${escapeHtml(f.cargo)}</span>
          <span class="pts-tag">${concluidos}/${cursos.length} concluídos</span>
        </div>
        <div class="list-item-question">${escapeHtml(f.nome)}</div>
        <div class="bar-row">
          <div class="bar-label"><span>Progresso da capacitação</span><span>${pct}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${pct === 100 ? 'var(--verde)' : 'var(--azul)'}"></div></div>
        </div>
        <button class="link-btn" data-action="toggle-cursos" data-id="${f.id}">Ver / marcar cursos</button>
        <div class="curso-checklist hidden" id="cursoChecklist-${f.id}">${checklistHtml}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="toggle-cursos"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('cursoChecklist-' + btn.dataset.id).classList.toggle('hidden');
    });
  });
  container.querySelectorAll('.curso-checklist input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => {
      const funcId = chk.dataset.func;
      const cursoId = chk.dataset.curso;
      const data = loadCursosProgresso();
      data[funcId] = data[funcId] || {};
      if (chk.checked) data[funcId][cursoId] = true;
      else delete data[funcId][cursoId];
      saveCursosProgresso(data);
      renderCursosEquipe();
      // reabre o checklist do funcionário editado após o re-render
      document.getElementById('cursoChecklist-' + funcId).classList.remove('hidden');
    });
  });
}

/* ===== Aba: Cursos por cargo (catálogo de referência) ===== */
function renderCursosCatalogo() {
  const select = document.getElementById('filtroCargoCurso');
  if (select.options.length <= 1) {
    select.innerHTML = '<option value="">Todos os cargos</option>' +
      Object.keys(CURSOS_POR_CARGO).map(c => `<option value="${c}">${c}</option>`).join('');
  }
  select.onchange = renderCursosCatalogoInner;
  renderCursosCatalogoInner();
}

function renderCursosCatalogoInner() {
  const cargoF = document.getElementById('filtroCargoCurso').value;
  const cargos = cargoF ? [cargoF] : Object.keys(CURSOS_POR_CARGO);
  const container = document.getElementById('cursosCatalogoList');

  let html = '';
  cargos.forEach(cargo => {
    const cursos = CURSOS_POR_CARGO[cargo];
    const totalCh = cursos.reduce((s, c) => s + c.ch, 0);
    html += `<div class="li-cat-title">${escapeHtml(cargo)} — ${cursos.length} cursos, ${totalCh}h</div>`;
    ['preliminar', 'complementar'].forEach(tipo => {
      const doTipo = cursos.filter(c => c.tipo === tipo);
      if (doTipo.length === 0) return;
      html += `<div class="curso-tipo-title">${TIPO_LABELS[tipo]}</div>`;
      html += doTipo.map(c => `
        <div class="li-item curso-catalogo-item">
          <span>${escapeHtml(c.nome)}</span>
          <span class="curso-ch">${c.ch}h</span>
        </div>
      `).join('');
    });
  });
  container.innerHTML = html || '<div class="empty-state">Nenhum curso encontrado.</div>';
}

/* ===== Aba: Chaves de cursos (consulta da planilha oficial) ===== */
function renderCursosChaves() {
  const input = document.getElementById('buscaChaveCurso');
  input.oninput = renderCursosChavesInner;
  renderCursosChavesInner();
}

function renderCursosChavesInner() {
  const termo = normalizarTexto(document.getElementById('buscaChaveCurso').value.trim());
  const container = document.getElementById('cursosChavesList');

  const cursos = CURSOS_CHAVES
    .filter(c => {
      if (!termo) return true;
      return normalizarTexto(c.nome).includes(termo) ||
        normalizarTexto(c.codigo).includes(termo) ||
        normalizarTexto(c.chave).includes(termo);
    })
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (cursos.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum curso encontrado para essa busca.</div>';
    return;
  }

  container.innerHTML = `<div class="muted" style="margin-bottom:10px;">${cursos.length} curso(s) encontrado(s)</div>` +
    cursos.map(c => `
      <div class="li-item curso-chave-item">
        <div>
          <div class="li-question">${escapeHtml(c.nome)}</div>
          <div class="muted" style="font-size:12px;">${escapeHtml(c.codigo)} · ${escapeHtml(c.modalidade)} · ${c.ch}h${c.aplicavel.length ? ' · ' + c.aplicavel.map(escapeHtml).join(', ') : ''}</div>
        </div>
        <div class="curso-chave-box">
          <span class="curso-chave-valor">${escapeHtml(c.chave)}</span>
          <button class="small-btn" type="button" data-action="copiar-chave" data-chave="${escapeHtml(c.chave)}">Copiar</button>
        </div>
      </div>
    `).join('');

  container.querySelectorAll('[data-action="copiar-chave"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chave = btn.dataset.chave;
      navigator.clipboard.writeText(chave).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      }).catch(() => {
        alert('Chave: ' + chave);
      });
    });
  });
}

function normalizarTexto(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/* ===================================================================
   MÓDULO: COMISSÕES (contratos assinados + liderança no ranking de produtos)
   =================================================================== */
const COMISSAO_CONTRATO_VALOR = 30;
const COMISSAO_LIDER_PRODUTOS_VALOR = 35;

function formatBRL(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularComissoes(mes) {
  const funcionarios = loadFuncionarios();
  const leads = loadLeads();
  const vendas = loadVendas();

  const contratosPorFuncionario = {};
  const postagensPorFuncionario = {};
  const clientesContratoPorFuncionario = {};
  const clientesPostagemPorFuncionario = {};
  // Comissão de 5% sobre o faturamento do 1º mês (contrato assinado ou começou a postar na AGF).
  // Conta no mês da data inicial do marco (mesmo que o valor só seja lançado ~30 dias depois).
  // Essa comissão SOMA com a comissão fixa de R$30 por contrato/postagem acima.
  const comissaoFaturamentoPorFuncionario = {};
  const clientesFaturamentoPorFuncionario = {};
  leads.forEach(l => {
    (l.historico || []).forEach(h => {
      if (!h.data || !h.data.startsWith(mes)) return;
      if (h.etapa === 'contrato_assinado') {
        contratosPorFuncionario[l.funcionarioId] = (contratosPorFuncionario[l.funcionarioId] || 0) + 1;
        (clientesContratoPorFuncionario[l.funcionarioId] = clientesContratoPorFuncionario[l.funcionarioId] || []).push(l.razaoSocial);
        if (l.faturamentoContrato) {
          const com = l.faturamentoContrato * 0.05;
          comissaoFaturamentoPorFuncionario[l.funcionarioId] = (comissaoFaturamentoPorFuncionario[l.funcionarioId] || 0) + com;
          (clientesFaturamentoPorFuncionario[l.funcionarioId] = clientesFaturamentoPorFuncionario[l.funcionarioId] || [])
            .push(`${l.razaoSocial} (${formatBRL(l.faturamentoContrato)} → ${formatBRL(com)})`);
        }
      }
      if (h.etapa === 'postando_agf') {
        postagensPorFuncionario[l.funcionarioId] = (postagensPorFuncionario[l.funcionarioId] || 0) + 1;
        (clientesPostagemPorFuncionario[l.funcionarioId] = clientesPostagemPorFuncionario[l.funcionarioId] || []).push(l.razaoSocial);
        if (l.faturamentoPostagem) {
          const com = l.faturamentoPostagem * 0.05;
          comissaoFaturamentoPorFuncionario[l.funcionarioId] = (comissaoFaturamentoPorFuncionario[l.funcionarioId] || 0) + com;
          (clientesFaturamentoPorFuncionario[l.funcionarioId] = clientesFaturamentoPorFuncionario[l.funcionarioId] || [])
            .push(`${l.razaoSocial} (${formatBRL(l.faturamentoPostagem)} → ${formatBRL(com)})`);
        }
      }
    });
  });

  // Quem liderar o ranking de pontos de produtos NESTE mês ganha a comissão do mês.
  // Em caso de empate no topo, a comissão do mês é dividida entre os líderes empatados.
  const comissaoProdutosPorFuncionario = {};
  const lideresProdutosDoMes = [];
  const porFuncProdutos = {};
  vendas.filter(v => v.data && v.data.startsWith(mes)).forEach(v => {
    if (!porFuncProdutos[v.funcionarioId]) porFuncProdutos[v.funcionarioId] = 0;
    porFuncProdutos[v.funcionarioId] += vendaTotalPontos(v);
  });
  const entries = Object.entries(porFuncProdutos).filter(([, pontos]) => pontos > 0);
  if (entries.length > 0) {
    const maxPontos = Math.max(...entries.map(([, pontos]) => pontos));
    const lideres = entries.filter(([, pontos]) => pontos === maxPontos).map(([id]) => id);
    const comissaoPorLider = COMISSAO_LIDER_PRODUTOS_VALOR / lideres.length;
    lideres.forEach(id => {
      comissaoProdutosPorFuncionario[id] = comissaoPorLider;
      lideresProdutosDoMes.push(id);
    });
  }

  return funcionarios.map(f => {
    const contratos = contratosPorFuncionario[f.id] || 0;
    const postagens = postagensPorFuncionario[f.id] || 0;
    const liderProdutos = lideresProdutosDoMes.includes(f.id);
    const comissaoContratos = contratos * COMISSAO_CONTRATO_VALOR;
    const comissaoPostagens = postagens * COMISSAO_CONTRATO_VALOR;
    const comissaoProdutos = comissaoProdutosPorFuncionario[f.id] || 0;
    const comissaoFaturamento = comissaoFaturamentoPorFuncionario[f.id] || 0;
    return {
      funcionario: f,
      contratos,
      postagens,
      liderProdutos,
      comissaoContratos,
      comissaoPostagens,
      comissaoProdutos,
      comissaoFaturamento,
      clientesContrato: clientesContratoPorFuncionario[f.id] || [],
      clientesPostagem: clientesPostagemPorFuncionario[f.id] || [],
      clientesFaturamento: clientesFaturamentoPorFuncionario[f.id] || [],
      total: comissaoContratos + comissaoPostagens + comissaoProdutos + comissaoFaturamento
    };
  })
  .filter(r => r.total > 0)
  .sort((a, b) => b.total - a.total);
}

function renderComissoes() {
  const mesInput = document.getElementById('mesComissoes');
  if (!mesInput.value) {
    const d = new Date();
    mesInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  mesInput.onchange = renderComissoesInner;
  renderComissoesInner();
}

function renderComissoesInner() {
  const mes = document.getElementById('mesComissoes').value;
  const dados = calcularComissoes(mes);
  const totalContratos = dados.reduce((s, r) => s + r.comissaoContratos, 0);
  const totalPostagens = dados.reduce((s, r) => s + r.comissaoPostagens, 0);
  const totalProdutos = dados.reduce((s, r) => s + r.comissaoProdutos, 0);
  const totalFaturamento = dados.reduce((s, r) => s + r.comissaoFaturamento, 0);
  const totalGeral = totalContratos + totalPostagens + totalProdutos + totalFaturamento;

  let html = `
    <div class="stat-grid">
      <div class="stat-box"><div class="num" style="color:var(--verde)">${formatBRL(totalGeral)}</div><div class="lbl">Comissão total da equipe no mês</div></div>
      <div class="stat-box"><div class="num">${formatBRL(totalContratos)}</div><div class="lbl">De contratos assinados</div></div>
      <div class="stat-box"><div class="num">${formatBRL(totalPostagens)}</div><div class="lbl">De clientes postando na AGF</div></div>
      <div class="stat-box"><div class="num">${formatBRL(totalProdutos)}</div><div class="lbl">De liderança em produtos</div></div>
      <div class="stat-box"><div class="num">${formatBRL(totalFaturamento)}</div><div class="lbl">De 5% sobre faturamento do 1º mês</div></div>
    </div>
  `;

  if (dados.length === 0) {
    html += '<div class="empty-state">Nenhuma comissão registrada neste mês.</div>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    html += dados.map((r, i) => `
      <div class="rank-row">
        <div class="rank-pos">${medals[i] || (i + 1)}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.funcionario.nome)}</div>
          <div class="rank-cargo">${escapeHtml(r.funcionario.cargo)} · ${r.contratos} contrato(s) assinado(s) · ${r.postagens} cliente(s) postando na AGF${r.liderProdutos ? ' · líder em produtos no mês' : ''}</div>
          ${r.clientesContrato.length > 0 ? `<div class="meta-line">Contratos assinados: ${r.clientesContrato.map(escapeHtml).join(', ')}</div>` : ''}
          ${r.clientesPostagem.length > 0 ? `<div class="meta-line">Começaram a postar na AGF: ${r.clientesPostagem.map(escapeHtml).join(', ')}</div>` : ''}
          ${r.clientesFaturamento.length > 0 ? `<div class="meta-line">5% sobre faturamento do 1º mês: ${r.clientesFaturamento.map(escapeHtml).join(', ')}</div>` : ''}
        </div>
        <div>
          <div class="rank-count" style="color:var(--verde)">${formatBRL(r.total)}</div>
          <div class="rank-count-lbl">comissão no mês</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('comissoesBody').innerHTML = html;
}

/* ===================================================================
   MÓDULO: RELATÓRIOS (consolidado semanal/mensal/personalizado)
   =================================================================== */
function isoDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dia = date.getDay(); // 0 = domingo
  const diff = (dia === 0 ? -6 : 1 - dia); // segunda-feira como início da semana
  date.setDate(date.getDate() + diff);
  return date;
}
function periodoRelatorioGeral(tipo) {
  const hoje = new Date();
  let inicio, fim;
  if (tipo === 'semana_atual') {
    inicio = startOfWeek(hoje);
    fim = new Date(inicio); fim.setDate(fim.getDate() + 6);
  } else if (tipo === 'semana_passada') {
    inicio = startOfWeek(hoje); inicio.setDate(inicio.getDate() - 7);
    fim = new Date(inicio); fim.setDate(fim.getDate() + 6);
  } else if (tipo === 'mes_passado') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  } else {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  }
  return { inicio: isoDateStr(inicio), fim: isoDateStr(fim) };
}

function activateRelatoriosModule() {
  const tipoSel = document.getElementById('relatorioTipoPeriodo');
  document.getElementById('relatorioPersonalizadoRow').classList.toggle('hidden', tipoSel.value !== 'personalizado');
  if (tipoSel.value !== 'personalizado') {
    const { inicio, fim } = periodoRelatorioGeral(tipoSel.value);
    document.getElementById('relatorioDataInicio').value = inicio;
    document.getElementById('relatorioDataFim').value = fim;
  }
  renderRelatorioGeral();
}

document.getElementById('relatorioTipoPeriodo').addEventListener('change', () => {
  const tipoSel = document.getElementById('relatorioTipoPeriodo');
  const personalizado = tipoSel.value === 'personalizado';
  document.getElementById('relatorioPersonalizadoRow').classList.toggle('hidden', !personalizado);
  if (!personalizado) {
    const { inicio, fim } = periodoRelatorioGeral(tipoSel.value);
    document.getElementById('relatorioDataInicio').value = inicio;
    document.getElementById('relatorioDataFim').value = fim;
    renderRelatorioGeral();
  }
});
document.getElementById('btnGerarRelatorio').addEventListener('click', renderRelatorioGeral);
document.getElementById('btnImprimirRelatorio').addEventListener('click', () => window.print());
document.getElementById('btnRelatorioProspeccaoPDF').addEventListener('click', () => window.print());
document.getElementById('btnRelatorioProdutosPDF').addEventListener('click', () => window.print());

function renderRelatorioGeral() {
  const inicio = document.getElementById('relatorioDataInicio').value;
  const fim = document.getElementById('relatorioDataFim').value;
  const body = document.getElementById('relatorioGeralBody');
  if (!inicio || !fim || inicio > fim) {
    body.innerHTML = '<div class="empty-state">Selecione um período válido.</div>';
    return;
  }
  const noPeriodo = (dataStr) => !!dataStr && dataStr >= inicio && dataStr <= fim;
  const inicioBR = formatDateBR(inicio);
  const fimBR = formatDateBR(fim);

  /* ---- Verificações ---- */
  const records = loadRecords();
  const verifEntries = Object.entries(records).filter(([data]) => noPeriodo(data));
  const verifTotal = verifEntries.length;
  const verifConformes = verifEntries.filter(([, r]) => r.status === 'conforme').length;
  const verifNaoConformes = verifEntries.filter(([, r]) => r.status === 'nao_conforme').length;
  const verifBase = verifEntries.filter(([, r]) => r.status !== 'na').length;
  const verifPct = verifBase > 0 ? Math.round((verifConformes / verifBase) * 100) : 0;

  let verifCatHtml = '';
  Object.keys(CAT_LABELS).forEach(cat => {
    const catEntries = verifEntries.filter(([, r]) => itemById(r.itemId).cat === cat);
    const catBase = catEntries.filter(([, r]) => r.status !== 'na').length;
    const catConf = catEntries.filter(([, r]) => r.status === 'conforme').length;
    const pct = catBase > 0 ? Math.round((catConf / catBase) * 100) : null;
    verifCatHtml += `
      <div class="bar-row">
        <div class="bar-label"><span>${CAT_LABELS[cat]}</span><span>${pct === null ? 'sem dados' : pct + '%'} (${catEntries.length} verificações)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct || 0}%; background:${pct !== null && pct < 70 ? 'var(--vermelho)' : 'var(--verde)'}"></div></div>
      </div>
    `;
  });

  /* ---- Produtos ---- */
  const vendas = loadVendas().filter(v => noPeriodo(v.data));
  const funcionarios = loadFuncionarios();
  const porFuncionarioProd = {};
  const porProduto = {};
  let totalPontosGeral = 0;
  let totalItensGeral = 0;
  vendas.forEach(v => {
    const pontos = vendaTotalPontos(v);
    const itens = vendaTotalItens(v);
    totalPontosGeral += pontos;
    totalItensGeral += itens;
    if (!porFuncionarioProd[v.funcionarioId]) porFuncionarioProd[v.funcionarioId] = { pontos: 0, itens: 0 };
    porFuncionarioProd[v.funcionarioId].pontos += pontos;
    porFuncionarioProd[v.funcionarioId].itens += itens;
    Object.entries(v.itens || {}).forEach(([prodId, qty]) => {
      porProduto[prodId] = (porProduto[prodId] || 0) + qty;
    });
  });
  const rankingProdutos = funcionarios
    .map(f => ({ funcionario: f, pontos: (porFuncionarioProd[f.id] || {}).pontos || 0, itens: (porFuncionarioProd[f.id] || {}).itens || 0 }))
    .filter(r => r.pontos > 0 || r.itens > 0)
    .sort((a, b) => b.pontos - a.pontos || b.itens - a.itens);

  /* ---- Prospecção ---- */
  const leads = loadLeads();
  const leadsProspectadosNoPeriodo = leads.filter(l => noPeriodo(l.criadoEm));
  const contratosNoPeriodo = [];
  const postagensNoPeriodo = [];
  leads.forEach(l => {
    (l.historico || []).forEach(h => {
      if (!noPeriodo(h.data)) return;
      if (h.etapa === 'contrato_assinado') contratosNoPeriodo.push(l);
      if (h.etapa === 'postando_agf') postagensNoPeriodo.push(l);
    });
  });

  const vazio = () => ({ prospectados: 0, contratos: 0, postagens: 0, clientesContrato: [], clientesPostagem: [], comissao: 0 });
  const porFuncionarioProsp = {};
  leadsProspectadosNoPeriodo.forEach(l => {
    porFuncionarioProsp[l.funcionarioId] = porFuncionarioProsp[l.funcionarioId] || vazio();
    porFuncionarioProsp[l.funcionarioId].prospectados++;
  });
  contratosNoPeriodo.forEach(l => {
    porFuncionarioProsp[l.funcionarioId] = porFuncionarioProsp[l.funcionarioId] || vazio();
    porFuncionarioProsp[l.funcionarioId].contratos++;
    porFuncionarioProsp[l.funcionarioId].clientesContrato.push(l.razaoSocial);
    porFuncionarioProsp[l.funcionarioId].comissao += COMISSAO_CONTRATO_VALOR;
  });
  postagensNoPeriodo.forEach(l => {
    porFuncionarioProsp[l.funcionarioId] = porFuncionarioProsp[l.funcionarioId] || vazio();
    porFuncionarioProsp[l.funcionarioId].postagens++;
    porFuncionarioProsp[l.funcionarioId].clientesPostagem.push(l.razaoSocial);
    porFuncionarioProsp[l.funcionarioId].comissao += COMISSAO_CONTRATO_VALOR;
  });

  const rankingProspeccao = funcionarios
    .map(f => ({ funcionario: f, ...(porFuncionarioProsp[f.id] || vazio()) }))
    .filter(r => r.prospectados > 0 || r.contratos > 0 || r.postagens > 0)
    .sort((a, b) => b.contratos - a.contratos || b.postagens - a.postagens || b.prospectados - a.prospectados);

  const comissaoProspeccaoTotal = rankingProspeccao.reduce((s, r) => s + r.comissao, 0);

  /* ---- Montagem do HTML ---- */
  let html = `<p class="muted">Período do relatório: <strong>${inicioBR}</strong> a <strong>${fimBR}</strong></p>`;

  html += '<h2 style="font-size:15px; margin-top:18px;">Verificações diárias</h2>';
  html += `
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${verifTotal}</div><div class="lbl">Verificações</div></div>
      <div class="stat-box"><div class="num" style="color:var(--verde)">${verifConformes}</div><div class="lbl">Conformes</div></div>
      <div class="stat-box"><div class="num" style="color:var(--vermelho)">${verifNaoConformes}</div><div class="lbl">Não conformes</div></div>
      <div class="stat-box"><div class="num">${verifPct}%</div><div class="lbl">Índice de conformidade</div></div>
    </div>
  `;
  html += verifTotal > 0 ? verifCatHtml : '<div class="empty-state">Nenhuma verificação registrada no período.</div>';

  html += '<h2 style="font-size:15px; margin-top:24px;">Produtos vendidos</h2>';
  html += `
    <div class="stat-grid">
      <div class="stat-box"><div class="num" style="color:var(--verde)">${totalPontosGeral}</div><div class="lbl">Pontos no período</div></div>
      <div class="stat-box"><div class="num">${totalItensGeral}</div><div class="lbl">Produtos vendidos</div></div>
    </div>
  `;
  const produtosVendidos = PRODUCTS.filter(p => porProduto[p.id] > 0);
  if (produtosVendidos.length > 0) {
    html += produtosVendidos.map(p => `
      <div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(p.nome)}</span><span>${porProduto[p.id]} unidade(s)</span></div>
      </div>
    `).join('');
  }
  if (rankingProdutos.length === 0) {
    html += '<div class="empty-state">Nenhuma venda registrada no período.</div>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    html += rankingProdutos.map((r, i) => `
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

  html += '<h2 style="font-size:15px; margin-top:24px;">Prospecção de clientes</h2>';
  html += `
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${leadsProspectadosNoPeriodo.length}</div><div class="lbl">Leads prospectados</div></div>
      <div class="stat-box"><div class="num" style="color:var(--verde)">${contratosNoPeriodo.length}</div><div class="lbl">Contratos assinados</div></div>
      <div class="stat-box"><div class="num" style="color:var(--verde)">${postagensNoPeriodo.length}</div><div class="lbl">Clientes postando na AGF</div></div>
      <div class="stat-box"><div class="num" style="color:var(--verde)">${formatBRL(comissaoProspeccaoTotal)}</div><div class="lbl">Comissão gerada</div></div>
    </div>
  `;
  if (rankingProspeccao.length === 0) {
    html += '<div class="empty-state">Nenhuma prospecção registrada no período.</div>';
  } else {
    html += rankingProspeccao.map(r => `
      <div class="rank-row">
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.funcionario.nome)}</div>
          <div class="rank-cargo">${escapeHtml(r.funcionario.cargo)} · ${r.prospectados} lead(s) prospectado(s) · ${r.contratos} contrato(s) · ${r.postagens} postagem(ns)</div>
          ${r.clientesContrato.length > 0 ? `<div class="meta-line">Contratos assinados: ${r.clientesContrato.map(escapeHtml).join(', ')}</div>` : ''}
          ${r.clientesPostagem.length > 0 ? `<div class="meta-line">Começaram a postar na AGF: ${r.clientesPostagem.map(escapeHtml).join(', ')}</div>` : ''}
        </div>
        <div>
          <div class="rank-count" style="color:var(--verde)">${formatBRL(r.comissao)}</div>
          <div class="rank-count-lbl">comissão</div>
        </div>
      </div>
    `).join('');
  }

  body.innerHTML = html;
}

/* ===== Utils ===== */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

/* ===== Init ===== */
async function fetchAllFromSupabase() {
  const [verifRes, funcRes, leadsRes, vendasRes, metasRes, cursosRes] = await Promise.all([
    sb.from('verificacoes').select('*'),
    sb.from('funcionarios').select('*'),
    sb.from('leads').select('*'),
    sb.from('vendas').select('*'),
    sb.from('metas').select('*'),
    sb.from('cursos_progresso').select('*')
  ]);
  const all = [verifRes, funcRes, leadsRes, vendasRes, metasRes, cursosRes];
  const ok = all.every(res => !res.error);
  if (!ok) all.forEach(res => { if (res.error) console.error('Erro ao carregar dados do Supabase:', res.error); });
  return {
    ok,
    verificacoes: verifRes.data || [],
    funcionarios: funcRes.data || [],
    leads: leadsRes.data || [],
    vendas: vendasRes.data || [],
    metas: metasRes.data || [],
    cursosProgresso: cursosRes.data || []
  };
}

function readLegacyLocalStorage() {
  function readKey(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  return {
    records: readKey(STORAGE_KEY, {}),
    funcionarios: readKey(FUNC_STORAGE_KEY, []),
    leads: readKey(LEADS_STORAGE_KEY, []),
    vendas: readKey(VENDAS_STORAGE_KEY, []),
    metas: readKey(METAS_STORAGE_KEY, {}),
    cursosProgresso: readKey(CURSOS_PROGRESSO_KEY, {})
  };
}

// Na primeira carga após a migração para o Supabase, se as tabelas remotas ainda
// estiverem vazias e existirem dados antigos no localStorage, envia esses dados
// para o Supabase uma única vez (o localStorage original não é apagado). Só marca
// a migração como concluída se as tabelas remotas puderam ser lidas e a gravação
// não teve erros — caso contrário tenta de novo na próxima carga.
async function migrateLegacyDataIfNeeded(remote) {
  if (!remote.ok || localStorage.getItem(MIGRATION_FLAG)) return remote;

  const remoteIsEmpty = remote.verificacoes.length === 0 && remote.funcionarios.length === 0 &&
    remote.leads.length === 0 && remote.vendas.length === 0 &&
    remote.metas.length === 0 && remote.cursosProgresso.length === 0;

  const legacy = readLegacyLocalStorage();
  const legacyHasData = Object.keys(legacy.records).length > 0 || legacy.funcionarios.length > 0 ||
    legacy.leads.length > 0 || legacy.vendas.length > 0 ||
    Object.keys(legacy.metas).length > 0 || Object.keys(legacy.cursosProgresso).length > 0;

  if (!remoteIsEmpty || !legacyHasData) {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return remote;
  }

  const tasks = [];
  if (Object.keys(legacy.records).length > 0) tasks.push(sb.from('verificacoes').upsert(recordsToRows(legacy.records), { onConflict: 'data' }));
  if (legacy.funcionarios.length > 0) tasks.push(sb.from('funcionarios').upsert(funcionariosToRows(legacy.funcionarios), { onConflict: 'id' }));
  if (legacy.leads.length > 0) tasks.push(sb.from('leads').upsert(leadsToRows(legacy.leads), { onConflict: 'id' }));
  if (legacy.vendas.length > 0) tasks.push(sb.from('vendas').upsert(vendasToRows(legacy.vendas), { onConflict: 'id' }));
  if (Object.keys(legacy.metas).length > 0) tasks.push(sb.from('metas').upsert(metasToRows(legacy.metas), { onConflict: 'mes' }));
  if (Object.keys(legacy.cursosProgresso).length > 0) tasks.push(sb.from('cursos_progresso').upsert(cursosProgressoToRows(legacy.cursosProgresso), { onConflict: 'funcionario_id' }));

  const results = await Promise.all(tasks);
  const migrationOk = results.every(res => !res.error);
  results.forEach(res => {
    if (res.error) console.error('Erro ao migrar dados antigos para o Supabase:', res.error);
  });

  if (!migrationOk) return remote;

  localStorage.setItem(MIGRATION_FLAG, '1');
  return fetchAllFromSupabase();
}

async function bootstrap() {
  let remote = await fetchAllFromSupabase();
  remote = await migrateLegacyDataIfNeeded(remote);

  if (remote.ok) {
    _records = rowsToRecords(remote.verificacoes);
    _funcionarios = rowsToFuncionarios(remote.funcionarios);
    _leads = rowsToLeads(remote.leads);
    _vendas = rowsToVendas(remote.vendas);
    _metas = rowsToMetas(remote.metas);
    _cursosProgresso = rowsToCursosProgresso(remote.cursosProgresso);
  } else {
    // Supabase indisponível (ex.: tabelas ainda não criadas) — usa os dados locais
    // como fallback temporário, sem apagar nada; a sincronização retoma sozinha
    // assim que o Supabase responder normalmente.
    const legacy = readLegacyLocalStorage();
    _records = legacy.records;
    _funcionarios = legacy.funcionarios;
    _leads = legacy.leads;
    _vendas = legacy.vendas;
    _metas = legacy.metas;
    _cursosProgresso = legacy.cursosProgresso;
  }

  document.body.classList.remove('app-loading');
  renderHeader();
  updatePendBadge();
  renderHoje();
}

bootstrap();
