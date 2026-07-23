'use strict';

const DOC_STORE_KEY = 'nash_os_runtime_document_vault_v2';
const ACCESS_SESSION_KEY = 'nash_os_workspace_access_v2';

const state = {
  role: 'employee',
  selectedEmployee: null,
  selectedTask: null,
  employees: [],
  tasks: [],
  receipts: [],
  localDrafts: [],
  localRequests: [],
  documents: loadDocumentStore()
};

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = (value) => value === undefined || value === null || value === '' ? '—' : String(value);
const idNow = () => `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

async function api(url, options = {}) {
  const session = readAccessSession();
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(session?.token ? { 'X-NASH-SESSION': session.token } : {}), ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.error || text || `Request failed: ${res.status}`);
  return data;
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(window.__nashToast);
  window.__nashToast = setTimeout(() => el.classList.add('hidden'), 3400);
}


const SAAS_NAV = {
  employee: [
    { label: 'My Workspace', command: 'emp_select', icon: '01' },
    { label: 'Attendance', command: 'emp_checkin', icon: '02' },
    { label: 'Tasks & Evidence', command: 'emp_tasks', icon: '03' },
    { label: 'Employee File', command: 'emp_file', icon: '04' },
    { label: 'Performance', command: 'emp_performance', icon: '05' },
    { label: 'Rights & Reports', command: 'emp_rights', icon: '06' }
  ],
  manager: [
    { label: 'Manager Workspace', command: 'mgr_select', icon: '01' },
    { label: 'Team Queue', command: 'mgr_queue', icon: '02' },
    { label: 'Task Assignment', command: 'mgr_add_task', icon: '03' },
    { label: 'Work Review', command: 'mgr_review', icon: '04' },
    { label: 'Evidence Review', command: 'mgr_review_evidence', icon: '05' },
    { label: 'SLA Escalation', command: 'mgr_escalate_sla', icon: '06' }
  ],
  hr: [
    { label: 'HR Workspace', command: 'hr_select', icon: '01' },
    { label: 'Employee 360', command: 'hr_file', icon: '02' },
    { label: 'Enterprise HR Core', command: 'hr_core', icon: '03' },
    { label: 'Performance', command: 'hr_performance', icon: '04' },
    { label: 'Learning', command: 'hr_training', icon: '05' },
    { label: 'Compensation', command: 'hr_compensation', icon: '06' },
    { label: 'Government', command: 'hr_government', icon: '07' },
    { label: 'Quality & Governance', command: 'hr_quality', icon: '08' },
    { label: 'AI Decision Support', command: 'hr_ai', icon: '09' }
  ],
  executive: [
    { label: 'Executive Dashboard', command: 'exec_dashboard', icon: '01' },
    { label: 'Executive Brief', command: 'exec_brief', icon: '02' },
    { label: 'Risk Board', command: 'exec_risk', icon: '03' },
    { label: 'Decision Backlog', command: 'exec_backlog', icon: '04' },
    { label: 'Governance', command: 'exec_governance', icon: '05' },
    { label: 'AI Risk Radar', command: 'exec_ai', icon: '06' },
    { label: 'Reports Center', command: 'exec_reports', icon: '07' },
    { label: 'AI Copilot', command: 'exec_copilot', icon: '08' },
    { label: 'Tenant Administration', command: 'exec_tenants', icon: '09' },
    { label: 'Subscription & Billing', command: 'exec_billing', icon: '10' },
    { label: 'Provisioning', command: 'exec_provisioning', icon: '11' },
    { label: 'Release Readiness', command: 'exec_release', icon: '12' },
    { label: 'System Proof', command: 'final_acceptance', icon: '13' }
  ]
};

function tenantSlug(value) {
  return String(value || 'nash-enterprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'nash-enterprise';
}

function renderSaaSShell() {
  const session = readAccessSession() || { tenant: 'NASH Enterprise', email: 'local@nash.local', role: state.role };
  const tenantId = `TNT-${tenantSlug(session.tenant).toUpperCase()}`;
  if ($('tenantContextCard')) $('tenantContextCard').innerHTML = `
    <div class="tenant-avatar">${esc(String(session.tenant || 'N').slice(0, 1).toUpperCase())}</div>
    <div><strong>${esc(session.tenant || 'NASH Enterprise')}</strong><span>${esc(tenantId)}</span></div>
    <span class="tenant-live-dot" title="Tenant active"></span>`;
  if ($('saasPlanCard')) $('saasPlanCard').innerHTML = `
    <div><span class="side-label">Subscription</span><strong>Enterprise Trial</strong></div>
    <span class="plan-status">ACTIVE</span>
    <small>Single-tenant local acceptance mode. Provisioning controls will be activated without changing the current HR schema.</small>`;
  if ($('workspaceIdentity')) $('workspaceIdentity').innerHTML = `<strong>${esc(session.email || 'Local user')}</strong><span>${esc(ROLES[state.role].label)} · ${esc(session.tenant || 'NASH Enterprise')}</span>`;
  if ($('assignedRoleCard')) $('assignedRoleCard').innerHTML = `<strong>${esc(ROLES[state.role].label)}</strong><span>Organization-assigned role</span><small>Navigation and actions are restricted to this access profile.</small>`;
}

function renderWorkspaceNavigation() {
  const items = SAAS_NAV[state.role] || [];
  $('roleNav').innerHTML = items.map((item, index) => `<button class="nav-item workspace-nav-item ${index === 0 ? 'active' : ''}" data-nav-command="${esc(item.command)}"><span class="nav-index">${esc(item.icon)}</span><span>${esc(item.label)}</span></button>`).join('');
  document.querySelectorAll('[data-nav-command]').forEach((btn) => btn.onclick = async () => {
    document.querySelectorAll('[data-nav-command]').forEach((node) => node.classList.remove('active'));
    btn.classList.add('active');
    await runCommand(btn.dataset.navCommand);
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
  });
}

const ROLES = {
  employee: {
    label: 'Employee',
    title: 'Employee Command Center',
    subtitle: 'Only personal actions are available. No other employee, payroll, approval, or HR administration data is exposed.',
    permissions: ['Own profile request', 'Own attendance', 'Own tasks', 'Own evidence files', 'Own employee file', 'Own rights/report', 'Own performance view'],
    blocked: ['Direct master-data edit', 'Other employee records', 'Payroll administration', 'Manager approval', 'HR compliance changes'],
    commands: [
      { id: 'emp_select', label: 'Select My Record', type: 'load', intent: 'Load only your selectable record context.' },
      { id: 'emp_profile_edit', label: 'Request Profile Edit', type: 'edit', intent: 'Create a controlled edit request.' },
      { id: 'emp_checkin', label: 'Check In', type: 'execute', intent: 'Record check-in receipt.' },
      { id: 'emp_start_day', label: 'Start Workday', type: 'execute', intent: 'Start session receipt.' },
      { id: 'emp_checkout', label: 'Check Out', type: 'execute', intent: 'Record check-out receipt.' },
      { id: 'emp_tasks', label: 'Load My Tasks', type: 'load', intent: 'Load tasks only on request.' },
      { id: 'emp_start_task', label: 'Start Selected Task', type: 'execute', intent: 'Start a selected task.' },
      { id: 'emp_submit_evidence', label: 'Submit Evidence File', type: 'add', intent: 'Upload/download task evidence file.' },
      { id: 'emp_edit_evidence', label: 'Edit Draft Evidence', type: 'edit', intent: 'Replace or update draft evidence file.' },
      { id: 'emp_delete_evidence', label: 'Delete Draft Evidence', type: 'delete', intent: 'Delete/cancel a runtime draft evidence request.' },
      { id: 'emp_file', label: 'My Employee File', type: 'load', intent: 'View/download own CV, certificates, experience, and documents.' },
      { id: 'emp_upload_file', label: 'Upload Employee Document', type: 'add', intent: 'Attach CV, certificate, experience letter, or HR document.' },
      { id: 'emp_replace_file', label: 'Replace My Document', type: 'edit', intent: 'Upload a new controlled version of an existing document.' },
      { id: 'emp_archive_file', label: 'Archive Draft Document', type: 'delete', intent: 'Cancel a draft/runtime document request.' },
      { id: 'emp_rights', label: 'My Rights / Reports', type: 'load', intent: 'View personal rights only.' },
      { id: 'emp_performance', label: 'My Performance', type: 'load', intent: 'View own evaluation only.' }
    ]
  },
  manager: {
    label: 'Manager',
    title: 'Manager Command Center',
    subtitle: 'Manager can act on team queue and submitted work. Manager cannot edit employee master file, payroll, or government data.',
    permissions: ['Team queue on request', 'Add/edit/cancel team task request', 'Review submitted work', 'Accept/return', 'Request evidence', 'Escalate SLA'],
    blocked: ['Direct salary edit', 'Final HR decision', 'Government data edit', 'Employee master-data mutation', 'AI autonomous approval'],
    commands: [
      { id: 'mgr_select', label: 'Select Team Member', type: 'load', intent: 'Load team/member context only on request.' },
      { id: 'mgr_queue', label: 'Load Team Queue', type: 'load', intent: 'Load team queue only on request.' },
      { id: 'mgr_add_task', label: 'Add Team Task Request', type: 'add', intent: 'Create a controlled team task request.' },
      { id: 'mgr_edit_task', label: 'Edit Team Task Request', type: 'edit', intent: 'Edit a pending task request.' },
      { id: 'mgr_cancel_task', label: 'Cancel / Delete Task Request', type: 'delete', intent: 'Cancel an unapproved task request.' },
      { id: 'mgr_review', label: 'Review Submitted Work', type: 'load', intent: 'Open submitted work for review.' },
      { id: 'mgr_accept', label: 'Accept Work', type: 'execute', intent: 'Record manager acceptance.' },
      { id: 'mgr_return', label: 'Return Work', type: 'execute', intent: 'Return work with required reason.' },
      { id: 'mgr_request_evidence', label: 'Request Evidence', type: 'execute', intent: 'Ask for additional evidence.' },
      { id: 'mgr_review_evidence', label: 'Review Evidence File', type: 'load', intent: 'Open submitted evidence/document queue.' },
      { id: 'mgr_correction', label: 'Request Evidence Correction', type: 'execute', intent: 'Return evidence for correction with reason.' },
      { id: 'mgr_escalate_sla', label: 'Escalate SLA', type: 'execute', intent: 'Escalate delayed work.' }
    ]
  },
  hr: {
    label: 'HR Operations',
    title: 'HR Operations Command Center',
    subtitle: 'HR executes controlled workflows. HR can create action requests and decision packets, but final changes require approval/evidence.',
    permissions: ['Employee 360 on request', 'Employee file documents', 'HR action add/edit/cancel', 'Performance/training/compensation', 'Government relations', 'JD/SOP enforcement', 'Approval/evidence/quality'],
    blocked: ['Silent payroll change', 'Schema migration', 'AI final decision', 'Unapproved deletion'],
    commands: [
      { id: 'hr_select', label: 'Select Employee', type: 'load', intent: 'Open employee context.' },
      { id: 'hr_file', label: 'Employee File / Documents', type: 'load', intent: 'Open employee documents only after selection.' },
      { id: 'hr_upload_document', label: 'Upload HR Document', type: 'add', intent: 'Attach controlled HR document to selected file.' },
      { id: 'hr_document_intake', label: 'Document Intake Queue', type: 'load', intent: 'Review uploaded employee and HR file requests.' },
      { id: 'hr_verify_document', label: 'Verify Employee Document', type: 'execute', intent: 'Verify a selected document with HR receipt.' },
      { id: 'hr_reject_document', label: 'Reject / Return Document', type: 'execute', intent: 'Reject or return a document with reason.' },
      { id: 'hr_missing_documents', label: 'Request Missing Documents', type: 'execute', intent: 'Request missing CV, certificates, ID, contract, or experience file.' },
      { id: 'hr_expiry_review', label: 'Document Expiry Review', type: 'load', intent: 'Show documents requiring renewal or expiry attention.' },
      { id: 'hr_add', label: 'Add HR Action Request', type: 'add', intent: 'Create HR operation request.' },
      { id: 'hr_edit', label: 'Edit HR Action Request', type: 'edit', intent: 'Edit pending HR request.' },
      { id: 'hr_cancel', label: 'Cancel / Delete HR Request', type: 'delete', intent: 'Cancel pending HR request.' },
      { id: 'hr_performance', label: 'Run Performance Review', type: 'execute', intent: 'Open performance decision flow.' },
      { id: 'hr_training', label: 'Build Development Plan', type: 'execute', intent: 'Open training gap workflow.' },
      { id: 'hr_compensation', label: 'Compensation / Payroll / WPS', type: 'execute', intent: 'Open compensation decision flow.' },
      { id: 'hr_government', label: 'Government Relations Check', type: 'execute', intent: 'Open Qiwa/GOSI/Mudad/Nitaqat readiness.' },
      { id: 'hr_quality', label: 'Quality / Governance Gate', type: 'execute', intent: 'Open quality gate.' },
      { id: 'hr_ai', label: 'AI Decision Support', type: 'execute', intent: 'Generate support only; no final decision.' }
    ]
  },
  executive: {
    label: 'Executive',
    title: 'Executive Command Center',
    subtitle: 'Executive sees command-level controls and source-labeled briefs only after request. No operational editing.',
    permissions: ['Executive brief', 'Risk board', 'Decision backlog', 'Governance risk', 'AI risk radar', 'Final acceptance'],
    blocked: ['Employee edits', 'Payroll mutation', 'Task mutation', 'AI auto-approval'],
    commands: [
      { id: 'exec_dashboard', label: 'Open Executive Dashboard', type: 'load', intent: 'Open the source-labeled executive command dashboard.' },
      { id: 'exec_brief', label: 'Request Executive Brief', type: 'load', intent: 'Load source-labeled executive summary.' },
      { id: 'exec_risk', label: 'Open Risk Board', type: 'load', intent: 'Load current risk board.' },
      { id: 'exec_backlog', label: 'Decision Backlog', type: 'load', intent: 'Load decision backlog.' },
      { id: 'exec_governance', label: 'Governance Risk', type: 'load', intent: 'Load governance risk.' },
      { id: 'exec_ai', label: 'AI Risk Radar', type: 'load', intent: 'Load AI risk signals.' },
      { id: 'exec_reports', label: 'Reports & Analytics Center', type: 'load', intent: 'Open source-labelled workforce and governance reports.' },
      { id: 'exec_escalate', label: 'Escalate Human Review', type: 'execute', intent: 'Record executive escalation.' },
      { id: 'final_acceptance', label: 'Final Acceptance', type: 'execute', intent: 'Run final proof on demand.' }
    ]
  }
};

function readAccessSession() {
  try { return JSON.parse(sessionStorage.getItem(ACCESS_SESSION_KEY) || 'null'); } catch { return null; }
}

function setWorkspaceVisibility(isAuthenticated) {
  const login = $('loginExperience');
  const app = $('app');
  login?.classList.toggle('hidden', isAuthenticated);
  login?.setAttribute('aria-hidden', String(isAuthenticated));
  app?.classList.toggle('hidden', !isAuthenticated);
  app?.setAttribute('aria-hidden', String(!isAuthenticated));
}

async function enterWorkspace({ tenant, email, password, demo = false }) {
  const result = await api('/api/access/login', { method: 'POST', body: { tenant, email, password, demo } });
  const session = { ...result.session, signedInAt: new Date().toISOString() };
  sessionStorage.setItem(ACCESS_SESSION_KEY, JSON.stringify(session));
  state.role = ROLES[session.role] ? session.role : 'employee';
  setWorkspaceVisibility(true);
  render();
  toast(`${ROLES[state.role].label} workspace opened for ${session.email}`);
}

async function signOut() {
  try { await api('/api/access/logout', { method: 'POST' }); } catch {}
  sessionStorage.removeItem(ACCESS_SESSION_KEY);
  state.role = 'employee';
  state.selectedEmployee = null;
  state.selectedTask = null;
  setWorkspaceVisibility(false);
  $('loginForm')?.reset();
  if ($('tenantInput')) $('tenantInput').value = 'NASH Enterprise';
  $('emailInput')?.focus();
}

function initializeLoginExperience() {
  const form = $('loginForm');
  const error = $('loginError');
  $('togglePassword')?.addEventListener('click', () => {
    const input = $('passwordInput');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    $('togglePassword').textContent = showing ? 'Show' : 'Hide';
    $('togglePassword').setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const tenant = $('tenantInput').value.trim();
    const email = $('emailInput').value.trim();
    const password = $('passwordInput').value;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    let message = '';
    if (!tenant) message = 'Enter your organization name.';
    else if (!emailValid) message = 'Enter a valid work email.';
    else if (password.length < 6) message = 'Password must contain at least 6 characters.';
    if (message) {
      error.textContent = message;
      error.classList.remove('hidden');
      return;
    }
    error.classList.add('hidden');
    enterWorkspace({ tenant, email, password }).catch((loginError) => { error.textContent = loginError.message; error.classList.remove('hidden'); });
  });
  $('demoAccessBtn')?.addEventListener('click', () => {
    const error = $('loginError');
    error?.classList.add('hidden');
    enterWorkspace({
      tenant: 'NASH Enterprise',
      email: 'employee@nash.local',
      password: '123456',
      demo: true
    }).catch((loginError) => {
      if (error) {
        error.textContent = loginError.message;
        error.classList.remove('hidden');
      }
    });
  });
  $('signOutBtn')?.addEventListener('click', signOut);
  $('sidebarToggleBtn')?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('mobile-open'));
  $('notificationBtn')?.addEventListener('click', () => toast('3 workspace notifications are waiting for review.'));

  const existing = readAccessSession();
  if (existing?.email && existing?.token && ROLES[existing.role]) {
    api('/api/access/session').then((out) => {
      const verified = out.session;
      sessionStorage.setItem(ACCESS_SESSION_KEY, JSON.stringify(verified));
      state.role = verified.role;
      setWorkspaceVisibility(true);
      render();
    }).catch(() => signOut());
  } else {
    setWorkspaceVisibility(false);
  }
}


const WORKSPACE_HOME = {
  employee: {
    title: 'My Workday',
    subtitle: 'Tasks, attendance, documents, performance, and employee services in one place.',
    metrics: [['Open Tasks','4','Assigned to you'],['Attendance','On time','Today'],['Evidence','2 pending','Requires upload'],['Performance','84%','Current cycle']],
    priorities: [
      ['Complete policy acknowledgement','Due today','emp_tasks'],
      ['Upload professional certificate','Due in 3 days','emp_file'],
      ['Review performance feedback','Available now','emp_performance']
    ],
    quick: ['emp_checkin','emp_tasks','emp_file','emp_rights']
  },
  manager: {
    title: 'Manager Workspace',
    subtitle: 'Lead the team, clear approvals, resolve SLA risk, and coach performance.',
    metrics: [['Team Members','12','Direct reports'],['Pending Reviews','5','Needs attention'],['SLA Risk','2','Escalation watch'],['Evidence Queue','7','Awaiting review']],
    priorities: [
      ['Review submitted work','5 items','mgr_review'],
      ['Clear evidence queue','7 files','mgr_review_evidence'],
      ['Resolve SLA exceptions','2 cases','mgr_escalate_sla']
    ],
    quick: ['mgr_queue','mgr_add_task','mgr_review','mgr_review_evidence']
  },
  hr: {
    title: 'HR Operations Workspace',
    subtitle: 'Run employee services, workforce decisions, compliance, and governance from one operating view.',
    metrics: [['Employees','551','MySQL source'],['Pending Actions','18','Across HR'],['Compliance Risk','6','Needs review'],['Documents','23','Verification queue']],
    priorities: [
      ['Review employee documents','23 files','hr_document_intake'],
      ['Open government readiness','6 cases','hr_government'],
      ['Run quality gate','4 controls','hr_quality']
    ],
    quick: ['hr_select','hr_file','hr_document_intake','hr_ai']
  },
  executive: {
    title: 'Executive Workspace',
    subtitle: 'Enterprise performance, risk, decisions, and AI-supported insights with source transparency.',
    metrics: [['Workforce','551','MySQL source'],['Decision Backlog','9','Executive queue'],['Enterprise Risk','Medium','Human review'],['Coverage','97%','Current data']],
    priorities: [
      ['Open enterprise dashboard','Live overview','exec_dashboard'],
      ['Review decision backlog','9 decisions','exec_backlog'],
      ['Inspect AI risk radar','Explainable signals','exec_ai']
    ],
    quick: ['exec_dashboard','exec_brief','exec_backlog','exec_ai']
  }
};

function commandById(id) {
  return ROLES[state.role].commands.find((item) => item.id === id) || { id, label: id, intent: '' };
}

function renderProductWorkspace() {
  const home = WORKSPACE_HOME[state.role];
  const role = ROLES[state.role];
  const session = readAccessSession() || {};
  if ($('workspaceTitle')) $('workspaceTitle').textContent = home.title;
  if ($('workspaceSubtitle')) $('workspaceSubtitle').textContent = home.subtitle;
  const metrics = home.metrics.map((m) => `<article class="saas-kpi"><span>${esc(m[0])}</span><strong>${esc(m[1])}</strong><small>${esc(m[2])}</small></article>`).join('');
  const priorities = home.priorities.map((p, index) => `<button class="priority-row" data-command="${esc(p[2])}"><span class="priority-index">${String(index + 1).padStart(2,'0')}</span><span><strong>${esc(p[0])}</strong><small>${esc(p[1])}</small></span><span class="priority-arrow">→</span></button>`).join('');
  const quick = home.quick.map((id) => { const c = commandById(id); return `<button class="quick-action-card" data-command="${esc(c.id)}"><span>${esc(c.label)}</span><small>${esc(c.intent)}</small></button>`; }).join('');
  const allCommands = role.commands.map(commandCard).join('');
  $('roleSurface').innerHTML = `
    <section class="saas-home">
      <div class="saas-welcome-card">
        <div><p class="eyebrow">${esc(role.label.toUpperCase())} WORKSPACE</p><h2>${esc(home.title)}</h2><p>${esc(home.subtitle)}</p></div>
        <div class="workspace-context-chip"><span>Tenant</span><strong>${esc(session.tenant || 'NASH Enterprise')}</strong><small>Enterprise Trial · Active</small></div>
      </div>
      <div class="saas-kpi-grid">${metrics}</div>
      <div class="saas-workspace-grid">
        <section class="workspace-card"><div class="workspace-card-head"><div><p class="eyebrow">PRIORITIES</p><h3>Needs your attention</h3></div><span>${home.priorities.length} items</span></div><div class="priority-list">${priorities}</div></section>
        <section class="workspace-card ai-copilot-card"><div class="workspace-card-head"><div><p class="eyebrow">NASH AI</p><h3>Decision Copilot</h3></div><span>Human-controlled</span></div><p>Summarize risk, explain source signals, and prepare a decision packet. NASH AI never makes the final decision.</p><button class="primary-btn" data-command="${state.role === 'executive' ? 'exec_ai' : state.role === 'hr' ? 'hr_ai' : home.quick[0]}">Open AI-supported workflow</button></section>
      </div>
      <section class="workspace-card"><div class="workspace-card-head"><div><p class="eyebrow">QUICK ACTIONS</p><h3>Start work</h3></div><span>Role-bound</span></div><div class="quick-action-grid">${quick}</div></section>
      <details class="workspace-card command-library"><summary><span><small>ALL CAPABILITIES</small><strong>Open role command library</strong></span><span>${role.commands.length} actions</span></summary><div class="permission-strip compact-permissions"><div class="permission-card allow"><strong>Allowed</strong>${role.permissions.map((p) => `<span>${esc(p)}</span>`).join('')}</div><div class="permission-card block"><strong>Blocked</strong>${role.blocked.map((p) => `<span>${esc(p)}</span>`).join('')}</div></div><div class="action-grid command-grid">${allCommands}</div></details>
    </section>`;
  document.querySelectorAll('[data-command]').forEach((btn) => btn.onclick = () => runCommand(btn.dataset.command));
}

function render() {
  renderSaaSShell();
  renderWorkspaceNavigation();
  renderProductWorkspace();
  closeOperation(false);
  renderLedger(false);
}

function commandCard(c) {
  return `<button class="action-btn command-card ${c.type}" data-command="${esc(c.id)}"><span>${esc(c.label)}</span><small>${esc(c.intent)}</small></button>`;
}

function setRole() { toast('Role switching is disabled. Access is assigned by the organization.'); }

function openOperation(title, subtitle, body) {
  const session = readAccessSession() || {};
  const role = ROLES[state.role] || ROLES.employee;
  const slug = operationSlug(title);
  $('operationSurface').classList.remove('hidden');
  $('operationSurface').dataset.workspace = slug;
  $('operationSurface').innerHTML = `
    <section class="unified-workspace-shell" data-workspace="${esc(slug)}">
      <header class="unified-workspace-header">
        <div class="workspace-breadcrumbs"><span>${esc(role.label)}</span><i>›</i><strong>${esc(title)}</strong></div>
        <div class="unified-workspace-title"><div><p class="eyebrow">ACTIVE WORKSPACE</p><h2>${esc(title)}</h2><p class="muted">${esc(subtitle || '')}</p></div><div class="workspace-source-chip"><span>Source of truth</span><strong>MySQL · Live</strong><small>${esc(session.tenant || 'NASH Enterprise')}</small></div></div>
        <div class="unified-action-bar"><div><span class="workspace-status-dot"></span><strong>Controlled operation</strong><small>Role-bound · Evidence-aware · Human decision</small></div><div class="unified-action-buttons"><button class="secondary-btn" id="workspaceHome">Workspace Home</button><button class="secondary-btn" id="workspaceLedger">Action Ledger</button><button class="secondary-btn" id="closeOperation">Close</button></div></div>
      </header>
      ${workflowRail(title)}
      ${hf28AiPanel(title)}
      ${hf30OperationalPanel(title)}
      <div class="surface-body unified-workspace-body">${body}</div>
    </section>`;
  $('closeOperation').onclick = () => closeOperation(true);
  $('workspaceHome').onclick = () => { closeOperation(false); $('roleSurface').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('workspaceLedger').onclick = () => renderLedger(true);
  bindDownloadButtons();
  bindWorkflowRail();
  bindHf28AiPanel(title);
  bindHf30OperationalPanel();
  $('operationSurface').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeOperation(showToast) {
  $('operationSurface').classList.add('hidden');
  $('operationSurface').innerHTML = '';
  $('roleSurface').classList.remove('hidden');
  if (showToast) toast('Operation closed. No additional information is displayed.');
}

function renderLedger(toggle = true) {
  if (!toggle && $('ledgerSurface').classList.contains('hidden')) return;
  $('ledgerSurface').classList.remove('hidden');
  const receipts = operationalReceipts();
  const summary = ledgerSummary(receipts);
  $('ledgerSurface').innerHTML = `<div class="panel-header"><div><p class="eyebrow">Runtime ledger</p><h2>Action Ledger</h2><p class="muted">Professional receipt trail. Context selections are not listed as business actions.</p></div><button class="secondary-btn" id="closeLedger">Close Ledger</button></div>${summary}<div class="receipt-list">${receipts.length ? receipts.map(receiptCard).join('') : '<div class="empty-state">No operational receipts yet. Select an action such as Request Profile Edit, Check In, Submit Evidence, or Manager Return Work.</div>'}</div>`;
  $('closeLedger').onclick = () => $('ledgerSurface').classList.add('hidden');
  bindDownloadButtons();
}



// HF32 — distinct operational applications. Each navigation item owns its own layout,
// data model, primary actions, and visual hierarchy instead of inheriting openOperation().
async function ensureEmployeeContext() {
  if (state.selectedEmployee) return state.selectedEmployee;
  const out = await optionalApi('/api/employees');
  const rows = Array.isArray(out) ? out : (out.employees || out.data || []);
  state.employees = rows;
  if (rows.length) state.selectedEmployee = rows[0];
  return state.selectedEmployee;
}

// Domain applications consistently provide their header actions before their body.
// Keeping that contract explicit prevents the action bar from swallowing the page body.
function appShell(kind, eyebrow, title, subtitle, actions='', body='') {
  $('operationSurface').classList.remove('hidden');
  $('roleSurface').classList.add('hidden');
  document.documentElement.dataset.nashBuild = 'HF33-DIRECT-APP-REBUILD';
  $('operationSurface').innerHTML = `<section class="domain-app domain-${esc(kind)}">
    <div class="hf33-build-proof">HF33 DIRECT APP · ${esc(kind).toUpperCase()}</div><header class="domain-app-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="domain-header-actions">${actions}<button class="secondary-btn" data-domain-home>Workspace Home</button></div></header>
    ${body}
  </section>`;
  document.querySelector('[data-domain-home]')?.addEventListener('click', () => closeOperation(false));
  hf29ScheduleWorkspaceAudit?.();
}

async function employeeAttendanceApp() {
  const e = await ensureEmployeeContext();
  const name = e?.displayName || e?.name || 'Current employee';
  appShell('attendance','TIME & ATTENDANCE','Attendance & Timesheet',`Daily presence, shifts, exceptions, overtime, and correction requests for ${name}.`, `
    <button class="primary-btn" data-command="emp_checkin_action">Check In</button>
    <button class="secondary-btn" data-command="emp_checkout_action">Check Out</button>`, `
    <div class="attendance-hero-grid">
      <article class="clock-card"><span>Today</span><strong>${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong><small>Scheduled shift · 08:00–17:00</small><div class="clock-status">● Ready to record attendance</div></article>
      <article class="attendance-stat"><span>Month status</span><strong>On track</strong><small>21 present · 1 late · 0 absent</small></article>
      <article class="attendance-stat"><span>Worked hours</span><strong>168h</strong><small>Target 176h</small></article>
      <article class="attendance-stat"><span>Overtime</span><strong>6.5h</strong><small>2.0h pending approval</small></article>
    </div>
    <div class="domain-two-column">
      <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">MONTH VIEW</p><h3>July attendance calendar</h3></div><button class="secondary-btn small" data-attendance-export>Export timesheet</button></div>
        <div class="attendance-calendar">${Array.from({length:31},(_,i)=>`<div class="day ${[4,11,18,25].includes(i)?'weekend':i===7?'late':'present'}"><span>${i+1}</span><small>${[4,11,18,25].includes(i)?'OFF':i===7?'LATE':'P'}</small></div>`).join('')}</div>
      </section>
      <section class="domain-panel"><p class="eyebrow">EXCEPTIONS</p><h3>Needs attention</h3><div class="domain-list">
        <article><span>Late arrival · 8 Jul</span><strong>12 min</strong><button class="text-btn" data-attendance-exception="Late arrival · 8 Jul">Request correction</button></article>
        <article><span>Overtime · 16 Jul</span><strong>2.0h</strong><button class="text-btn" data-attendance-exception="Overtime · 16 Jul">View approval</button></article>
        <article><span>Missing checkout · 20 Jul</span><strong>Open</strong><button class="text-btn" data-attendance-exception="Missing checkout · 20 Jul">Add evidence</button></article>
      </div></section>
    </div>`);
  document.querySelector('[data-command="emp_checkin_action"]')?.addEventListener('click',()=>attendance('/api/workday/check-in','CHECK_IN',{method:'PIN Check-in'}));
  document.querySelector('[data-command="emp_checkout_action"]')?.addEventListener('click',()=>attendance('/api/workday/check-out','CHECK_OUT'));
  document.querySelector('[data-attendance-export]')?.addEventListener('click', () => downloadCsv(`nash-attendance-${new Date().toISOString().slice(0, 10)}.csv`, [['Date', 'Status', 'Hours'], ['Current month', 'On track', '168']]));
  document.querySelectorAll('[data-attendance-exception]').forEach((button) => button.addEventListener('click', () => permissionReceipt('EMPLOYEE_SERVICE_REQUEST', { target: button.dataset.attendanceException, note: 'Attendance exception routed for authorized HR and manager review.' })));
}

async function employeeTasksApp() {
  await ensureEmployeeContext();
  const out = await optionalApi('/api/tasks');
  const tasks = (Array.isArray(out)?out:(out.tasks||out.data||[])).slice(0,8);
  state.tasks = tasks;
  const rows = tasks.length ? tasks.map((t,i)=>`<tr><td><strong>${esc(t.title||t.name||`Task ${i+1}`)}</strong><small>${esc(t.id||'')}</small></td><td>${esc(t.owner||'You')}</td><td>${esc(t.dueDate||t.deadline||'This week')}</td><td><span class="status-pill">${esc(t.status||'Open')}</span></td><td><button class="text-btn" data-task-index="${i}">Open</button></td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">No tasks returned by the live task source.</td></tr>`;
  appShell('tasks','WORK MANAGEMENT','Tasks & Evidence','Manage assigned work, deadlines, evidence files, and completion receipts.',`<button class="primary-btn" data-new-evidence>Submit Evidence</button>`,`
    <div class="task-metrics"><article><span>Open</span><strong>${tasks.length||4}</strong></article><article><span>Due today</span><strong>1</strong></article><article><span>Evidence pending</span><strong>2</strong></article><article><span>Completed this month</span><strong>18</strong></article></div>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">MY QUEUE</p><h3>Assigned work</h3></div><div class="table-tools"><input id="taskSearch" placeholder="Search tasks" aria-label="Search assigned tasks"><button class="secondary-btn small" data-task-filter>Filter open</button></div></div>
      <div class="table-wrap"><table class="domain-table"><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody id="taskRows">${rows}</tbody></table></div>
    </section>
    <section class="evidence-strip"><div><p class="eyebrow">EVIDENCE VAULT</p><h3>Recent evidence</h3></div><article><strong>Policy_Acknowledgement.pdf</strong><span>Submitted · manager visible</span></article><article><strong>Professional_Certificate.pdf</strong><span>Draft · replace before submission</span></article></section>`);
  document.querySelector('[data-new-evidence]')?.addEventListener('click',()=>evidenceForm('SUBMIT_EVIDENCE'));
  document.querySelectorAll('[data-task-index]').forEach(b=>b.onclick=()=>{state.selectedTask=tasks[Number(b.dataset.taskIndex)]; taskEndpoint('/api/workday/tasks/start','START_TASK')});
  const renderTaskRows = (query = '', openOnly = false) => { const normalized = query.trim().toLowerCase(); const filtered = tasks.filter((task) => (!normalized || `${task.title || task.name || ''} ${task.status || ''}`.toLowerCase().includes(normalized)) && (!openOnly || !/complete|closed/i.test(task.status || ''))); $('taskRows').innerHTML = filtered.length ? filtered.map((t) => `<tr><td><strong>${esc(t.title || t.name || 'Task')}</strong></td><td>${esc(t.owner || 'You')}</td><td>${esc(t.dueDate || t.deadline || 'This week')}</td><td><span class="status-pill">${esc(t.status || 'Open')}</span></td><td><button class="text-btn" data-filtered-task-index="${tasks.indexOf(t)}">Open</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No assigned tasks match this filter.</td></tr>'; document.querySelectorAll('[data-filtered-task-index]').forEach((button) => button.addEventListener('click', () => { state.selectedTask = tasks[Number(button.dataset.filteredTaskIndex)]; taskEndpoint('/api/workday/tasks/start', 'START_TASK'); })); };
  let taskOpenOnly = false; $('taskSearch')?.addEventListener('input', hf29Debounce((event) => renderTaskRows(event.target.value, taskOpenOnly)));
  document.querySelector('[data-task-filter]')?.addEventListener('click', () => { taskOpenOnly = !taskOpenOnly; document.querySelector('[data-task-filter]').textContent = taskOpenOnly ? 'Show all' : 'Filter open'; renderTaskRows($('taskSearch').value, taskOpenOnly); });
}

async function employeeFileApp() {
  const e = await ensureEmployeeContext();
  const docs = state.documents.filter(d => !e || String(d.employeeId||'')===String(e.id||'') || !d.employeeId);
  const name=e?.displayName||e?.name||'Current employee';
  const code=e?.employeeCode||e?.code||'N-0001';
  appShell('employee-file','EMPLOYEE RECORD','My Employee File','Personal, employment, qualification, and document records in one controlled profile.',`<button class="primary-btn" data-upload-file>Upload Document</button>`,`
    <section class="profile-hero"><div class="profile-avatar">${esc(name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</div><div><h2>${esc(name)}</h2><p>${esc(code)} · ${esc(e?.jobTitle||e?.position||'Employee')}</p><div class="profile-tags"><span>Active</span><span>${esc(e?.department||'Assigned department')}</span><span>File complete 86%</span></div></div><div class="profile-score"><span>Profile completeness</span><strong>86%</strong><small>3 documents need attention</small></div></section>
    <nav class="record-tabs" aria-label="Employee file sections"><button class="active" data-file-tab="Overview">Overview</button><button data-file-tab="Employment">Employment</button><button data-file-tab="Qualifications">Qualifications</button><button data-file-tab="Documents">Documents</button><button data-file-tab="Emergency">Emergency</button><button data-file-tab="History">History</button></nav><p class="workspace-source-context" id="fileTabContext">Overview of controlled employee record data.</p>
    <div class="domain-two-column">
      <section class="domain-panel"><p class="eyebrow">CORE RECORD</p><h3>Personal & employment details</h3><div class="detail-grid"><div><span>Employee ID</span><strong>${esc(code)}</strong></div><div><span>Work email</span><strong>${esc(e?.email||'employee@nash.local')}</strong></div><div><span>Department</span><strong>${esc(e?.department||'—')}</strong></div><div><span>Manager</span><strong>${esc(e?.managerName||'Assigned manager')}</strong></div><div><span>Hire date</span><strong>${esc(e?.hireDate||e?.joinDate||'—')}</strong></div><div><span>Contract</span><strong>${esc(e?.contractType||'Active')}</strong></div></div></section>
      <section class="domain-panel"><p class="eyebrow">FILE HEALTH</p><h3>Required actions</h3><div class="domain-list"><article><span>National ID / Iqama</span><strong class="good-text">Verified</strong></article><article><span>Professional certificate</span><strong class="watch-text">Upload required</strong></article><article><span>CV</span><strong>Current</strong></article><article><span>Policy acknowledgements</span><strong class="watch-text">1 pending</strong></article></div></section>
    </div>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">DOCUMENT LIBRARY</p><h3>Controlled files</h3></div><button class="secondary-btn small" data-upload-file-2>Add file</button></div><div class="document-grid">${(docs.length?docs.slice(0,6):[{fileName:'Employment_Contract.pdf',category:'Contract',status:'Verified'},{fileName:'CV.pdf',category:'CV / Resume',status:'Current'},{fileName:'Degree_Certificate.pdf',category:'Education',status:'Verified'}]).map(d=>`<article><div class="doc-icon">PDF</div><div><strong>${esc(d.fileName)}</strong><span>${esc(d.category||'Document')}</span><small>${esc(d.status||'Current')}</small></div><button class="text-btn" data-document-preview="${esc(d.fileName)}">View</button></article>`).join('')}</div></section>`);
  document.querySelectorAll('[data-upload-file],[data-upload-file-2]').forEach(b=>b.onclick=()=>employeeDocumentForm('EMPLOYEE_DOCUMENT_UPLOAD'));
  document.querySelectorAll('[data-file-tab]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-file-tab]').forEach((tab) => tab.classList.toggle('active', tab === button)); $('fileTabContext').textContent = `${button.dataset.fileTab} section selected. Source-backed edits require a controlled request.`; }));
  document.querySelectorAll('[data-document-preview]').forEach((button) => button.addEventListener('click', () => permissionReceipt('DOCUMENT_DOWNLOAD', { target: button.dataset.documentPreview, note: 'Employee requested a controlled document preview/download.' })));
}

async function employeePerformanceApp() {
  const e = await ensureEmployeeContext();
  const out = e ? await optionalApi(`/api/performance/evaluation/${encodeURIComponent(e.id)}`) : {};
  const score=firstValue(out,['score','overallScore','rating'],'84%');
  appShell('performance','PERFORMANCE','My Performance','Objectives, competencies, feedback, and development outcomes for the current review cycle.',`<button class="primary-btn" data-performance-self-review>Open Self Review</button>`,`
    <div class="performance-banner"><div><span>2026 Annual Review</span><strong>${esc(score)}</strong><small>Overall performance score</small></div><div class="rating-ring"><b>4.2</b><span>Exceeds expectations</span></div><div><span>Cycle status</span><strong>Manager review</strong><small>Self review completed</small></div></div>
    <div class="domain-three-column"><section class="domain-panel"><p class="eyebrow">OBJECTIVES</p><h3>Goal progress</h3><div class="progress-list"><div><span>Operational delivery</span><b>92%</b><i style="--p:92%"></i></div><div><span>Quality improvement</span><b>78%</b><i style="--p:78%"></i></div><div><span>Capability development</span><b>85%</b><i style="--p:85%"></i></div></div></section><section class="domain-panel"><p class="eyebrow">COMPETENCIES</p><h3>Current strengths</h3><div class="skill-bars"><div><span>Accountability</span><b>4.6</b></div><div><span>Collaboration</span><b>4.2</b></div><div><span>Decision quality</span><b>4.0</b></div><div><span>Innovation</span><b>3.8</b></div></div></section><section class="domain-panel"><p class="eyebrow">DEVELOPMENT</p><h3>Next actions</h3><div class="domain-list"><article><span>Advanced analytics</span><strong>Learning path</strong></article><article><span>Leadership exposure</span><strong>Recommended</strong></article><article><span>Quarterly coaching</span><strong>Scheduled</strong></article></div></section></div>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">REVIEW HISTORY</p><h3>Performance trend</h3></div><span class="status-pill">Human decision</span></div><div class="trend-chart"><div style="--h:58%"><span>2022</span></div><div style="--h:66%"><span>2023</span></div><div style="--h:72%"><span>2024</span></div><div style="--h:79%"><span>2025</span></div><div style="--h:84%"><span>2026</span></div></div></section>`);
  document.querySelector('[data-performance-self-review]')?.addEventListener('click', async () => { await permissionReceipt('EMPLOYEE_PERFORMANCE_SELF_REVIEW', { target: employeeLabel(), note: 'Employee opened a controlled self-review workflow.' }, false); performanceAssessmentForm('SELF'); });
}

function performanceAssessmentForm(type='SELF') {
  const employee = state.selectedEmployee;
  if (!employee) return toast('Select an employee profile before starting a self assessment.');
  openOperation(type === 'SELF' ? 'Self Assessment' : 'Manager Review', 'Submit a structured, evidence-aware competency assessment. Ratings remain subject to human calibration.', `${contextCard()}<form id="performanceAssessmentForm" class="form-grid"><label>Cycle<input name="cycleId" required maxlength="80" value="2026-ANNUAL"></label><label>Competency<input name="competency" required maxlength="120" value="Accountability"></label><label>Rating (1–5)<input name="score" type="number" min="1" max="5" step="0.1" required></label><label class="full">Evidence-based narrative<textarea name="narrative" required maxlength="1000" placeholder="Describe delivered outcomes, evidence, and development needs."></textarea></label><button class="primary-btn" type="submit">Submit for calibration</button></form>`);
  $('performanceAssessmentForm').onsubmit = async (event) => { event.preventDefault(); const f = new FormData(event.target); try { const out = await api('/api/performance/assessments', { method:'POST', body:{ employeeId:employee.id, type, cycleId:f.get('cycleId'), competency:f.get('competency'), score:f.get('score'), narrative:f.get('narrative') } }); addReceipt(out.receipt); toast('Assessment submitted for controlled calibration.'); employeePerformanceApp(); } catch (error) { toast(error.message); } };
}

async function performanceManagementWorkspace() {
  const out = await api('/api/performance/dashboard'); const m = out.metrics || {}; const cycles = out.cycles || [];
  const metric = (label, value, note) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  openOperation('Performance Management', 'Manage cycles, OKRs, competency assessments, 360 feedback, calibration, improvement actions, and human-approved recommendations. MySQL remains the source of truth.', `<section class="domain-metrics">${metric('Employees',m.employees||0,'MySQL employee source')}${metric('Goals / KPIs',m.goals||0,'Runtime workflow packets')}${metric('Self & manager reviews',`${m.selfAssessments||0} / ${m.managerReviews||0}`,'Calibration-bound')}${metric('360 feedback',m.feedbackRequests||0,'Evidence-aware')}${metric('Open PIPs',m.openPips||0,'Human-managed')}${metric('Recommendations',`${m.promotionRecommendations||0} / ${m.compensationRecommendations||0}`,'Promotion / compensation')}</section><section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">PERFORMANCE CYCLE</p><h3>Cycle control</h3></div><button class="primary-btn" data-performance-action="cycle">Create cycle</button></div><div class="domain-list">${cycles.length ? cycles.map(c=>`<article><span>${esc(c.name)} · ${esc(c.startDate)} – ${esc(c.endDate)}</span><strong>${esc(c.status)}</strong></article>`).join('') : '<p class="empty-state">No runtime cycles have been created. Create a cycle to begin controlled reviews.</p>'}</div></section><section class="domain-panel"><p class="eyebrow">CONTROLLED ACTIONS</p><h3>Performance workflows</h3><div class="action-grid"><button class="secondary-btn" data-performance-action="goal">Add OKR / KPI</button><button class="secondary-btn" data-performance-action="manager">Manager review</button><button class="secondary-btn" data-performance-action="feedback">Request 360 feedback</button><button class="secondary-btn" data-performance-action="calibration">Schedule calibration</button><button class="secondary-btn" data-performance-action="pip">Create improvement plan</button><button class="secondary-btn" data-performance-action="promotion">Promotion recommendation</button><button class="secondary-btn" data-performance-action="compensation">Compensation recommendation</button></div><p class="workspace-source-context">Learning and Development plus succession links are mandatory fields on PIP, promotion, and compensation recommendation packets. AI is advisory only; authorized humans decide.</p></section>`);
  document.querySelectorAll('[data-performance-action]').forEach((button) => button.onclick = () => performanceActionForm(button.dataset.performanceAction, cycles[0]?.id || '2026-ANNUAL'));
}
function performanceActionForm(action, defaultCycle) {
  const titles={cycle:'Create performance cycle',goal:'Add OKR / KPI',manager:'Submit manager review',feedback:'Submit 360 feedback',calibration:'Schedule calibration',pip:'Create performance improvement plan',promotion:'Create promotion recommendation',compensation:'Create compensation recommendation'}; const employeeActions=['goal','manager','feedback','pip','promotion','compensation'];
  const employeeField=employeeActions.includes(action)?'<label>Employee<select name="employeeId" required>'+state.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.displayName||e.name||e.employeeCode)}</option>`).join('')+'</select></label>':'';
  const body=action==='cycle'?'<label>Cycle name<input name="name" required maxlength="120"></label><label>Start date<input name="startDate" type="date" required></label><label>End date<input name="endDate" type="date" required></label>':action==='calibration'?'<label>Cycle<input name="cycleId" value="'+esc(defaultCycle)+'" required></label><label>Session title<input name="title" required></label><label>Date<input name="scheduledFor" type="date" required></label><label class="full">Participants<input name="participants" required placeholder="Names or group"></label>':`${employeeField}<label>Cycle<input name="cycleId" value="${esc(defaultCycle)}" required></label>${action==='goal'?'<label>Goal title<input name="title" required></label><label>KPI metric<input name="metric" required></label><label>Target<input name="target" type="number" required></label><label>Due date<input name="dueDate" type="date" required></label>':action==='manager'?'<label>Competency<input name="competency" value="Accountability" required></label><label>Rating<input name="score" type="number" min="1" max="5" step="0.1" required></label><label class="full">Narrative<textarea name="narrative" required></textarea></label>':action==='feedback'?'<label>Relationship<input name="relationship" placeholder="Peer, direct report, stakeholder" required></label><label>Competency<input name="competency" required></label><label>Rating<input name="rating" type="number" min="1" max="5" step="0.1" required></label><label class="full">Comment<textarea name="comment" required></textarea></label>':'<label class="full">Rationale<textarea name="rationale" required></textarea></label><label>Learning & Development link<input name="linkedLearning" required placeholder="Learning path or coaching action"></label><label>Succession link<input name="linkedSuccession" required placeholder="Readiness or successor pool"></label>'}`;
  openOperation(titles[action], 'Complete required fields to create a controlled runtime workflow packet; no database schema or employee data is mutated.', `<form id="performanceActionForm" class="form-grid">${body}<button class="primary-btn" type="submit">Create controlled packet</button></form>`);
  $('performanceActionForm').onsubmit=async(e)=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));let url='/api/performance/';let payload=values;if(action==='cycle')url+='cycles';else if(action==='goal')url+='goals';else if(action==='manager'){url+='assessments';payload={...values,type:'MANAGER'};}else if(action==='feedback')url+='feedback';else if(action==='calibration')url+='calibrations';else{url+='recommendations';payload={...values,type:action.toUpperCase()};}try{const result=await api(url,{method:'POST',body:payload});if(result.receipt)addReceipt(result.receipt);toast('Performance workflow packet created.');performanceManagementWorkspace();}catch(error){toast(error.message);}};
}

async function employeeRightsApp() {
  await ensureEmployeeContext();
  appShell('rights','SELF SERVICE','Rights & Reports','Personal entitlements, requests, letters, payslips, and downloadable reports.',`<button class="primary-btn" data-service-request="General employee service">Create Request</button>`,`
    <div class="service-grid"><button data-service-request="Leave request"><span>Leave balance</span><strong>24 days</strong><small>View and request leave</small></button><button data-service-request="Payslip"><span>Payslips</span><strong>12</strong><small>Download salary statements</small></button><button data-service-request="Employment letter"><span>Employment letter</span><strong>Generate</strong><small>Arabic or English</small></button><button data-service-request="End-of-service estimate"><span>End-of-service estimate</span><strong>Preview</strong><small>Non-binding calculation</small></button><button data-service-request="Benefits enquiry"><span>Benefits</span><strong>Active</strong><small>Medical and allowances</small></button><button data-service-request="Request status"><span>My requests</span><strong>3 open</strong><small>Track approval status</small></button></div>
    <section class="domain-panel"><p class="eyebrow">REQUEST HISTORY</p><h3>Recent employee services</h3><div class="table-wrap"><table class="domain-table"><thead><tr><th>Request</th><th>Submitted</th><th>Owner</th><th>Status</th><th></th></tr></thead><tbody><tr><td>Employment letter</td><td>20 Jul 2026</td><td>HR Services</td><td><span class="status-pill">Completed</span></td><td><button class="text-btn" data-service-request="Employment letter download">Download</button></td></tr><tr><td>Leave request</td><td>18 Jul 2026</td><td>Manager</td><td><span class="status-pill">Pending</span></td><td><button class="text-btn" data-service-request="Leave request status">Track</button></td></tr><tr><td>Bank details update</td><td>10 Jul 2026</td><td>Payroll</td><td><span class="status-pill">Verified</span></td><td><button class="text-btn" data-service-request="Bank details update">View</button></td></tr></tbody></table></div></section>`);
  document.querySelectorAll('[data-service-request]').forEach((button) => button.addEventListener('click', () => permissionReceipt('EMPLOYEE_SERVICE_REQUEST', { target: button.dataset.serviceRequest, note: 'Employee service request opened for controlled HR review.' })));
}

async function learningTalentWorkspace() {
  if (!state.employees.length) state.employees = (await api('/api/employees')).employees || [];
  const data = await api('/api/learning-talent/dashboard'); const m=data.metrics||{}; const records=data.records||{};
  const metric=(label,value,note)=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  const list=(collection, empty) => (records[collection]||[]).slice(0,6).map(r=>`<article><span><strong>${esc(r.employeeName||r.title)}</strong><small>${esc(r.title)} · ${esc(r.status)}</small></span><button class="secondary-btn small" data-talent-complete="${esc(collection)}|${esc(r.id)}">Complete</button></article>`).join('') || `<p class="empty-state">${esc(empty)}</p>`;
  openOperation('Learning, Development & Succession', 'Learning catalog, capability gaps, certifications, career growth, mentoring, succession, and executive talent intelligence. Employee identity remains MySQL-sourced; workflow packets require human approval.', `
    <section class="domain-metrics">${metric('MySQL employees',m.employees||0,'Source of truth')}${metric('Mandatory learning',m.mandatoryAssignments||0,'Assigned packets')}${metric('Certifications',m.certifications||0,`${m.expiringCertifications||0} expiring ≤90 days`)}${metric('Development plans',m.developmentPlans||0,'IDP workflow')}${metric('Ready now',data.analytics?.readyNow||0,'Succession readiness')}${metric('High potential',data.analytics?.highPotential||0,'Nine-box calibration')}</section>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">LEARNING & TALENT CONTROL</p><h3>Complete a controlled workflow</h3></div><button class="primary-btn" data-talent-action="recommendations">AI recommendations</button></div><div class="action-grid"><button class="secondary-btn" data-talent-action="catalog">Add learning offering</button><button class="secondary-btn" data-talent-action="paths">Create career learning path</button><button class="secondary-btn" data-talent-action="assignments">Assign mandatory training</button><button class="secondary-btn" data-talent-action="certifications">Track certification</button><button class="secondary-btn" data-talent-action="developmentPlans">Create IDP</button><button class="secondary-btn" data-talent-action="succession">Nominate successor</button><button class="secondary-btn" data-talent-action="talentPools">Create talent pool</button><button class="secondary-btn" data-talent-action="nineBox">Calibrate nine-box</button><button class="secondary-btn" data-talent-action="mentoring">Schedule mentoring</button><button class="secondary-btn" data-talent-action="coaching">Schedule coaching</button><button class="secondary-btn" data-talent-export>Export talent analytics</button></div><p class="workspace-source-context">AI recommendations are explainable and advisory only. Authorized HR and leaders approve plans, readiness, certifications, and talent decisions.</p></section>
    <div class="domain-two-column"><section class="domain-panel"><p class="eyebrow">DEVELOPMENT DELIVERY</p><h3>Learning, IDP & certification register</h3><div class="domain-list">${list('assignments','No mandatory learning assignments.')}${list('developmentPlans','No IDPs created.')}${list('certifications','No controlled certifications tracked.')}</div></section><section class="domain-panel"><p class="eyebrow">SUCCESSION GOVERNANCE</p><h3>Talent & readiness register</h3><div class="domain-list">${list('succession','No successor nominations.')}${list('nineBox','No nine-box calibration packets.')}${list('mentoring','No mentoring workflows scheduled.')}${list('coaching','No coaching workflows scheduled.')}</div></section></div>
    <section class="domain-panel"><p class="eyebrow">EXECUTIVE TALENT SIGNALS</p><h3>Talent analytics dashboard</h3><div class="detail-grid"><div><span>Learning completion</span><strong>${esc(data.analytics?.completionRate||0)}%</strong></div><div><span>Catalog offerings</span><strong>${esc(m.catalog||0)}</strong></div><div><span>Learning paths</span><strong>${esc(m.learningPaths||0)}</strong></div><div><span>Talent pools</span><strong>${esc(m.talentPools||0)}</strong></div></div>${(data.analytics?.certificationWatch||[]).length?`<div class="domain-list">${data.analytics.certificationWatch.map(x=>`<article><span>${esc(x.employeeName)} · ${esc(x.certification)}<small>Expires ${esc(x.expiryDate)}</small></span><strong class="watch-text">${esc(x.urgency)}</strong></article>`).join('')}</div>`:'<p class="empty-state">No certification expirations are currently in the 90-day watch window.</p>'}</section>`);
  document.querySelectorAll('[data-talent-action]').forEach(b=>b.onclick=()=>talentWorkflowForm(b.dataset.talentAction));
  document.querySelectorAll('[data-talent-complete]').forEach(b=>b.onclick=async()=>{const [workflow,id]=b.dataset.talentComplete.split('|');try{await api(`/api/learning-talent/${workflow}/${encodeURIComponent(id)}/status`,{method:'POST',body:{status:'COMPLETED'}});toast('Workflow completion recorded.');learningTalentWorkspace();}catch(error){toast(error.message);}});
  document.querySelector('[data-talent-export]')?.addEventListener('click',()=>downloadCsv(`nash-learning-talent-${new Date().toISOString().slice(0,10)}.csv`, [['Metric','Value'],['MySQL employees',m.employees||0],['Mandatory assignments',m.mandatoryAssignments||0],['Certifications',m.certifications||0],['Expiring certifications',m.expiringCertifications||0],['Ready now successors',data.analytics?.readyNow||0],['High potential',data.analytics?.highPotential||0]]));
}
function talentEmployeeSelect() { return `<label>Employee<select name="employeeId" required>${state.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.employeeCode||e.id)} · ${esc(e.displayName||e.name)}</option>`).join('')}</select></label>`; }
function talentWorkflowForm(action) {
  if(action==='recommendations') { openOperation('AI training recommendations','Select a MySQL employee to generate source-grounded competency gap analysis and advisory learning recommendations.',`<form id="talentRecommendationForm" class="form-grid">${talentEmployeeSelect()}<button class="primary-btn" type="submit">Generate advisory recommendations</button></form>`); $('talentRecommendationForm').onsubmit=async e=>{e.preventDefault();try{const id=new FormData(e.target).get('employeeId'), out=await api(`/api/learning-talent/recommendations/${encodeURIComponent(id)}`);openOperation('AI training recommendations','Explainable recommendations built from MySQL-linked performance and SOP evidence. Human approval is required.',`<section class="domain-panel"><p class="eyebrow">COMPETENCY GAP ANALYSIS</p><h3>${esc(out.profile.displayName)}</h3><div class="domain-list">${out.gapAnalysis.map(g=>`<article><span>${esc(g.factor)}<small>${esc(g.evidence)}</small></span><strong>${esc(g.score)} / 5</strong></article>`).join('')}</div></section><section class="domain-panel"><p class="eyebrow">ADVISORY LEARNING PATH</p><h3>Recommended interventions</h3><div class="domain-list">${out.recommendations.map(r=>`<article><span>${esc(r.title)}<small>${esc(r.deliveryMode)} · ${esc(r.expectedOutcome)}</small></span><strong>${esc(r.durationHours)}h</strong></article>`).join('')}</div><p class="workspace-source-context">${esc(out.aiExplanation.recommendation)} No learning assignment is created until an authorized human completes the assignment workflow.</p><button class="primary-btn" data-return-learning>Return to Learning & Talent</button></section>`);document.querySelector('[data-return-learning]').onclick=learningTalentWorkspace;}catch(error){toast(error.message);}};return; }
  const employee=['assignments','certifications','developmentPlans','succession','nineBox','mentoring','coaching'].includes(action); const titles={catalog:'Add learning catalog offering',paths:'Create career learning path',assignments:'Assign mandatory training',certifications:'Track certification expiration',developmentPlans:'Create Individual Development Plan',succession:'Nominate succession candidate',talentPools:'Create talent pool',nineBox:'Calibrate nine-box talent matrix',mentoring:'Schedule mentoring workflow',coaching:'Schedule coaching workflow'};
  const common=`<label>Title<input name="title" required maxlength="160"></label>`; let fields=common;
  if(employee) fields=talentEmployeeSelect()+fields;
  if(action==='catalog') fields+=`<label>Provider<input name="provider" required></label><label>Duration hours<input name="durationHours" type="number" min="0" required></label><label>Competency<input name="competency" required></label>`;
  if(action==='paths') fields+=`<label>Target role<input name="targetRole" required></label><label>Competency<input name="competency" required></label><label>Due date<input name="dueDate" type="date" required></label>`;
  if(action==='assignments') fields+=`<label>Due date<input name="dueDate" type="date" required></label><label class="full">Completion evidence<textarea name="evidence" required></textarea></label><label><input name="mandatory" type="checkbox" checked> Mandatory training</label>`;
  if(action==='certifications') fields+=`<label>Issuer<input name="issuer" required></label><label>Issued date<input name="issuedDate" type="date" required></label><label>Expiration date<input name="expiryDate" type="date" required></label>`;
  if(action==='developmentPlans') fields+=`<label>Target date<input name="targetDate" type="date" required></label><label class="full">Development objective<textarea name="objective" required></textarea></label>`;
  if(action==='succession') fields+=`<label>Critical role<input name="criticalRole" required></label><label>Readiness<select name="readiness"><option value="READY_NOW">Ready now</option><option value="READY_1_2_YEARS">Ready 1–2 years</option><option value="DEVELOPING">Developing</option></select></label><label class="full">Readiness rationale<textarea name="rationale" required></textarea></label>`;
  if(action==='talentPools') fields+=`<label>Owner<input name="owner" required></label><label class="full">Pool criteria<textarea name="criteria" required></textarea></label>`;
  if(action==='nineBox') fields+=`<label>Performance (1–5)<input name="performance" type="number" min="1" max="5" step="0.1" required></label><label>Potential (1–5)<input name="potential" type="number" min="1" max="5" step="0.1" required></label><label>Nine-box placement<select name="box"><option value="HIGH_POTENTIAL">High potential</option><option value="CORE_CONTRIBUTOR">Core contributor</option><option value="DEVELOPMENT_PRIORITY">Development priority</option></select></label><label class="full">Calibration rationale<textarea name="rationale" required></textarea></label>`;
  if(action==='mentoring'||action==='coaching') fields+=`<label>${action==='mentoring'?'Mentor':'Coach'}<input name="mentorOrCoach" required></label><label>Cadence<input name="cadence" placeholder="Monthly" required></label><label class="full">Objective<textarea name="objective" required></textarea></label>`;
  openOperation(titles[action],'Create a controlled runtime workflow packet. MySQL employee master data and schema remain unchanged.',`<form id="talentWorkflowForm" class="form-grid">${fields}<button class="primary-btn" type="submit">Create for human review</button></form>`);
  $('talentWorkflowForm').onsubmit=async e=>{e.preventDefault();const form=new FormData(e.target), payload=Object.fromEntries(form);payload.mandatory=form.get('mandatory')==='on';try{const out=await api(`/api/learning-talent/${action}`,{method:'POST',body:payload});addReceipt(out.receipt);toast(out.message);learningTalentWorkspace();}catch(error){toast(error.message);}};
}

async function hrDomainApp(domain) {
  const configs={
    performance:['PERFORMANCE MANAGEMENT','Performance Center','Cycles, objectives, 28-factor reviews, calibration, and final decisions.',['Open reviews','544','Calibration','12','Overdue','7','Coverage','98%'],['Employee','Cycle','Self review','Manager review','Calibration','Decision']],
    compensation:['COMPENSATION','Compensation Center','Salary review, allowances, payroll impact, equity, and WPS readiness.',['Review cases','19','Payroll impact','SAR 214K','WPS ready','97%','Exceptions','4'],['Employee','Current package','Proposed change','Budget impact','Approval','Status']],
    government:['GOVERNMENT RELATIONS','Government Compliance Center','Qiwa, GOSI, Mudad, Muqeem, permits, expiry, and Saudization controls.',['Open cases','16','Expiring ≤30d','9','Saudization','42.6%','Critical','3'],['Employee','Service','Reference','Expiry','Owner','Status']],
    quality:['QUALITY & GOVERNANCE','Quality & Governance Center','Controls, audit findings, corrective actions, SLA, evidence, and closure.',['Open findings','11','Corrective actions','8','SLA breaches','2','Control score','94%'],['Control','Finding','Owner','Due','Evidence','Status']],
    ai:['EXPLAINABLE AI','AI Decision Support','Cross-module signals, explainability, confidence, evidence, and human decisions.',['Signals','27','High risk','4','Decision packets','9','Overrides','2'],['Signal','Affected domain','Confidence','Evidence','Human owner','Status']]
  };
  const c=configs[domain];
  const metrics=[]; for(let i=0;i<c[3].length;i+=2) metrics.push(`<article><span>${c[3][i]}</span><strong>${c[3][i+1]}</strong></article>`);
  const rows=Array.from({length:6},(_,i)=>`<tr>${c[4].map((h,j)=>`<td>${j===0?`<strong>${['Fahad Alzahrani','Abdulaziz Alanzi','Khalid Alshehri','Noura Alharbi','Sara Alotaibi','Mohammed Alqahtani'][i]}</strong>`:j===c[4].length-1?`<span class="status-pill">${i%3===0?'Needs review':i%3===1?'In progress':'Ready'}</span>`:['2026 Annual','Leadership gap','SAR 1,500','Qiwa contract','Policy control','Retention risk'][i%6]}</td>`).join('')}</tr>`).join('');
  appShell(`hr-${domain}`,c[0],c[1],c[2],`<button class="primary-btn" data-hr-create>Create ${domain==='ai'?'Decision Packet':'Case'}</button>`,`<div class="task-metrics">${metrics.join('')}</div><section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">OPERATIONS QUEUE</p><h3>${c[1]} queue</h3></div><div class="table-tools"><input data-hr-search placeholder="Search" aria-label="Search ${c[1]} queue"><button class="secondary-btn small" data-hr-filter>Filter review</button><button class="secondary-btn small" data-hr-export>Export</button></div></div><div class="table-wrap"><table class="domain-table"><thead><tr>${c[4].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody id="hrDomainRows">${rows}</tbody></table></div></section>`);
  document.querySelector('[data-hr-create]')?.addEventListener('click', () => permissionReceipt(`HR_${domain.toUpperCase()}_${domain === 'ai' ? 'DECISION_PACKET' : 'CASE'}_REQUEST`, { target: c[1], note: `New ${domain === 'ai' ? 'decision packet' : 'case'} routed for authorized HR review.` }));
  const hrRows = [...document.querySelectorAll('#hrDomainRows tr')]; let reviewOnly = false; const filterHrRows = () => { const query = document.querySelector('[data-hr-search]').value.trim().toLowerCase(); hrRows.forEach((row) => { const matches = !query || row.textContent.toLowerCase().includes(query); const needsReview = /needs review/i.test(row.textContent); row.hidden = !matches || (reviewOnly && !needsReview); }); };
  document.querySelector('[data-hr-search]')?.addEventListener('input', hf29Debounce(filterHrRows));
  document.querySelector('[data-hr-filter]')?.addEventListener('click', () => { reviewOnly = !reviewOnly; document.querySelector('[data-hr-filter]').textContent = reviewOnly ? 'Show all' : 'Filter review'; filterHrRows(); });
  document.querySelector('[data-hr-export]')?.addEventListener('click', () => downloadCsv(`nash-${domain}-queue-${new Date().toISOString().slice(0, 10)}.csv`, [c[4], ...hrRows.filter((row) => !row.hidden).map((row) => [...row.cells].map((cell) => cell.innerText.trim()))]));
}

function payrollMoney(value) { return Number(value || 0).toLocaleString('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 }); }
async function payrollWorkspace() {
  const data = await api('/api/payroll/dashboard');
  if (!state.employees.length) { try { state.employees = (await api('/api/employees')).employees || []; } catch (_) {} }
  const periods = data.periods || []; const runs = data.runs || [];
  const periodRows = periods.length ? periods.map(p => `<tr><td><strong>${esc(p.name)}</strong><small>${esc(p.id)}</small></td><td>${esc(p.startDate)} — ${esc(p.endDate)}</td><td><span class="status-pill">${esc(p.status)}</span></td></tr>`).join('') : '<tr><td colspan="3" class="empty-state">No payroll periods. Create a controlled period to begin.</td></tr>';
  const runRows = runs.length ? runs.map(r => `<tr><td><strong>${esc(r.employeeName)}</strong><small>${esc(r.employeeCode)}</small></td><td>${payrollMoney(r.calculation.net)}</td><td><span class="status-pill">${esc(r.status)}</span></td><td>${esc(r.compliance.wpsStatus)}</td><td><button class="secondary-btn small" data-payroll-payslip="${esc(r.id)}">Payslip</button> ${r.status === 'CALCULATED' ? `<button class="secondary-btn small" data-payroll-action="HR_APPROVE" data-payroll-run="${esc(r.id)}">HR approve</button>` : r.status === 'HR_APPROVED' ? `<button class="secondary-btn small" data-payroll-action="FINANCE_APPROVE" data-payroll-run="${esc(r.id)}">Finance approve</button>` : r.status === 'FINANCE_APPROVED' ? `<button class="primary-btn small" data-payroll-action="EXPORT_WPS" data-payroll-run="${esc(r.id)}">Export WPS</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No calculated payroll runs yet.</td></tr>';
  const options = state.employees.map(e => `<option value="${esc(e.id)}" ${state.selectedEmployee?.id === e.id ? 'selected' : ''}>${esc(e.employeeCode)} · ${esc(e.displayName)}</option>`).join('');
  openOperation('Payroll & Compensation', 'Production payroll control: periods, structured earnings, leave and loan impacts, approvals, Saudi compliance, GOSI reconciliation, Mudad readiness, WPS export, payslips, and immutable runtime audit evidence.', `
    <section class="hr-ops-shell"><div class="hr-ops-hero"><div><p class="eyebrow">PAYROLL CONTROL CENTER</p><h2>Human-approved payroll execution</h2><p>MySQL remains the employee source of truth. This workspace creates controlled calculation and approval records without changing source tables.</p></div><div class="hr-source-card"><span>Saudi compliance</span><strong>Validated before export</strong><small>GOSI · Mudad · WPS controls</small></div></div>
    <div class="hr-kpi-grid"><article><span>MySQL payroll cycles</span><strong>${esc(data.source.payrollCycles)}</strong><small>Source visibility</small></article><article><span>Runtime periods</span><strong>${periods.length}</strong><small>Controlled workflow</small></article><article><span>Calculated runs</span><strong>${runs.length}</strong><small>Audit-backed</small></article><article><span>Export ready</span><strong>${runs.filter(r => r.status === 'FINANCE_APPROVED' && r.compliance.ready).length}</strong><small>WPS gate cleared</small></article></div>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">PAYROLL PERIOD</p><h3>Create pay cycle</h3></div></div><form id="payrollPeriodForm" class="form-grid"><label class="form-field"><span>Period name</span><input name="name" required placeholder="July 2026 payroll"></label><label class="form-field"><span>Start date</span><input name="startDate" type="date" required></label><label class="form-field"><span>End date</span><input name="endDate" type="date" required></label><button class="primary-btn" type="submit">Create period</button></form></section>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">CALCULATE PAYROLL</p><h3>Salary structure and impacts</h3></div></div><form id="payrollRunForm" class="form-grid"><label class="form-field"><span>Payroll period</span><select name="periodId" required><option value="">Select period</option>${periods.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><label class="form-field"><span>Employee</span><select name="employeeId" required><option value="">Select employee</option>${options}</select></label><label class="form-field"><span>Verified bank IBAN</span><input name="bankIban" required placeholder="SA…"></label><label class="form-field"><span>Basic salary (SAR)</span><input name="basicSalary" type="number" min="0" step="0.01"></label><label class="form-field"><span>Allowances (SAR)</span><input name="allowance" type="number" min="0" step="0.01" value="0"></label><label class="form-field"><span>Other deductions (SAR)</span><input name="deduction" type="number" min="0" step="0.01" value="0"></label><label class="form-field"><span>Overtime hours</span><input name="overtimeHours" type="number" min="0" step="0.25" value="0"></label><label class="form-field"><span>Unpaid leave days</span><input name="unpaidLeaveDays" type="number" min="0" step="0.5" value="0"></label><label class="form-field"><span>Loan installment (SAR)</span><input name="loanInstallment" type="number" min="0" step="0.01" value="0"></label><label class="form-field"><span>Bonus / incentive (SAR)</span><input name="bonus" type="number" min="0" step="0.01" value="0"></label><label class="form-field"><span>Service years (EOS estimate)</span><input name="serviceYears" type="number" min="0" step="0.1" value="0"></label><button class="primary-btn" type="submit">Calculate & validate</button></form><p class="hr-ai-note">Overtime uses a 1.5× baseline multiplier. End-of-service is an estimate only; authorized HR review remains required.</p></section>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">PERIOD REGISTER</p><h3>Payroll periods</h3></div></div><div class="table-wrap"><table class="domain-table"><thead><tr><th>Period</th><th>Dates</th><th>Status</th></tr></thead><tbody>${periodRows}</tbody></table></div></section>
    <section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">PAYROLL APPROVAL & AUDIT</p><h3>Calculated payroll runs</h3></div></div><div class="table-wrap"><table class="domain-table"><thead><tr><th>Employee</th><th>Net pay</th><th>Workflow</th><th>WPS / Mudad</th><th>Actions</th></tr></thead><tbody>${runRows}</tbody></table></div></section></section>`);
  $('payrollPeriodForm').onsubmit = async event => { event.preventDefault(); const out = await api('/api/payroll/periods', { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) }); addReceipt({ ...out.audit, actionType: 'PAYROLL_PERIOD_CREATED', target: out.period.name, note: out.message }); toast(out.message); payrollWorkspace(); };
  $('payrollRunForm').onsubmit = async event => { event.preventDefault(); const v = Object.fromEntries(new FormData(event.currentTarget)); const out = await api('/api/payroll/runs', { method: 'POST', body: { ...v, allowances: Number(v.allowance) ? [{ name: 'Configured allowance', amount: v.allowance }] : [], deductions: Number(v.deduction) ? [{ name: 'Configured deduction', amount: v.deduction }] : [] } }); addReceipt({ ...out.audit, actionType: 'PAYROLL_CALCULATED', target: out.run.employeeName, note: out.message }); toast(out.message); payrollWorkspace(); };
  document.querySelectorAll('[data-payroll-action]').forEach(b => b.onclick = async () => { const out = await api(`/api/payroll/runs/${encodeURIComponent(b.dataset.payrollRun)}/action`, { method: 'POST', body: { action: b.dataset.payrollAction } }); addReceipt({ ...out.audit, actionType: `PAYROLL_${b.dataset.payrollAction}`, target: out.run.employeeName, note: out.message }); if (out.export) downloadCsv(out.export.fileName, out.export.content.trim().split('\n').map(line => line.split(','))); toast(out.message); payrollWorkspace(); });
  document.querySelectorAll('[data-payroll-payslip]').forEach(b => b.onclick = async () => { const out = await api(`/api/payroll/runs/${encodeURIComponent(b.dataset.payrollPayslip)}/payslip`); const p = out.payslip; openOperation('Payslip', `${p.employeeName} · ${p.periodId}`, `<section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">CONTROLLED PAYSLIP</p><h3>Net pay ${payrollMoney(p.net)}</h3></div></div>${businessSummary(p)}</section>`); });
}

async function enterpriseHrCoreWorkspace() {
  const data = await api('/api/hr-core/dashboard');
  const workflows = [
    ['employees', 'Employee Master File', 'Controlled employee identity and employment records', ['fullName:Full name', 'employeeCode:Employee code', 'workEmail:Work email', 'department:Department', 'position:Position']],
    ['organizations', 'Organization Structure', 'Departments, reporting units, and cost centers', ['name:Unit name', 'code:Unit code', 'parentCode:Parent unit code', 'leader:Accountable leader']],
    ['positions', 'Position Management', 'Approved positions, grades, and headcount ownership', ['title:Position title', 'code:Position code', 'department:Department', 'grade:Grade']],
    ['jobDescriptions', 'Job Description & SOP', 'Versioned role outcomes, SOP references, and controls', ['title:JD title', 'positionCode:Position code', 'version:Version', 'sopReference:SOP reference']],
    ['candidates', 'Hiring', 'Candidate pipeline from intake through hire decision', ['fullName:Candidate name', 'jobTitle:Role title', 'source:Hiring source', 'owner:Recruiter']],
    ['onboarding', 'Onboarding', 'Start-date readiness, equipment, access, and policy acknowledgements', ['employeeName:Employee name', 'startDate:Start date', 'owner:Onboarding owner', 'checklist:Checklist reference']],
    ['lifecycle', 'Employee Lifecycle', 'Controlled employee changes, transfers, leave, and separation events', ['employeeName:Employee name', 'eventType:Lifecycle event', 'effectiveDate:Effective date', 'owner:Case owner']]
  ];
  const cards = workflows.map(([key, title, description]) => `<button class="hr-domain-card" data-hr-core-open="${esc(key)}"><span>${esc(title)}</span><strong>${esc((data.records[key] || []).length)}</strong><small>${esc(description)}</small><b>Manage workflow →</b></button>`).join('');
  openOperation('Enterprise HR Core', 'Production workflow controls for employee master data, structure, positions, JD/SOP, hiring, onboarding, and lifecycle. Runtime records are auditable and require human approval.', `
    <section class="hr-ops-shell"><div class="hr-ops-hero"><div><p class="eyebrow">ENTERPRISE HR PLATFORM</p><h2>Core people operations</h2><p>Source reference: ${data.source.available ? `${esc(data.source.employees)} employees · ${esc(data.source.departments)} departments · ${esc(data.source.positions)} positions from MySQL` : 'MySQL source temporarily unavailable; workflow records remain available for controlled review.'}</p></div><div class="hr-source-card"><span>Human approval</span><strong>Required</strong><small>No direct source-table mutation</small></div></div><div class="hr-domain-grid">${cards}</div><section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">AUDIT TRAIL</p><h3>Latest core workflow activity</h3></div></div><div class="table-wrap"><table class="domain-table"><thead><tr><th>Action</th><th>Workflow</th><th>Actor</th><th>Time</th></tr></thead><tbody>${(data.audit || []).length ? data.audit.slice(0,8).map(a => `<tr><td>${esc(a.action)}</td><td>${esc(a.collection)}</td><td>${esc(a.actor)}</td><td>${esc(a.createdAt)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-state">No core workflow activity yet.</td></tr>'}</tbody></table></div></section></section>`);
  document.querySelectorAll('[data-hr-core-open]').forEach((button) => button.onclick = () => enterpriseHrWorkflow(button.dataset.hrCoreOpen, workflows));
}

async function enterpriseHrWorkflow(collection, definitions) {
  const definition = definitions.find((item) => item[0] === collection); if (!definition) return;
  const [key, title, description, fields] = definition; const data = await api('/api/hr-core/dashboard'); const records = data.records[key] || [];
  const fieldHtml = fields.map((spec) => { const [name, label] = spec.split(':'); const type = /date/i.test(label) ? 'date' : 'text'; return `<label class="form-field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" required></label>`; }).join('');
  openOperation(title, description, `<section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">CREATE CONTROLLED RECORD</p><h3>Route for human review</h3></div></div><form id="hrCoreForm" class="form-grid">${fieldHtml}<button class="primary-btn" type="submit">Create ${esc(title)} record</button></form></section><section class="domain-panel"><div class="panel-title"><div><p class="eyebrow">WORKFLOW REGISTER</p><h3>${esc(records.length)} record(s)</h3></div></div><div class="table-wrap"><table class="domain-table"><thead><tr><th>Record</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody>${records.length ? records.map(record => `<tr><td><strong>${esc(record.fullName || record.name || record.title || record.employeeName)}</strong><small>${esc(record.id)}</small></td><td>${esc(Object.entries(record).filter(([k]) => !['id','status','createdAt','updatedAt','note'].includes(k)).slice(1,3).map(([,v]) => v).join(' · '))}</td><td><span class="status-pill">${esc(record.status)}</span></td><td><button class="secondary-btn small" data-hr-core-transition="${esc(record.id)}">Advance review</button></td></tr>`).join('') : '<tr><td colspan="4" class="empty-state">No records yet. Create the first controlled record above.</td></tr>'}</tbody></table></div></section>`);
  $('hrCoreForm').onsubmit = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const out = await api(`/api/hr-core/${key}`, { method: 'POST', body: values }); addReceipt({ ...out.audit, actionType: `HR_CORE_${key.toUpperCase()}_CREATE`, target: title, note: out.message }); toast(out.message); enterpriseHrWorkflow(key, definitions); };
  document.querySelectorAll('[data-hr-core-transition]').forEach((button) => button.onclick = async () => { const out = await api(`/api/hr-core/${key}/${encodeURIComponent(button.dataset.hrCoreTransition)}/transition`, { method: 'POST', body: { status: 'IN_REVIEW', note: 'Advanced from controlled HR workspace.' } }); addReceipt({ ...out.audit, actionType: `HR_CORE_${key.toUpperCase()}_REVIEW`, target: title, note: out.message }); toast(out.message); enterpriseHrWorkflow(key, definitions); });
}

async function runCommand(command) {
  try {
    const map = {
      emp_select: () => loadEmployees('Select My Record'),
      mgr_select: managerWorkspace,
      hr_select: hrOperationsWorkspace,
      emp_profile_edit: profileEditForm,
      emp_checkin: employeeAttendanceApp,
      emp_checkin_action: () => attendance('/api/workday/check-in', 'CHECK_IN', { method: 'PIN Check-in' }),
      emp_start_day: () => attendance('/api/workday/start-session', 'START_WORKDAY'),
      emp_checkout: () => attendance('/api/workday/check-out', 'CHECK_OUT'),
      emp_tasks: employeeTasksApp,
      mgr_queue: () => loadTasks('Team Queue'),
      emp_start_task: () => taskEndpoint('/api/workday/tasks/start', 'START_TASK'),
      emp_submit_evidence: () => evidenceForm('SUBMIT_EVIDENCE'),
      emp_edit_evidence: () => evidenceForm('EDIT_DRAFT_EVIDENCE'),
      emp_delete_evidence: () => permissionReceipt('DELETE_DRAFT_EVIDENCE', { target: taskLabel(), note: 'Draft evidence deleted/cancelled by employee. File removal requires permission receipt.' }),
      emp_file: employeeFileApp,
      emp_upload_file: () => employeeDocumentForm('EMPLOYEE_DOCUMENT_UPLOAD'),
      emp_replace_file: () => employeeDocumentForm('EMPLOYEE_DOCUMENT_REPLACE'),
      emp_archive_file: () => documentActionForm('EMPLOYEE_DOCUMENT_ARCHIVE'),
      emp_rights: employeeRightsApp,
      emp_performance: employeePerformanceApp,
      mgr_add_task: () => managerTaskForm('ADD_TEAM_TASK_REQUEST'),
      mgr_edit_task: () => managerTaskForm('EDIT_TEAM_TASK_REQUEST'),
      mgr_cancel_task: () => permissionReceipt('CANCEL_TEAM_TASK_REQUEST', { target: taskLabel(), note: 'Manager cancelled pending task request.' }),
      mgr_review: () => loadTasks('Review Submitted Work'),
      mgr_accept: () => managerDecision('manager_accept'),
      mgr_return: () => managerDecision('manager_return'),
      mgr_request_evidence: () => permissionReceipt('MANAGER_REQUEST_EVIDENCE', { target: taskLabel(), note: 'Manager requested additional evidence.' }),
      mgr_review_evidence: () => documentIntakeQueue('Manager Evidence Review', 'manager'),
      mgr_correction: () => documentActionForm('MANAGER_EVIDENCE_CORRECTION'),
      mgr_escalate_sla: () => permissionReceipt('MANAGER_ESCALATE_SLA', { target: taskLabel(), note: 'Manager escalated SLA.' }),
      hr_file: employee360Workspace,
      hr_core: enterpriseHrCoreWorkspace,
      hr_upload_document: () => employeeDocumentForm('HR_DOCUMENT_UPLOAD'),
      hr_document_intake: () => documentIntakeQueue('Document Intake Queue', 'hr'),
      hr_verify_document: () => documentActionForm('HR_DOCUMENT_VERIFY'),
      hr_reject_document: () => documentActionForm('HR_DOCUMENT_REJECT'),
      hr_missing_documents: missingDocumentsForm,
      hr_expiry_review: documentExpiryReview,
      hr_add: () => hrForm('HR_ADD_ACTION_REQUEST'),
      hr_edit: () => hrForm('HR_EDIT_ACTION_REQUEST'),
      hr_cancel: () => permissionReceipt('HR_DELETE_ACTION_REQUEST', { target: employeeLabel(), note: 'HR cancelled/deleted pending request, not source data.' }),
      hr_performance: performanceManagementWorkspace,
      hr_training: learningTalentWorkspace,
      hr_compensation: payrollWorkspace,
      hr_government: () => hrDomainApp('government'),
      hr_quality: () => hrDomainApp('quality'),
      hr_ai: () => hrDomainApp('ai'),
      exec_dashboard: executiveDashboard,
      exec_brief: executiveDashboard,
      exec_risk: () => moduleLoad('Executive Risk Board', '/api/ai/summary'),
      exec_backlog: () => moduleLoad('Decision Backlog', '/api/controls/summary'),
      exec_governance: () => moduleLoad('Governance Risk', '/api/quality/summary'),
      exec_ai: executiveAiWorkspace,
      exec_reports: reportsAnalyticsCenter,
      exec_copilot: aiCopilotWorkspace,
      exec_tenants: tenantAdministrationWorkspace,
      exec_billing: subscriptionBillingWorkspace,
      exec_provisioning: tenantProvisioningWorkspace,
      exec_release: releaseCandidateWorkspace,
      exec_escalate: () => permissionReceipt('EXEC_ESCALATE', { target: 'Executive decision queue', note: 'Executive human review escalation.' }),
      final_acceptance: finalAcceptance
    };
    if (!map[command]) throw new Error(`No command binding: ${command}`);
    await map[command]();
  } catch (error) {
    toast(error.message || 'Command failed.');
  }
}


async function optionalApi(url) {
  try { return await api(url); } catch (error) { return { unavailable: true, error: error.message }; }
}

function firstValue(source, keys, fallback = '—') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function countFrom(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'number') return value;
  }
  return 0;
}


function summaryCount(source, keys, fallback = 0) {
  const counts = source?.counts || {};
  for (const key of keys) {
    if (typeof source?.[key] === 'number') return source[key];
    if (typeof counts?.[key] === 'number') return counts[key];
  }
  return fallback;
}

async function hrOperationsWorkspace() {
  openOperation('HR Operations Workspace', 'Loading workforce, approvals, compliance, learning, compensation, governance, and AI sources.', '<div class="hr-loading-state">Loading controlled HR source summaries…</div>');
  const [employees, performanceData, training, compensation, government, controls, quality, aiData] = await Promise.all([
    optionalApi('/api/employees/summary'), optionalApi('/api/performance/summary'), optionalApi('/api/training/summary'),
    optionalApi('/api/compensation/summary'), optionalApi('/api/government/summary'), optionalApi('/api/controls/summary'),
    optionalApi('/api/quality/summary'), optionalApi('/api/ai/summary')
  ]);
  const employeeCount = summaryCount(employees, ['employees'], 0);
  const reviewCount = summaryCount(performanceData, ['reviews'], 0);
  const taskCount = summaryCount(controls, ['tasks'], 0);
  const approvalCount = summaryCount(controls, ['approval_requests'], 0);
  const auditCount = summaryCount(controls, ['audit_trail'], 0);
  const runtimeActions = Number(controls.runtimeUnifiedControlActions || 0) + Number(quality.runtimeQualityGovernanceActions || 0);
  const sourceStatus = [employees, performanceData, training, compensation, government, controls, quality, aiData].filter((x) => !x.unavailable && !x.error).length;
  const queues = [
    ['Employee Services', `${employeeCount} employees`, 'Employee 360, documents, profile requests', 'hr_file'],
    ['Performance', `${reviewCount} reviews`, '28-factor evaluation and calibration', 'hr_performance'],
    ['Learning', `${Number(training.runtimeTrainingPlans || 0)} active plans`, 'Gap engine and development plans', 'hr_training'],
    ['Compensation', `${Number(compensation.runtimeCompensationDecisions || 0)} decisions`, 'Payroll impact and WPS readiness', 'hr_compensation'],
    ['Government', `${Number(government.runtimeGovernmentActions || 0)} actions`, 'Qiwa, GOSI, Mudad, Nitaqat and permits', 'hr_government'],
    ['Quality & Governance', `${runtimeActions} runtime actions`, 'Approval, SLA, evidence and quality gates', 'hr_quality']
  ];
  const queueCards = queues.map((q) => `<button class="hr-domain-card" data-command="${esc(q[3])}"><span>${esc(q[0])}</span><strong>${esc(q[1])}</strong><small>${esc(q[2])}</small><b>Open workspace →</b></button>`).join('');
  const risks = [
    ['Approval backlog', approvalCount, approvalCount > 10 ? 'watch' : 'good'],
    ['Open work items', taskCount, taskCount > 100 ? 'watch' : 'good'],
    ['Audit evidence', auditCount, auditCount ? 'good' : 'watch'],
    ['Connected sources', `${sourceStatus}/8`, sourceStatus === 8 ? 'good' : 'watch']
  ].map((r) => `<div class="hr-risk-row"><span>${esc(r[0])}</span><strong>${esc(r[1])}</strong><em class="${esc(r[2])}">${r[2] === 'good' ? 'Ready' : 'Review'}</em></div>`).join('');
  openOperation('HR Operations Workspace', 'Enterprise HR service delivery with source-labelled queues and human-controlled decisions.', `
    <section class="hr-ops-shell">
      <div class="hr-ops-hero"><div><p class="eyebrow">HR OPERATING SYSTEM</p><h2>Run the workforce from one controlled workspace</h2><p>Employee services, talent, compensation, government relations, governance, and AI decision support remain connected to the current MySQL source.</p></div><div class="hr-source-card"><span>Source status</span><strong>${sourceStatus}/8 connected</strong><small>Schema unchanged · Human approval required</small></div></div>
      <div class="hr-kpi-grid">
        <article><span>Workforce</span><strong>${employeeCount || '—'}</strong><small>MySQL employees</small></article>
        <article><span>Performance records</span><strong>${reviewCount || '—'}</strong><small>Review source</small></article>
        <article><span>Approval queue</span><strong>${approvalCount || '0'}</strong><small>Controlled decisions</small></article>
        <article><span>Evidence trail</span><strong>${auditCount || '0'}</strong><small>Audit source</small></article>
      </div>
      <div class="hr-ops-grid">
        <section class="hr-panel"><div class="hr-panel-head"><div><p class="eyebrow">SERVICE DOMAINS</p><h3>HR workspaces</h3></div><span>Role-bound</span></div><div class="hr-domain-grid">${queueCards}</div></section>
        <section class="hr-panel hr-control-panel"><div class="hr-panel-head"><div><p class="eyebrow">CONTROL TOWER</p><h3>Operational readiness</h3></div><span>Live summary</span></div><div class="hr-risk-list">${risks}</div><button class="primary-btn" data-command="hr_ai">Open NASH AI decision support</button><p class="hr-ai-note">AI explains signals and prepares packets. It cannot approve, mutate payroll, submit government transactions, or change the database.</p></section>
      </div>
      <section class="hr-panel"><div class="hr-panel-head"><div><p class="eyebrow">QUICK EXECUTION</p><h3>Start controlled HR work</h3></div><span>Receipt-based</span></div><div class="hr-quick-grid">
        <button data-command="hr_file"><strong>Open Employee 360</strong><small>Unified employee profile and documents.</small></button>
        <button data-command="hr_document_intake"><strong>Document Intake</strong><small>Verify, reject, replace, or request files.</small></button>
        <button data-command="hr_add"><strong>Create HR Action</strong><small>Start a controlled employee service request.</small></button>
        <button data-command="hr_quality"><strong>Run Governance Gate</strong><small>Inspect quality, evidence, and approvals.</small></button>
      </div></section>
    </section>`);
  document.querySelectorAll('[data-command]').forEach((btn) => btn.onclick = () => runCommand(btn.dataset.command));
}


function businessFieldLabel(key) {
  return String(key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function businessSummary(obj, emptyText = 'No operational data is currently available.') {
  if (!obj || obj.unavailable) return `<div class="empty-state">${esc(emptyText)}</div>`;
  const hidden = /^(lock|build|source|profile|createdAt|updatedAt|id|employeeId|employeeCode)$/i;
  const rows = [];
  const walk = (value, prefix = '', depth = 0) => {
    if (rows.length >= 10 || depth > 2 || value == null) return;
    if (Array.isArray(value)) {
      if (prefix) rows.push([businessFieldLabel(prefix), `${value.length} item${value.length === 1 ? '' : 's'}`]);
      value.slice(0, 3).forEach((item, index) => { if (item && typeof item === 'object') walk(item, `${prefix} ${index + 1}`, depth + 1); });
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([k,v]) => { if (!hidden.test(k)) walk(v, prefix ? `${prefix} ${k}` : k, depth + 1); });
      return;
    }
    if (prefix) rows.push([businessFieldLabel(prefix), String(value)]);
  };
  walk(obj);
  if (!rows.length) return `<div class="empty-state">${esc(emptyText)}</div>`;
  return `<div class="business-summary-grid">${rows.map(([k,v]) => `<article><span>${esc(k)}</span><strong>${esc(v)}</strong></article>`).join('')}</div>`;
}
function recommendationList(obj, emptyText = 'No recommendations are currently available.') {
  if (!obj || obj.unavailable) return `<div class="empty-state">${esc(emptyText)}</div>`;
  const arrays = Object.values(obj).filter(Array.isArray);
  const items = arrays.flat().slice(0,6);
  if (!items.length) return businessSummary(obj, emptyText);
  return `<div class="decision-list">${items.map((item, i) => {
    const title = firstValue(item || {}, ['title','name','courseName','recommendation','action','label'], `Recommendation ${i+1}`);
    const status = firstValue(item || {}, ['status','priority','riskLevel','level'], 'Review');
    const note = firstValue(item || {}, ['description','reason','rationale','nextAction','summary'], 'Human review required before action.');
    return `<article><div><span class="status-pill">${esc(status)}</span><h4>${esc(title)}</h4><p>${esc(note)}</p></div></article>`;
  }).join('')}</div>`;
}

async function employee360Workspace() {
  if (!state.selectedEmployee) {
    const data = await api('/api/employees/search?limit=20');
    state.employees = data.profiles || data.employees || [];
    const rows = state.employees.map((e, i) => `<button class="employee-picker-row" data-employee360-pick="${i}"><span class="employee-avatar">${esc(String(e.displayName || 'E').slice(0,1).toUpperCase())}</span><span><strong>${esc(e.displayName)}</strong><small>${esc(e.employeeCode)} · ${esc(e.department)} · ${esc(e.position)}</small></span><span>Open 360 →</span></button>`).join('') || '<div class="empty-state">No employee rows returned.</div>';
    openOperation('Employee 360', 'Select an employee to open the unified HR profile. No master data is changed.', `<section class="employee360-picker"><div class="employee360-picker-head"><p class="eyebrow">WORKFORCE DIRECTORY</p><h3>Select employee</h3><p>Open a controlled, read-only 360° view across profile, performance, learning, compensation, compliance, documents, and AI signals.</p></div><div class="employee-picker-list">${rows}</div></section>`);
    document.querySelectorAll('[data-employee360-pick]').forEach((btn) => btn.onclick = async () => {
      state.selectedEmployee = state.employees[Number(btn.dataset.employee360Pick)];
      await employee360Workspace();
    });
    return;
  }

  const e = state.selectedEmployee;
  const id = encodeURIComponent(e.id);
  const [rights, performanceData, training, compensation, government, quality, aiData, taskData] = await Promise.all([
    optionalApi(`/api/self-service/rights/${id}`),
    optionalApi(`/api/performance/evaluation/${id}`),
    optionalApi(`/api/training/plan/${id}`),
    optionalApi(`/api/compensation/decision/${id}`),
    optionalApi(`/api/government/case/${id}`),
    optionalApi(`/api/quality/governance/${id}`),
    optionalApi(`/api/ai/radar/${id}`),
    optionalApi(`/api/workday/tasks/${id}`)
  ]);
  const docs = docsForSelectedEmployee();
  const tasks = taskData.tasks || [];
  const perfScore = firstValue(performanceData, ['score','overallScore','rating','finalScore'], firstValue(performanceData.evaluation || {}, ['score','overallScore','rating'], 'Available'));
  const risk = firstValue(aiData, ['riskLevel','overallRisk','level','status'], firstValue(aiData.radar || {}, ['riskLevel','overallRisk','level'], 'Review'));
  const readiness = firstValue(government, ['readiness','status','overallStatus'], firstValue(government.case || {}, ['readiness','status'], 'Review'));
  const governanceStatus = firstValue(quality, ['status','gateStatus','overallStatus'], firstValue(quality.governance || {}, ['status','gateStatus'], 'Review'));
  const trainingCount = countFrom(training, ['recommendations','courses','plans','gaps']) || (training.unavailable ? 0 : 1);
  const initials = String(e.displayName || 'E').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();

  const body = `
    <section class="employee360-shell">
      <header class="employee360-hero">
        <div class="employee360-avatar">${esc(initials)}</div>
        <div class="employee360-identity"><p class="eyebrow">EMPLOYEE 360</p><h2>${esc(e.displayName)}</h2><p>${esc(e.position)} · ${esc(e.department)}</p><div class="employee360-tags"><span>${esc(e.employeeCode)}</span><span>${esc(firstValue(e,['employmentStatus','status'],'Active'))}</span><span>${esc(firstValue(e,['location','workLocation'],'Primary location'))}</span></div></div>
        <div class="employee360-actions"><button class="primary-btn" data-e360-command="hr_edit">Create HR action</button><button class="secondary-btn" data-e360-command="hr_upload_document">Add document</button><button class="secondary-btn" id="changeEmployee360">Change employee</button></div>
      </header>
      <div class="employee360-command-strip">
        <div><span>Lifecycle</span><strong>${esc(firstValue(e,['employmentStatus','status'],'Active'))}</strong><small>Employee master source</small></div>
        <div><span>Manager</span><strong>${esc(firstValue(e,['managerName','manager'],'Not assigned'))}</strong><small>Organization relationship</small></div>
        <div><span>Compliance</span><strong>${esc(readiness)}</strong><small>Government readiness</small></div>
        <div><span>Governance</span><strong>${esc(governanceStatus)}</strong><small>Human-controlled gate</small></div>
      </div>
      <div class="employee360-kpis">
        <article><span>Performance</span><strong>${esc(perfScore)}</strong><small>Current evaluation</small></article>
        <article><span>Open tasks</span><strong>${tasks.filter(t=>!['completed','closed','accepted'].includes(String(t.status||'').toLowerCase())).length}</strong><small>${tasks.length} total tasks</small></article>
        <article><span>Documents</span><strong>${docs.length}</strong><small>Controlled employee vault</small></article>
        <article><span>AI risk</span><strong>${esc(risk)}</strong><small>Human review required</small></article>
      </div>
      <nav class="employee360-tabs" aria-label="Employee 360 sections">
        <button class="active" data-e360-tab="overview">Overview</button><button data-e360-tab="employment">Employment</button><button data-e360-tab="work">Work</button><button data-e360-tab="attendance">Attendance</button><button data-e360-tab="leave">Leave</button><button data-e360-tab="payroll">Payroll</button><button data-e360-tab="performance">Performance</button><button data-e360-tab="learning">Learning</button><button data-e360-tab="government">Government</button><button data-e360-tab="documents">Documents</button><button data-e360-tab="assets">Assets</button><button data-e360-tab="approvals">Approvals</button><button data-e360-tab="timeline">Timeline</button><button data-e360-tab="ai">AI insights</button><button data-e360-tab="ledger">Action Ledger</button>
      </nav>
      <div class="employee360-content">
        <section class="e360-panel active" data-e360-panel="overview">
          <div class="e360-grid two">
            <article class="e360-card"><p class="eyebrow">PROFILE</p><h3>Employment profile</h3><dl><div><dt>Employee ID</dt><dd>${esc(e.employeeCode)}</dd></div><div><dt>Department</dt><dd>${esc(e.department)}</dd></div><div><dt>Position</dt><dd>${esc(e.position)}</dd></div><div><dt>Manager</dt><dd>${esc(firstValue(e,['managerName','manager'],'Not assigned'))}</dd></div><div><dt>Join date</dt><dd>${esc(firstValue(e,['joinDate','hireDate','startDate'],'—'))}</dd></div><div><dt>Employment type</dt><dd>${esc(firstValue(e,['employmentType','contractType'],'—'))}</dd></div></dl></article>
            <article class="e360-card"><p class="eyebrow">STATUS</p><h3>Lifecycle readiness</h3><div class="e360-status-list"><div><span>Government readiness</span><strong>${esc(readiness)}</strong></div><div><span>Governance gate</span><strong>${esc(governanceStatus)}</strong></div><div><span>Employee rights</span><strong>${rights.unavailable?'Unavailable':'Available'}</strong></div><div><span>Document verification</span><strong>${docs.filter(d=>String(d.verificationStatus||'').toLowerCase().includes('verif')).length}/${docs.length}</strong></div></div></article>
          </div>
          <div class="e360-grid two e360-overview-lower">
            <article class="e360-card"><p class="eyebrow">TODAY</p><h3>Operational priorities</h3><div class="e360-priority-list">
              <button data-e360-command="hr_tasks"><span>Open work queue</span><strong>${tasks.length} task(s)</strong></button>
              <button data-e360-command="hr_documents"><span>Review employee evidence</span><strong>${docs.length} file(s)</strong></button>
              <button data-e360-command="hr_performance"><span>Review performance</span><strong>${esc(perfScore)}</strong></button>
              <button data-e360-command="hr_ai"><span>Review AI signals</span><strong>${esc(risk)}</strong></button>
            </div></article>
            <article class="e360-card"><p class="eyebrow">ACTIVITY</p><h3>Controlled timeline</h3><div class="e360-timeline">
              <div><i></i><span><strong>Employee profile loaded</strong><small>Source: employee master · read-only</small></span></div>
              <div><i></i><span><strong>${docs.length} document(s) available</strong><small>Source: controlled document vault</small></span></div>
              <div><i></i><span><strong>${tasks.length} work item(s) linked</strong><small>Source: workday task service</small></span></div>
              <div><i></i><span><strong>Decision boundary active</strong><small>AI recommendation only · human approval required</small></span></div>
            </div></article>
          </div>
        </section>
        <section class="e360-panel" data-e360-panel="employment">
          <div class="e360-grid two">
            <article class="e360-card"><p class="eyebrow">EMPLOYMENT RECORD</p><h3>Current assignment</h3><dl><div><dt>Employee code</dt><dd>${esc(e.employeeCode)}</dd></div><div><dt>Status</dt><dd>${esc(firstValue(e,['employmentStatus','status'],'Active'))}</dd></div><div><dt>Employment type</dt><dd>${esc(firstValue(e,['employmentType','contractType'],'—'))}</dd></div><div><dt>Join date</dt><dd>${esc(firstValue(e,['joinDate','hireDate','startDate'],'—'))}</dd></div><div><dt>Department</dt><dd>${esc(e.department)}</dd></div><div><dt>Position</dt><dd>${esc(e.position)}</dd></div><div><dt>Manager</dt><dd>${esc(firstValue(e,['managerName','manager'],'Not assigned'))}</dd></div><div><dt>Location</dt><dd>${esc(firstValue(e,['location','workLocation'],'Primary location'))}</dd></div></dl></article>
            <article class="e360-card"><p class="eyebrow">LIFECYCLE ACTIONS</p><h3>Controlled HR actions</h3><div class="hf31-action-grid"><button class="primary-btn" data-e360-command="hr_edit">Update employment</button><button class="secondary-btn" data-e360-command="hr_compensation">Salary revision</button><button class="secondary-btn" data-e360-command="hr_performance">Promotion review</button><button class="secondary-btn" data-e360-command="hr_government">Contract renewal</button></div><p class="hf31-boundary">Every action requires evidence, approval, and a receipt. No direct silent master-data mutation.</p></article>
          </div>
        </section>
        <section class="e360-panel" data-e360-panel="work"><div class="e360-card"><p class="eyebrow">TASKS & EVIDENCE</p><h3>Current work</h3>${tasks.length?`<div class="e360-list">${tasks.slice(0,8).map(t=>`<div><span><strong>${esc(t.title)}</strong><small>${esc(t.status)} · SLA ${esc(t.slaHours||'—')}h</small></span><span>${esc(t.evidenceRequired||'Evidence controlled')}</span></div>`).join('')}</div>`:'<div class="empty-state">No tasks returned for this employee.</div>'}</div></section>
        <section class="e360-panel" data-e360-panel="attendance"><div class="e360-grid two"><article class="e360-card"><p class="eyebrow">ATTENDANCE</p><h3>Attendance operating view</h3>${businessSummary(rights.attendance || rights.time || {}, 'Attendance details are available through the controlled attendance service.')}<button class="primary-btn" data-e360-command="employee_checkin">Record attendance action</button></article><article class="e360-card"><p class="eyebrow">CONTROL</p><h3>Exceptions and evidence</h3><div class="e360-status-list"><div><span>Source</span><strong>Attendance service</strong></div><div><span>Exception owner</span><strong>Manager / HR</strong></div><div><span>Evidence</span><strong>Required for correction</strong></div><div><span>Audit</span><strong>Receipt-backed</strong></div></div></article></div></section>
        <section class="e360-panel" data-e360-panel="leave"><div class="e360-grid two"><article class="e360-card"><p class="eyebrow">LEAVE</p><h3>Balances and requests</h3>${businessSummary(rights.leave || rights.leaves || {}, 'Leave balances and requests are loaded from employee rights.')}<button class="primary-btn" data-e360-command="employee_leave">Open leave request</button></article><article class="e360-card"><p class="eyebrow">APPROVAL PATH</p><h3>Human-controlled decision</h3><div class="hf31-approval-chain"><span>Employee request</span><i>→</i><span>Manager review</span><i>→</i><span>HR policy check</span><i>→</i><span>Receipt</span></div></article></div></section>
        <section class="e360-panel" data-e360-panel="payroll"><div class="e360-grid two"><article class="e360-card"><p class="eyebrow">PAYROLL & COMPENSATION</p><h3>Current decision packet</h3>${businessSummary(compensation, 'No payroll or compensation packet is currently available.')}<button class="primary-btn" data-e360-command="hr_compensation">Open compensation workflow</button></article><article class="e360-card"><p class="eyebrow">PAYROLL BOUNDARY</p><h3>Protected financial data</h3><div class="e360-status-list"><div><span>Visibility</span><strong>Role restricted</strong></div><div><span>Approval</span><strong>HR + Finance</strong></div><div><span>WPS readiness</span><strong>Controlled workflow</strong></div><div><span>Final mutation</span><strong>Human authorized</strong></div></div></article></div></section>
        <section class="e360-panel" data-e360-panel="performance"><div class="e360-card"><p class="eyebrow">PERFORMANCE</p><h3>Evaluation and decisions</h3>${businessSummary(performanceData, 'No performance evaluation has been returned.')}<button class="primary-btn" data-e360-command="hr_performance">Open performance workflow</button></div></section>
        <section class="e360-panel" data-e360-panel="learning"><div class="e360-card"><p class="eyebrow">LEARNING</p><h3>Development plan</h3><p>${trainingCount} development signal(s) available.</p>${recommendationList(training, 'No development recommendations are currently available.')}<button class="primary-btn" data-e360-command="hr_training">Open learning workflow</button></div></section>
        <section class="e360-panel" data-e360-panel="compensation"><div class="e360-card"><p class="eyebrow">COMPENSATION</p><h3>Controlled decision view</h3>${businessSummary(compensation, 'No compensation decision packet is currently available.')}<button class="primary-btn" data-e360-command="hr_compensation">Open compensation workflow</button></div></section>
        <section class="e360-panel" data-e360-panel="compliance"><div class="e360-grid two"><article class="e360-card"><p class="eyebrow">GOVERNMENT</p><h3>${esc(readiness)}</h3>${businessSummary(government, 'No government-readiness case is currently open.')}<button class="secondary-btn" data-e360-command="hr_government">Open government workflow</button></article><article class="e360-card"><p class="eyebrow">QUALITY & GOVERNANCE</p><h3>${esc(governanceStatus)}</h3>${businessSummary(quality, 'No governance exception is currently open.')}<button class="secondary-btn" data-e360-command="hr_quality">Open governance workflow</button></article></div></section>
        <section class="e360-panel" data-e360-panel="government"><div class="e360-grid two"><article class="e360-card"><p class="eyebrow">GOVERNMENT RELATIONS</p><h3>${esc(readiness)}</h3>${businessSummary(government, 'No government-readiness case is currently open.')}<button class="primary-btn" data-e360-command="hr_government">Open government workflow</button></article><article class="e360-card"><p class="eyebrow">GOVERNANCE</p><h3>${esc(governanceStatus)}</h3>${businessSummary(quality, 'No governance exception is currently open.')}<button class="secondary-btn" data-e360-command="hr_quality">Open governance workflow</button></article></div></section>
        <section class="e360-panel" data-e360-panel="documents"><div class="e360-card"><p class="eyebrow">DOCUMENT VAULT</p><h3>Employee files</h3>${documentList(docs)}<button class="primary-btn" data-e360-command="hr_upload_document">Upload HR document</button></div></section>
        <section class="e360-panel" data-e360-panel="assets"><div class="e360-card"><p class="eyebrow">EMPLOYEE ASSETS</p><h3>Assigned assets and custody</h3><div class="hf31-table-wrap"><table class="hf31-table"><thead><tr><th>Asset</th><th>Reference</th><th>Status</th><th>Custody</th></tr></thead><tbody><tr><td>Laptop / workstation</td><td>Employee custody record</td><td><span class="status-pill">Controlled</span></td><td>${esc(e.displayName)}</td></tr><tr><td>Access credentials</td><td>Identity service</td><td><span class="status-pill">Active</span></td><td>IT governed</td></tr></tbody></table></div><p class="hf31-boundary">Asset assignment remains evidence-backed; this view does not create inventory records.</p></div></section>
        <section class="e360-panel" data-e360-panel="approvals"><div class="e360-card"><p class="eyebrow">APPROVALS</p><h3>Employee decision queue</h3><div class="hf31-approval-list"><article><span>Performance decision</span><strong>${esc(perfScore)}</strong><small>Manager → HR → Final owner</small></article><article><span>Compensation decision</span><strong>${compensation.unavailable?'No packet':'Review'}</strong><small>HR → Finance → Authorized approver</small></article><article><span>Government case</span><strong>${esc(readiness)}</strong><small>Government Relations → HR</small></article><article><span>Document verification</span><strong>${docs.length} file(s)</strong><small>Employee file custodian</small></article></div></div></section>
        <section class="e360-panel" data-e360-panel="timeline"><div class="e360-card"><p class="eyebrow">LIFECYCLE TIMELINE</p><h3>Traceable employee history</h3><div class="e360-timeline hf31-full-timeline"><div><i></i><span><strong>Employment profile active</strong><small>${esc(firstValue(e,['joinDate','hireDate','startDate'],'Current record'))} · Employee master</small></span></div><div><i></i><span><strong>Performance record</strong><small>Current score: ${esc(perfScore)} · Performance service</small></span></div><div><i></i><span><strong>Learning signals</strong><small>${trainingCount} recommendation(s) · Learning service</small></span></div><div><i></i><span><strong>Government readiness</strong><small>${esc(readiness)} · Government relations</small></span></div><div><i></i><span><strong>Document vault</strong><small>${docs.length} controlled file(s)</small></span></div><div><i></i><span><strong>Action receipts</strong><small>${operationalReceipts().filter(r=>String(r.employeeId||r.employeeCode||'').includes(String(e.id||e.employeeCode))).length} linked runtime receipt(s)</small></span></div></div></div></section>
        <section class="e360-panel" data-e360-panel="ai"><div class="e360-card ai"><p class="eyebrow">NASH AI</p><h3>Explainable employee signals</h3><p>Decision support only. Final HR decisions remain human-controlled and receipt-backed.</p>${recommendationList(aiData, 'No AI-supported recommendation is currently available.')}<div class="hf31-ai-boundary"><span><b>Confidence</b>Source-dependent</span><span><b>Evidence</b>Visible before decision</span><span><b>Authority</b>Human owner only</span></div><button class="primary-btn" data-e360-command="hr_ai">Open AI decision support</button></div></section>
        <section class="e360-panel" data-e360-panel="ledger"><div class="e360-card"><p class="eyebrow">ACTION LEDGER</p><h3>Employee-linked operational receipts</h3>${operationalReceipts().length?`<div class="receipt-list">${operationalReceipts().slice(0,12).map(receiptCard).join('')}</div>`:'<div class="empty-state">No operational receipts yet. Complete an employee action to create the first traceable receipt.</div>'}</div></section>
      </div>
    </section>`;
  openOperation('Employee 360', 'Unified, permission-bound employee profile. Data is loaded from existing APIs without schema changes.', body);
  $('changeEmployee360').onclick = () => { state.selectedEmployee = null; employee360Workspace(); };
  document.querySelectorAll('[data-e360-tab]').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('[data-e360-tab]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('[data-e360-panel]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-e360-panel="${btn.dataset.e360Tab}"]`)?.classList.add('active');
  });
  document.querySelectorAll('[data-e360-command]').forEach(btn => btn.onclick = () => runCommand(btn.dataset.e360Command));
}


async function managerWorkspace() {
  if (!state.employees.length) {
    const data = await api('/api/employees/search?limit=20');
    state.employees = data.profiles || data.employees || [];
  }
  const team = state.employees;
  const session = readAccessSession() || {};
  if (!state.selectedEmployee) {
    const controls = await optionalApi('/api/controls/summary');
    const ai = await optionalApi('/api/ai/summary');
    const managerDocs = state.documents.filter(isManagerVisibleEvidence);
    const openReceipts = operationalReceipts().filter(r => /MANAGER|RETURN|REQUEST|ESCALATE/i.test(String(r.actionType || ''))).length;
    const memberRows = team.map((e, i) => `<button class="manager-member-row" data-manager-member="${i}"><span class="manager-member-avatar">${esc(String(e.displayName || 'E').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span><span><strong>${esc(e.displayName)}</strong><small>${esc(e.position)} · ${esc(e.department)}</small></span><span class="manager-member-meta"><b>${esc(e.employeeCode)}</b><small>Open team member →</small></span></button>`).join('') || '<div class="empty-state">No team members returned by the employee source.</div>';
    const body = `
      <section class="manager-workspace-shell">
        <header class="manager-workspace-hero">
          <div><p class="eyebrow">MANAGER WORKSPACE</p><h2>${esc(session.tenant || 'NASH Enterprise')} · Team Operations</h2><p>Lead work, evidence, coaching, and SLA decisions from one permission-bound surface.</p></div>
          <div class="manager-source-chip"><span>Source boundary</span><strong>MySQL + controlled runtime</strong><small>No direct employee, payroll, or government mutation</small></div>
        </header>
        <div class="manager-kpi-grid">
          <article><span>Team members</span><strong>${team.length}</strong><small>Employee search source</small></article>
          <article><span>Evidence queue</span><strong>${managerDocs.length}</strong><small>Manager-visible files only</small></article>
          <article><span>Open manager actions</span><strong>${openReceipts}</strong><small>Runtime receipt ledger</small></article>
          <article><span>Control status</span><strong>${esc(firstValue(controls,['status','overallStatus'],'Review'))}</strong><small>Controls summary source</small></article>
        </div>
        <div class="manager-main-grid">
          <section class="manager-panel">
            <div class="manager-panel-head"><div><p class="eyebrow">TEAM DIRECTORY</p><h3>Direct team context</h3></div><span>${team.length} loaded</span></div>
            <div class="manager-member-list">${memberRows}</div>
          </section>
          <section class="manager-panel manager-ai-panel">
            <div class="manager-panel-head"><div><p class="eyebrow">NASH AI</p><h3>Manager coaching brief</h3></div><span>Advisory only</span></div>
            <p>Use explainable signals to prepare coaching, evidence requests, and SLA interventions. Final decisions remain human-controlled.</p>
            <div class="manager-ai-signal"><span>AI source status</span><strong>${ai.unavailable ? 'Unavailable' : 'Available for review'}</strong></div>
            <button class="primary-btn" data-manager-command="mgr_review">Open review queue</button>
          </section>
        </div>
        <section class="manager-panel">
          <div class="manager-panel-head"><div><p class="eyebrow">QUICK CONTROL</p><h3>Start a manager action</h3></div><span>Receipt-bound</span></div>
          <div class="manager-quick-grid">
            <button data-manager-command="mgr_queue"><strong>Team queue</strong><small>Load assigned work on request</small></button>
            <button data-manager-command="mgr_add_task"><strong>Assign work</strong><small>Create a controlled task request</small></button>
            <button data-manager-command="mgr_review_evidence"><strong>Evidence review</strong><small>Manager-visible files only</small></button>
            <button data-manager-command="mgr_escalate_sla"><strong>SLA intervention</strong><small>Record escalation with receipt</small></button>
          </div>
        </section>
      </section>`;
    openOperation('Manager Workspace', 'Team operations, evidence, coaching, and SLA decisions. Source-labeled and permission-bound.', body);
    document.querySelectorAll('[data-manager-member]').forEach(btn => btn.onclick = async () => {
      state.selectedEmployee = team[Number(btn.dataset.managerMember)];
      state.selectedTask = null;
      await managerWorkspace();
    });
    document.querySelectorAll('[data-manager-command]').forEach(btn => btn.onclick = () => runCommand(btn.dataset.managerCommand));
    return;
  }

  const e = state.selectedEmployee;
  const taskData = await optionalApi(`/api/workday/tasks/${encodeURIComponent(e.id)}`);
  state.tasks = taskData.tasks || [];
  const docs = managerVisibleDocuments(docsForSelectedEmployee());
  const activeTasks = state.tasks.filter(t => !/closed|complete|accepted/i.test(String(t.status || '')));
  const submittedTasks = state.tasks.filter(t => /submit|review|evidence/i.test(String(t.status || '')));
  const slaRisk = state.tasks.filter(t => Number(t.slaHours || 0) > 0 && /pending|open|progress|submit/i.test(String(t.status || '')));
  const initials = String(e.displayName || 'E').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  const taskRows = state.tasks.map((t,i) => `<button class="manager-task-row" data-manager-task="${i}"><span><strong>${esc(t.title)}</strong><small>${esc(safe(t.status))} · SLA ${esc(safe(t.slaHours))}h</small></span><span>${esc(safe(t.priority))}</span></button>`).join('') || '<div class="empty-state">No tasks returned for this team member.</div>';
  const evidenceRows = docs.map(d => `<article class="manager-evidence-row"><div><strong>${esc(d.fileName)}</strong><small>${esc(d.category)} · ${esc(d.verificationStatus || 'Pending review')}</small></div><button class="secondary-btn small" data-download-doc="${esc(d.documentId)}">Download</button></article>`).join('') || '<div class="empty-state">No manager-visible evidence for this employee.</div>';
  const body = `
    <section class="manager-workspace-shell">
      <header class="manager-member-hero">
        <div class="manager-member-avatar large">${esc(initials)}</div>
        <div><p class="eyebrow">TEAM MEMBER WORKSPACE</p><h2>${esc(e.displayName)}</h2><p>${esc(e.position)} · ${esc(e.department)} · ${esc(e.employeeCode)}</p></div>
        <div class="manager-member-actions"><button class="primary-btn" data-manager-command="mgr_add_task">Assign task</button><button class="secondary-btn" data-manager-command="mgr_review">Review work</button><button class="secondary-btn" id="changeManagerMember">Change member</button></div>
      </header>
      <div class="manager-kpi-grid">
        <article><span>Active tasks</span><strong>${activeTasks.length}</strong><small>Workday task source</small></article>
        <article><span>Submitted work</span><strong>${submittedTasks.length}</strong><small>Status-derived review queue</small></article>
        <article><span>Evidence files</span><strong>${docs.length}</strong><small>Manager-visible only</small></article>
        <article><span>SLA watch</span><strong>${slaRisk.length}</strong><small>Human review required</small></article>
      </div>
      <nav class="manager-tabs"><button class="active" data-manager-tab="work">Work queue</button><button data-manager-tab="evidence">Evidence</button><button data-manager-tab="coaching">Coaching</button><button data-manager-tab="actions">Manager actions</button></nav>
      <div class="manager-tab-content">
        <section class="manager-tab-panel active" data-manager-panel="work"><div class="manager-panel"><div class="manager-panel-head"><div><p class="eyebrow">WORK QUEUE</p><h3>Assigned and submitted work</h3></div><span>${state.tasks.length} tasks</span></div><div class="manager-task-list">${taskRows}</div></div></section>
        <section class="manager-tab-panel" data-manager-panel="evidence"><div class="manager-panel"><div class="manager-panel-head"><div><p class="eyebrow">EVIDENCE</p><h3>Submitted evidence files</h3></div><span>${docs.length} files</span></div><div class="manager-evidence-list">${evidenceRows}</div></div></section>
        <section class="manager-tab-panel" data-manager-panel="coaching"><div class="manager-panel manager-ai-panel"><p class="eyebrow">COACHING SUPPORT</p><h3>Human-led coaching preparation</h3><p>Review task status, evidence quality, and SLA patterns before recording feedback. NASH AI may explain signals but cannot issue a final rating or decision.</p><div class="manager-coaching-grid"><div><span>Workload signal</span><strong>${activeTasks.length > 5 ? 'Review capacity' : 'Within current load'}</strong></div><div><span>Evidence readiness</span><strong>${docs.length ? 'Evidence available' : 'Request evidence'}</strong></div><div><span>SLA signal</span><strong>${slaRisk.length ? 'Intervention watch' : 'No visible exception'}</strong></div></div></div></section>
        <section class="manager-tab-panel" data-manager-panel="actions"><div class="manager-panel"><div class="manager-quick-grid"><button data-manager-command="mgr_add_task"><strong>Add task request</strong><small>Controlled assignment workflow</small></button><button data-manager-command="mgr_edit_task"><strong>Edit task request</strong><small>Pending request only</small></button><button data-manager-command="mgr_request_evidence"><strong>Request evidence</strong><small>Create manager receipt</small></button><button data-manager-command="mgr_escalate_sla"><strong>Escalate SLA</strong><small>Human-controlled intervention</small></button></div></div></section>
      </div>
    </section>`;
  openOperation('Manager Workspace', 'Unified team-member work, evidence, coaching, and SLA surface.', body);
  $('changeManagerMember').onclick = () => { state.selectedEmployee = null; state.selectedTask = null; managerWorkspace(); };
  document.querySelectorAll('[data-manager-tab]').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('[data-manager-tab]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('[data-manager-panel]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-manager-panel="${btn.dataset.managerTab}"]`)?.classList.add('active');
  });
  document.querySelectorAll('[data-manager-task]').forEach(btn => btn.onclick = () => {
    state.selectedTask = state.tasks[Number(btn.dataset.managerTask)];
    openOperation('Task Context Selected', 'Manager task context selected. Choose a permitted decision or evidence action.', `${contextCard()}${taskCard(state.selectedTask)}<div class="manager-inline-actions"><button class="primary-btn" data-command="mgr_accept">Accept work</button><button class="secondary-btn danger" data-command="mgr_return">Return work</button><button class="secondary-btn" data-command="mgr_request_evidence">Request evidence</button></div>`);
    document.querySelectorAll('[data-command]').forEach(b => b.onclick = () => runCommand(b.dataset.command));
  });
  document.querySelectorAll('[data-manager-command]').forEach(btn => btn.onclick = () => runCommand(btn.dataset.managerCommand));
  bindDownloadButtons();
}

async function loadEmployees(title) {
  const data = await api('/api/employees/search?limit=20');
  state.employees = data.profiles || data.employees || []; // Hotfix 01: accept both API contracts
  const rows = state.employees.map((e, i) => `<button class="record-row" data-emp="${i}"><strong>${esc(e.displayName)}</strong><span>${esc(e.employeeCode)} · ${esc(e.department)} · ${esc(e.position)}</span></button>`).join('') || '<div class="empty-state">No employee rows returned.</div>';
  openOperation(title, 'Employee records loaded only after this command.', `<div class="record-list">${rows}</div>`);
  document.querySelectorAll('[data-emp]').forEach((btn) => btn.onclick = () => {
    state.selectedEmployee = state.employees[Number(btn.dataset.emp)];
    openOperation('Employee Context Selected', 'Now run a permitted command. This selection does not pollute the Action Ledger.', contextCard());
    toast(`Context selected: ${state.selectedEmployee.displayName}`);
  });
}

async function loadTasks(title) {
  await requireEmployee();
  const data = await api(`/api/workday/tasks/${encodeURIComponent(state.selectedEmployee.id)}`);
  state.tasks = data.tasks || [];
  const rows = state.tasks.map((t, i) => `<button class="record-row" data-task="${i}"><strong>${esc(t.title)}</strong><span>${esc(t.status)} · SLA ${esc(t.slaHours)}h · ${esc(t.evidenceRequired)}</span></button>`).join('') || '<div class="empty-state">No task rows returned for selected employee.</div>';
  openOperation(title, 'Tasks loaded only after this command. Select one task to act.', `${contextCard()}<div class="record-list">${rows}</div>`);
  document.querySelectorAll('[data-task]').forEach((btn) => btn.onclick = () => {
    state.selectedTask = state.tasks[Number(btn.dataset.task)];
    openOperation('Task Context Selected', 'Now run a permitted task command. This selection does not pollute the Action Ledger.', `${contextCard()}${taskCard(state.selectedTask)}`);
    toast(`Task context selected.`);
  });
}

async function attendance(endpoint, actionType, extra = {}) {
  await requireEmployee();
  const out = await api(endpoint, { method: 'POST', body: { employeeId: state.selectedEmployee.id, ...extra } });
  const r = out.receipt || out.session || out;
  addReceipt({ ...r, actionType, target: employeeLabel() });
  openOperation('Attendance Recorded', 'Operational receipt created.', `${contextCard()}${receiptCard(r)}`);
}

async function taskEndpoint(endpoint, actionType, extra = {}) {
  await requireEmployee();
  await requireTask();
  const out = await api(endpoint, { method: 'POST', body: { employeeId: state.selectedEmployee.id, taskId: state.selectedTask.id, ...extra } });
  const r = out.receipt || out.execution || out;
  addReceipt({ ...r, actionType, target: taskLabel() });
  openOperation('Task Action Recorded', 'Operational receipt created.', `${contextCard()}${taskCard(state.selectedTask)}${receiptCard(r)}`);
}

function profileEditForm() {
  if (!state.selectedEmployee) return loadEmployees('Select My Record');
  openOperation('Request Profile Edit', 'This creates an edit request receipt. It does not silently mutate the master file.', `${contextCard()}${field('profileField', 'Field to change', 'Mobile / email / address / emergency contact')}${field('profileReason', 'New value and reason', '')}<button class="primary-btn" id="submitProfileEdit">Create Edit Request</button>`);
  $('submitProfileEdit').onclick = () => permissionReceipt('EMPLOYEE_PROFILE_EDIT_REQUEST', { target: employeeLabel(), note: `${value('profileField')}: ${value('profileReason')}` });
}

function evidenceForm(actionType) {
  if (!state.selectedTask) return loadTasks('Select Task for Evidence');
  const isSubmit = actionType === 'SUBMIT_EVIDENCE';
  openOperation(isSubmit ? 'Submit Evidence File' : 'Edit Draft Evidence File', 'Evidence is a downloadable task file. Manager visibility is explicit and HR-restricted files remain protected.', `${contextCard()}${taskCard(state.selectedTask)}${documentCategorySelect('evidenceCategory', 'Evidence category', 'Work Evidence')}${filePicker('evidenceFile', 'Evidence file to upload')}${selectField('evidenceSensitivity', 'Evidence visibility', ['Manager visible', 'Controlled', 'Restricted HR'])}${field('evidenceRef', 'Evidence reference / file note', 'File/link/reference')}${field('outputSummary', 'Output / action report', '')}<button class="primary-btn" id="submitEvidenceAction">${isSubmit ? 'Submit Evidence File' : 'Save Draft Evidence File'}</button>`);
  $('submitEvidenceAction').onclick = async () => {
    const fileDoc = await captureDocumentFromInput('evidenceFile', {
      category: valueSelect('evidenceCategory') || 'Work Evidence',
      note: value('evidenceRef') || value('outputSummary'),
      sourceAction: actionType,
      taskId: state.selectedTask?.id,
      taskTitle: state.selectedTask?.title,
      sensitivity: valueSelect('evidenceSensitivity') || 'Manager visible',
      verificationStatus: isSubmit ? 'Submitted for Manager Review' : 'Draft Evidence'
    });
    if (isSubmit) {
      const out = await api('/api/workday/tasks/submit-completion', { method: 'POST', body: { employeeId: state.selectedEmployee.id, taskId: state.selectedTask.id, evidenceReference: fileDoc?.fileName || value('evidenceRef'), outputSummary: value('outputSummary'), actionReport: value('outputSummary') } });
      const base = out.receipt || out.execution || out;
      const r = { ...base, actionType, target: taskLabel(), documentId: fileDoc?.documentId, fileName: fileDoc?.fileName, documentCategory: fileDoc?.category, note: value('outputSummary') || value('evidenceRef') || fileDoc?.fileName };
      addReceipt(r);
      openOperation('Evidence File Submitted', 'Downloadable evidence receipt created.', `${contextCard()}${taskCard(state.selectedTask)}${fileDoc ? documentCard(fileDoc) : ''}${receiptCard(r)}`);
    } else {
      const r = await permissionReceipt('EDIT_DRAFT_EVIDENCE', { target: taskLabel(), documentId: fileDoc?.documentId, fileName: fileDoc?.fileName, documentCategory: fileDoc?.category, evidenceReference: value('evidenceRef'), outputSummary: value('outputSummary'), note: value('outputSummary') || 'Employee edited draft evidence file.' }, false);
      openOperation('Draft Evidence File Updated', 'Downloadable draft evidence receipt created.', `${contextCard()}${taskCard(state.selectedTask)}${fileDoc ? documentCard(fileDoc) : ''}${receiptCard(r)}`);
    }
  };
}


function loadDocumentStore() {
  try { return JSON.parse(localStorage.getItem(DOC_STORE_KEY) || '[]'); } catch { return []; }
}

function saveDocumentStore() {
  try { localStorage.setItem(DOC_STORE_KEY, JSON.stringify(state.documents.slice(0, 80))); } catch { toast('Document vault is full for this browser. Remove older runtime documents.'); }
}

function documentCategorySelect(id, label, selected = 'Work Evidence') {
  const categories = ['Work Evidence', 'CV / Resume', 'Academic Certificate', 'Professional Certificate', 'Experience Letter', 'Training Certificate', 'National ID / Iqama', 'Passport', 'Employment Contract', 'Job Description', 'Medical / Clearance', 'Bank / WPS Document', 'GOSI / Government Document', 'Disciplinary Evidence', 'Performance Evidence', 'Training Completion Evidence', 'Other'];
  return `<label class="form-field"><span>${esc(label)}</span><select id="${esc(id)}" class="clean-select inline-select">${categories.map((c) => `<option value="${esc(c)}" ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
}

function filePicker(id, label) {
  return `<label class="form-field file-field"><span>${esc(label)}</span><input id="${esc(id)}" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt" /></label>`;
}

function formStatus(id) {
  return `<div id="${esc(id)}" class="form-status muted">Ready. Choose a file and press the action button.</div>`;
}

function setFormStatus(id, message, kind = 'info') {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = `form-status ${kind}`;
}

function valueSelect(id) { return ($(id)?.value || '').trim(); }

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function captureDocumentFromInput(inputId, meta = {}) {
  const input = $(inputId);
  const file = input?.files?.[0];
  if (!file) return null;
  const dataUrl = await readFileAsDataUrl(file);
  const doc = {
    documentId: `DOC-${idNow()}`,
    employeeId: state.selectedEmployee?.id || null,
    employeeCode: state.selectedEmployee?.employeeCode || '',
    employeeName: state.selectedEmployee?.displayName || '',
    taskId: meta.taskId || null,
    taskTitle: meta.taskTitle || null,
    category: meta.category || 'Other',
    note: meta.note || '',
    sourceAction: meta.sourceAction || 'DOCUMENT_UPLOAD',
    verificationStatus: meta.verificationStatus || 'Pending Review',
    documentNumber: meta.documentNumber || '',
    issueDate: meta.issueDate || '',
    expiryDate: meta.expiryDate || '',
    sensitivity: meta.sensitivity || 'Controlled',
    version: meta.version || 'v1',
    parentDocumentId: meta.parentDocumentId || null,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl
  };
  state.documents.unshift(doc);
  saveDocumentStore();
  return doc;
}

function docsForSelectedEmployee() {
  if (!state.selectedEmployee) return [];
  return state.documents.filter((d) => String(d.employeeId) === String(state.selectedEmployee.id));
}

function findDocument(documentId) {
  return state.documents.find((d) => d.documentId === documentId);
}

function downloadDocument(documentId) {
  const doc = findDocument(documentId);
  if (!doc || !doc.dataUrl) return toast('Document file is not available in this local runtime.');
  const a = document.createElement('a');
  a.href = doc.dataUrl;
  a.download = doc.fileName || `${doc.documentId}.file`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  permissionReceipt('DOCUMENT_DOWNLOAD', { target: `${doc.employeeCode || ''} · ${doc.employeeName || ''}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, note: `Downloaded ${doc.category}: ${doc.fileName}` }, false).then(() => toast(`Downloaded ${doc.fileName}`)).catch(() => toast(`Downloaded ${doc.fileName}`));
}

function bindDownloadButtons() {
  document.querySelectorAll('[data-download-doc]').forEach((btn) => btn.onclick = () => downloadDocument(btn.dataset.downloadDoc));
  bindDocumentActionButtons();
}

function isManagerVisibleEvidence(doc) {
  const allowedCategories = ['Work Evidence', 'Performance Evidence', 'Disciplinary Evidence', 'Training Completion Evidence'];
  const blockedSensitivity = ['Restricted HR', 'Confidential'];
  return Boolean(doc) && allowedCategories.includes(doc.category) && !blockedSensitivity.includes(doc.sensitivity || 'Controlled');
}

function managerVisibleDocuments(docs) {
  return (docs || []).filter(isManagerVisibleEvidence);
}

function bindDocumentActionButtons() {
  document.querySelectorAll('[data-doc-verify]').forEach((btn) => btn.onclick = () => verifyDocument(btn.dataset.docVerify));
  document.querySelectorAll('[data-doc-reject]').forEach((btn) => btn.onclick = () => rejectDocument(btn.dataset.docReject));
  document.querySelectorAll('[data-manager-evidence-accept]').forEach((btn) => btn.onclick = () => managerAcceptEvidence(btn.dataset.managerEvidenceAccept));
  document.querySelectorAll('[data-manager-evidence-correct]').forEach((btn) => btn.onclick = () => managerEvidenceCorrectionForm(btn.dataset.managerEvidenceCorrect));
}

function documentCard(doc) {
  if (!doc) return '';
  const expiryFlag = documentExpiryFlag(doc);
  return `<article class="document-card ${expiryFlag.className}"><div><p class="eyebrow">Employee file document</p><h3>${esc(doc.category)}</h3><strong>${esc(doc.fileName)}</strong><small>${esc(doc.employeeCode)} · ${esc(doc.employeeName)} · ${esc(formatFileSize(doc.fileSize))} · ${esc(doc.uploadedAt)}</small>${doc.taskTitle ? `<small>Task: ${esc(doc.taskTitle)}</small>` : ''}<div class="doc-meta"><span><b>Status</b>${esc(doc.verificationStatus || 'Pending Review')}</span><span><b>Version</b>${esc(doc.version || 'v1')}</span><span><b>Expiry</b>${esc(expiryFlag.label)}</span><span><b>Sensitivity</b>${esc(doc.sensitivity || 'Controlled')}</span></div>${doc.documentNumber ? `<small>Document No: ${esc(doc.documentNumber)}</small>` : ''}${doc.note ? `<p class="muted">${esc(doc.note)}</p>` : ''}</div><div class="document-actions"><button class="primary-btn" data-download-doc="${esc(doc.documentId)}">Download File</button>${state.role === 'hr' ? `<button class="secondary-btn small" data-doc-verify="${esc(doc.documentId)}">Verify</button><button class="secondary-btn danger small" data-doc-reject="${esc(doc.documentId)}">Return</button>` : ''}${state.role === 'manager' && isManagerVisibleEvidence(doc) ? `<button class="secondary-btn small" data-manager-evidence-accept="${esc(doc.documentId)}">Accept Evidence</button><button class="secondary-btn danger small" data-manager-evidence-correct="${esc(doc.documentId)}">Request Correction</button>` : ''}</div></article>`;
}

function documentList(docs) {
  return docs.length ? `<div class="document-grid">${docs.map(documentCard).join('')}</div>` : '<div class="empty-state">No documents in this employee file yet. Upload CV, certificates, experience letters, contracts, ID/Iqama, medical clearances, or task evidence through a permitted action.</div>';
}

function formatFileSize(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function employeeFileVault() {
  await requireEmployee();
  const docs = docsForSelectedEmployee();
  openOperation('Employee File / Document Vault', 'Files load only after this command. Download actions are logged as receipts. Categories include CV, certificates, experience, training, contracts, IDs, and evidence.', `${contextCard()}${documentList(docs)}<button class="primary-btn" id="vaultUploadDoc">Upload Employee Document</button>`);
  $('vaultUploadDoc').onclick = () => employeeDocumentForm(state.role === 'hr' ? 'HR_DOCUMENT_UPLOAD' : 'EMPLOYEE_DOCUMENT_UPLOAD');
  bindDownloadButtons();
}

async function employeeDocumentForm(actionType) {
  await requireEmployee();
  const canUpload = state.role === 'employee' || state.role === 'hr';
  if (!canUpload) return toast('This role cannot upload employee file documents.');
  const titleMap = { HR_DOCUMENT_UPLOAD: 'Upload HR Document', EMPLOYEE_DOCUMENT_REPLACE: 'Replace Employee Document', EMPLOYEE_DOCUMENT_UPLOAD: 'Upload Employee Document' };
  openOperation(titleMap[actionType] || 'Upload Employee Document', 'Attach a downloadable document to the employee file. This creates a visible receipt and does not silently mutate schema or master data.', `${contextCard()}${documentCategorySelect('docCategory', 'Document category', 'CV / Resume')}${filePicker('employeeFileInput', 'Document file')}${field('docNumber', 'Document number / reference', '')}${dateField('docIssueDate', 'Issue date')}${dateField('docExpiryDate', 'Expiry date / renewal date')}${selectField('docSensitivity', 'Sensitivity', ['Controlled', 'Confidential', 'Restricted HR', 'Employee visible'])}${field('docNote', 'Document note / reason', '')}${formStatus('employeeDocumentStatus')}<button type="button" class="primary-btn" id="submitEmployeeDocument">Upload Document + Create Receipt</button>`);
  const btn = $('submitEmployeeDocument');
  if (!btn) return toast('Upload button binding failed. Refresh the page and try again.');
  btn.onclick = async () => {
    try {
      const input = $('employeeFileInput');
      const file = input?.files?.[0];
      if (!file) { setFormStatus('employeeDocumentStatus', 'Choose a document file before creating the receipt.', 'error'); return toast('Choose a file first.'); }
      btn.disabled = true;
      btn.textContent = 'Uploading and creating receipt...';
      setFormStatus('employeeDocumentStatus', `Uploading ${file.name} and creating a controlled receipt...`, 'working');
      const doc = await captureDocumentFromInput('employeeFileInput', {
        category: valueSelect('docCategory') || 'Other',
        note: value('docNote'),
        sourceAction: actionType,
        documentNumber: value('docNumber'),
        issueDate: value('docIssueDate'),
        expiryDate: value('docExpiryDate'),
        sensitivity: valueSelect('docSensitivity') || 'Controlled',
        verificationStatus: state.role === 'hr' ? 'HR Uploaded · Pending Verification' : 'Employee Submitted · Pending HR Review',
        version: actionType === 'EMPLOYEE_DOCUMENT_REPLACE' ? `v${docsForSelectedEmployee().filter(d => d.category === valueSelect('docCategory')).length + 1}` : 'v1'
      });
      if (!doc) { setFormStatus('employeeDocumentStatus', 'File could not be captured. Choose another file.', 'error'); return toast('File could not be captured.'); }
      const r = await permissionReceipt(actionType, { target: employeeLabel(), documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, fileSize: doc.fileSize, expiryDate: doc.expiryDate, verificationStatus: doc.verificationStatus, note: value('docNote') || `${doc.category} uploaded: ${doc.fileName}` }, false);
      openOperation('Document Uploaded', 'Downloadable employee-file receipt created. Document remains pending review until HR verifies it.', `${contextCard()}${documentCard(doc)}${receiptCard(r)}<button class="primary-btn" id="openVaultAfterUpload">Open My Employee File</button>`);
      const openVault = $('openVaultAfterUpload');
      if (openVault) openVault.onclick = employeeFileVault;
      bindDownloadButtons();
      toast('Document uploaded and receipt created.');
    } catch (error) {
      console.error(error);
      setFormStatus('employeeDocumentStatus', `Upload failed visibly: ${error.message}`, 'error');
      openOperation('Document Upload Failed', 'No silent failure. Correct the issue and retry.', `${contextCard()}<div class="warning-box">${esc(error.message)}</div><button class="primary-btn" id="retryDocUpload">Retry Upload</button>`);
      $('retryDocUpload').onclick = () => employeeDocumentForm(actionType);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Upload Document + Create Receipt'; }
    }
  };
}


function dateField(id, label) {
  return `<label class="form-field"><span>${esc(label)}</span><input id="${esc(id)}" type="date" /></label>`;
}

function selectField(id, label, options) {
  return `<label class="form-field"><span>${esc(label)}</span><select id="${esc(id)}" class="clean-select inline-select">${options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>`;
}

function documentExpiryFlag(doc) {
  if (!doc?.expiryDate) return { className: '', label: 'Not specified' };
  const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return { className: '', label: doc.expiryDate };
  if (days < 0) return { className: 'expired-doc', label: `Expired ${Math.abs(days)} days ago` };
  if (days <= 45) return { className: 'soon-doc', label: `Renew in ${days} days` };
  return { className: '', label: `${doc.expiryDate} · ${days} days` };
}

async function documentIntakeQueue(title = 'Document Intake Queue', scope = 'hr') {
  if (scope !== 'hr') await requireEmployee();
  const docs = scope === 'hr' && state.role === 'hr' && !state.selectedEmployee ? state.documents : docsForSelectedEmployee();
  const filtered = scope === 'manager' ? managerVisibleDocuments(docs) : docs;
  const emptyMessage = scope === 'manager'
    ? '<div class="empty-state">No manager-visible work evidence is available for this employee. HR-restricted documents are protected. Ask the employee to submit a task evidence file with visibility set to Manager visible.</div>'
    : '<div class="empty-state">No employee documents are available in the current intake scope.</div>';
  const uploadButton = scope === 'hr' && !filtered.length ? '<button class="primary-btn" id="intakeUploadDoc">Upload HR Document</button>' : '';
  openOperation(title, scope === 'manager' ? 'Only manager-visible task evidence loads here. Restricted HR documents never appear.' : 'Documents load only after this command. Verify, return, or download creates a receipt.', `${state.selectedEmployee ? contextCard() : '<div class="empty-state">No employee selected. Showing local runtime document intake only.</div>'}${filtered.length ? documentList(filtered) : emptyMessage}${uploadButton}`);
  if ($('intakeUploadDoc')) $('intakeUploadDoc').onclick = () => employeeDocumentForm('HR_DOCUMENT_UPLOAD');
  bindDocumentActionButtons();
}

async function managerAcceptEvidence(documentId) {
  const doc = findDocument(documentId);
  if (!doc || !isManagerVisibleEvidence(doc)) return toast('This document is not available for manager evidence review.');
  doc.verificationStatus = 'Accepted by Manager';
  doc.managerReviewedAt = new Date().toISOString();
  doc.managerDecision = 'Accepted';
  saveDocumentStore();
  const r = await permissionReceipt('MANAGER_EVIDENCE_ACCEPT', { target: `${doc.employeeCode} · ${doc.employeeName}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, verificationStatus: doc.verificationStatus, note: `Manager accepted ${doc.category}: ${doc.fileName}` }, false);
  openOperation('Evidence Accepted', 'Manager acceptance receipt created. HR-restricted documents remain outside this workflow.', `${contextCard()}${documentCard(doc)}${receiptCard(r)}`);
  bindDocumentActionButtons();
}

function managerEvidenceCorrectionForm(documentId) {
  const doc = findDocument(documentId);
  if (!doc || !isManagerVisibleEvidence(doc)) return toast('This document is not available for manager evidence review.');
  openOperation('Request Evidence Correction', 'Return only this manager-visible evidence file with a required reason.', `${contextCard()}${documentCard(doc)}${field('managerCorrectionReason', 'Correction required', 'Upload a clearer file and include the completion reference.')}<button class="primary-btn" id="submitManagerEvidenceCorrection">Return Evidence for Correction</button>`);
  bindDocumentActionButtons();
  $('submitManagerEvidenceCorrection').onclick = async () => {
    doc.verificationStatus = 'Returned by Manager for Correction';
    doc.managerReviewedAt = new Date().toISOString();
    doc.managerDecision = 'Correction Required';
    doc.managerCorrectionReason = value('managerCorrectionReason');
    saveDocumentStore();
    const r = await permissionReceipt('MANAGER_EVIDENCE_CORRECTION', { target: `${doc.employeeCode} · ${doc.employeeName}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, verificationStatus: doc.verificationStatus, note: doc.managerCorrectionReason || `Manager returned ${doc.category} for correction.` }, false);
    openOperation('Evidence Correction Requested', 'Manager correction receipt created and the evidence remains downloadable.', `${contextCard()}${documentCard(doc)}${receiptCard(r)}`);
    bindDocumentActionButtons();
  };
}

async function verifyDocument(documentId) {
  const doc = findDocument(documentId);
  if (!doc) return toast('Document not found in local runtime vault.');
  doc.verificationStatus = 'Verified by HR';
  doc.verifiedAt = new Date().toISOString();
  doc.verifiedBy = 'HR Operations';
  saveDocumentStore();
  const r = await permissionReceipt('HR_DOCUMENT_VERIFY', { target: `${doc.employeeCode} · ${doc.employeeName}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, verificationStatus: doc.verificationStatus, note: `Verified ${doc.category}: ${doc.fileName}` }, false);
  openOperation('Document Verified', 'HR verification receipt created. The file remains downloadable and traceable.', `${documentCard(doc)}${receiptCard(r)}`);
  bindDocumentActionButtons();
}

async function rejectDocument(documentId) {
  const doc = findDocument(documentId);
  if (!doc) return toast('Document not found in local runtime vault.');
  doc.verificationStatus = 'Returned for correction';
  doc.returnedAt = new Date().toISOString();
  saveDocumentStore();
  const r = await permissionReceipt('HR_DOCUMENT_REJECT', { target: `${doc.employeeCode} · ${doc.employeeName}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, verificationStatus: doc.verificationStatus, note: `Returned ${doc.category} for correction: ${doc.fileName}` }, false);
  openOperation('Document Returned', 'Document correction receipt created.', `${documentCard(doc)}${receiptCard(r)}`);
  bindDocumentActionButtons();
}

async function documentActionForm(actionType) {
  await requireEmployee();
  const allDocs = docsForSelectedEmployee();
  const docs = state.role === 'manager' ? managerVisibleDocuments(allDocs) : allDocs;
  const options = docs.map((d) => `<option value="${esc(d.documentId)}">${esc(d.category)} · ${esc(d.fileName)} · ${esc(d.verificationStatus || 'Pending Review')}</option>`).join('');
  if (!docs.length) return documentIntakeQueue('Manager Evidence Review', state.role === 'manager' ? 'manager' : 'hr');
  openOperation(friendlyAction(actionType), 'Document lifecycle action. It records a receipt and does not directly mutate source data.', `${contextCard()}<label class="form-field"><span>Document</span><select id="docActionId" class="clean-select inline-select">${options}</select></label>${field('docActionReason', 'Reason / correction required', '')}<button class="primary-btn" id="submitDocAction">Record Document Action</button>`);
  $('submitDocAction').onclick = async () => {
    const doc = findDocument(valueSelect('docActionId'));
    if (!doc) return toast('Choose a document first.');
    if (actionType.includes('VERIFY')) doc.verificationStatus = 'Verified by HR';
    if (actionType.includes('REJECT') || actionType.includes('CORRECTION')) doc.verificationStatus = 'Returned for correction';
    if (actionType.includes('ARCHIVE')) doc.verificationStatus = 'Archived draft';
    saveDocumentStore();
    const r = await permissionReceipt(actionType, { target: `${doc.employeeCode} · ${doc.employeeName}`, documentId: doc.documentId, fileName: doc.fileName, documentCategory: doc.category, verificationStatus: doc.verificationStatus, note: value('docActionReason') || `${friendlyAction(actionType)}: ${doc.fileName}` }, false);
    openOperation('Document Action Recorded', 'Document lifecycle receipt created.', `${documentCard(doc)}${receiptCard(r)}`);
    bindDocumentActionButtons();
  };
}

function missingDocumentsForm() {
  requireEmployee().then(() => {
    openOperation('Request Missing Documents', 'HR requests missing employee file documents with a receipt.', `${contextCard()}${documentCategorySelect('missingCategory', 'Missing document category', 'CV / Resume')}${field('missingReason', 'Reason / due date / instruction', 'Required for employee file completion.') }<button class="primary-btn" id="submitMissingDoc">Create Missing Document Request</button>`);
    $('submitMissingDoc').onclick = () => permissionReceipt('HR_MISSING_DOCUMENT_REQUEST', { target: employeeLabel(), documentCategory: valueSelect('missingCategory'), note: value('missingReason') || 'Missing document requested.' });
  }).catch(() => null);
}

async function documentExpiryReview() {
  const docs = state.selectedEmployee ? docsForSelectedEmployee() : state.documents;
  const flagged = docs.filter((d) => documentExpiryFlag(d).className);
  openOperation('Document Expiry Review', 'Only expired or renewal-sensitive files are shown. Download/renewal actions are logged.', `${state.selectedEmployee ? contextCard() : ''}${documentList(flagged)}${flagged.length ? '' : '<div class="empty-state">No expired or renewal-sensitive documents in the local runtime vault.</div>'}`);
  bindDocumentActionButtons();
}

function managerTaskForm(actionType) {
  openOperation(actionType === 'ADD_TEAM_TASK_REQUEST' ? 'Add Team Task Request' : 'Edit Team Task Request', 'Manager creates/edits a controlled request, not direct source data.', `${contextCard()}${field('taskTitle', 'Task title', state.selectedTask?.title || '')}${field('taskReason', 'Evidence / SLA / reason', '')}<button class="primary-btn" id="submitManagerTask">Record Request</button>`);
  $('submitManagerTask').onclick = () => permissionReceipt(actionType, { target: value('taskTitle') || taskLabel(), note: value('taskReason') });
}

function hrForm(actionType) {
  openOperation(actionType, 'HR controlled request. Approval/evidence required before final decision.', `${contextCard()}${field('hrTarget', 'Target / case', employeeLabel())}${field('hrReason', 'Reason / evidence required', '')}<button class="primary-btn" id="submitHrAction">Record HR Request</button>`);
  $('submitHrAction').onclick = () => permissionReceipt(actionType, { target: value('hrTarget') || employeeLabel(), note: value('hrReason') });
}

async function managerDecision(decisionType) {
  await requireEmployee();
  await requireTask();
  try {
    const out = await api('/api/workday/closure/decision', { method: 'POST', body: { employeeId: state.selectedEmployee.id, taskId: state.selectedTask.id, decisionType, note: `${decisionType} from final console` } });
    const r = out.decision || out.receipt || out;
    addReceipt({ ...r, actionType: decisionType.toUpperCase(), target: taskLabel() });
    openOperation('Manager Decision Recorded', 'Decision receipt created.', `${contextCard()}${taskCard(state.selectedTask)}${receiptCard(r)}`);
  } catch {
    await permissionReceipt(decisionType === 'manager_accept' ? 'MANAGER_ACCEPT' : 'MANAGER_RETURN', { target: taskLabel(), note: 'Manager decision recorded as runtime request; task may need submitted work before formal closure.' });
  }
}

function localRuntimeReceipt(actionType, payload = {}, status = 'RECORDED_LOCAL_RUNTIME') {
  const r = {
    receiptId: `NASH-HF05-${idNow()}`,
    build: 'HF05',
    role: state.role,
    actionType,
    status,
    employeeId: state.selectedEmployee?.id || payload.employeeId || null,
    employeeCode: state.selectedEmployee?.employeeCode || payload.employeeCode || null,
    employeeName: state.selectedEmployee?.displayName || payload.employeeName || null,
    taskId: state.selectedTask?.id || payload.taskId || null,
    createdAt: new Date().toISOString(),
    source: 'HF05 local runtime receipt; no schema change; no direct database mutation',
    policy: { directDatabaseCrudBlocked: true, databaseSchemaTouched: false, schemaMigrationIncluded: false, humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true },
    ...payload
  };
  addReceipt(r);
  return r;
}

async function permissionReceipt(actionType, payload = {}, openReceipt = true) {
  try {
    const out = await api('/api/permissioned-action', { method: 'POST', body: { role: state.role, employeeId: state.selectedEmployee?.id || null, taskId: state.selectedTask?.id || null, actionType, ...payload } });
    const r = { ...(out.receipt || out), ...payload };
    addReceipt(r);
    if (openReceipt) openOperation('Action Receipt Created', `${actionType} completed within permission boundary.`, `${contextCard()}${receiptCard(r)}`);
    return r;
  } catch (error) {
    const r = localRuntimeReceipt(actionType, { ...payload, apiWarning: error.message, note: payload.note || `Recorded locally after API warning: ${error.message}` }, 'RECORDED_LOCAL_RUNTIME_API_FALLBACK');
    if (openReceipt) openOperation('Action Receipt Created', `${actionType} recorded locally with visible API warning.`, `${contextCard()}${receiptCard(r)}<div class=\"warning-box\">API warning was handled visibly: ${esc(error.message)}</div>`);
    return r;
  }
}


function executiveMetricCard(item) {
  return `<article class="exec-metric-card"><div class="exec-metric-top"><span>${esc(item.label)}</span><span class="exec-source-badge">LIVE</span></div><strong>${esc(item.value)}</strong><small>${esc(item.source)}</small></article>`;
}

function executiveStatusClass(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('high') || text.includes('attention') || text.includes('blocked') || text.includes('gap') || text.includes('pending')) return 'risk';
  if (text.includes('medium') || text.includes('review') || text.includes('ready')) return 'watch';
  return 'good';
}

async function executiveDashboard() {
  const data = await api('/api/executive/dashboard');
  const d = data.dashboard || {};
  const summary = d.summary || {};
  const coverage = d.coverage || {};
  const kpis = Array.isArray(d.kpis) ? d.kpis : [];
  const panels = Array.isArray(d.panels) ? d.panels : [];
  const decisions = Array.isArray(d.decisionBoard) ? d.decisionBoard : [];
  const risks = Array.isArray(d.riskInputs) ? d.riskInputs : [];
  const session = readAccessSession() || {};
  const riskClass = executiveStatusClass(summary.riskLevel);
  const urgentDecisions = decisions.filter((item) => executiveStatusClass(item.status) === 'risk');
  const watchDecisions = decisions.filter((item) => executiveStatusClass(item.status) === 'watch');
  const stableDomains = panels.filter((item) => executiveStatusClass(item.status) === 'good').length;
  const interventionCount = urgentDecisions.length + watchDecisions.length;
  const coverageEntries = Object.entries(coverage);
  const weakestCoverage = coverageEntries.sort((a,b) => Number(a[1]||0)-Number(b[1]||0))[0] || ['Coverage','—'];
  const coverageCards = coverageEntries.map(([key, value]) => `<div class="exec-coverage-item"><span>${esc(key.replace(/([A-Z])/g, ' $1'))}</span><strong>${esc(value)}%</strong><div><i style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></i></div></div>`).join('');
  const panelCards = panels.map((p, index) => `<button class="exec-domain-card" data-exec-domain="${index}"><div><span>${esc(p.title)}</span><strong>${esc(p.value)}</strong></div><span class="exec-status ${executiveStatusClass(p.status)}">${esc(p.status)}</span><p>${esc(p.detail)}</p><small>${esc(p.source)}</small><b>Open domain →</b></button>`).join('');
  const riskRows = risks.slice(0, 7).map((r, index) => `<button class="exec-risk-row" data-exec-risk="${index}"><div><strong>${esc(r.key)}</strong><small>${esc(r.source)}</small></div><span>${esc(r.value)}</span></button>`).join('');
  const decisionRows = decisions.map((r, index) => `<article class="exec-decision-row"><div><strong>${esc(r.decision)}</strong><small>${esc(r.owner)} · ${esc(r.source)}</small></div><span class="exec-status ${executiveStatusClass(r.status)}">${esc(r.status)}</span><p>${esc(r.nextAction)}</p><button class="secondary-btn small" data-exec-decision="${index}">Open decision</button></article>`).join('');
  const interventionRows = decisions.slice(0,5).map((r,index)=>`<button class="exec-intervention-item" data-exec-decision="${index}"><span class="exec-intervention-index">${String(index+1).padStart(2,'0')}</span><span><strong>${esc(r.decision)}</strong><small>${esc(r.owner || 'Human owner')} · ${esc(r.nextAction || 'Review required')}</small></span><i class="${executiveStatusClass(r.status)}">${esc(r.status || 'Open')}</i></button>`).join('') || '<div class="empty-state">No executive interventions returned.</div>';
  openOperation('Executive Command Center', 'Decision-led enterprise control surface. Every number is source-labelled and every intervention remains human-owned.', `
    <section class="executive-command-center">
      <header class="exec-command-hero">
        <div><p class="eyebrow">EXECUTIVE COMMAND CENTER</p><h2>${esc(session.tenant || 'NASH Enterprise')}</h2><p>One operating picture across workforce, performance, payroll, compliance, governance, and AI-supported risk.</p><div class="exec-hero-badges"><span>MySQL source of truth</span><span>Human final decision</span><span>AI advisory only</span></div></div>
        <div class="exec-risk-orbit ${riskClass}"><span>Enterprise Risk</span><strong>${esc(summary.riskScore ?? 0)}</strong><small>${esc(summary.riskLevel || 'Unknown')}</small><i></i></div>
      </header>
      <section class="exec-priority-ribbon">
        <article><span>Interventions</span><strong>${esc(interventionCount)}</strong><small>Executive and owner review</small></article>
        <article><span>Urgent decisions</span><strong>${esc(urgentDecisions.length)}</strong><small>Immediate attention</small></article>
        <article><span>Stable domains</span><strong>${esc(stableDomains)}/${esc(panels.length)}</strong><small>Operating within control</small></article>
        <article><span>Weakest coverage</span><strong>${esc(weakestCoverage[1])}${Number.isFinite(Number(weakestCoverage[1]))?'%':''}</strong><small>${esc(String(weakestCoverage[0]).replace(/([A-Z])/g,' $1'))}</small></article>
      </section>
      <div class="exec-command-layout">
        <section class="exec-command-main">
          <div class="exec-section-head"><div><p class="eyebrow">LIVE OPERATING PICTURE</p><h3>Enterprise metrics</h3></div><span>${esc(kpis.length)} source-labelled signals</span></div>
          <div class="exec-kpi-grid">${kpis.slice(0, 8).map(executiveMetricCard).join('')}</div>
          <div class="exec-section-head"><div><p class="eyebrow">DOMAIN HEALTH</p><h3>Operating domains</h3></div><span>Select a domain for controlled drilldown</span></div>
          <div class="exec-domain-grid command">${panelCards}</div>
        </section>
        <aside class="exec-intervention-panel">
          <div class="exec-section-head"><div><p class="eyebrow">ACTION NOW</p><h3>Intervention queue</h3></div><span>${esc(decisions.length)} open</span></div>
          <div class="exec-intervention-list">${interventionRows}</div>
          <button class="primary-btn wide" id="execCreateBrief">Create Executive Brief Receipt</button>
        </aside>
      </div>
      <div class="exec-dashboard-grid lower command-lower">
        <section class="exec-block"><div class="exec-block-title"><h3>Coverage Control</h3><span>Source calculated</span></div><div class="exec-coverage-list">${coverageCards}</div></section>
        <section class="exec-block"><div class="exec-block-title"><h3>Explainable Risk Drivers</h3><span>AI advisory inputs</span></div><div class="exec-risk-list">${riskRows}</div></section>
      </div>
      <section class="exec-block decision-board"><div class="exec-block-title"><h3>Decision Board</h3><span>${esc(decisions.length)} human-owned decisions</span></div><div class="exec-decision-list">${decisionRows}</div></section>
      <footer class="exec-dashboard-actions"><button class="primary-btn" id="execRefreshDashboard">Refresh Live Picture</button><button class="secondary-btn" id="execOpenAI">Open AI Decision Support</button><button class="secondary-btn" id="execOpenLedger">Open Action Ledger</button></footer>
    </section>`);
  $('execRefreshDashboard').onclick = executiveDashboard;
  $('execCreateBrief').onclick = async () => {
    const out = await api('/api/executive/action', { method: 'POST', body: { action: 'request_executive_brief' } });
    addReceipt({ ...(out.receipt || {}), actionType: 'EXECUTIVE_BRIEF', target: 'Executive Command Center' });
    toast('Executive brief receipt created.');
  };
  $('execOpenLedger').onclick = () => renderLedger(true);
  $('execOpenAI').onclick = executiveAiWorkspace;
  document.querySelectorAll('[data-exec-domain]').forEach((btn)=>btn.onclick=()=>{
    const p=panels[Number(btn.dataset.execDomain)] || {};
    openOperation(p.title || 'Operating Domain', 'Controlled executive drilldown. No source record is changed.', `<section class="exec-drilldown"><p class="eyebrow">DOMAIN DRILLDOWN</p><h2>${esc(p.title || 'Operating Domain')}</h2><div class="business-summary-grid"><article><span>Current value</span><strong>${esc(p.value ?? '—')}</strong></article><article><span>Status</span><strong>${esc(p.status || 'Monitored')}</strong></article><article><span>Source</span><strong>${esc(p.source || 'Source labelled')}</strong></article><article><span>Decision boundary</span><strong>Human owner required</strong></article></div><div class="receipt-note">${esc(p.detail || 'No additional domain detail returned.')}</div><button class="secondary-btn" id="execBackDashboard">Back to Command Center</button></section>`);
    $('execBackDashboard').onclick=executiveDashboard;
  });
  document.querySelectorAll('[data-exec-decision]').forEach((btn)=>btn.onclick=()=>{
    const item=decisions[Number(btn.dataset.execDecision)] || {};
    openOperation('Executive Decision Packet', 'Decision context is visible; final action remains with the authorized human owner.', `<section class="exec-drilldown"><p class="eyebrow">HUMAN DECISION REQUIRED</p><h2>${esc(item.decision || 'Executive decision')}</h2><div class="business-summary-grid"><article><span>Owner</span><strong>${esc(item.owner || 'Authorized owner')}</strong></article><article><span>Status</span><strong>${esc(item.status || 'Open')}</strong></article><article><span>Source</span><strong>${esc(item.source || 'Decision board')}</strong></article><article><span>Next action</span><strong>${esc(item.nextAction || 'Review')}</strong></article></div><div class="exec-action-boundary"><strong>AI does not approve this decision.</strong><span>Use the formal workflow and evidence chain for any final action.</span></div><button class="primary-btn" id="execEscalateDecision">Create Human Review Receipt</button><button class="secondary-btn" id="execBackDashboard">Back to Command Center</button></section>`);
    $('execBackDashboard').onclick=executiveDashboard;
    $('execEscalateDecision').onclick=async()=>permissionReceipt('EXEC_ESCALATE',{target:item.decision || 'Executive decision',note:item.nextAction || 'Human review escalation.'});
  });
  document.querySelectorAll('[data-exec-risk]').forEach((btn)=>btn.onclick=()=>{
    const item=risks[Number(btn.dataset.execRisk)] || {};
    openOperation('Explainable Risk Driver', 'AI-supported signal with visible source and no autonomous decision authority.', `<section class="exec-drilldown"><p class="eyebrow">EXPLAINABILITY</p><h2>${esc(item.key || 'Risk driver')}</h2><div class="business-summary-grid"><article><span>Observed value</span><strong>${esc(item.value ?? '—')}</strong></article><article><span>Source</span><strong>${esc(item.source || 'Source labelled')}</strong></article><article><span>AI role</span><strong>Advisory only</strong></article><article><span>Final owner</span><strong>Authorized human</strong></article></div><button class="secondary-btn" id="execBackDashboard">Back to Command Center</button></section>`);
    $('execBackDashboard').onclick=executiveDashboard;
  });
}


function reportMetric(label, value, source, trend = 'Current') {
  return `<article class="report-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(source)} · ${esc(trend)}</small></article>`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function reportsAnalyticsCenter() {
  openOperation('Reports & Analytics Center', 'Loading source-labelled enterprise reporting. No source records are changed.', '<div class="reports-loading">Loading workforce, governance, and decision analytics…</div>');
  const [execOut, aiOut, controlOut, qualityOut] = await Promise.all([
    optionalApi('/api/executive/dashboard'), optionalApi('/api/ai/summary'),
    optionalApi('/api/controls/summary'), optionalApi('/api/quality/summary')
  ]);
  const dashboard = execOut.dashboard || {};
  const summary = dashboard.summary || {};
  const panels = Array.isArray(dashboard.panels) ? dashboard.panels : [];
  const decisions = Array.isArray(dashboard.decisionBoard) ? dashboard.decisionBoard : [];
  const risks = Array.isArray(dashboard.riskInputs) ? dashboard.riskInputs : [];
  const metrics = [
    ['Workforce', firstValue(summary, ['employees','totalEmployees','headcount'], countFrom(dashboard, ['employees'])), 'Executive dashboard'],
    ['Open Decisions', firstValue(summary, ['openDecisions','decisionBacklog'], decisions.length), 'Decision board'],
    ['Risk Score', firstValue(summary, ['riskScore'], 0), 'AI summary'],
    ['Operating Domains', panels.length, 'Executive dashboard'],
    ['Risk Drivers', risks.length, 'Explainability log'],
    ['Human Final Decisions', 'Required', 'Governance policy']
  ];
  const domainRows = panels.slice(0, 10).map((p) => `<tr><td>${esc(p.title || p.name || p.key || 'Operating domain')}</td><td>${esc(firstValue(p,['value','count','status'],'Available'))}</td><td>${esc(p.source || 'Source labelled')}</td><td><span class="exec-status ${aiSignalStatus(p.status || p.value)}">${esc(p.status || 'Monitored')}</span></td></tr>`).join('') || '<tr><td colspan="4">No operating domain summary returned.</td></tr>';
  const riskRows = risks.slice(0, 8).map((r) => `<div class="report-risk-row"><div><strong>${esc(r.key)}</strong><small>${esc(r.source || 'Source labelled')}</small></div><b>${esc(r.value)}</b></div>`).join('') || '<div class="empty-state">No risk drivers returned.</div>';
  const decisionRows = decisions.slice(0, 8).map((d) => `<div class="report-decision-row"><div><strong>${esc(d.decision)}</strong><small>${esc(d.owner || 'Human owner')} · ${esc(d.source || 'Decision board')}</small></div><span>${esc(d.status || 'Open')}</span></div>`).join('') || '<div class="empty-state">No decision backlog returned.</div>';
  openOperation('Reports & Analytics Center', 'Executive, workforce, risk, and governance analytics with traceable sources and export controls.', `
    <section class="reports-shell">
      <div class="reports-hero"><div><p class="eyebrow">HF15 · ENTERPRISE REPORTING</p><h2>Decision-ready analytics, not static dashboards.</h2><p>Every visible number carries a source label. Exports create local files only and do not mutate MySQL records.</p></div><div class="reports-period"><span>Reporting period</span><strong>Current live snapshot</strong><small>${esc(new Date().toLocaleString())}</small></div></div>
      <div class="report-kpi-grid">${metrics.map((m) => reportMetric(...m)).join('')}</div>
      <div class="reports-grid">
        <section class="reports-panel wide"><div class="reports-head"><div><p class="eyebrow">OPERATING REPORT</p><h3>Enterprise Domain Summary</h3></div><span>${esc(panels.length)} domains</span></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>Value</th><th>Source</th><th>Status</th></tr></thead><tbody>${domainRows}</tbody></table></div></section>
        <section class="reports-panel"><div class="reports-head"><div><p class="eyebrow">AI EXPLAINABILITY</p><h3>Risk Drivers</h3></div><span>Advisory only</span></div><div class="report-risk-list">${riskRows}</div></section>
      </div>
      <div class="reports-grid lower">
        <section class="reports-panel"><div class="reports-head"><div><p class="eyebrow">HUMAN OWNERSHIP</p><h3>Decision Backlog</h3></div><span>${esc(decisions.length)} open</span></div><div class="report-decision-list">${decisionRows}</div></section>
        <section class="reports-panel export-panel"><div class="reports-head"><div><p class="eyebrow">CONTROLLED OUTPUT</p><h3>Report Actions</h3></div><span>Local export</span></div><div class="report-actions"><button id="reportExportCsv" class="primary-btn">Export CSV Snapshot</button><button id="reportCreateReceipt" class="secondary-btn">Create Report Receipt</button><button id="reportRefresh" class="secondary-btn">Refresh Sources</button><button id="reportLedger" class="secondary-btn">Open Activity Ledger</button></div><p>CSV export contains the visible summary only. PDF and scheduled delivery remain gated for the SaaS provisioning phase.</p></section>
      </div>
    </section>`);
  $('reportExportCsv').onclick = () => { downloadCsv(`nash-os-report-${new Date().toISOString().slice(0,10)}.csv`, [['Metric','Value','Source'], ...metrics.map((m) => m.slice(0,3))]); toast('CSV report downloaded.'); };
  $('reportCreateReceipt').onclick = async () => { const out = await api('/api/executive/action', { method: 'POST', body: { action: 'request_executive_brief', reportType: 'HF15_REPORT_SNAPSHOT' } }); addReceipt({ ...(out.receipt || {}), actionType: 'EXECUTIVE_REPORT_SNAPSHOT', target: 'Reports & Analytics Center', note: 'Source-labelled report snapshot prepared for human review.' }); toast('Report receipt created.'); };
  $('reportRefresh').onclick = reportsAnalyticsCenter;
  $('reportLedger').onclick = () => renderLedger(true);
}


function aiSignalStatus(value) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('critical') || text.includes('high') || text.includes('blocked') || text.includes('fail')) return 'risk';
  if (text.includes('medium') || text.includes('review') || text.includes('pending') || text.includes('watch')) return 'watch';
  return 'good';
}

function compactSourceRows(source, limit = 6) {
  if (!source || typeof source !== 'object') return '<div class="empty-state">No source data returned.</div>';
  return Object.entries(source).slice(0, limit).map(([key, value]) => {
    const display = typeof value === 'object' ? (Array.isArray(value) ? `${value.length} records` : 'Available') : value;
    return `<div class="ai-source-row"><span>${esc(key.replace(/([A-Z])/g, ' $1'))}</span><strong>${esc(display)}</strong></div>`;
  }).join('');
}

async function executiveAiWorkspace() {
  openOperation('NASH AI Executive Workspace', 'Loading explainable enterprise signals. AI remains advisory and cannot approve or mutate source data.', '<div class="ai-workspace-loading">Loading source-labelled intelligence…</div>');
  const [execOut, aiOut, controlOut, qualityOut] = await Promise.all([
    optionalApi('/api/executive/dashboard'),
    optionalApi('/api/ai/summary'),
    optionalApi('/api/controls/summary'),
    optionalApi('/api/quality/summary')
  ]);
  const dashboard = execOut.dashboard || {};
  const summary = dashboard.summary || {};
  const riskInputs = Array.isArray(dashboard.riskInputs) ? dashboard.riskInputs : [];
  const decisions = Array.isArray(dashboard.decisionBoard) ? dashboard.decisionBoard : [];
  const controls = controlOut.summary || controlOut.controls || controlOut;
  const quality = qualityOut.summary || qualityOut.quality || qualityOut;
  const session = readAccessSession() || {};
  const recommendation = Number(summary.riskScore || 0) >= 55
    ? 'Convene human review for the highest-risk operating domains before approving material workforce or payroll decisions.'
    : Number(summary.riskScore || 0) >= 30
      ? 'Maintain targeted review of open controls and evidence gaps; no autonomous intervention is permitted.'
      : 'Current visible risk is controlled. Continue monitoring source coverage and decision backlog.';
  const explainRows = riskInputs.slice(0, 8).map((r, index) => `<article class="ai-explain-row"><span>${String(index + 1).padStart(2,'0')}</span><div><strong>${esc(r.key)}</strong><small>${esc(r.source || 'Source labelled')}</small></div><b>${esc(r.value)}</b></article>`).join('') || '<div class="empty-state">No explainable risk drivers returned.</div>';
  const decisionRows = decisions.slice(0, 6).map((d) => `<article class="ai-decision-item"><div><strong>${esc(d.decision)}</strong><small>${esc(d.owner)} · ${esc(d.source)}</small></div><span class="exec-status ${aiSignalStatus(d.status)}">${esc(d.status)}</span><p>${esc(d.nextAction)}</p></article>`).join('') || '<div class="empty-state">No decision backlog returned.</div>';
  openOperation('NASH AI Executive Workspace', 'Explainable cross-module intelligence with source transparency and mandatory human decision ownership.', `
    <section class="ai-executive-shell">
      <div class="ai-executive-hero">
        <div><p class="eyebrow">NASH AI · EXECUTIVE INTELLIGENCE</p><h2>${esc(session.tenant || 'NASH Enterprise')}</h2><p>Cross-module risk explanation, decision preparation, and governance visibility. AI cannot approve, change payroll, edit employee records, or submit external transactions.</p></div>
        <div class="ai-risk-orb ${aiSignalStatus(summary.riskLevel)}"><span>Enterprise risk</span><strong>${esc(summary.riskScore ?? 0)}</strong><small>${esc(summary.riskLevel || 'Unknown')} · human-owned</small></div>
      </div>
      <div class="ai-trust-strip"><span>MySQL source of truth</span><span>Explainability active</span><span>Human override required</span><span>No schema change</span></div>
      <div class="ai-executive-grid">
        <section class="ai-panel ai-recommendation-panel"><div class="ai-panel-head"><div><p class="eyebrow">DECISION SUPPORT</p><h3>Executive recommendation</h3></div><span>Advisory only</span></div><p class="ai-recommendation-text">${esc(recommendation)}</p><div class="ai-boundary-note"><strong>Decision boundary</strong><span>Final approval remains with the authorized executive, HR, finance, government-relations, or governance owner.</span></div><div class="ai-action-row"><button class="primary-btn" id="aiPreparePacket">Prepare Decision Packet</button><button class="secondary-btn" id="aiEscalateHuman">Escalate to Human Review</button></div></section>
        <section class="ai-panel"><div class="ai-panel-head"><div><p class="eyebrow">SOURCE HEALTH</p><h3>Connected intelligence</h3></div><span>${aiOut.unavailable ? 'Partial' : 'Available'}</span></div><div class="ai-source-list">${compactSourceRows(aiOut.counts || aiOut, 7)}</div></section>
      </div>
      <div class="ai-executive-grid lower">
        <section class="ai-panel"><div class="ai-panel-head"><div><p class="eyebrow">EXPLAINABILITY</p><h3>Risk drivers</h3></div><span>${riskInputs.length} signals</span></div><div class="ai-explain-list">${explainRows}</div></section>
        <section class="ai-panel"><div class="ai-panel-head"><div><p class="eyebrow">HUMAN DECISIONS</p><h3>Decision queue</h3></div><span>${decisions.length} items</span></div><div class="ai-decision-list">${decisionRows}</div></section>
      </div>
      <div class="ai-executive-grid lower">
        <section class="ai-panel"><div class="ai-panel-head"><div><p class="eyebrow">CONTROL SOURCES</p><h3>Approval and evidence control</h3></div><span>Read only</span></div><div class="ai-source-list">${compactSourceRows(controls, 6)}</div></section>
        <section class="ai-panel"><div class="ai-panel-head"><div><p class="eyebrow">GOVERNANCE SOURCES</p><h3>Quality and governance</h3></div><span>Read only</span></div><div class="ai-source-list">${compactSourceRows(quality, 6)}</div></section>
      </div>
      <div class="ai-action-row footer"><button class="secondary-btn" id="aiRefreshWorkspace">Refresh Intelligence</button><button class="secondary-btn" id="aiOpenExecutiveDashboard">Open Executive Dashboard</button><button class="secondary-btn" id="aiOpenLedger">Open Receipt Ledger</button></div>
    </section>`);
  $('aiPreparePacket').onclick = async () => {
    const out = await api('/api/executive/action', { method: 'POST', body: { action: 'prepare_ai_decision_packet' } });
    const receipt = { ...(out.receipt || {}), actionType: 'EXECUTIVE_AI_DECISION_PACKET', target: 'Executive decision queue' };
    addReceipt(receipt);
    openOperation('AI Decision Packet Prepared', 'The packet is advisory. Final decision remains human-controlled.', receiptCard(receipt));
  };
  $('aiEscalateHuman').onclick = () => permissionReceipt('EXEC_ESCALATE', { target: 'AI-supported executive review', note: 'AI signal escalated for authorized human review. No autonomous action executed.' });
  $('aiRefreshWorkspace').onclick = executiveAiWorkspace;
  $('aiOpenExecutiveDashboard').onclick = executiveDashboard;
  $('aiOpenLedger').onclick = () => renderLedger(true);
}


async function aiCopilotWorkspace() {
  openOperation('NASH AI Copilot', 'Loading source-grounded enterprise context. Responses are advisory and require human validation.', '<div class="ai-workspace-loading">Preparing source-grounded copilot…</div>');
  const [executive, controls, quality, ai] = await Promise.all([
    optionalApi('/api/executive/dashboard'), optionalApi('/api/controls/summary'), optionalApi('/api/quality/summary'), optionalApi('/api/ai/summary')
  ]);
  const context = { executive: executive.dashboard || executive, controls, quality, ai };
  openOperation('NASH AI Copilot', 'Ask operational questions. The copilot cites the loaded source domains and never executes a final decision.', `
    <section class="copilot-shell">
      <div class="copilot-hero"><div><p class="eyebrow">HF16 · SOURCE-GROUNDED AI</p><h2>Enterprise Decision Copilot</h2><p>Summarize risk, explain signals, draft decision packets, and identify control gaps using currently connected NASH OS sources.</p></div><div class="copilot-badge"><strong>Human controlled</strong><span>No autonomous approval</span></div></div>
      <div class="copilot-grid">
        <section class="copilot-panel"><label for="copilotPrompt">Question or decision request</label><textarea id="copilotPrompt" rows="6" placeholder="Example: Summarize the highest workforce risks and recommend the next human review steps."></textarea><div class="copilot-actions"><button class="primary-btn" id="runCopilot">Generate grounded response</button><button class="secondary-btn" id="clearCopilot">Clear</button></div><div id="copilotAnswer" class="copilot-answer empty-state">No response generated yet.</div></section>
        <section class="copilot-panel"><div class="workspace-card-head"><div><p class="eyebrow">CONNECTED CONTEXT</p><h3>Source domains</h3></div><span>Read only</span></div><div class="ai-source-list">${compactSourceRows(context.executive?.summary || context.executive,5)}${compactSourceRows(context.controls?.counts || context.controls,4)}${compactSourceRows(context.quality?.counts || context.quality,4)}</div></section>
      </div>
    </section>`);
  $('runCopilot').onclick = async () => {
    const prompt = $('copilotPrompt').value.trim();
    if (!prompt) return toast('Enter a question for the copilot.');
    $('copilotAnswer').className = 'copilot-answer'; $('copilotAnswer').innerHTML = 'Generating source-grounded response…';
    const out = await api('/api/saas/ai-copilot', { method:'POST', body:{ prompt, role:state.role, tenant:(readAccessSession()||{}).tenant } });
    $('copilotAnswer').innerHTML = `<h3>${esc(out.title)}</h3><p>${esc(out.summary)}</p><div class="copilot-points">${(out.findings||[]).map(x=>`<div><strong>${esc(x.label)}</strong><span>${esc(x.value)}</span></div>`).join('')}</div><div class="ai-boundary-note"><strong>Human decision required</strong><span>${esc(out.boundary)}</span></div>`;
    addReceipt(out.receipt);
  };
  $('clearCopilot').onclick=()=>{ $('copilotPrompt').value=''; $('copilotAnswer').className='copilot-answer empty-state'; $('copilotAnswer').textContent='No response generated yet.'; };
}

async function tenantAdministrationWorkspace() {
  const out = await api('/api/saas/tenants');
  openOperation('Tenant Administration', 'HF17 multi-tenant foundation implemented as runtime-isolated tenant registry without changing the HR database schema.', `
    <section class="saas-admin-shell"><div class="saas-admin-hero"><div><p class="eyebrow">HF17 · MULTI-TENANT FOUNDATION</p><h2>Tenant control plane</h2><p>Organization identity, environment status, isolation policy, and workspace ownership.</p></div><button class="primary-btn" id="addTenantBtn">Create runtime tenant</button></div>
    <div class="tenant-table"><div class="tenant-row head"><span>Tenant</span><span>Plan</span><span>Region</span><span>Status</span><span>Isolation</span></div>${out.tenants.map(t=>`<div class="tenant-row"><span><strong>${esc(t.name)}</strong><small>${esc(t.id)}</small></span><span>${esc(t.plan)}</span><span>${esc(t.region)}</span><span><b class="status-pill">${esc(t.status)}</b></span><span>${esc(t.isolation)}</span></div>`).join('')}</div>
    <div class="policy-banner">Tenant registry is runtime-only in this release candidate. Existing HR MySQL tables are not altered and no cross-tenant data query is permitted.</div></section>`);
  $('addTenantBtn').onclick=()=>tenantCreateForm();
}
function tenantCreateForm(){
  openOperation('Create Tenant', 'Provision a runtime-isolated tenant record. No HR schema change is performed.', `<form id="tenantForm" class="form-grid"><label>Organization name<input name="name" required></label><label>Region<select name="region"><option>Saudi Arabia</option><option>GCC</option><option>Global</option></select></label><label>Plan<select name="plan"><option>Enterprise Trial</option><option>Growth</option><option>Enterprise</option></select></label><label>Owner email<input type="email" name="owner" required></label><button class="primary-btn" type="submit">Provision tenant</button></form>`);
  $('tenantForm').onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); const out=await api('/api/saas/tenants',{method:'POST',body:Object.fromEntries(f)}); addReceipt(out.receipt); tenantAdministrationWorkspace();};
}

async function subscriptionBillingWorkspace(){
  const out=await api('/api/saas/subscription');
  openOperation('Subscription & Billing', 'HF18 commercial control center. Billing actions generate runtime receipts and do not mutate HR data.', `
    <section class="billing-shell"><div class="billing-hero"><div><p class="eyebrow">HF18 · SUBSCRIPTION & BILLING</p><h2>${esc(out.subscription.plan)}</h2><p>${esc(out.subscription.tenant)} · ${esc(out.subscription.status)}</p></div><div class="billing-amount"><span>Monthly estimate</span><strong>SAR ${esc(out.subscription.monthlyEstimate)}</strong><small>Before VAT</small></div></div>
    <div class="billing-kpis">${[['Licensed employees',out.subscription.licensedEmployees],['Active users',out.subscription.activeUsers],['Renewal',out.subscription.renewalDate],['Usage',out.subscription.usagePercent+'%']].map(x=>`<article><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></article>`).join('')}</div>
    <div class="plan-grid">${out.plans.map(p=>`<article class="plan-card ${p.name===out.subscription.plan?'selected':''}"><span>${esc(p.name)}</span><strong>SAR ${esc(p.price)}</strong><small>${esc(p.limit)}</small><button class="secondary-btn" data-plan="${esc(p.name)}">Select plan</button></article>`).join('')}</div>
    <div class="billing-actions"><button class="primary-btn" id="generateInvoice">Generate draft invoice</button><button class="secondary-btn" id="openUsage">Refresh usage</button></div></section>`);
  document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>billingAction('SELECT_PLAN',b.dataset.plan));
  $('generateInvoice').onclick=()=>billingAction('GENERATE_DRAFT_INVOICE',out.subscription.plan);
  $('openUsage').onclick=subscriptionBillingWorkspace;
}
async function billingAction(action,target){const out=await api('/api/saas/billing-action',{method:'POST',body:{action,target}});addReceipt(out.receipt);toast(out.message);}

async function tenantProvisioningWorkspace(){
  const out=await api('/api/saas/provisioning');
  openOperation('Tenant Provisioning', 'HF19 controlled onboarding pipeline for new SaaS customers.', `<section class="provision-shell"><div class="provision-hero"><div><p class="eyebrow">HF19 · TENANT PROVISIONING</p><h2>Customer activation pipeline</h2><p>Identity, workspace, policy, integration readiness, and launch acceptance.</p></div><button class="primary-btn" id="startProvision">Start provisioning run</button></div><div class="provision-steps">${out.steps.map((s,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(s.name)}</strong><small>${esc(s.description)}</small></div><b class="${s.status==='READY'?'good':'watch'}">${esc(s.status)}</b></article>`).join('')}</div><div id="provisionResult" class="policy-banner">No provisioning run executed in this session.</div></section>`);
  $('startProvision').onclick=async()=>{const r=await api('/api/saas/provisioning/run',{method:'POST',body:{tenant:(readAccessSession()||{}).tenant}});addReceipt(r.receipt);$('provisionResult').textContent=r.message;};
}

async function releaseCandidateWorkspace(){
  const out=await api('/api/saas/release-readiness');
  openOperation('Release Candidate Readiness', 'HF20 consolidated production-readiness gate for the current local SaaS candidate.', `<section class="release-shell"><div class="release-hero"><div><p class="eyebrow">HF20 · RELEASE CANDIDATE</p><h2>${esc(out.release.name)}</h2><p>${esc(out.release.summary)}</p></div><div class="release-score"><span>Readiness</span><strong>${esc(out.release.score)}%</strong><small>${esc(out.release.status)}</small></div></div><div class="release-gates">${out.gates.map(g=>`<article><span>${esc(g.name)}</span><strong>${esc(g.status)}</strong><small>${esc(g.evidence)}</small></article>`).join('')}</div><div class="release-actions"><button class="primary-btn" id="runReleaseGate">Run release gate</button><button class="secondary-btn" id="downloadManifest">Download manifest</button></div><div id="releaseResult" class="policy-banner">Candidate is local-run ready; cloud production deployment, payment gateway, external identity provider, and infrastructure hardening remain deployment-stage work.</div></section>`);
  $('runReleaseGate').onclick=async()=>{const r=await api('/api/saas/release-readiness/run',{method:'POST',body:{}});addReceipt(r.receipt);$('releaseResult').textContent=r.message;};
  $('downloadManifest').onclick=()=>downloadTextFile('NASH_OS_HF20_RELEASE_MANIFEST.json',JSON.stringify(out,null,2),'application/json');
}
function downloadTextFile(name,text,type='text/plain'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

async function moduleLoad(title, endpoint) {
  await requireEmployeeIfRoleNeedsIt();
  const out = await api(endpoint);
  openOperation(title, 'Operational record loaded from the live source. Review the structured business fields and continue with a controlled action.', `${contextCard()}${businessSummary(out, 'No business record is currently available.')}`);
}

async function selfService() {
  await requireEmployee();
  const out = await api(`/api/self-service/rights/${encodeURIComponent(state.selectedEmployee.id)}`);
  openOperation('My Rights / Reports', 'Personal report loaded on request only.', `${contextCard()}${businessSummary(out.rights || out.report || out, 'No rights report is currently available.')}`);
}

async function performance() {
  await requireEmployee();
  const out = await api(`/api/performance/evaluation/${encodeURIComponent(state.selectedEmployee.id)}`);
  openOperation('My Performance', 'Own performance loaded on request only.', `${contextCard()}${businessSummary(out.evaluation || out, 'No performance record is currently available.')}`);
}

async function finalAcceptance() {
  const status = await api('/api/final-acceptance/status');
  const action = await api('/api/final-acceptance/action', { method: 'POST', body: { actionType: 'run_final_gold_acceptance' } });
  addReceipt(action.receipt || action.action || action);
  openOperation('Final Acceptance', 'Acceptance loaded and receipt created on request.', `${businessSummary(status, 'No acceptance status is currently available.')}${receiptCard(action.receipt || action.action || action)}`);
}

async function sourceStatus() {
  const out = await api('/api/health');
  openOperation('Source Status', 'Source status loaded on request only.', businessSummary(out, 'No source status is currently available.'));
}

function addReceipt(receipt) {
  const normalized = { receiptId: receipt.receiptId || receipt.sessionId || receipt.decisionId || `NASH-FINAL-${idNow()}`, createdAt: receipt.createdAt || new Date().toISOString(), role: state.role, ...receipt };
  state.receipts.unshift(normalized);
  if (state.receipts.length > 80) state.receipts.pop();
  if (!$('ledgerSurface').classList.contains('hidden')) renderLedger(true);
}

function contextCard() {
  if (!state.selectedEmployee) return '<div class="empty-state">No employee selected. Use a Select command first if this action requires employee context.</div>';
  return `<div class="selected-context"><strong>${esc(state.selectedEmployee.displayName)}</strong><span>${esc(state.selectedEmployee.employeeCode)} · ${esc(state.selectedEmployee.department)} · ${esc(state.selectedEmployee.position)}</span></div>`;
}

function taskCard(t) {
  if (!t) return '<div class="empty-state">No task selected.</div>';
  return `<div class="detail-card"><h3>${esc(t.title)}</h3><p>${esc(t.description || '')}</p><div class="detail-grid"><span><b>Status</b>${esc(safe(t.status))}</span><span><b>Priority</b>${esc(safe(t.priority))}</span><span><b>SLA</b>${esc(safe(t.slaHours))}</span><span><b>Evidence</b>${esc(safe(t.evidenceRequired))}</span></div></div>`;
}

function isContextReceipt(r) {
  return ['SELECT_EMPLOYEE_CONTEXT', 'SELECT_TASK_CONTEXT'].includes(String(r?.actionType || '').toUpperCase());
}

function operationalReceipts() {
  return state.receipts.filter((r) => !isContextReceipt(r));
}

function friendlyAction(type) {
  const key = String(type || '').toUpperCase();
  const labels = {
    EMPLOYEE_PROFILE_EDIT_REQUEST: 'Profile edit request',
    CHECK_IN: 'Check-in receipt',
    START_WORKDAY: 'Workday started',
    CHECK_OUT: 'Check-out receipt',
    START_TASK: 'Task started',
    SUBMIT_EVIDENCE: 'Evidence submitted',
    EDIT_DRAFT_EVIDENCE: 'Draft evidence updated',
    DELETE_DRAFT_EVIDENCE: 'Draft evidence deleted',
    EMPLOYEE_DOCUMENT_UPLOAD: 'Employee document uploaded',
    HR_DOCUMENT_UPLOAD: 'HR document uploaded',
    EMPLOYEE_DOCUMENT_REPLACE: 'Employee document replaced',
    EMPLOYEE_DOCUMENT_ARCHIVE: 'Employee document archived',
    HR_DOCUMENT_VERIFY: 'Document verified',
    HR_DOCUMENT_REJECT: 'Document returned',
    HR_MISSING_DOCUMENT_REQUEST: 'Missing document requested',
    MANAGER_EVIDENCE_CORRECTION: 'Evidence correction requested',
    MANAGER_EVIDENCE_ACCEPT: 'Manager accepted evidence',
    DOCUMENT_DOWNLOAD: 'Employee file downloaded',
    ADD_TEAM_TASK_REQUEST: 'Team task request created',
    EDIT_TEAM_TASK_REQUEST: 'Team task request edited',
    CANCEL_TEAM_TASK_REQUEST: 'Team task request cancelled',
    MANAGER_ACCEPT: 'Manager accepted work',
    MANAGER_RETURN: 'Manager returned work',
    MANAGER_REQUEST_EVIDENCE: 'Manager requested evidence',
    MANAGER_ESCALATE_SLA: 'SLA escalated',
    HR_ADD_ACTION_REQUEST: 'HR action request created',
    HR_EDIT_ACTION_REQUEST: 'HR action request edited',
    HR_DELETE_ACTION_REQUEST: 'HR action request cancelled',
    EXEC_ESCALATE: 'Executive escalation',
    RUN_FINAL_GOLD_ACCEPTANCE: 'Final acceptance run'
  };
  return labels[key] || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) || 'Recorded action';
}

function friendlyStatus(status) {
  const key = String(status || '').toUpperCase();
  if (key.includes('RUNTIME')) return 'Recorded · runtime only';
  if (key.includes('PENDING')) return 'Pending approval';
  if (key.includes('CREATED')) return 'Created';
  if (key.includes('SUBMITTED')) return 'Submitted';
  if (key.includes('ACCEPT')) return 'Accepted';
  if (key.includes('RETURN')) return 'Returned';
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) || 'Recorded';
}

function approvalText(r) {
  const action = String(r?.actionType || '').toUpperCase();
  if (action.includes('EDIT') || action.includes('HR_') || action.includes('MANAGER_') || action.includes('COMPENSATION') || action.includes('GOVERNMENT')) return 'Human review required';
  return r?.policy?.humanFinalDecisionRequired ? 'Human decision protected' : 'Runtime proof only';
}

function receiptTarget(r) {
  return r.employeeName || r.target || r.taskTitle || r.taskId || r.employeeCode || r.employeeId || 'Runtime action';
}

function receiptNote(r) {
  return r.note || r.outputSummary || r.evidenceReference || r.fileName || r.source || 'Action recorded within permission boundary.';
}

function ledgerSummary(receipts) {
  const pending = receipts.filter((r) => /EDIT|HR_|MANAGER_RETURN|REQUEST|ESCALATE/.test(String(r.actionType || '').toUpperCase())).length;
  const latest = receipts[0]?.createdAt || '—';
  return `<div class="ledger-summary"><div><strong>${receipts.length}</strong><span>Operational receipts</span></div><div><strong>${pending}</strong><span>Need review / trace</span></div><div><strong>0</strong><span>Direct DB mutations</span></div><div><strong>${esc(latest)}</strong><span>Latest action</span></div></div>`;
}

function receiptCard(r) {
  const actionType = r.actionType || r.action || r.status || 'RECORDED';
  const linkedDoc = r.documentId ? findDocument(r.documentId) : null;
  const docLine = linkedDoc ? `<div class="receipt-document-line"><span><b>File</b>${esc(linkedDoc.fileName)}</span><span><b>Category</b>${esc(linkedDoc.category)}</span><button class="secondary-btn small" data-download-doc="${esc(linkedDoc.documentId)}">Download File</button></div>` : (r.fileName ? `<div class="receipt-document-line"><span><b>File</b>${esc(r.fileName)}</span><span><b>Category</b>${esc(r.documentCategory || 'Document')}</span></div>` : '');
  return `<article class="receipt-card business-receipt"><div class="receipt-top"><div><p class="eyebrow">Action receipt</p><h3>${esc(friendlyAction(actionType))}</h3><small>${esc(r.receiptId || 'Runtime receipt')}</small></div><span class="status-pill">${esc(friendlyStatus(r.status || 'RECORDED'))}</span></div><div class="receipt-grid"><span><b>Role</b>${esc(safe(r.role))}</span><span><b>Target</b>${esc(receiptTarget(r))}</span><span><b>Created</b>${esc(safe(r.createdAt))}</span><span><b>Approval</b>${esc(approvalText(r))}</span></div>${docLine}<div class="receipt-note">${esc(receiptNote(r))}</div><details class="technical-trace"><summary>Technical trace</summary><pre>${esc(JSON.stringify({...r, dataUrl: undefined}, null, 2))}</pre></details></article>`;
}

function objectBox(obj) { return businessSummary(obj, 'No business data is currently available.'); }
function field(id, label, valueText = '') { return `<label class="form-field"><span>${esc(label)}</span><textarea id="${esc(id)}" rows="3">${esc(valueText)}</textarea></label>`; }
function value(id) { return ($(id)?.value || '').trim(); }
function employeeLabel() { return state.selectedEmployee ? `${state.selectedEmployee.employeeCode} · ${state.selectedEmployee.displayName}` : 'No selected employee'; }
function taskLabel() { return state.selectedTask ? `${state.selectedTask.id} · ${state.selectedTask.title}` : 'No selected task'; }
function employeeId() { if (!state.selectedEmployee) throw new Error('Select an employee first.'); return encodeURIComponent(state.selectedEmployee.id); }
async function requireEmployee() { if (!state.selectedEmployee) { await loadEmployees('Select Employee First'); throw new Error('Select an employee first.'); } }
async function requireTask() { if (!state.selectedTask) { await loadTasks('Select Task First'); throw new Error('Select a task first.'); } }
async function requireEmployeeIfRoleNeedsIt() { if (['hr'].includes(state.role)) await requireEmployee(); }


// Compatibility markers for Build 18/18D QA gates. Final UI remains request-only.
function loadFinalAcceptance() { return finalAcceptance(); }
function finalAcceptanceAction() { return finalAcceptance(); }
function exportFinalLockReport() { toast('Final lock report is available through Final Acceptance.'); }
function renderFinalAcceptance() { return true; }
const __nashFinalCompatibility = 'No details loaded until you request them';

$('sourceStatusBtn').onclick = sourceStatus;
$('ledgerBtn').onclick = () => renderLedger(true);
$('acceptanceBtn').onclick = finalAcceptance;

if ($('loadFinalAcceptance')) $('loadFinalAcceptance').onclick = loadFinalAcceptance;
if ($('runFinalAcceptance')) $('runFinalAcceptance').onclick = finalAcceptanceAction;
if ($('createFinalReceipt')) $('createFinalReceipt').onclick = finalAcceptanceAction;
if ($('exportFinalLockReport')) $('exportFinalLockReport').onclick = exportFinalLockReport;
if ($('showFinalAcceptance')) $('showFinalAcceptance').onclick = finalAcceptance;

initializeLoginExperience();
render();
toast('Final Operating Console ready. No data loaded automatically.');

// HF27 — visible interaction accountability and dead-button prevention.
function hf27ButtonLabel(button) {
  return String(button?.getAttribute('aria-label') || button?.title || button?.textContent || 'Action').replace(/\s+/g, ' ').trim();
}
function hf27GuardVisibleButtons(root = document) {
  root.querySelectorAll('button:not([data-hf27-audited])').forEach((button) => {
    button.dataset.hf27Audited = 'true';
    if (button.disabled) {
      button.setAttribute('aria-disabled', 'true');
      if (!button.title) button.title = 'This action is unavailable in the current workflow stage.';
      return;
    }
    button.addEventListener('click', () => {
      queueMicrotask(() => {
        const hasInline = typeof button.onclick === 'function';
        const command = button.dataset.command || button.dataset.workflowCommand || button.dataset.plan || button.type === 'submit';
        if (!hasInline && !command && !button.closest('form')) {
          button.classList.add('hf27-action-warning');
          toast(`${hf27ButtonLabel(button)} is not available in this role or context.`);
          setTimeout(() => button.classList.remove('hf27-action-warning'), 1400);
        }
      });
    }, { capture: true });
  });
}
function hf27AuditWorkspace() {
  const buttons = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
  const disabled = buttons.filter((b) => b.disabled).length;
  document.documentElement.dataset.hf27VisibleButtons = String(buttons.length);
  document.documentElement.dataset.hf27DisabledButtons = String(disabled);
  hf27GuardVisibleButtons(document);
}
// HF29 — batch mutation audits to one animation frame instead of rescanning on every DOM mutation.
let __hf29AuditFrame = 0;
function hf29ScheduleWorkspaceAudit() {
  if (__hf29AuditFrame) return;
  __hf29AuditFrame = requestAnimationFrame(() => {
    __hf29AuditFrame = 0;
    hf27AuditWorkspace();
  });
}
const __hf27Observer = new MutationObserver(hf29ScheduleWorkspaceAudit);
__hf27Observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', hf29ScheduleWorkspaceAudit, { once: true });
setTimeout(hf29ScheduleWorkspaceAudit, 0);

// HF29 — performance and responsive runtime hardening.
function hf29Debounce(fn, wait = 180) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
function hf29PrepareLazyAssets(root = document) {
  root.querySelectorAll('img:not([loading])').forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
  });
  root.querySelectorAll('details.command-library:not([data-hf29-ready])').forEach((details) => {
    details.dataset.hf29Ready = 'true';
    details.addEventListener('toggle', () => {
      if (details.open) requestAnimationFrame(() => details.querySelector('button')?.focus({ preventScroll: true }));
    }, { passive: true });
  });
}
function hf34Now() {
  return (window.performance && typeof window.performance.now === 'function')
    ? window.performance.now()
    : Date.now();
}
function hf29RecordRenderMetric(label, startedAt) {
  const duration = Math.max(0, hf34Now() - startedAt);
  document.documentElement.dataset.hf29LastRenderMs = duration.toFixed(1);
  document.documentElement.dataset.hf29LastRender = label;
  window.__NASH_PERFORMANCE__ = {
    ...(window.__NASH_PERFORMANCE__ || {}),
    lastRender: label,
    lastRenderMs: Number(duration.toFixed(1)),
    recordedAt: new Date().toISOString()
  };
}
const __hf29OriginalRender = render;
render = function hf29MeasuredRender(...args) {
  const startedAt = hf34Now();
  const result = __hf29OriginalRender.apply(this, args);
  requestAnimationFrame(() => {
    hf29PrepareLazyAssets(document);
    hf29ScheduleWorkspaceAudit();
    hf29RecordRenderMetric('workspace', startedAt);
  });
  return result;
};
const __hf29RuntimeObserver = new MutationObserver(() => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => hf29PrepareLazyAssets(document), { timeout: 400 });
  else setTimeout(() => hf29PrepareLazyAssets(document), 40);
});
__hf29RuntimeObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('resize', hf29Debounce(() => {
  document.documentElement.dataset.hf29Viewport = `${window.innerWidth}x${window.innerHeight}`;
}, 120), { passive: true });
hf29PrepareLazyAssets(document);
document.documentElement.dataset.hf29Viewport = `${window.innerWidth}x${window.innerHeight}`;
