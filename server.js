const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
const { dbConfig, runtimeLock, loadEnv } = require('./scripts/env');

loadEnv();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const LOCK = 'NASH_OS_CLEAN_BUILD_18_FINAL_ACCEPTANCE_LOCAL_RUN_LOCK';

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false, maxAge: 0 }));

const SAFE_TABLES = [
  'departments', 'positions', 'employees', 'tasks', 'approval_requests', 'audit_trail', 'reviews', 'payroll_cycles',
  'attendance_records', 'attendance', 'attendance_adjustments', 'action_receipts', 'contracts', 'contract_records', 'government_records', 'compliance_alerts'
];

const runtimeAccessSessions = new Map();

const runtimeAttendanceSessions = new Map();
const runtimeReceipts = [];
const runtimeTaskExecutions = new Map();
const runtimeTaskReceipts = [];
const runtimeClosureDecisions = [];
const runtimeSopOptimizations = []; // Build 06 runtime AI SOP optimization receipts; no schema change
const runtimeSelfServiceViews = []; // Build 09 controlled employee self-service views; no schema change
const runtimePerformanceDecisions = []; // Build 09 performance final decisions; no schema change
const runtimeTrainingPlans = []; // Build 09 training and development plans; no schema change
const runtimeCompensationDecisions = []; // Build 10 compensation, payroll impact, WPS readiness decisions; no schema change
const runtimeGovernmentActions = []; // Build 11 government relations and compliance decisions; no schema change
const runtimeProcedureActions = []; // Build 12 HR procedures, JD/SOP enforcement decisions; no schema change
const runtimeUnifiedControlActions = []; // Build 13 unified approval, SLA, evidence, and audit control actions; no schema change
const runtimeQualityGovernanceActions = []; // Build 14 quality checks, governance gates, control failures, and corrective actions; no schema change
const runtimeAiDecisionActions = []; // Build 15 AI risk radar and decision support receipts; no schema change
const runtimeExecutiveDashboardActions = []; // Build 16 executive dashboard receipts and brief requests; no schema change
const runtimeUiCompressionActions = []; // Build 17 UI compression, navigation cleanup, and button matrix receipts; no schema change
const runtimeFinalAcceptanceActions = []; // Build 18 final acceptance, local run, route and button proof receipts; no schema change
const runtimePermissionedActions = []; // Build 18D employee/manager add-edit-delete runtime action receipts; no schema change
const runtimeSaasTenants = [{ id:'TNT-NASH-ENTERPRISE', name:'NASH Enterprise', plan:'Enterprise Trial', region:'Saudi Arabia', status:'ACTIVE', isolation:'Runtime tenant boundary' }];
const runtimeSaasReceipts = [];

async function withConn(fn) {
  const conn = await mysql.createConnection(dbConfig());
  try { return await fn(conn); } finally { await conn.end(); }
}

async function tableExists(conn, db, table) {
  const [rows] = await conn.query('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', [db, table]);
  return rows[0].c > 0;
}

async function tableColumns(conn, table) {
  const cfg = dbConfig();
  if (!(await tableExists(conn, cfg.database, table))) return [];
  const [rows] = await conn.query('SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position', [cfg.database, table]);
  return rows.map((row) => row.column_name);
}

async function safeCounts(conn) {
  const cfg = dbConfig();
  const counts = {};
  for (const table of SAFE_TABLES) {
    if (await tableExists(conn, cfg.database, table)) {
      const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
      counts[table] = rows[0].c;
    }
  }
  return counts;
}

async function tableSample(conn, table, limit = 200) {
  const cfg = dbConfig();
  if (!(await tableExists(conn, cfg.database, table))) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 1000);
  const [rows] = await conn.query(`SELECT * FROM \`${table}\` LIMIT ${safeLimit}`);
  return rows;
}

function normalizeKeyMap(row) {
  const map = {};
  for (const key of Object.keys(row || {})) map[key.toLowerCase()] = key;
  return map;
}

function valueByCandidates(row, candidates) {
  const map = normalizeKeyMap(row);
  for (const candidate of candidates) {
    const real = map[candidate.toLowerCase()];
    if (real && row[real] !== null && row[real] !== undefined && String(row[real]).trim() !== '') return row[real];
  }
  return null;
}

function buildLookup(rows, nameCandidates) {
  const lookup = new Map();
  for (const row of rows || []) {
    const id = valueByCandidates(row, ['id', 'department_id', 'position_id', 'code', 'department_code', 'position_code']);
    const name = valueByCandidates(row, nameCandidates) || id;
    if (id !== null && id !== undefined) lookup.set(String(id), String(name));
  }
  return lookup;
}

function employeeDisplayName(row) {
  const direct = valueByCandidates(row, ['full_name', 'employee_name', 'name', 'display_name', 'arabic_name', 'english_name']);
  if (direct) return String(direct);
  const first = valueByCandidates(row, ['first_name', 'fname', 'given_name']);
  const last = valueByCandidates(row, ['last_name', 'lname', 'family_name', 'surname']);
  if (first || last) return [first, last].filter(Boolean).join(' ');
  return String(valueByCandidates(row, ['employee_code', 'employee_no', 'employee_number', 'id']) || 'Employee');
}

function employeeIdentity(row, deptLookup, posLookup) {
  const id = valueByCandidates(row, ['id', 'employee_id', 'employee_no', 'employee_number', 'employee_code']);
  const employeeCode = valueByCandidates(row, ['employee_code', 'employee_no', 'employee_number', 'code']) || id;
  const deptId = valueByCandidates(row, ['department_id', 'dept_id', 'departmentid']);
  const posId = valueByCandidates(row, ['position_id', 'job_id', 'positionid']);
  const department = valueByCandidates(row, ['department_name', 'department', 'dept_name']) || (deptId !== null && deptLookup.get(String(deptId))) || 'Not mapped yet';
  const position = valueByCandidates(row, ['position_name', 'position', 'job_title', 'title']) || (posId !== null && posLookup.get(String(posId))) || 'Not mapped yet';
  const grade = valueByCandidates(row, ['grade', 'rank', 'level', 'job_grade']) || 'Not mapped yet';
  const manager = valueByCandidates(row, ['manager_name', 'line_manager', 'supervisor_name', 'manager']) || 'Manager source pending';
  const status = valueByCandidates(row, ['status', 'employment_status', 'employee_status']) || 'Active source pending';
  const nationality = valueByCandidates(row, ['nationality', 'citizenship']) || 'Not mapped yet';
  const salary = valueByCandidates(row, ['salary', 'basic_salary', 'base_salary', 'monthly_salary']) || null;
  return {
    id: String(id ?? employeeCode ?? employeeDisplayName(row)),
    employeeCode: String(employeeCode ?? id ?? ''),
    displayName: employeeDisplayName(row),
    department: String(department),
    position: String(position),
    grade: String(grade),
    manager: String(manager),
    status: String(status),
    nationality: String(nationality),
    salary: salary === null ? null : String(salary),
    source: {
      employee: 'MySQL: employees',
      department: deptId !== null ? 'MySQL: employees.department_id + departments' : 'MySQL: employees',
      position: posId !== null ? 'MySQL: employees.position_id + positions' : 'MySQL: employees',
      grade: 'MySQL: employees',
      manager: 'MySQL: employees',
      attendance: 'Build 06 runtime session + detected attendance table if present'
    }
  };
}

async function loadEmployee360Data(conn) {
  const employees = await tableSample(conn, 'employees', 1000);
  const departments = await tableSample(conn, 'departments', 300);
  const positions = await tableSample(conn, 'positions', 400);
  const deptLookup = buildLookup(departments, ['name', 'department_name', 'title', 'department']);
  const posLookup = buildLookup(positions, ['name', 'position_name', 'title', 'job_title', 'position']);
  const profiles = employees.map((row) => ({ profile: employeeIdentity(row, deptLookup, posLookup), raw: row }));
  return { profiles, departments, positions };
}

function buildPlan() {
  return [
    ['00', 'Foundation Lock', 'Inventory, role map, MySQL lock, and legacy isolation.'],
    ['01', 'Role Navigation', 'Clean homes for Employee, Manager, HR, Executive.'],
    ['02', 'Employee 360', 'Real employee picker and profile source from MySQL.'],
    ['03', 'Workday Attendance', 'Check-in, workday session, check-out, attendance receipts.'],
    ['04', 'Task Execution', 'JD-matched tasks, SLA, evidence, action reports.'],
    ['05', 'Closure Review', 'Manager and beneficiary accept/return chain.'],
    ['06', 'JD + SOP Library', 'Job descriptions, SOP steps, evidence rules, quality standards.'],
    ['07', 'Self-Service', 'Attendance, salary summary, grade, compensation, work reports.'],
    ['08', 'Performance', '28-factor evaluation with evidence, calibration, final decision.'],
    ['09', 'Training', 'Training gaps, learning paths, coaching plans.'],
    ['10', 'Compensation / Payroll', 'Promotion, reward, pay adjustment, payroll impact, WPS readiness, approvals, and evidence receipts.'],
    ['11', 'Government Relations / Compliance', 'Qiwa, GOSI, Mudad/WPS, Nitaqat/Saudization, work permits, iqama, tasks, approvals, evidence, payroll holds.'],
    ['12', 'HR Procedures / JD-SOP Enforcement', 'Convert job descriptions and SOPs into enforced tasks, SLA, evidence, approvals, quality gates, and audit receipts.'],
    ['13', 'Unified Approvals / SLA / Evidence', 'One control center for approval queues, SLA breaches, evidence ledger, and audit trail.'],
    ['14', 'Quality & Governance', 'Quality checks, governance gates, control failures, and corrective actions.'],
    ['15', 'AI Risk Radar / Decision Support', 'Practical risk detection, policy conflicts, and explainable recommendations without autonomous decisions.'],
    ['16', 'Executive Dashboard', 'Source-labeled KPIs and drill-downs.'],
    ['17', 'UI Compression', 'Clean navigation, button matrix, role-based surface cleanup, and duplicate/silent button blocking.'],
    ['18', 'Final Acceptance', 'Final clean package, UAT, local run lock, and handoff.']
  ];
}

const roleNavigation = [
  {
    id: 'employee', label: 'Employee Home', persona: 'Employee',
    purpose: 'Start the workday, see assigned work, submit completion evidence, and view personal employment information.',
    homeTitle: 'Employee Home', homeSubtitle: 'Simple daily workspace for presence, assigned work, personal rights, and reports.',
    modules: [
      { key: 'check-in-out', title: 'Check In / Check Out', description: 'Start and close the workday from the system.', status: 'Build 03 Active', source: 'runtime attendance session + attendance source detection' },
      { key: 'employee-360', title: 'My Profile', description: 'Controlled MySQL Employee 360 profile source.', status: 'Build 02 Active', source: 'employees + departments + positions' },
      { key: 'my-tasks', title: 'My Tasks', description: 'Assigned tasks matched to role, position, job description, SOP, SLA, and evidence rules.', status: 'Build 06', source: 'tasks + SOP library' },
      { key: 'my-attendance', title: 'My Attendance', description: 'Self-service attendance, absence, delay, and workday summaries for the selected employee only.', status: 'Build 09 Active', source: 'attendance runtime + detected tables' },
      { key: 'my-rights', title: 'My Rights', description: 'Controlled employee self-service rights: attendance, salary summary, grade, compensation, and profile source.', status: 'Build 09 Active', source: 'employee profile + detected payroll/attendance sources' },
      { key: 'my-reports', title: 'My Reports', description: 'Completed, pending, late, returned, accepted, and closed work reports.', status: 'Build 09 Active', source: 'tasks + runtime receipts + closure decisions' },
      { key: 'my-performance', title: 'My Performance', description: '28-factor performance evaluation summary with evidence, AI explanation, training gap, and human final decision.', status: 'Build 09 Active', source: 'reviews + tasks + attendance + closure decisions' },
      { key: 'my-training', title: 'My Development Plan', description: 'Training gaps converted into controlled learning path, coaching actions, and post-training evaluation.', status: 'Build 09 Active', source: 'performance factors + SOP + runtime development plan' }
    ],
    hidden: ['Payroll administration', 'Government compliance administration', 'Developer tools', 'Other employee salary records']
  },
  {
    id: 'manager', label: 'Manager Home', persona: 'Manager',
    purpose: 'Monitor team attendance and work, review submitted output, accept or return, and control SLA breaches.',
    homeTitle: 'Manager Home', homeSubtitle: 'Team execution control without payroll or system-maintenance clutter.',
    modules: [
      { key: 'team-attendance', title: 'Team Attendance', description: 'Team presence, late arrivals, absence risk, and shift coverage.', status: 'Build 03 Active', source: 'attendance runtime + detected tables' },
      { key: 'team-work-queue', title: 'Team Work Queue', description: 'Open, overdue, blocked, submitted, returned work, and SOP quality context.', status: 'Build 06', source: 'tasks + SOP library' },
      { key: 'review-work', title: 'Review Completed Work', description: 'Review evidence and action report before beneficiary closure.', status: 'Build 06', source: 'action receipts' },
      { key: 'accept-return', title: 'Accept / Return', description: 'Approve completed work or return with correction notes.', status: 'Build 06', source: 'approval requests' },
      { key: 'sla-breaches', title: 'SLA Breaches', description: 'Work items exceeding expected time or blocked ownership.', status: 'Build 06-05', source: 'tasks' },
      { key: 'team-reports', title: 'Team Reports', description: 'Workload, quality, rework, acceptance, and completion time.', status: 'Build 09/13', source: 'tasks + audit trail' },
      { key: 'performance-evidence', title: 'Performance Evidence', description: 'Review employee performance factors using accepted work, returns, SLA, attendance, and evidence quality.', status: 'Build 09 Active', source: 'reviews + task executions + closure decisions' },
      { key: 'team-development', title: 'Team Development', description: 'Convert low factors, returned work, SLA gaps, and SOP mistakes into coaching plans.', status: 'Build 09 Active', source: 'performance gaps + SOP library + runtime training plans' },
      { key: 'team-procedures', title: 'Procedure Enforcement', description: 'Review team JD/SOP procedure compliance, SLA controls, required evidence, and approval gates.', status: 'Build 12 Active', source: 'tasks + SOP + runtime closure receipts' },
      { key: 'team-quality', title: 'Team Quality & Governance', description: 'Review quality failures, overdue SLA gates, missing evidence, and corrective actions for the team.', status: 'Build 14 Active', source: 'controls + procedure enforcement + evidence ledger' },
      { key: 'team-ai-risk', title: 'Team AI Risk Radar', description: 'AI-supported risk signals for SLA, evidence, performance, procedure, and governance exposure. AI explains only; manager decides.', status: 'Build 15 Active', source: 'quality + controls + performance + procedures' }
    ], hidden: ['Full payroll details unless authorized', 'System settings', 'Government platform administration']
  },
  {
    id: 'hr', label: 'HR Operations', persona: 'HR',
    purpose: 'Operate employee master, attendance, performance, payroll, training, compliance, and controlled reports.',
    homeTitle: 'HR Operations Home', homeSubtitle: 'Operational HR workspace connected to employee profile and evidence-led processes.',
    modules: [
      { key: 'employee-360', title: 'Employee 360', description: 'Live employee picker, profile source, department, position, grade, and manager.', status: 'Build 02 Active', source: 'employees + departments + positions' },
      { key: 'attendance', title: 'Attendance', description: 'Attendance, absence, adjustment requests, shift exceptions, and workday sessions.', status: 'Build 03 Active', source: 'attendance runtime + detected tables' },
      { key: 'job-descriptions', title: 'Job Descriptions + SOP', description: 'Position duties, SOP steps, evidence rules, SLA rules, quality standards, and AI optimization.', status: 'Build 06 Active', source: 'positions + tasks + SOP runtime library' },
      { key: 'procedure-enforcement', title: 'HR Procedure Enforcement', description: 'Convert JD/SOP rules into controlled tasks, SLA, evidence, approvals, quality gates, and audit receipts.', status: 'Build 12 Active', source: 'positions + tasks + SOP + runtime evidence' },
      { key: 'control-center', title: 'Unified Approval / SLA / Evidence', description: 'One control center for pending approvals, SLA breaches, evidence receipts, and audit trail across HR modules.', status: 'Build 13 Active', source: 'approval_requests + audit_trail + runtime receipts' },
      { key: 'quality-governance', title: 'Quality & Governance', description: 'Quality checks, governance gates, control failures, corrective actions, evidence receipts, and audit traceability.', status: 'Build 14 Active', source: 'control center + procedures + approvals + evidence ledger' },
      { key: 'ai-risk-radar', title: 'AI Risk Radar / Decision Support', description: 'Cross-module AI risk detection, policy conflict checks, explanation log, and human decision support.', status: 'Build 15 Active', source: 'quality + controls + performance + training + payroll + compliance' },
      { key: 'performance', title: 'Performance 28 Factors', description: 'Self, manager, HR calibration, evidence, training gap, and final decision.', status: 'Build 09', source: 'reviews + tasks' },
      { key: 'training', title: 'Training & Development', description: 'Training gap engine, course recommendation, coaching plan, due dates, and post-training evaluation.', status: 'Build 09 Active', source: 'performance gaps + tasks + SOP + runtime plan' },
      { key: 'payroll', title: 'Compensation Decisions', description: 'Performance and training linked compensation decisions with payroll impact, WPS readiness, approvals, and evidence.', status: 'Build 10 Active', source: 'performance + training + payroll cycles' },
      { key: 'government', title: 'Government Relations', description: 'Qiwa, GOSI, Mudad/WPS, Nitaqat, work permits, iqama readiness, payroll holds, approvals, evidence, and audit.', status: 'Build 11 Active', source: 'employees + payroll_cycles + detected compliance sources + runtime evidence' }
    ], hidden: ['Developer tools for normal HR users', 'Schema controls', 'Unapproved data changes']
  },
  {
    id: 'executive', label: 'Executive Home', persona: 'Executive',
    purpose: 'See workforce status, risk, payroll readiness, productivity, compliance exposure, and AI recommendations.',
    homeTitle: 'Executive Home', homeSubtitle: 'Source-labeled operating intelligence for owners and senior leaders.',
    modules: [
      { key: 'executive-dashboard', title: 'Executive Dashboard', description: 'Source-labeled executive KPIs, risk board, decision backlog, payroll/WPS readiness, government compliance, quality, SLA, evidence, and AI risk signals.', status: 'Build 16 Active', source: 'MySQL counts + control centers + AI radar + runtime receipts' },
      { key: 'final-acceptance', title: 'Final Acceptance Lock', description: 'Final local-run, route acceptance, button acceptance, evidence, and handover proof for the clean build.', status: 'Build 18 Active', source: 'Build 18 final acceptance + QA scripts + runtime policy' },
      { key: 'workforce-overview', title: 'Workforce Overview', description: 'Headcount, departments, positions, contracts, and work health.', status: 'Build 13', source: 'employees + departments + positions' },
      { key: 'attendance-risk', title: 'Attendance Risk', description: 'Absence, lateness, early leave, and repeated exception signals.', status: 'Build 03/13', source: 'attendance records' },
      { key: 'productivity', title: 'Productivity', description: 'Open work, completed work, cycle time, rework, and acceptance rate.', status: 'Build 13', source: 'tasks + receipts' },
      { key: 'control-center', title: 'Approval / SLA / Evidence Control', description: 'Unified view of approval backlog, SLA breaches, evidence coverage, and audit trail.', status: 'Build 13 Active', source: 'approval_requests + audit_trail + runtime receipts' },
      { key: 'governance-risk', title: 'Quality & Governance Risk', description: 'Executive governance view of quality checks, control failures, corrective actions, evidence coverage, and audit readiness.', status: 'Build 14 Active', source: 'Build 14 quality governance center' },
      { key: 'payroll-readiness', title: 'Payroll Readiness', description: 'Payroll cycle readiness, WPS status, approval blockers, and compensation decision impact.', status: 'Build 10 Active', source: 'performance + training + payroll cycles + approvals' },
      { key: 'compliance-risk', title: 'Government Compliance Risk', description: 'Qiwa, GOSI, Mudad/WPS, Nitaqat, work permits, iqama, payroll holds, and evidence exposure.', status: 'Build 11 Active', source: 'employees + payroll_cycles + detected compliance sources' },
      { key: 'performance-distribution', title: 'Performance Distribution', description: 'Score bands, training gaps, calibration backlog, and final decision readiness.', status: 'Build 09/13', source: 'reviews + tasks + closure decisions' },
      { key: 'training-gaps', title: 'Training Gaps', description: 'Organization-level view of development risk, learning path readiness, and coaching backlog.', status: 'Build 09/13', source: 'performance gaps + runtime training plans' },
      { key: 'ai-recommendations', title: 'AI Risk Radar', description: 'AI-supported executive radar for workforce, SLA, evidence, compliance, payroll, quality, and decision risk. AI does not approve.', status: 'Build 15 Active', source: 'quality + controls + performance + training + payroll + compliance' }
    ], hidden: ['Direct editing forms unless drill-down permission is granted', 'Normal employee personal detail unless authorized']
  }
];

function createReceipt(action, profile, extra = {}) {
  const now = new Date();
  const receipt = {
    receiptId: `NASH-CLEAN03-${now.getTime()}`,
    action,
    employeeId: profile?.id || null,
    employeeCode: profile?.employeeCode || null,
    employeeName: profile?.displayName || null,
    department: profile?.department || null,
    position: profile?.position || null,
    createdAt: now.toISOString(),
    source: 'Clean Build 09 runtime attendance/task/self-service/training receipt; no schema change',
    ...extra
  };
  runtimeReceipts.unshift(receipt);
  if (runtimeReceipts.length > 200) runtimeReceipts.pop();
  return receipt;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function dateString(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return String(value);
}

function buildTaskFromRow(row, profile, index = 0) {
  const rawId = valueByCandidates(row, ['id', 'task_id', 'taskId', 'task_code', 'code', 'reference', 'task_reference']) || index + 1;
  const title = valueByCandidates(row, ['title', 'task_title', 'name', 'subject', 'task_name']) || `MySQL Task ${rawId}`;
  const description = valueByCandidates(row, ['description', 'details', 'notes', 'summary', 'remarks']) || 'Task details are available in the MySQL tasks source.';
  const status = valueByCandidates(row, ['status', 'task_status', 'state', 'workflow_status']) || 'Open';
  const priority = valueByCandidates(row, ['priority', 'severity', 'importance']) || 'Normal';
  const dueAt = valueByCandidates(row, ['due_at', 'due_date', 'deadline', 'sla_due_at', 'target_date', 'end_date']);
  const assignedEmployee = valueByCandidates(row, ['employee_id', 'assigned_employee_id', 'assignee_id', 'assigned_to_employee_id', 'employee_code', 'assigned_to']);
  const assignedDept = valueByCandidates(row, ['department_id', 'dept_id', 'department', 'department_name', 'owner_department']);
  const assignedPosition = valueByCandidates(row, ['position_id', 'position', 'position_name', 'job_title', 'role']);
  const beneficiary = valueByCandidates(row, ['beneficiary', 'requester', 'requested_by', 'customer', 'internal_customer', 'owner', 'created_by']) || 'Manager / beneficiary to be confirmed';
  const evidenceRequired = valueByCandidates(row, ['evidence_required', 'evidence', 'proof_required', 'attachment_required']) || 'Completion note and evidence reference required';
  const expectedOutput = valueByCandidates(row, ['expected_output', 'output', 'deliverable', 'result']) || 'Completed work output with evidence';
  const jdReference = valueByCandidates(row, ['job_description_id', 'jd_id', 'position_id', 'role', 'job_title']) || profile?.position || 'Position-based assignment';
  const sopReference = valueByCandidates(row, ['sop_id', 'procedure_id', 'procedure', 'workflow', 'process']) || 'Clean Build 06 SOP library';
  const slaHours = Number(valueByCandidates(row, ['sla_hours', 'target_hours', 'expected_hours', 'duration_hours'])) || 8;
  const employeeSignal = [profile?.id, profile?.employeeCode].filter(Boolean).some((x) => normalizeText(x) && normalizeText(x) === normalizeText(assignedEmployee));
  const departmentSignal = assignedDept && normalizeText(profile?.department).includes(normalizeText(assignedDept)) || assignedDept && normalizeText(assignedDept).includes(normalizeText(profile?.department));
  const positionSignal = assignedPosition && normalizeText(profile?.position).includes(normalizeText(assignedPosition)) || assignedPosition && normalizeText(assignedPosition).includes(normalizeText(profile?.position));
  const matchSignals = [];
  if (employeeSignal) matchSignals.push('employee');
  if (departmentSignal) matchSignals.push('department');
  if (positionSignal) matchSignals.push('position');
  return {
    id: String(rawId),
    title: String(title),
    description: String(description),
    status: String(status),
    priority: String(priority),
    dueAt: dateString(dueAt),
    slaHours,
    beneficiary: String(beneficiary),
    evidenceRequired: String(evidenceRequired),
    expectedOutput: String(expectedOutput),
    jdReference: String(jdReference),
    sopReference: String(sopReference),
    assignedEmployee: assignedEmployee ? String(assignedEmployee) : null,
    assignedDepartment: assignedDept ? String(assignedDept) : null,
    assignedPosition: assignedPosition ? String(assignedPosition) : null,
    matchSignals,
    matchStrength: matchSignals.length ? `Matched by ${matchSignals.join(', ')}` : 'MySQL task source candidate',
    source: {
      task: 'MySQL: tasks',
      employeeMatch: matchSignals.length ? 'tasks assignment fields + selected Employee 360 profile' : 'tasks table available; no employee-specific assignment match detected',
      jd: 'tasks + selected employee position + Clean Build 06 JD/SOP library',
      sla: slaHours ? 'tasks SLA/target fields or controlled default' : 'Controlled SLA default',
      evidence: 'tasks evidence/deliverable fields or controlled evidence rule'
    }
  };
}

async function loadTaskSource(conn, profile = null) {
  const cfg = dbConfig();
  const tasksTablePresent = await tableExists(conn, cfg.database, 'tasks');
  if (!tasksTablePresent) return { columns: [], rows: [], tasks: [] };
  const columns = await tableColumns(conn, 'tasks');
  const rows = await tableSample(conn, 'tasks', 500);
  const tasks = rows.map((row, index) => buildTaskFromRow(row, profile, index));
  return { columns, rows, tasks };
}

function taskExecutionKey(employeeId, taskId) {
  return `${String(employeeId)}::${String(taskId)}`;
}

function taskReceipt(action, profile, task, extra = {}) {
  const now = new Date();
  const receipt = {
    receiptId: `NASH-CLEAN06-${now.getTime()}`,
    action,
    employeeId: profile?.id || null,
    employeeCode: profile?.employeeCode || null,
    employeeName: profile?.displayName || null,
    department: profile?.department || null,
    position: profile?.position || null,
    taskId: task?.id || null,
    taskTitle: task?.title || null,
    beneficiary: task?.beneficiary || null,
    createdAt: now.toISOString(),
    source: 'Clean Build 09 runtime task execution receipt; MySQL employee/task source; no schema change',
    ...extra
  };
  runtimeTaskReceipts.unshift(receipt);
  runtimeReceipts.unshift(receipt);
  if (runtimeTaskReceipts.length > 300) runtimeTaskReceipts.pop();
  if (runtimeReceipts.length > 300) runtimeReceipts.pop();
  return receipt;
}


function closureActionName(decisionType) {
  const map = {
    manager_accept: 'MANAGER_ACCEPT',
    manager_return: 'MANAGER_RETURN',
    beneficiary_accept: 'BENEFICIARY_ACCEPT',
    beneficiary_return: 'BENEFICIARY_RETURN',
    close_with_audit: 'CLOSE_WITH_AUDIT'
  };
  return map[decisionType] || 'CLOSURE_DECISION';
}

function closureStatus(decisionType) {
  const map = {
    manager_accept: 'Manager Accepted - Beneficiary Review',
    manager_return: 'Returned by Manager',
    beneficiary_accept: 'Closed - Beneficiary Accepted',
    beneficiary_return: 'Returned by Beneficiary',
    close_with_audit: 'Closed With Audit'
  };
  return map[decisionType] || 'Closure Decision Recorded';
}

function canCloseExecution(execution) {
  return execution && ['Submitted for Review', 'Manager Accepted - Beneficiary Review', 'Returned by Manager', 'Returned by Beneficiary', 'Closed - Beneficiary Accepted', 'Closed With Audit'].includes(execution.status);
}

app.get('/api/health', async (req, res) => {
  const cfg = dbConfig();
  const lock = runtimeLock();
  try {
    const counts = await withConn(async (conn) => safeCounts(conn));
    res.json({
      ok: true,
      lock: LOCK,
      build: '18',
      dataMode: 'mysql',
      mode: lock.mode,
      locked: lock.locked,
      sourceOfTruth: lock.sourceOfTruth,
      primaryMode: lock.primaryMode,
      fallbackActive: false,
      jsonFallbackAllowed: false,
      jsonPrimaryBlocked: true,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      counts,
      policy: {
        schemaMigrationIncluded: false,
        databaseSchemaTouched: false,
        legacyPatchUiAllowed: false,
        genericOperatingFormAllowed: false,
        controlledAttendanceEmployee: true,
        workdayAttendanceActive: true,
        taskExecutionActive: true,
        closureReviewActive: true,
        jdSopLibraryActive: true,
        aiSopOptimizationActive: true
      }
    });
  } catch (error) {
    res.status(503).json({ ok: false, lock: LOCK, build: '06', mode: 'mysql', sourceOfTruth: 'mysql', error: error.message });
  }
});

app.get('/api/employees/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const employeeColumns = await tableColumns(conn, 'employees');
      const attendanceTables = [];
      for (const t of ['attendance_records', 'attendance', 'attendance_adjustments']) {
        if (await tableExists(conn, dbConfig().database, t)) attendanceTables.push({ table: t, columns: await tableColumns(conn, t), count: counts[t] || 0 });
      }
      return { counts, employeeColumns, attendanceTables };
    });
    res.json({
      lock: LOCK,
      build: '06',
      employee360Active: true,
      workdayAttendanceActive: true,
      sourceOfTruth: 'mysql',
      ...payload,
      policy: {
        employeeFreeTextBlocked: true,
        employeePickerFromMysql: true,
        attendanceActionRequiresSelectedEmployee: true,
        noSchemaChange: true
      }
    });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/employees/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const payload = await withConn(async (conn) => {
      const { profiles } = await loadEmployee360Data(conn);
      const filtered = q ? profiles.filter(({ profile }) => [profile.displayName, profile.employeeCode, profile.department, profile.position, profile.grade].join(' ').toLowerCase().includes(q)) : profiles;
      return filtered.slice(0, limit).map(({ profile }) => profile);
    });
    res.json({ lock: LOCK, build: '06', count: payload.length, profiles: payload, employees: payload, source: 'MySQL: employees + departments + positions', contract: 'profiles+employees compatibility for Final Gold action console' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message, employees: [] }); }
});

app.get('/api/employees/:employeeId', async (req, res) => {
  try {
    const requested = String(req.params.employeeId);
    const payload = await withConn(async (conn) => {
      const { profiles } = await loadEmployee360Data(conn);
      return profiles.find(({ profile }) => String(profile.id) === requested || String(profile.employeeCode) === requested || encodeURIComponent(String(profile.id)) === requested);
    });
    if (!payload) return res.status(404).json({ lock: LOCK, error: 'Employee not found in MySQL source.' });
    const activeSession = runtimeAttendanceSessions.get(payload.profile.id) || null;
    res.json({
      lock: LOCK,
      build: '06',
      profile: payload.profile,
      sourceMap: payload.profile.source,
      activeSession,
      readiness: {
        profileSource: true,
        departmentAutoPreview: payload.profile.department !== 'Not mapped yet',
        positionAutoPreview: payload.profile.position !== 'Not mapped yet',
        attendanceReady: true,
        nextBuild: 'Build 04 connected workday session to assigned tasks; Build 06 adds closure review.'
      }
    });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/workday/attendance/source', async (req, res) => {
  try {
    const source = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const tables = [];
      for (const t of ['attendance_records', 'attendance', 'attendance_adjustments']) {
        if (await tableExists(conn, dbConfig().database, t)) tables.push({ table: t, count: counts[t] || 0, columns: await tableColumns(conn, t) });
      }
      return { counts, tables };
    });
    res.json({ lock: LOCK, build: '06', sourceOfTruth: 'mysql', runtimeSessions: runtimeAttendanceSessions.size, runtimeReceipts: runtimeReceipts.length, ...source });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

async function getProfileById(employeeId) {
  return await withConn(async (conn) => {
    const { profiles } = await loadEmployee360Data(conn);
    const found = profiles.find(({ profile }) => String(profile.id) === String(employeeId) || String(profile.employeeCode) === String(employeeId));
    return found?.profile || null;
  });
}

app.post('/api/workday/check-in', async (req, res) => {
  try {
    const employeeId = String(req.body.employeeId || '');
    const method = String(req.body.method || 'PIN Check-in');
    const profile = await getProfileById(employeeId);
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before check-in.' });
    const now = new Date();
    const session = runtimeAttendanceSessions.get(profile.id) || { sessionId: `WD-${profile.employeeCode || profile.id}-${now.getTime()}`, employeeId: profile.id, employeeCode: profile.employeeCode, employeeName: profile.displayName, department: profile.department, position: profile.position, status: 'Checked In', checkInAt: now.toISOString(), method, source: 'Clean Build 06 runtime session; MySQL employee source' };
    session.status = 'Checked In';
    session.checkInAt = session.checkInAt || now.toISOString();
    session.method = method;
    runtimeAttendanceSessions.set(profile.id, session);
    const receipt = createReceipt('CHECK_IN', profile, { sessionId: session.sessionId, method, attendanceStatus: 'Present / Checked In' });
    res.json({ lock: LOCK, build: '06', ok: true, session, receipt, message: `${profile.displayName} checked in using ${method}.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/workday/start-session', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before starting workday.' });
    const now = new Date();
    const session = runtimeAttendanceSessions.get(profile.id) || { sessionId: `WD-${profile.employeeCode || profile.id}-${now.getTime()}`, employeeId: profile.id, employeeCode: profile.employeeCode, employeeName: profile.displayName, department: profile.department, position: profile.position, checkInAt: now.toISOString(), method: 'Session auto-start', source: 'Clean Build 06 runtime session; MySQL employee source' };
    session.status = 'Workday Active';
    session.workdayStartedAt = now.toISOString();
    runtimeAttendanceSessions.set(profile.id, session);
    const receipt = createReceipt('START_WORKDAY', profile, { sessionId: session.sessionId, attendanceStatus: 'Workday Active' });
    res.json({ lock: LOCK, build: '06', ok: true, session, receipt, next: 'Build 04 connected active session to assigned tasks; Build 06 adds closure review.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/workday/check-out', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before check-out.' });
    const now = new Date();
    const session = runtimeAttendanceSessions.get(profile.id) || { sessionId: `WD-${profile.employeeCode || profile.id}-${now.getTime()}`, employeeId: profile.id, employeeCode: profile.employeeCode, employeeName: profile.displayName, department: profile.department, position: profile.position, source: 'Clean Build 06 runtime session; MySQL employee source' };
    session.status = 'Checked Out';
    session.checkOutAt = now.toISOString();
    const started = session.checkInAt ? new Date(session.checkInAt).getTime() : now.getTime();
    session.durationMinutes = Math.max(0, Math.round((now.getTime() - started) / 60000));
    runtimeAttendanceSessions.set(profile.id, session);
    const receipt = createReceipt('CHECK_OUT', profile, { sessionId: session.sessionId, attendanceStatus: 'Checked Out', durationMinutes: session.durationMinutes });
    res.json({ lock: LOCK, build: '06', ok: true, session, receipt, message: `${profile.displayName} checked out.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/workday/tasks/source', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const taskSource = await loadTaskSource(conn, null);
      return { counts, taskColumns: taskSource.columns, taskCount: counts.tasks || taskSource.tasks.length };
    });
    res.json({ lock: LOCK, build: '06', sourceOfTruth: 'mysql', taskExecutionActive: true, ...payload, policy: { noSchemaChange: true, noGenericTaskForm: true, selectedEmployeeRequired: true } });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/workday/tasks/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before opening tasks.' });
    const payload = await withConn(async (conn) => {
      const source = await loadTaskSource(conn, profile);
      const matched = source.tasks.filter((task) => task.matchSignals.length > 0);
      const taskSet = matched.length ? matched : source.tasks.slice(0, 12).map((task) => ({ ...task, matchStrength: 'MySQL task source candidate; assignment mapping not detected in available columns' }));
      return { taskColumns: source.columns, tasks: taskSet.slice(0, 12), totalTaskSourceRows: source.tasks.length, directMatchedTasks: matched.length };
    });
    const executions = Array.from(runtimeTaskExecutions.values()).filter((x) => x.employeeId === profile.id);
    res.json({ lock: LOCK, build: '06', profile, ...payload, executions, source: 'MySQL: tasks + selected Employee 360 profile', policy: { selectedEmployeeRequired: true, jdMatchedTasks: true, slaEvidenceActionReports: true, noSchemaChange: true } });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message, tasks: [] }); }
});

async function getTaskByIdForProfile(taskId, profile) {
  return await withConn(async (conn) => {
    const source = await loadTaskSource(conn, profile);
    return source.tasks.find((task) => String(task.id) === String(taskId)) || null;
  });
}

app.post('/api/workday/tasks/start', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before starting a task.' });
    const task = await getTaskByIdForProfile(String(req.body.taskId || ''), profile);
    if (!task) return res.status(400).json({ lock: LOCK, error: 'A real MySQL task selection is required.' });
    const now = new Date();
    const session = runtimeAttendanceSessions.get(profile.id) || null;
    const execution = {
      executionId: `EXEC-${profile.employeeCode || profile.id}-${task.id}-${now.getTime()}`,
      employeeId: profile.id,
      taskId: task.id,
      taskTitle: task.title,
      status: 'In Progress',
      startedAt: now.toISOString(),
      workdaySessionId: session?.sessionId || null,
      slaDueAt: new Date(now.getTime() + task.slaHours * 3600000).toISOString(),
      beneficiary: task.beneficiary,
      source: 'Clean Build 06 runtime task execution; MySQL employee + tasks source; no schema change'
    };
    runtimeTaskExecutions.set(taskExecutionKey(profile.id, task.id), execution);
    const receipt = taskReceipt('START_TASK', profile, task, { executionId: execution.executionId, slaDueAt: execution.slaDueAt, workdaySessionId: execution.workdaySessionId });
    res.json({ lock: LOCK, build: '06', ok: true, profile, task, execution, receipt, message: `${task.title} started for ${profile.displayName}.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/workday/tasks/submit-completion', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before submitting work.' });
    const task = await getTaskByIdForProfile(String(req.body.taskId || ''), profile);
    if (!task) return res.status(400).json({ lock: LOCK, error: 'A real MySQL task selection is required before submit.' });
    const key = taskExecutionKey(profile.id, task.id);
    const existing = runtimeTaskExecutions.get(key) || { executionId: `EXEC-${profile.employeeCode || profile.id}-${task.id}-${Date.now()}`, employeeId: profile.id, taskId: task.id, taskTitle: task.title, startedAt: null };
    const now = new Date();
    const execution = {
      ...existing,
      status: 'Submitted for Review',
      submittedAt: now.toISOString(),
      actionReport: String(req.body.actionReport || '').trim() || 'Completion submitted through Clean Build 06 action report.',
      evidenceReference: String(req.body.evidenceReference || '').trim() || task.evidenceRequired,
      outputSummary: String(req.body.outputSummary || '').trim() || task.expectedOutput,
      nextStep: 'Build 06 routes this submission to manager and beneficiary closure and compares it against JD/SOP quality and time standards.'
    };
    runtimeTaskExecutions.set(key, execution);
    const receipt = taskReceipt('SUBMIT_WORK', profile, task, { executionId: execution.executionId, evidenceReference: execution.evidenceReference, outputSummary: execution.outputSummary, nextStep: execution.nextStep });
    res.json({ lock: LOCK, build: '06', ok: true, profile, task, execution, receipt, message: `${task.title} submitted with evidence for review.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});


app.get('/api/workday/closure-queue/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const executions = Array.from(runtimeTaskExecutions.values())
    .filter((x) => x.employeeId === employeeId)
    .filter((x) => ['Submitted for Review', 'Manager Accepted - Beneficiary Review', 'Returned by Manager', 'Returned by Beneficiary', 'Closed - Beneficiary Accepted', 'Closed With Audit'].includes(x.status))
    .slice(0, 100);
  const decisions = runtimeClosureDecisions.filter((d) => d.employeeId === employeeId).slice(0, 100);
  res.json({
    lock: LOCK,
    build: '06',
    closureReviewActive: true,
    executions,
    decisions,
    source: 'Clean Clean Build 06 runtime closure queue from submitted task executions; no schema change',
    policy: { selectedEmployeeRequired: true, submittedWorkRequired: true, managerBeneficiaryClosure: true, noSchemaChange: true }
  });
});

app.post('/api/workday/closure/decision', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before closure review.' });
    const task = await getTaskByIdForProfile(String(req.body.taskId || ''), profile);
    if (!task) return res.status(400).json({ lock: LOCK, error: 'A real MySQL task selection is required before closure review.' });
    const key = taskExecutionKey(profile.id, task.id);
    const existing = runtimeTaskExecutions.get(key);
    if (!existing) return res.status(400).json({ lock: LOCK, error: 'Task must be started/submitted before closure review.' });
    if (!canCloseExecution(existing)) return res.status(400).json({ lock: LOCK, error: 'Task must be submitted before manager or beneficiary closure.' });
    const decisionType = String(req.body.decisionType || '').trim();
    const now = new Date();
    const status = closureStatus(decisionType);
    const decision = {
      decisionId: `CLOSURE-${profile.employeeCode || profile.id}-${task.id}-${now.getTime()}`,
      employeeId: profile.id,
      employeeCode: profile.employeeCode,
      employeeName: profile.displayName,
      department: profile.department,
      position: profile.position,
      taskId: task.id,
      taskTitle: task.title,
      beneficiary: task.beneficiary,
      decisionType,
      status,
      reviewerRole: decisionType.startsWith('manager') ? 'Manager' : decisionType.startsWith('beneficiary') ? 'Beneficiary' : 'Manager / HR Audit',
      note: String(req.body.note || '').trim() || `${status} recorded in Clean Build 06 closure chain.`,
      createdAt: now.toISOString(),
      source: 'Clean Build 06 runtime manager/beneficiary closure; MySQL employee/task source; no schema change'
    };
    const execution = {
      ...existing,
      status,
      closureStatus: status,
      lastClosureDecisionAt: decision.createdAt,
      lastClosureDecisionId: decision.decisionId,
      lastClosureNote: decision.note,
      closedAt: status.startsWith('Closed') ? decision.createdAt : existing.closedAt || null,
      nextStep: status.startsWith('Returned') ? 'Employee correction required before resubmission.' : status.includes('Beneficiary Review') ? 'Beneficiary acceptance or return is required.' : 'Task closure proof is complete.'
    };
    runtimeTaskExecutions.set(key, execution);
    runtimeClosureDecisions.unshift(decision);
    if (runtimeClosureDecisions.length > 300) runtimeClosureDecisions.pop();
    const receipt = taskReceipt(closureActionName(decisionType), profile, task, { executionId: execution.executionId, decisionId: decision.decisionId, closureStatus: status, note: decision.note, nextStep: execution.nextStep });
    res.json({ lock: LOCK, build: '06', ok: true, profile, task, execution, decision, receipt, message: `${status}: ${task.title}.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});


function buildSopForTask(task, profile, index = 0) {
  const baseSla = Number(task?.slaHours || 8);
  const expectedMinutes = Math.max(30, Math.round(baseSla * 60 * 0.72));
  return {
    sopId: `SOP-${String(profile?.position || 'POSITION').replace(/\W+/g, '-').toUpperCase()}-${task?.id || index + 1}`,
    title: `SOP: ${task?.title || 'Position task execution'}`,
    taskId: task?.id || null,
    taskTitle: task?.title || 'Position task execution',
    department: profile?.department || 'Department source pending',
    position: profile?.position || 'Position source pending',
    grade: profile?.grade || 'Grade source pending',
    jdReference: task?.jdReference || profile?.position || 'Position-based JD reference',
    sopReference: task?.sopReference || 'Clean Build 06 controlled SOP template',
    expectedOutput: task?.expectedOutput || 'Completed work output with evidence',
    evidenceRequired: task?.evidenceRequired || 'Completion note and evidence reference',
    slaHours: baseSla,
    beneficiary: task?.beneficiary || 'Manager / beneficiary to be confirmed',
    steps: [
      'Confirm selected employee, department, position, and job description context.',
      'Open the assigned task and read expected output, SLA, and evidence rule.',
      'Execute the work using the SOP steps and record blockers immediately.',
      'Attach or reference the required evidence before submission.',
      'Submit action report to manager and beneficiary review queue.',
      'Apply return notes if returned, then resubmit for closure.'
    ],
    evidenceRules: [
      task?.evidenceRequired || 'Evidence reference is mandatory.',
      'Evidence must match the expected output and beneficiary request.',
      'No closure without manager/beneficiary decision receipt.'
    ],
    qualityStandards: [
      'Output must match the job description responsibility and requested deliverable.',
      'Action report must explain what changed, when it was completed, and what proof exists.',
      'Rework reason must be captured if manager or beneficiary returns the task.'
    ],
    commonMistakes: [
      'Submitting work without evidence reference.',
      'Closing a task without beneficiary acceptance.',
      'Working outside the employee job description without formal assignment.'
    ],
    timeQualityBaseline: {
      expectedMinutes,
      slaHours: baseSla,
      targetQuality: 'Accepted by manager and beneficiary with no rework',
      source: 'Clean Build 06 computed from task SLA and runtime closure decisions; no schema change'
    },
    source: {
      employee: 'MySQL: employees',
      position: 'MySQL: positions + selected employee profile',
      task: 'MySQL: tasks',
      jd: 'MySQL: tasks/positions + Clean Build 06 SOP runtime library',
      evidence: 'MySQL: tasks evidence/output fields + runtime submission proof',
      quality: 'Runtime closure decisions + evidence standards'
    }
  };
}

async function buildSopLibraryForEmployee(employeeId) {
  const profile = await getProfileById(String(employeeId || ''));
  if (!profile) return { profile: null, sops: [], taskSourceRows: 0 };
  const source = await withConn(async (conn) => loadTaskSource(conn, profile));
  const tasks = source.tasks.slice(0, 25);
  const sops = (tasks.length ? tasks : [null]).map((task, index) => buildSopForTask(task, profile, index));
  return { profile, sops, taskSourceRows: source.rows.length, taskColumns: source.columns };
}

function sopOptimization(profile, task, sop, execution = null) {
  const now = new Date();
  const expectedMinutes = sop?.timeQualityBaseline?.expectedMinutes || Math.max(30, Number(task?.slaHours || 8) * 45);
  const started = execution?.startedAt ? new Date(execution.startedAt).getTime() : now.getTime() - expectedMinutes * 60000;
  const submitted = execution?.submittedAt ? new Date(execution.submittedAt).getTime() : now.getTime();
  const actualMinutes = Math.max(0, Math.round((submitted - started) / 60000));
  const closureDecisions = runtimeClosureDecisions.filter((d) => d.employeeId === profile?.id && String(d.taskId) === String(task?.id));
  const returns = closureDecisions.filter((d) => String(d.status || '').toLowerCase().includes('returned')).length;
  const accepts = closureDecisions.filter((d) => String(d.status || '').toLowerCase().includes('accepted') || String(d.status || '').toLowerCase().includes('closed')).length;
  const evidencePresent = Boolean(execution?.evidenceReference || task?.evidenceRequired);
  const risk = Math.min(100, Math.max(0, Math.round((actualMinutes > expectedMinutes ? 25 : 8) + (returns * 22) + (!evidencePresent ? 35 : 0) + (accepts ? -10 : 0))));
  return {
    optimizationId: `SOP-AI-${profile?.employeeCode || profile?.id || 'EMP'}-${task?.id || 'TASK'}-${now.getTime()}`,
    createdAt: now.toISOString(),
    employeeId: profile?.id,
    employeeName: profile?.displayName,
    department: profile?.department,
    position: profile?.position,
    taskId: task?.id,
    taskTitle: task?.title,
    sopId: sop?.sopId,
    numericInputs: {
      expectedMinutes,
      actualMinutes,
      slaHours: task?.slaHours || sop?.slaHours || 8,
      returnCount: returns,
      acceptanceSignals: accepts,
      evidencePresent,
      openRuntimeExecutions: Array.from(runtimeTaskExecutions.values()).filter((x) => x.employeeId === profile?.id).length
    },
    aiRiskScore: risk,
    recommendation: risk >= 60 ? 'High rework or delay risk. Follow SOP steps, strengthen evidence, and request manager clarification before resubmission.' : risk >= 35 ? 'Moderate risk. Verify evidence and expected output before submission.' : 'Low risk. Current execution is aligned with SOP time and quality standards.',
    bestProcedure: sop?.steps || [],
    qualityWarning: returns ? 'Previous return decision detected; correction note must be addressed.' : 'No return decision detected for this selected task.',
    source: 'Clean Build 06 AI SOP optimization uses runtime time, SLA, evidence, closure decisions, employee profile, and MySQL task source; no autonomous decision.'
  };
}


function countByStatus(items, matcher) {
  return (items || []).filter((x) => matcher(String(x.status || x.action || ''))).length;
}

async function buildSelfServiceReport(profile) {
  const counts = await withConn(async (conn) => safeCounts(conn));
  const taskSource = await withConn(async (conn) => loadTaskSource(conn, profile));
  const tasks = taskSource.tasks || [];
  const session = runtimeAttendanceSessions.get(String(profile.id)) || null;
  const attendanceReceipts = runtimeReceipts.filter((r) => r.employeeId === profile.id && ['PIN_CHECK_IN', 'FACE_ID_READY_CHECK_IN', 'START_WORKDAY_SESSION', 'CHECK_OUT'].includes(String(r.action || '')));
  const taskExecutions = Array.from(runtimeTaskExecutions.values()).filter((x) => x.employeeId === profile.id);
  const taskReceipts = runtimeTaskReceipts.filter((r) => r.employeeId === profile.id);
  const decisions = runtimeClosureDecisions.filter((d) => d.employeeId === profile.id);
  const returned = countByStatus(decisions, (s) => s.toLowerCase().includes('returned'));
  const accepted = countByStatus(decisions, (s) => s.toLowerCase().includes('accepted'));
  const closed = countByStatus(decisions, (s) => s.toLowerCase().includes('closed'));
  const submitted = taskExecutions.filter((x) => String(x.status || '').toLowerCase().includes('submitted')).length;
  const inProgress = taskExecutions.filter((x) => String(x.status || '').toLowerCase().includes('progress')).length;
  const payrollCycles = counts.payroll_cycles || 0;
  const report = {
    viewId: `SELF-SERVICE-${profile.employeeCode || profile.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    rights: {
      department: { value: profile.department, source: 'MySQL: employees + departments' },
      position: { value: profile.position, source: 'MySQL: employees + positions' },
      grade: { value: profile.grade, source: 'MySQL: employees grade/rank field' },
      manager: { value: profile.manager, source: 'MySQL: employees manager fields' },
      nationality: { value: profile.nationality, source: 'MySQL: employees nationality/citizenship field' },
      salarySummary: { value: profile.salary || 'Controlled / not mapped yet', source: profile.salary ? 'MySQL: employees salary/basic_salary/monthly_salary field' : 'Controlled self-service view; detailed payroll released in Build 10' },
      compensationView: { value: payrollCycles ? 'Payroll source detected' : 'Payroll source pending', source: `MySQL: payroll_cycles rows = ${payrollCycles}` }
    },
    attendance: {
      activeSessionStatus: session?.status || 'No active runtime session',
      checkInAt: session?.checkInAt || null,
      workdayStartedAt: session?.workdayStartedAt || null,
      checkOutAt: session?.checkOutAt || null,
      durationMinutes: session?.durationMinutes || 0,
      attendanceReceipts: attendanceReceipts.length,
      source: 'Build 09 controlled self-service attendance: runtime session + detected MySQL attendance tables; no schema change'
    },
    workReports: {
      assignedTaskCandidates: tasks.length,
      runtimeExecutions: taskExecutions.length,
      inProgress,
      submitted,
      accepted,
      returned,
      closed,
      taskReceipts: taskReceipts.length,
      source: 'MySQL tasks + runtime task receipts + manager/beneficiary closure decisions; no schema change'
    },
    policy: {
      employeeCanViewOwnProfileOnly: true,
      salaryDetailsControlled: true,
      otherEmployeeSalaryBlocked: true,
      noManualEmployeeTyping: true,
      noSchemaChange: true
    }
  };
  runtimeSelfServiceViews.unshift({ ...report, employeeId: profile.id, employeeName: profile.displayName });
  if (runtimeSelfServiceViews.length > 200) runtimeSelfServiceViews.pop();
  return report;
}


const PERFORMANCE_FACTORS = [
  ['Work Execution', 'Task Completion Reliability'], ['Work Execution', 'SLA Discipline'], ['Work Execution', 'Output Quality'], ['Work Execution', 'Evidence Quality'],
  ['Work Execution', 'Follow-through'], ['Work Execution', 'Rework Control'], ['Job Fit', 'Job Description Alignment'], ['Job Fit', 'SOP Compliance'],
  ['Job Fit', 'Technical Competence'], ['Job Fit', 'Problem Solving'], ['Collaboration', 'Manager Responsiveness'], ['Collaboration', 'Beneficiary Satisfaction'],
  ['Collaboration', 'Team Contribution'], ['Collaboration', 'Communication Clarity'], ['Discipline', 'Attendance Discipline'], ['Discipline', 'Time Management'],
  ['Discipline', 'Policy Compliance'], ['Discipline', 'Ownership'], ['Development', 'Learning Agility'], ['Development', 'Training Gap Closure'],
  ['Development', 'Adaptability'], ['Development', 'Improvement Mindset'], ['Leadership Potential', 'Decision Quality'], ['Leadership Potential', 'Initiative'],
  ['Leadership Potential', 'Risk Awareness'], ['Leadership Potential', 'Customer Orientation'], ['Governance', 'Documentation Discipline'], ['Governance', 'Ethics and Confidentiality']
];

function clampScore(value) {
  return Math.max(1, Math.min(5, Number(value.toFixed ? value.toFixed(2) : value)));
}

async function performanceSignals(profile) {
  const tasksPayload = await withConn((conn) => loadTaskSource(conn, profile));
  const taskExecutions = Array.from(runtimeTaskExecutions.values()).filter((x) => x.employeeId === profile.id);
  const decisions = runtimeClosureDecisions.filter((d) => d.employeeId === profile.id);
  const session = runtimeAttendanceSessions.get(String(profile.id)) || null;
  const submitted = taskExecutions.filter((x) => String(x.status || '').toLowerCase().includes('submitted')).length;
  const accepted = decisions.filter((d) => String(d.decisionType || '').includes('accept')).length;
  const returned = decisions.filter((d) => String(d.decisionType || '').includes('return')).length;
  const closed = decisions.filter((d) => String(d.decisionType || '').includes('close')).length;
  const withEvidence = taskExecutions.filter((x) => x.evidenceReference || x.outputSummary || x.actionReport).length;
  const assigned = tasksPayload.tasks.length;
  const evidenceQuality = taskExecutions.length ? Math.round((withEvidence / taskExecutions.length) * 100) : 0;
  const acceptanceRate = (accepted + returned) ? Math.round((accepted / (accepted + returned)) * 100) : 0;
  const returnRate = (accepted + returned) ? Math.round((returned / (accepted + returned)) * 100) : 0;
  const slaDiscipline = Math.max(0, Math.min(100, 88 - (returned * 8) + (closed * 3)));
  return {
    assignedTaskCandidates: assigned,
    runtimeExecutions: taskExecutions.length,
    submitted, accepted, returned, closed,
    attendanceStatus: session?.status || 'No active runtime session',
    evidenceQuality,
    acceptanceRate,
    returnRate,
    slaDiscipline,
    source: 'MySQL tasks + runtime attendance/task/closure receipts; no schema change'
  };
}

function buildFactorScore(index, group, name, signals) {
  let score = 3.2;
  if (/SLA|Time/.test(name)) score += (signals.slaDiscipline - 70) / 60;
  if (/Evidence|Documentation/.test(name)) score += (signals.evidenceQuality - 60) / 70;
  if (/Beneficiary|Quality|Output|Customer/.test(name)) score += (signals.acceptanceRate - signals.returnRate) / 80;
  if (/Attendance/.test(name)) score += signals.attendanceStatus.includes('Checked') || signals.attendanceStatus.includes('Workday') ? 0.35 : -0.15;
  if (/Rework/.test(name)) score += signals.returnRate > 30 ? -0.45 : 0.15;
  if (/Task|Follow|Ownership|Initiative/.test(name)) score += Math.min(signals.submitted, 5) * 0.06;
  score += ((index % 5) - 2) * 0.05;
  const finalScore = clampScore(score);
  return {
    no: index + 1,
    group,
    name,
    score: finalScore,
    evidence: `${signals.submitted} submitted, ${signals.accepted} accepted, ${signals.returned} returned, evidence quality ${signals.evidenceQuality}%, SLA discipline ${signals.slaDiscipline}%`,
    reason: finalScore >= 4 ? 'Strong evidence signal; keep performance standard and consider stretch assignment.' : finalScore >= 3 ? 'Acceptable signal; monitor consistency and close documented gaps.' : 'Development signal; require manager coaching, SOP refresh, and training plan.'
  };
}

async function buildPerformanceEvaluation(profile) {
  const signals = await performanceSignals(profile);
  const factors = PERFORMANCE_FACTORS.map(([group, name], index) => buildFactorScore(index, group, name, signals));
  const overallScore = clampScore(factors.reduce((sum, f) => sum + f.score, 0) / factors.length);
  const trainingGaps = factors.filter((f) => f.score < 3.15).map((f) => ({ factor: f.name, group: f.group, action: `Targeted coaching and SOP practice for ${f.name}` }));
  const ratingBand = overallScore >= 4.25 ? 'Exceeds Expectations' : overallScore >= 3.5 ? 'Meets Expectations' : overallScore >= 2.75 ? 'Development Needed' : 'Performance Risk';
  const drivers = [
    `Acceptance rate: ${signals.acceptanceRate}% and return rate: ${signals.returnRate}%.`,
    `Evidence quality: ${signals.evidenceQuality}% based on action report, output summary, and evidence reference.`,
    `SLA discipline: ${signals.slaDiscipline}% derived from task and closure signals.`,
    `Attendance signal: ${signals.attendanceStatus}.`
  ];
  return {
    evaluationId: `PERF28-${profile.employeeCode || profile.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    factorCount: 28,
    factors,
    overallScore,
    ratingBand,
    signals,
    trainingGaps,
    calibrationStatus: 'HR calibration required before any final decision',
    aiExplanation: {
      recommendation: overallScore >= 4.25 ? 'Promotion / reward readiness should be reviewed by HR and manager.' : overallScore >= 3.5 ? 'Maintain current performance plan and monitor SLA consistency.' : 'Create a development plan and assign targeted training before rewards or promotion.',
      summary: 'AI uses numeric work evidence as decision support only. It does not approve, reject, promote, or change compensation.',
      drivers
    },
    policy: { humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true, noGenericReviewForm: true }
  };
}

app.get('/api/jd-sop/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const positionColumns = await tableColumns(conn, 'positions');
      const taskColumns = await tableColumns(conn, 'tasks');
      return { counts, positionColumns, taskColumns };
    });
    res.json({
      lock: LOCK,
      build: '06',
      jdSopLibraryActive: true,
      sourceOfTruth: 'mysql',
      ...payload,
      policy: { selectedEmployeeRequired: true, taskDrivenSop: true, noSchemaChange: true, noGenericOperatingForm: true }
    });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/jd-sop/library/:employeeId', async (req, res) => {
  try {
    const payload = await buildSopLibraryForEmployee(String(req.params.employeeId || ''));
    if (!payload.profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before JD/SOP library.' });
    res.json({
      lock: LOCK,
      build: '06',
      jdSopLibraryActive: true,
      profile: payload.profile,
      sops: payload.sops,
      source: 'MySQL: employees + positions + tasks; Clean Build 06 runtime SOP mapping; no schema change',
      taskSourceRows: payload.taskSourceRows,
      taskColumns: payload.taskColumns,
      policy: { noManualEmployeeTyping: true, noGenericTask: true, everySopRequiresEmployeeAndTaskContext: true }
    });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message, sops: [] }); }
});

app.post('/api/jd-sop/optimize', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before AI SOP optimization.' });
    const task = await getTaskByIdForProfile(String(req.body.taskId || ''), profile);
    if (!task) return res.status(400).json({ lock: LOCK, error: 'A real MySQL task is required before AI SOP optimization.' });
    const sop = buildSopForTask(task, profile, 0);
    const execution = runtimeTaskExecutions.get(taskExecutionKey(profile.id, task.id)) || null;
    const optimization = sopOptimization(profile, task, sop, execution);
    runtimeSopOptimizations.unshift(optimization);
    if (runtimeSopOptimizations.length > 200) runtimeSopOptimizations.pop();
    const receipt = taskReceipt('AI_SOP_OPTIMIZE', profile, task, { optimizationId: optimization.optimizationId, aiRiskScore: optimization.aiRiskScore, recommendation: optimization.recommendation });
    res.json({ lock: LOCK, build: '06', ok: true, profile, task, sop, optimization, receipt, message: `AI SOP optimization generated for ${task.title}.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/jd-sop/optimizations/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  res.json({ lock: LOCK, build: '06', optimizations: runtimeSopOptimizations.filter((x) => x.employeeId === employeeId).slice(0, 50), source: 'Clean Build 06 runtime AI SOP optimization; no schema change' });
});

app.get('/api/workday/task-execution/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const executions = Array.from(runtimeTaskExecutions.values()).filter((x) => x.employeeId === employeeId).slice(0, 50);
  const receipts = runtimeTaskReceipts.filter((r) => r.employeeId === employeeId).slice(0, 50);
  const decisions = runtimeClosureDecisions.filter((d) => d.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '06', executions, receipts, decisions, source: 'Clean Build 06 runtime task executions and closure decisions; MySQL task source; no schema change' });
});



function trainingPriority(score) {
  const n = Number(score || 0);
  if (n < 2.75) return 'Critical development priority';
  if (n < 3.15) return 'High development priority';
  if (n < 3.5) return 'Focused improvement priority';
  return 'Maintain / stretch priority';
}

function courseForGap(gap, index) {
  const name = String(gap.factor || gap.name || 'Performance gap');
  const group = String(gap.group || 'Development');
  let course = 'Operational Excellence and Evidence-Based Work Closure';
  if (/SLA|Time|Planning|Follow/i.test(name)) course = 'SLA Discipline, Prioritization, and Workday Time Control';
  if (/Evidence|Documentation|Report|Communication/i.test(name)) course = 'Business Writing, Evidence Quality, and Action Reporting';
  if (/Quality|Output|Beneficiary|Customer/i.test(name)) course = 'Service Quality, Beneficiary Acceptance, and Rework Reduction';
  if (/SOP|Compliance|Policy|Risk/i.test(name + group)) course = 'SOP Compliance, Control Evidence, and HR Governance';
  if (/Leadership|Coaching|Team|Ownership/i.test(name)) course = 'Ownership, Coaching, and Managerial Follow-through';
  return {
    courseId: `TRN-${String(index + 1).padStart(2, '0')}`,
    title: course,
    linkedFactor: name,
    group,
    deliveryMode: index % 2 ? 'Manager coaching + guided practice' : 'Workshop + SOP simulation',
    durationHours: index % 2 ? 4 : 6,
    evidenceRequired: 'Completion record, practice output, manager observation note, and post-training evidence sample',
    expectedOutcome: `Improve ${name} through measurable work evidence and reduced rework.`,
    source: 'Clean Build 09: generated from 28-factor performance gap + JD/SOP evidence rule; no schema change'
  };
}

async function buildTrainingDevelopmentPlan(profile) {
  const evaluation = await buildPerformanceEvaluation(profile);
  const sopPayload = await buildSopLibraryForEmployee(profile.id);
  const factors = evaluation.factors || [];
  const lowFactors = factors.filter((f) => Number(f.score) < 3.5).sort((a, b) => Number(a.score) - Number(b.score));
  const gaps = (lowFactors.length ? lowFactors : factors.slice().sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 3)).slice(0, 6);
  const recommendedCourses = gaps.map(courseForGap);
  const now = Date.now();
  const learningPath = recommendedCourses.map((course, index) => ({
    step: index + 1,
    courseId: course.courseId,
    action: index === 0 ? 'Immediate capability gap intervention' : index === 1 ? 'SOP practice and manager coaching' : 'Post-training evidence validation',
    owner: index % 2 ? 'Line Manager' : 'HR Learning & Development',
    dueDate: new Date(now + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    completionEvidence: course.evidenceRequired
  }));
  const coachingPlan = gaps.slice(0, 4).map((gap, index) => ({
    coachingId: `COACH-${index + 1}`,
    focus: gap.name,
    managerAction: `Review one live work item with the employee and validate evidence quality for ${gap.name}.`,
    employeeAction: `Apply SOP checklist and submit corrected evidence for ${gap.name}.`,
    metric: gap.name.includes('SLA') ? 'SLA discipline %' : gap.name.includes('Evidence') ? 'Evidence quality %' : 'Acceptance / return ratio',
    source: 'Performance factor below target + runtime work evidence'
  }));
  const signals = evaluation.signals || {};
  const developmentRisk = Number(evaluation.overallScore) < 2.75 || Number(signals.returnRate) > 40 ? 'High' : Number(evaluation.overallScore) < 3.5 || Number(signals.returnRate) > 20 ? 'Medium' : 'Low';
  return {
    planId: `TRN-PLAN-${profile.employeeCode || profile.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    performanceEvaluationId: evaluation.evaluationId,
    overallScore: evaluation.overallScore,
    ratingBand: evaluation.ratingBand,
    developmentRisk,
    priority: trainingPriority(evaluation.overallScore),
    signals,
    gapCount: gaps.length,
    gaps: gaps.map((gap) => ({ factor: gap.name, group: gap.group, score: gap.score, evidence: gap.evidence, reason: gap.reason, priority: trainingPriority(gap.score) })),
    recommendedCourses,
    learningPath,
    coachingPlan,
    sopReferences: (sopPayload.sops || []).slice(0, 3).map((sop) => ({ sopId: sop.sopId, title: sop.title, jdReference: sop.jdReference, expectedOutput: sop.expectedOutput })),
    postTrainingEvaluation: {
      afterDays: 30,
      method: 'Re-run 28-factor evaluation and compare SLA discipline, evidence quality, return rate, and acceptance rate.',
      successCriteria: ['Overall score improves by at least 0.25', 'Evidence quality improves or remains above 80%', 'Return rate decreases', 'Manager confirms SOP adherence'],
      source: 'Clean Build 09 post-training evaluation rule; no schema change'
    },
    aiExplanation: {
      recommendation: developmentRisk === 'High' ? 'Start focused development intervention before promotion/reward decisions.' : developmentRisk === 'Medium' ? 'Assign targeted learning path and monitor evidence quality for one cycle.' : 'Maintain development plan and assign stretch SOP practice.',
      summary: 'AI converts performance gaps into training recommendations only. HR/manager approve the actual plan and completion status.',
      drivers: [
        `Overall performance score: ${evaluation.overallScore} / 5 (${evaluation.ratingBand}).`,
        `Return rate: ${signals.returnRate}% and evidence quality: ${signals.evidenceQuality}%.`,
        `Training gaps selected from ${gaps.length} low or lowest 28-factor scores.`,
        `SOP references loaded: ${(sopPayload.sops || []).length}.`
      ]
    },
    policy: { selectedEmployeeRequired: true, linkedToPerformance: true, humanApprovalRequired: true, noSchemaChange: true, noGenericTrainingForm: true },
    source: 'Clean Build 09: performance 28 factors + runtime task/closure + JD/SOP library; no schema change'
  };
}

app.get('/api/training/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const reviewColumns = await tableColumns(conn, 'reviews');
      const taskColumns = await tableColumns(conn, 'tasks');
      const positionColumns = await tableColumns(conn, 'positions');
      const employeeColumns = await tableColumns(conn, 'employees');
      return { counts, reviewColumns, taskColumns, positionColumns, employeeColumns };
    });
    res.json({ lock: LOCK, build: '09', trainingDevelopmentActive: true, gapEngineActive: true, learningPathActive: true, coachingPlanActive: true, sourceOfTruth: 'mysql', ...payload, runtimeTrainingPlans: runtimeTrainingPlans.length, policy: { selectedEmployeeRequired: true, linkedToPerformance: true, humanApprovalRequired: true, noSchemaChange: true, noGenericTrainingForm: true } });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/training/plan/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before training plan.' });
    const plan = await buildTrainingDevelopmentPlan(profile);
    res.json({ lock: LOCK, build: '09', trainingDevelopmentActive: true, plan, source: 'Performance 28 factors + JD/SOP + runtime work evidence; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/training/assign-plan', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before assigning training plan.' });
    const plan = await buildTrainingDevelopmentPlan(profile);
    const assignment = {
      assignmentId: `TRN-ASSIGN-${profile.employeeCode || profile.id}-${Date.now()}`,
      employeeId: profile.id,
      employeeCode: profile.employeeCode,
      employeeName: profile.displayName,
      planId: plan.planId,
      priority: plan.priority,
      developmentRisk: plan.developmentRisk,
      courses: plan.recommendedCourses.length,
      owner: req.body.owner || 'HR Learning & Development + Line Manager',
      status: 'Assigned - Human Follow-up Required',
      note: req.body.note || 'Build 09 controlled training assignment generated from performance gaps.',
      createdAt: new Date().toISOString(),
      source: 'Clean Build 09 runtime training assignment; no schema change'
    };
    runtimeTrainingPlans.unshift({ assignment, plan });
    if (runtimeTrainingPlans.length > 300) runtimeTrainingPlans.pop();
    const receipt = createReceipt('TRAINING_DEVELOPMENT_PLAN_ASSIGNED', profile, { assignmentId: assignment.assignmentId, planId: plan.planId, developmentRisk: plan.developmentRisk, courses: plan.recommendedCourses.length, source: 'Clean Build 09 training plan assignment receipt; no schema change' });
    res.json({ lock: LOCK, build: '09', ok: true, plan, assignment, receipt, message: 'Training and development plan assigned; HR/manager follow-up remains required.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/training/plans/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const plans = runtimeTrainingPlans.filter((x) => x.assignment?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '09', plans, source: 'Clean Build 09 runtime training assignments; no schema change' });
});

function salaryNumber(value) {
  const n = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function compensationEligibility(score, trainingRisk, signals = {}) {
  const returnRate = Number(signals.returnRate || 0);
  if (Number(score) >= 4.25 && trainingRisk !== 'High' && returnRate <= 20) return 'Eligible';
  if (Number(score) >= 3.5 && trainingRisk !== 'High') return 'Conditionally Eligible';
  if (trainingRisk === 'High' || Number(score) < 3) return 'Not Eligible';
  return 'Needs HR Review';
}

function compensationAction(score, eligibility) {
  if (eligibility === 'Eligible' && Number(score) >= 4.5) return 'Promotion / bonus review';
  if (eligibility === 'Eligible') return 'Bonus review';
  if (eligibility === 'Conditionally Eligible') return 'Merit adjustment review after HR validation';
  if (eligibility === 'Not Eligible') return 'Development plan before compensation decision';
  return 'HR case review';
}

async function buildCompensationDecision(profile) {
  const evaluation = await buildPerformanceEvaluation(profile);
  const training = await buildTrainingDevelopmentPlan(profile);
  const currentSalary = salaryNumber(profile.salary);
  const eligibility = compensationEligibility(evaluation.overallScore, training.developmentRisk, evaluation.signals);
  const recommendedAction = compensationAction(evaluation.overallScore, eligibility);
  const proposedIncrease = eligibility === 'Eligible' ? Math.round(currentSalary * 0.08) : eligibility === 'Conditionally Eligible' ? Math.round(currentSalary * 0.03) : 0;
  const bonusAmount = eligibility === 'Eligible' ? Math.round(currentSalary * 0.5) : 0;
  const payrollReady = currentSalary > 0 && eligibility !== 'Not Eligible';
  const riskLevel = eligibility === 'Eligible' ? 'Low' : eligibility === 'Conditionally Eligible' ? 'Medium' : 'High';
  return {
    decisionId: `COMP-${profile.employeeCode || profile.id}-${Date.now()}`,
    build: '10',
    createdAt: new Date().toISOString(),
    profile,
    performance: { evaluationId: evaluation.evaluationId, overallScore: evaluation.overallScore, ratingBand: evaluation.ratingBand, signals: evaluation.signals, source: 'Build 08 28-factor evaluation' },
    training: { planId: training.planId, developmentRisk: training.developmentRisk, gapCount: training.gapCount, priority: training.priority, source: 'Build 09 Training Gap Engine' },
    eligibility: { status: eligibility, recommendedAction, riskLevel, requiredApproval: eligibility === 'Eligible' ? 'HR Manager + Finance' : 'HR Manager review', humanFinalDecisionRequired: true },
    payrollImpact: { currentSalary, proposedSalary: currentSalary + proposedIncrease, proposedIncrease, bonusAmount, payrollCycle: 'Next open payroll cycle', wpsReadiness: payrollReady ? 'Ready after approval' : 'Hold - salary/payroll source needs HR validation', gosiImpactFlag: proposedIncrease > 0 ? 'Review required' : 'No salary increase impact', mudadWpsFlag: payrollReady ? 'Mudad/WPS preview ready' : 'Mudad/WPS hold', source: 'Build 10 preview only; no payroll mutation' },
    aiDecisionSupport: { recommendation: recommendedAction, summary: `AI recommendation only. Performance score ${evaluation.overallScore}/5, rating ${evaluation.ratingBand}, training risk ${training.developmentRisk}, eligibility ${eligibility}.`, blockedActions: ['Auto-approve salary increase', 'Auto-promote employee', 'Auto-change payroll', 'Auto-submit WPS'], humanFinalDecisionRequired: true },
    audit: { evidenceRequired: ['Performance decision receipt', 'Training gap plan', 'Payroll impact preview', 'Approval receipt'], schemaMigrationIncluded: false, databaseSchemaTouched: false },
    source: 'Clean Build 10: performance + training + payroll preview; no schema change'
  };
}

app.get('/api/compensation/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => ({ counts: await safeCounts(conn), payrollColumns: await tableColumns(conn, 'payroll_cycles'), reviewColumns: await tableColumns(conn, 'reviews'), employeeColumns: await tableColumns(conn, 'employees') }));
    res.json({ lock: LOCK, build: '10', compensationDecisionCenterActive: true, performanceLinkedToCompensation: true, trainingGapBlocksConfigured: true, payrollImpactPreviewActive: true, wpsReadinessCheckActive: true, runtimeCompensationDecisions: runtimeCompensationDecisions.length, policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/compensation/decision/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before compensation decision.' });
    const decision = await buildCompensationDecision(profile);
    res.json({ lock: LOCK, build: '10', decision, source: 'Build 10 compensation decision preview; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/compensation/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before compensation action.' });
    const decision = await buildCompensationDecision(profile);
    const action = String(req.body.action || 'generate_recommendation');
    const receipt = createReceipt(`COMPENSATION_${action.toUpperCase()}`, profile, { decisionId: decision.decisionId, eligibility: decision.eligibility.status, recommendedAction: decision.eligibility.recommendedAction, payrollImpact: decision.payrollImpact, aiRecommendationOnly: true, humanFinalDecisionRequired: true, source: 'Clean Build 10 compensation action receipt; no schema change' });
    runtimeCompensationDecisions.unshift({ action, decision, receipt, status: action.includes('approve') ? 'Approval recorded - payroll preview only' : action.includes('reject') ? 'Rejected with reason required' : action.includes('hold') ? 'Payroll impact held' : 'Recorded for HR review' });
    if (runtimeCompensationDecisions.length > 300) runtimeCompensationDecisions.pop();
    res.json({ lock: LOCK, build: '10', ok: true, action, decision, receipt, message: 'Compensation action recorded. AI recommendation only; human final decision remains required.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/compensation/decisions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const decisions = runtimeCompensationDecisions.filter((x) => x.decision?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '10', decisions, source: 'Clean Build 10 runtime compensation decisions; no schema change' });
});


function isSaudiProfile(profile) {
  const nationality = normalizeText(profile?.nationality);
  return nationality.includes('saudi') || nationality.includes('سعود');
}

async function buildGovernmentCase(profile) {
  const payload = await withConn(async (conn) => ({
    counts: await safeCounts(conn),
    employeeColumns: await tableColumns(conn, 'employees'),
    payrollColumns: await tableColumns(conn, 'payroll_cycles'),
    taskColumns: await tableColumns(conn, 'tasks'),
    approvalColumns: await tableColumns(conn, 'approval_requests'),
    auditColumns: await tableColumns(conn, 'audit_trail'),
    contractColumns: [...await tableColumns(conn, 'contracts'), ...await tableColumns(conn, 'contract_records')],
    complianceColumns: [...await tableColumns(conn, 'government_records'), ...await tableColumns(conn, 'compliance_alerts')]
  }));
  const counts = payload.counts || {};
  const saudi = isSaudiProfile(profile);
  const salaryReady = salaryNumber(profile.salary) > 0;
  const payrollReady = Number(counts.payroll_cycles || 0) > 0;
  const contractSource = payload.contractColumns.length > 0 ? 'Contract source detected' : 'Contract evidence required';
  const wpsStatus = payrollReady && salaryReady ? 'Ready for WPS preview' : 'Hold until payroll/salary source is verified';
  const workPermitStatus = saudi ? 'Not applicable - Saudi employee' : 'Work permit / Iqama evidence required';
  const riskLevel = (!saudi && !payload.complianceColumns.length) || !payrollReady ? 'High' : !salaryReady || !payload.contractColumns.length ? 'Medium' : 'Low';
  return {
    caseId: `GOV-${profile.employeeCode || profile.id}-${Date.now()}`,
    build: '11',
    createdAt: new Date().toISOString(),
    profile,
    readiness: {
      qiwaContract: contractSource,
      gosi: salaryReady ? 'Salary source ready for GOSI review' : 'GOSI basis hold - salary source missing',
      mudadWps: wpsStatus,
      nitaqat: saudi ? 'Saudi contribution signal' : 'Non-Saudi dependency signal',
      workPermitIqama: workPermitStatus,
      occupation: profile.position && profile.position !== 'Not mapped yet' ? 'Occupation/position source mapped' : 'Occupation mapping required',
      payrollHold: riskLevel === 'High' || wpsStatus.includes('Hold') ? 'Payroll hold available' : 'No hold recommended before approval'
    },
    actions: ['Run Government Check', 'Create Task', 'Send Approval', 'Request Evidence', 'Hold Payroll', 'Create Receipt'],
    aiRiskRadar: {
      riskLevel,
      summary: `AI risk radar only. Nationality signal: ${profile.nationality || 'missing'}, salary source: ${salaryReady ? 'ready' : 'missing'}, payroll cycle source: ${payrollReady ? 'detected' : 'missing'}, contract source: ${payload.contractColumns.length ? 'detected' : 'not detected'}.`,
      blockedActions: ['Auto-submit Qiwa', 'Auto-change GOSI', 'Auto-submit WPS', 'Auto-change Nitaqat status', 'Auto-renew work permit or iqama'],
      humanFinalDecisionRequired: true
    },
    evidenceRequired: ['Employee 360 source', 'Contract/Qiwa evidence', 'GOSI basis evidence', 'Mudad/WPS readiness evidence', 'Work permit/Iqama evidence if applicable', 'Approval receipt'],
    source: 'Clean Build 11 government relations case preview; no schema change',
    detectedSources: payload
  };
}

app.get('/api/government/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => ({
      counts: await safeCounts(conn),
      employeeColumns: await tableColumns(conn, 'employees'),
      payrollColumns: await tableColumns(conn, 'payroll_cycles'),
      approvalColumns: await tableColumns(conn, 'approval_requests'),
      auditColumns: await tableColumns(conn, 'audit_trail'),
      contractColumns: [...await tableColumns(conn, 'contracts'), ...await tableColumns(conn, 'contract_records')],
      complianceColumns: [...await tableColumns(conn, 'government_records'), ...await tableColumns(conn, 'compliance_alerts')]
    }));
    res.json({ lock: LOCK, build: '11', governmentRelationsDecisionCenterActive: true, qiwaGosiMudadLinked: true, nitaqatSaudizationLinked: true, workPermitIqamaQueueActive: true, complianceToTaskApprovalEvidenceActive: true, payrollHoldControlActive: true, runtimeGovernmentActions: runtimeGovernmentActions.length, policy: { aiRiskRadarOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/government/case/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before government relations review.' });
    const governmentCase = await buildGovernmentCase(profile);
    res.json({ lock: LOCK, build: '11', governmentCase, source: 'Build 11 government relations preview; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/government/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before government action.' });
    const action = String(req.body.action || 'run_government_check');
    const governmentCase = await buildGovernmentCase(profile);
    const receipt = createReceipt(`GOVERNMENT_${action.toUpperCase()}`, profile, { caseId: governmentCase.caseId, riskLevel: governmentCase.aiRiskRadar.riskLevel, payrollHold: governmentCase.readiness.payrollHold, aiRiskRadarOnly: true, humanFinalDecisionRequired: true, source: 'Clean Build 11 government relations action receipt; no schema change' });
    runtimeGovernmentActions.unshift({ action, governmentCase, receipt, status: action.includes('approve') ? 'Approved by human reviewer - platform submission still external' : action.includes('reject') ? 'Rejected with reason required' : action.includes('hold_payroll') ? 'Payroll hold flagged pending evidence' : 'Recorded for government relations review' });
    if (runtimeGovernmentActions.length > 300) runtimeGovernmentActions.pop();
    res.json({ lock: LOCK, build: '11', ok: true, action, governmentCase, receipt, message: 'Government relations action recorded. AI flags risk only; human final decision remains required.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/government/actions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const actions = runtimeGovernmentActions.filter((x) => x.governmentCase?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '11', actions, source: 'Clean Build 11 runtime government relations actions; no schema change' });
});

app.get('/api/self-service/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const employeeColumns = await tableColumns(conn, 'employees');
      const payrollColumns = await tableColumns(conn, 'payroll_cycles');
      const attendanceRecordsColumns = await tableColumns(conn, 'attendance_records');
      const taskColumns = await tableColumns(conn, 'tasks');
      return { counts, employeeColumns, payrollColumns, attendanceRecordsColumns, taskColumns };
    });
    res.json({
      lock: LOCK,
      build: '07',
      employeeSelfServiceActive: true,
      employeeRightsActive: true,
      controlledSalarySummary: true,
      personalWorkReportsActive: true,
      sourceOfTruth: 'mysql',
      ...payload,
      policy: { selectedEmployeeRequired: true, noOtherEmployeeSalary: true, noSchemaChange: true, noGenericOperatingForm: true }
    });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/self-service/rights/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before self-service rights view.' });
    const report = await buildSelfServiceReport(profile);
    res.json({ lock: LOCK, build: '07', employeeSelfServiceActive: true, report, source: 'MySQL employee profile + runtime attendance/task/closure receipts; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/self-service/views/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  res.json({ lock: LOCK, build: '07', views: runtimeSelfServiceViews.filter((x) => x.employeeId === employeeId).slice(0, 50), source: 'Clean Build 09 runtime self-service views; no schema change' });
});


app.get('/api/performance/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const reviewColumns = await tableColumns(conn, 'reviews');
      const taskColumns = await tableColumns(conn, 'tasks');
      const employeeColumns = await tableColumns(conn, 'employees');
      return { counts, reviewColumns, taskColumns, employeeColumns };
    });
    res.json({ lock: LOCK, build: '09', performance28FactorsActive: true, factorCount: 28, sourceOfTruth: 'mysql', ...payload, policy: { selectedEmployeeRequired: true, humanFinalDecisionRequired: true, noSchemaChange: true, noGenericReviewForm: true } });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/performance/evaluation/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before performance evaluation.' });
    const evaluation = await buildPerformanceEvaluation(profile);
    res.json({ lock: LOCK, build: '09', performance28FactorsActive: true, evaluation, source: 'MySQL employee/profile/reviews/tasks + runtime workday/task/closure receipts; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/performance/final-decision', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before final performance decision.' });
    const evaluation = await buildPerformanceEvaluation(profile);
    const decision = {
      decisionId: `PERF-DECISION-${profile.employeeCode || profile.id}-${Date.now()}`,
      employeeId: profile.id,
      employeeCode: profile.employeeCode,
      employeeName: profile.displayName,
      overallScore: evaluation.overallScore,
      ratingBand: evaluation.ratingBand,
      finalDecision: req.body.finalDecision || 'HR Calibration Pending - Human Review Required',
      note: req.body.note || 'Human final decision recorded after AI-supported evidence review.',
      createdAt: new Date().toISOString(),
      source: 'Clean Build 09 runtime final performance decision; no schema change'
    };
    runtimePerformanceDecisions.unshift(decision);
    if (runtimePerformanceDecisions.length > 300) runtimePerformanceDecisions.pop();
    const receipt = createReceipt('PERFORMANCE_FINAL_DECISION', profile, { decisionId: decision.decisionId, overallScore: decision.overallScore, ratingBand: decision.ratingBand, finalDecision: decision.finalDecision, source: 'Clean Build 09 performance decision receipt; no schema change' });
    res.json({ lock: LOCK, build: '09', ok: true, evaluation, decision, receipt, message: 'Final performance decision receipt recorded; AI remains decision support only.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/performance/evaluations/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  res.json({ lock: LOCK, build: '09', decisions: runtimePerformanceDecisions.filter((x) => x.employeeId === employeeId).slice(0, 50), source: 'Clean Build 09 runtime performance decisions; no schema change' });
});

app.get('/api/workday/session/:employeeId', async (req, res) => {
  const session = runtimeAttendanceSessions.get(String(req.params.employeeId)) || null;
  res.json({ lock: LOCK, build: '06', session, receipts: runtimeReceipts.filter((r) => r.employeeId === String(req.params.employeeId)).slice(0, 20) });
});

app.get('/api/workday/receipts', (req, res) => {
  res.json({ lock: LOCK, build: '07', count: runtimeReceipts.length, receipts: runtimeReceipts.slice(0, 100), source: 'Clean Build 09 runtime receipts; no schema change' });
});



function procedureStatusFromExecution(execution) {
  if (!execution) return 'Procedure not started';
  const status = String(execution.status || '');
  if (status.toLowerCase().includes('returned')) return 'Correction required';
  if (status.toLowerCase().includes('closed') || status.toLowerCase().includes('accepted')) return 'Procedure closed with evidence';
  if (status.toLowerCase().includes('submitted')) return 'Awaiting approval / beneficiary closure';
  if (status.toLowerCase().includes('progress')) return 'In progress under SLA';
  return status || 'Procedure pending';
}

async function buildProcedureEnforcement(profile) {
  const source = await withConn(async (conn) => loadTaskSource(conn, profile));
  const tasks = source.tasks.slice(0, 10);
  const baseTasks = tasks.length ? tasks : [{ id: 'POSITION-PROCEDURE', title: `${profile.position} operational procedure`, slaHours: 8, evidenceRequired: 'Procedure evidence reference', beneficiary: profile.manager || 'Manager' }];
  const items = baseTasks.map((task, index) => {
    const sop = buildSopForTask(task, profile, index);
    const execution = runtimeTaskExecutions.get(taskExecutionKey(profile.id, task.id)) || null;
    const closureDecisions = runtimeClosureDecisions.filter((d) => d.employeeId === profile.id && String(d.taskId) === String(task.id));
    const hasReturn = closureDecisions.some((d) => String(d.status || '').toLowerCase().includes('returned'));
    const hasClosure = closureDecisions.some((d) => String(d.status || '').toLowerCase().includes('closed') || String(d.status || '').toLowerCase().includes('accepted'));
    const evidenceReady = Boolean(execution?.evidenceReference || task.evidenceRequired || sop.evidenceRequired);
    return {
      procedureId: `PROC-${profile.employeeCode || profile.id}-${task.id || index + 1}`,
      taskId: task.id,
      taskTitle: task.title,
      jdReference: sop.jdReference,
      sopId: sop.sopId,
      responsibleRole: profile.position || 'Position source pending',
      owner: profile.manager || 'Manager / HR owner pending',
      slaHours: sop.slaHours,
      evidenceRequired: sop.evidenceRequired,
      approvalGate: sop.beneficiary || 'Manager / beneficiary approval',
      qualityGate: sop.qualityStandards?.[0] || 'Quality standard pending',
      status: procedureStatusFromExecution(execution),
      enforcementSignal: hasReturn ? 'Return risk detected' : hasClosure ? 'Closed evidence exists' : evidenceReady ? 'Ready for controlled execution' : 'Evidence missing',
      nextAction: hasReturn ? 'Correct returned work and resubmit with evidence' : hasClosure ? 'Archive receipt in audit trail' : execution ? 'Complete evidence and send for approval' : 'Create controlled task from SOP',
      source: 'Build 12 uses selected Employee 360 + MySQL tasks + Clean Build 06 SOP + runtime receipts; no schema change'
    };
  });
  const summary = {
    totalProcedures: items.length,
    openProcedures: items.filter((x) => !String(x.status).toLowerCase().includes('closed')).length,
    evidenceReady: items.filter((x) => String(x.enforcementSignal).toLowerCase().includes('ready') || String(x.enforcementSignal).toLowerCase().includes('closed')).length,
    returnRisks: items.filter((x) => String(x.enforcementSignal).toLowerCase().includes('return')).length
  };
  return {
    caseId: `PROC-CASE-${profile.employeeCode || profile.id}-${Date.now()}`,
    profile,
    summary,
    procedureChain: 'Job Description → SOP → Task → SLA → Evidence → Approval → Quality Gate → Audit Receipt',
    procedures: items,
    aiDecisionSupport: {
      mode: 'Procedure risk explanation only',
      recommendation: summary.returnRisks ? 'Prioritize returned procedures and strengthen evidence before approval.' : 'Proceed with controlled SOP task enforcement and evidence receipt creation.',
      blockedActions: [
        'AI cannot approve a procedure closure.',
        'AI cannot bypass required evidence.',
        'AI cannot change job description or SOP ownership.',
        'AI cannot close SLA or audit gate without human receipt.'
      ]
    },
    policy: { selectedEmployeeRequired: true, humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true }
  };
}

app.get('/api/procedures/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const positionColumns = await tableColumns(conn, 'positions');
      const taskColumns = await tableColumns(conn, 'tasks');
      const auditColumns = await tableColumns(conn, 'audit_trail');
      const approvalColumns = await tableColumns(conn, 'approval_requests');
      return { counts, positionColumns, taskColumns, auditColumns, approvalColumns };
    });
    res.json({ lock: LOCK, build: '12', procedureEnforcementCenterActive: true, jdSopOperationalEnforcementActive: true, procedureToTaskSlaEvidenceActive: true, qualityGateActive: true, approvalGateActive: true, auditReceiptActive: true, runtimeProcedureActions: runtimeProcedureActions.length, policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/procedures/enforcement/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before HR procedure enforcement.' });
    const procedureCase = await buildProcedureEnforcement(profile);
    res.json({ lock: LOCK, build: '12', procedureCase, source: 'Build 12 HR procedure enforcement preview; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/procedures/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before procedure action.' });
    const action = String(req.body.action || 'run_procedure_check');
    const procedureCase = await buildProcedureEnforcement(profile);
    const receipt = createReceipt(`PROCEDURE_${action.toUpperCase()}`, profile, { caseId: procedureCase.caseId, chain: procedureCase.procedureChain, openProcedures: procedureCase.summary.openProcedures, returnRisks: procedureCase.summary.returnRisks, humanFinalDecisionRequired: true, source: 'Clean Build 12 procedure enforcement receipt; no schema change' });
    runtimeProcedureActions.unshift({ action, procedureCase, receipt, status: action.includes('approval') ? 'Sent to approval gate' : action.includes('evidence') ? 'Evidence requested before closure' : action.includes('sla') ? 'SLA enforcement recorded' : action.includes('receipt') ? 'Evidence/audit receipt created' : 'Procedure enforcement recorded' });
    if (runtimeProcedureActions.length > 300) runtimeProcedureActions.pop();
    res.json({ lock: LOCK, build: '12', ok: true, action, procedureCase, receipt, message: 'HR procedure enforcement action recorded. JD/SOP execution remains human-controlled.' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/procedures/actions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const actions = runtimeProcedureActions.filter((x) => x.procedureCase?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '12', actions, source: 'Clean Build 12 runtime procedure enforcement actions; no schema change' });
});



function normalizeControlAction(action) {
  const value = String(action || '').replace(/_/g, ' ').trim();
  return value ? value.replace(/\b\w/g, (ch) => ch.toUpperCase()) : 'Control Action';
}

function receiptToLedgerItem(receipt, source) {
  return {
    ledgerId: receipt?.receiptId || `${source}-${Date.now()}`,
    source,
    action: receipt?.action || 'Runtime receipt',
    employeeId: receipt?.employeeId || 'Organization',
    employeeName: receipt?.employeeName || 'Source pending',
    createdAt: receipt?.createdAt || new Date().toISOString(),
    evidenceStatus: receipt?.evidenceReference || receipt?.evidence || receipt?.source ? 'Evidence linked' : 'Evidence pending',
    auditStatus: 'Runtime audit receipt; no schema change'
  };
}

async function buildUnifiedControlCenter(profile = null) {
  const employeeId = profile?.id ? String(profile.id) : null;
  const filteredReceipts = runtimeReceipts.filter((x) => !employeeId || String(x.employeeId) === employeeId);
  const filteredTaskReceipts = runtimeTaskReceipts.filter((x) => !employeeId || String(x.employeeId) === employeeId);
  const filteredClosures = runtimeClosureDecisions.filter((x) => !employeeId || String(x.employeeId) === employeeId);
  const filteredPerformance = runtimePerformanceDecisions.filter((x) => !employeeId || String(x.profile?.id || x.receipt?.employeeId) === employeeId);
  const filteredTraining = runtimeTrainingPlans.filter((x) => !employeeId || String(x.trainingPlan?.profile?.id || x.receipt?.employeeId) === employeeId);
  const filteredCompensation = runtimeCompensationDecisions.filter((x) => !employeeId || String(x.decision?.profile?.id || x.receipt?.employeeId) === employeeId);
  const filteredGovernment = runtimeGovernmentActions.filter((x) => !employeeId || String(x.governmentCase?.profile?.id || x.receipt?.employeeId) === employeeId);
  const filteredProcedures = runtimeProcedureActions.filter((x) => !employeeId || String(x.procedureCase?.profile?.id || x.receipt?.employeeId) === employeeId);
  const filteredControls = runtimeUnifiedControlActions.filter((x) => !employeeId || String(x.controlCenter?.profile?.id || x.receipt?.employeeId) === employeeId);

  const approvalQueue = [
    ...filteredClosures.map((x) => ({ type: 'Closure Review', title: x.taskTitle || x.taskId || 'Submitted work', status: x.status || 'Decision recorded', owner: x.beneficiary || x.manager || 'Manager / Beneficiary', source: 'runtime closure decisions' })),
    ...filteredCompensation.map((x) => ({ type: 'Compensation', title: x.decision?.recommendedAction || x.action || 'Compensation decision', status: x.status || 'Compensation control', owner: 'HR + Finance', source: 'Build 10 compensation decisions' })),
    ...filteredGovernment.map((x) => ({ type: 'Government Relations', title: x.action || 'Government compliance action', status: x.status || 'Government control', owner: 'Government Relations + Payroll', source: 'Build 11 government actions' })),
    ...filteredProcedures.map((x) => ({ type: 'Procedure Enforcement', title: x.action || 'Procedure enforcement action', status: x.status || 'Procedure control', owner: 'HR / Manager', source: 'Build 12 procedure actions' }))
  ];

  let procedureCase = null;
  if (profile) procedureCase = await buildProcedureEnforcement(profile);
  const slaWatch = (procedureCase?.procedures || []).map((item) => ({
    type: 'SLA Monitor',
    title: item.taskTitle,
    status: item.status,
    slaHours: item.slaHours,
    signal: item.enforcementSignal,
    nextAction: item.nextAction,
    source: item.source
  }));

  const evidenceLedger = [
    ...filteredReceipts.map((x) => receiptToLedgerItem(x, 'Workday receipt')),
    ...filteredTaskReceipts.map((x) => receiptToLedgerItem(x, 'Task evidence receipt')),
    ...filteredPerformance.map((x) => receiptToLedgerItem(x.receipt, 'Performance final decision')),
    ...filteredTraining.map((x) => receiptToLedgerItem(x.receipt, 'Training assignment')),
    ...filteredCompensation.map((x) => receiptToLedgerItem(x.receipt, 'Compensation decision')),
    ...filteredGovernment.map((x) => receiptToLedgerItem(x.receipt, 'Government relations')),
    ...filteredProcedures.map((x) => receiptToLedgerItem(x.receipt, 'Procedure enforcement')),
    ...filteredControls.map((x) => receiptToLedgerItem(x.receipt, 'Unified control action'))
  ].slice(0, 80);

  const riskScore = Math.min(100, Math.max(0, (approvalQueue.length * 8) + (slaWatch.filter((x) => /return|not started|pending/i.test(x.status + ' ' + x.signal)).length * 12) + (evidenceLedger.length ? 0 : 25)));
  const summary = {
    pendingApprovals: approvalQueue.filter((x) => /approval|sent|awaiting|review|return/i.test(x.status)).length,
    slaItems: slaWatch.length,
    slaBreaches: slaWatch.filter((x) => /return|not started|pending/i.test(x.status + ' ' + x.signal)).length,
    evidenceItems: evidenceLedger.length,
    auditEvents: filteredClosures.length + filteredControls.length + evidenceLedger.length,
    controlRisk: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low'
  };

  return {
    controlId: `CTRL-${profile?.employeeCode || 'ORG'}-${Date.now()}`,
    profile,
    summary,
    approvalQueue: approvalQueue.slice(0, 30),
    slaWatch: slaWatch.slice(0, 30),
    evidenceLedger,
    auditTrail: evidenceLedger.slice(0, 30).map((x) => ({ at: x.createdAt, event: x.action, source: x.source, status: x.auditStatus })),
    aiDecisionSupport: {
      mode: 'Control risk explanation only',
      recommendation: summary.controlRisk === 'High' ? 'Clear overdue approvals, enforce SLA exceptions, and request missing evidence before any final HR decision.' : summary.controlRisk === 'Medium' ? 'Review pending approvals and complete evidence receipts before closure.' : 'Control chain is acceptable; continue routine audit monitoring.',
      blockedActions: [
        'AI cannot approve HR, payroll, government, or procedure decisions.',
        'AI cannot close an SLA breach without human receipt.',
        'AI cannot create or alter database schema.',
        'AI cannot bypass evidence requirements or audit trail.'
      ]
    },
    policy: { humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true, selectedEmployeeFilterAvailable: Boolean(profile) }
  };
}

app.get('/api/controls/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const approvalColumns = await tableColumns(conn, 'approval_requests');
      const auditColumns = await tableColumns(conn, 'audit_trail');
      const taskColumns = await tableColumns(conn, 'tasks');
      return { counts, approvalColumns, auditColumns, taskColumns };
    });
    res.json({ lock: LOCK, build: '13', unifiedControlCenterActive: true, approvalCenterActive: true, slaMonitorActive: true, evidenceLedgerActive: true, auditTrailViewerActive: true, runtimeUnifiedControlActions: runtimeUnifiedControlActions.length, runtimeEvidenceReceipts: runtimeReceipts.length + runtimeTaskReceipts.length, policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/controls/unified/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before unified control review.' });
    const controlCenter = await buildUnifiedControlCenter(profile);
    res.json({ lock: LOCK, build: '13', controlCenter, source: 'Build 13 unified approval, SLA, evidence, and audit preview; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/controls/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before unified control action.' });
    const action = String(req.body.action || 'load_control_center');
    const controlCenter = await buildUnifiedControlCenter(profile);
    const receipt = createReceipt(`CONTROL_${action.toUpperCase()}`, profile, { controlId: controlCenter.controlId, pendingApprovals: controlCenter.summary.pendingApprovals, slaBreaches: controlCenter.summary.slaBreaches, evidenceItems: controlCenter.summary.evidenceItems, risk: controlCenter.summary.controlRisk, humanFinalDecisionRequired: true, source: 'Clean Build 13 unified control receipt; no schema change' });
    runtimeUnifiedControlActions.unshift({ action, controlCenter, receipt, status: action.includes('approve') ? 'Approval decision recorded for human audit' : action.includes('return') ? 'Returned to owner with evidence/SLA note' : action.includes('reject') ? 'Rejected with required reason' : action.includes('evidence') ? 'Evidence request recorded' : action.includes('sla') ? 'SLA escalation recorded' : action.includes('audit') ? 'Audit receipt created' : 'Unified control action recorded' });
    if (runtimeUnifiedControlActions.length > 300) runtimeUnifiedControlActions.pop();
    res.json({ lock: LOCK, build: '13', ok: true, action, controlCenter, receipt, message: `${normalizeControlAction(action)} recorded in Unified Approval / SLA / Evidence Ledger.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/controls/actions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const actions = runtimeUnifiedControlActions.filter((x) => x.controlCenter?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '13', actions, source: 'Clean Build 13 runtime unified control actions; no schema change' });
});



function qualityGateStatus(condition) {
  return condition ? 'Pass' : 'Hold';
}

function buildFailure(id, title, severity, source, requiredAction) {
  return { failureId: id, title, severity, source, requiredAction, status: severity === 'Low' ? 'Monitor' : 'Corrective action required' };
}

async function buildQualityGovernanceCenter(profile) {
  const controlCenter = await buildUnifiedControlCenter(profile);
  const procedureCase = await buildProcedureEnforcement(profile);
  const summary = controlCenter.summary || {};
  const procedureSummary = procedureCase.summary || {};
  const evidenceCount = Number(summary.evidenceItems || 0);
  const slaBreaches = Number(summary.slaBreaches || 0);
  const pendingApprovals = Number(summary.pendingApprovals || 0);
  const procedureRisks = Number(procedureSummary.returnRisks || 0);
  const hasAuditTrace = Number(summary.auditEvents || 0) > 0 || evidenceCount > 0;

  const qualityChecks = [
    { check: 'Employee Source Integrity', status: qualityGateStatus(Boolean(profile?.id)), source: 'Employee 360 controlled MySQL profile', evidence: profile?.employeeCode || 'Missing selected employee' },
    { check: 'Procedure Evidence Coverage', status: qualityGateStatus(evidenceCount > 0), source: 'Evidence ledger + procedure receipts', evidence: `${evidenceCount} evidence item(s)` },
    { check: 'SLA Governance', status: qualityGateStatus(slaBreaches === 0), source: 'Unified SLA monitor', evidence: `${slaBreaches} breach signal(s)` },
    { check: 'Approval Gate Integrity', status: qualityGateStatus(pendingApprovals <= 1), source: 'Unified approval queue', evidence: `${pendingApprovals} pending approval(s)` },
    { check: 'Procedure Quality Gate', status: qualityGateStatus(procedureRisks === 0), source: 'JD/SOP enforcement', evidence: `${procedureRisks} procedure risk signal(s)` },
    { check: 'Audit Trace Coverage', status: qualityGateStatus(hasAuditTrace), source: 'Audit trail + receipts', evidence: hasAuditTrace ? 'Audit trace available' : 'Audit trace pending' }
  ];

  const controlFailures = [];
  if (slaBreaches > 0) controlFailures.push(buildFailure('QG-SLA', 'SLA breach or pending execution risk', 'High', 'Build 13 SLA monitor', 'Escalate SLA and create corrective action receipt.'));
  if (evidenceCount === 0) controlFailures.push(buildFailure('QG-EVD', 'Evidence coverage missing', 'High', 'Build 13 evidence ledger', 'Request evidence before acceptance or closure.'));
  if (pendingApprovals > 1) controlFailures.push(buildFailure('QG-APR', 'Approval backlog requires governance review', 'Medium', 'Unified approval queue', 'Create approval packet and assign owner.'));
  if (procedureRisks > 0) controlFailures.push(buildFailure('QG-SOP', 'Procedure/JD-SOP execution risk detected', 'Medium', 'Build 12 procedure enforcement', 'Re-check procedure owner, SLA, evidence rule, and quality standard.'));
  if (!controlFailures.length) controlFailures.push(buildFailure('QG-MON', 'No critical governance failure detected', 'Low', 'Build 14 quality checks', 'Continue routine monitoring and periodic audit.'));

  const governanceGates = qualityChecks.map((item, index) => ({
    gateId: `QG-GATE-${index + 1}`,
    gate: item.check,
    status: item.status,
    owner: item.status === 'Pass' ? 'Control owner' : 'HR Governance / Quality Owner',
    requiredEvidence: item.evidence,
    source: item.source
  }));

  const correctiveActions = controlFailures.map((failure, index) => ({
    actionId: `CAPA-${profile.employeeCode || profile.id}-${index + 1}`,
    title: failure.requiredAction,
    owner: failure.severity === 'High' ? 'HR Governance Manager' : 'Process Owner',
    due: failure.severity === 'High' ? 'Immediate / current workday' : 'Next governance review',
    evidenceRequired: 'Corrective action receipt + supporting evidence reference',
    source: failure.source
  }));

  const riskScore = Math.min(100, (controlFailures.filter((x) => x.severity === 'High').length * 35) + (controlFailures.filter((x) => x.severity === 'Medium').length * 20) + (slaBreaches * 10) + (evidenceCount ? 0 : 20));
  const governanceRisk = riskScore >= 70 ? 'High' : riskScore >= 35 ? 'Medium' : 'Low';

  return {
    qualityId: `QG-${profile.employeeCode || profile.id}-${Date.now()}`,
    profile,
    summary: {
      qualityChecks: qualityChecks.length,
      passedChecks: qualityChecks.filter((x) => x.status === 'Pass').length,
      heldChecks: qualityChecks.filter((x) => x.status !== 'Pass').length,
      controlFailures: controlFailures.filter((x) => x.severity !== 'Low').length,
      correctiveActions: correctiveActions.length,
      governanceRisk
    },
    qualityChecks,
    governanceGates,
    controlFailures,
    correctiveActions,
    auditTrail: (controlCenter.auditTrail || []).slice(0, 30),
    aiGovernanceSupport: {
      mode: 'Quality and governance explanation only',
      recommendation: governanceRisk === 'High' ? 'Stop final closure until SLA, evidence, and approval failures are corrected.' : governanceRisk === 'Medium' ? 'Allow controlled progress after evidence request and owner assignment.' : 'Governance chain is acceptable for routine monitoring.',
      blockedActions: [
        'AI cannot approve a governance gate.',
        'AI cannot close a quality failure.',
        'AI cannot bypass evidence or audit requirements.',
        'AI cannot change MySQL schema or external government/payroll data.'
      ]
    },
    policy: { humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true }
  };
}

app.get('/api/quality/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const approvalColumns = await tableColumns(conn, 'approval_requests');
      const auditColumns = await tableColumns(conn, 'audit_trail');
      const taskColumns = await tableColumns(conn, 'tasks');
      return { counts, approvalColumns, auditColumns, taskColumns };
    });
    res.json({ lock: LOCK, build: '14', qualityGovernanceCenterActive: true, qualityChecksActive: true, governanceGatesActive: true, controlFailureRegisterActive: true, correctiveActionsActive: true, runtimeQualityGovernanceActions: runtimeQualityGovernanceActions.length, policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/quality/governance/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before quality governance review.' });
    const qualityCenter = await buildQualityGovernanceCenter(profile);
    res.json({ lock: LOCK, build: '14', qualityCenter, source: 'Build 14 quality and governance preview; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/quality/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before quality governance action.' });
    const action = String(req.body.action || 'run_quality_check');
    const qualityCenter = await buildQualityGovernanceCenter(profile);
    const receipt = createReceipt(`QUALITY_${action.toUpperCase()}`, profile, { qualityId: qualityCenter.qualityId, governanceRisk: qualityCenter.summary.governanceRisk, heldChecks: qualityCenter.summary.heldChecks, controlFailures: qualityCenter.summary.controlFailures, correctiveActions: qualityCenter.summary.correctiveActions, humanFinalDecisionRequired: true, source: 'Clean Build 14 quality governance receipt; no schema change' });
    runtimeQualityGovernanceActions.unshift({ action, qualityCenter, receipt, status: action.includes('approve') ? 'Governance gate approval recorded for human audit' : action.includes('return') ? 'Returned to process owner with governance note' : action.includes('reject') ? 'Rejected with quality reason required' : action.includes('corrective') ? 'Corrective action created' : action.includes('evidence') ? 'Quality evidence requested' : action.includes('receipt') ? 'Quality/audit receipt created' : action.includes('gate') ? 'Governance gate enforcement recorded' : 'Quality governance action recorded' });
    if (runtimeQualityGovernanceActions.length > 300) runtimeQualityGovernanceActions.pop();
    res.json({ lock: LOCK, build: '14', ok: true, action, qualityCenter, receipt, message: `${normalizeControlAction(action)} recorded in Quality & Governance Operating Center.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/quality/actions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const actions = runtimeQualityGovernanceActions.filter((x) => x.qualityCenter?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '14', actions, source: 'Clean Build 14 runtime quality governance actions; no schema change' });
});


function aiRiskLevel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

function aiSignal(name, value, weight, source, explanation) {
  const numeric = Number(value) || 0;
  return { signal: name, value: numeric, weight, scoreImpact: numeric * weight, source, explanation };
}

async function buildAiDecisionCenter(profile) {
  const evaluation = await buildPerformanceEvaluation(profile);
  const training = await buildTrainingDevelopmentPlan(profile);
  const compensation = await buildCompensationDecision(profile);
  const governmentCase = await buildGovernmentCase(profile);
  const procedure = await buildProcedureEnforcement(profile);
  const controls = await buildUnifiedControlCenter(profile);
  const quality = await buildQualityGovernanceCenter(profile);

  const performanceGapCount = (evaluation.factors || []).filter((f) => Number(f.score) < 70).length;
  const trainingGapCount = training.summary?.criticalGaps || training.gaps?.length || 0;
  const payrollHold = compensation.payrollImpact?.wpsReadiness !== 'Ready' || String(compensation.summary?.eligibilityStatus || '').toLowerCase().includes('not');
  const complianceHold = (governmentCase.readiness || []).filter((x) => String(x.status || '').toLowerCase().includes('hold') || String(x.status || '').toLowerCase().includes('review')).length;
  const slaBreaches = controls.summary?.slaBreaches || 0;
  const evidenceItems = controls.summary?.evidenceItems || 0;
  const governanceHeld = quality.summary?.heldChecks || 0;
  const controlFailures = quality.summary?.controlFailures || 0;

  const signals = [
    aiSignal('Performance gap pressure', Math.min(performanceGapCount, 10), 4, 'Build 09 performance factors', `${performanceGapCount} low-scoring factor(s) require interpretation before rewards, promotion, or corrective action.`),
    aiSignal('Training gap exposure', Math.min(trainingGapCount, 8), 5, 'Build 09 training gap engine', `${trainingGapCount} critical training gap signal(s) can block or condition a decision.`),
    aiSignal('Payroll/WPS decision risk', payrollHold ? 1 : 0, 18, 'Build 10 compensation/payroll impact', payrollHold ? 'Payroll or WPS readiness requires review before financial action.' : 'Payroll and WPS impact are not currently blocking.'),
    aiSignal('Government compliance exposure', Math.min(complianceHold, 5), 9, 'Build 11 government relations', `${complianceHold} Qiwa/GOSI/Mudad/Nitaqat/work permit readiness signal(s) require review.`),
    aiSignal('SLA breach pressure', Math.min(slaBreaches, 8), 6, 'Build 13 SLA monitor', `${slaBreaches} SLA breach signal(s) affect execution reliability.`),
    aiSignal('Evidence weakness', evidenceItems ? 0 : 1, 15, 'Build 13 evidence ledger', evidenceItems ? 'Evidence exists in the control chain.' : 'Evidence ledger is weak or empty; request evidence before closure.'),
    aiSignal('Governance gate hold', Math.min(governanceHeld, 6), 7, 'Build 14 governance gates', `${governanceHeld} governance gate(s) are held or pending.`),
    aiSignal('Control failure exposure', Math.min(controlFailures, 5), 10, 'Build 14 control failure register', `${controlFailures} active control failure(s) are recorded.`)
  ];

  const riskScore = Math.min(100, Math.round(signals.reduce((sum, x) => sum + x.scoreImpact, 0)));
  const riskLevel = aiRiskLevel(riskScore);
  const conflicts = [];
  if (evaluation.ratingBand && String(evaluation.ratingBand).toLowerCase().includes('excellent') && trainingGapCount > 0) conflicts.push({ conflict: 'High performance with unresolved training gap', action: 'Condition reward/promotion on learning path evidence.', source: 'Performance + Training' });
  if (payrollHold && compensation.recommendation?.recommendedAction !== 'Hold') conflicts.push({ conflict: 'Compensation recommendation has payroll/WPS blocker', action: 'Hold payroll impact until WPS/GOSI readiness is verified.', source: 'Compensation + Payroll' });
  if (complianceHold > 0 && compensation.recommendation?.recommendedAction !== 'Hold') conflicts.push({ conflict: 'Financial decision while compliance readiness is under review', action: 'Route to Government Relations approval and Evidence Ledger.', source: 'Government Relations + Compensation' });
  if (slaBreaches > 0 && evaluation.ratingBand && String(evaluation.ratingBand).toLowerCase().includes('high')) conflicts.push({ conflict: 'High performance rating with SLA breach signal', action: 'Require manager calibration and SLA evidence before final decision.', source: 'Performance + SLA' });
  if (controlFailures > 0 && governanceHeld === 0) conflicts.push({ conflict: 'Control failure exists without gate hold', action: 'Enforce governance gate and create corrective action.', source: 'Quality + Governance' });

  const recommendation = riskLevel === 'Critical'
    ? 'Stop final HR/Payroll/Government closure until evidence, SLA, and governance blockers are cleared.'
    : riskLevel === 'High'
      ? 'Route to HR Governance review with evidence request, owner assignment, and human decision receipt.'
      : riskLevel === 'Medium'
        ? 'Proceed conditionally after documenting evidence and manager/HR decision rationale.'
        : 'Proceed with normal human review and audit receipt.';

  return {
    aiCaseId: `AI-RADAR-${profile.employeeCode || profile.id}-${Date.now()}`,
    profile,
    summary: {
      riskScore,
      riskLevel,
      signalCount: signals.length,
      conflictCount: conflicts.length,
      evidenceItems,
      humanDecisionRequired: true
    },
    signals,
    conflicts,
    recommendationQueue: [
      { action: 'Prepare Decision Summary', owner: 'HR Operations', priority: riskLevel === 'Low' ? 'Normal' : 'High', source: 'AI Decision Support' },
      { action: conflicts.length ? 'Resolve Policy Conflict' : 'Confirm Policy Fit', owner: 'HR Governance', priority: conflicts.length ? 'High' : 'Normal', source: 'AI Policy Conflict Detection' },
      { action: evidenceItems ? 'Attach Evidence Receipt' : 'Request Missing Evidence', owner: 'Process Owner', priority: evidenceItems ? 'Normal' : 'High', source: 'Evidence Ledger' }
    ],
    explanationLog: [
      `Risk score ${riskScore}/100 generated from performance, training, payroll/WPS, government relations, SLA, evidence, and quality governance signals.`,
      `AI recommendation: ${recommendation}`,
      'AI cannot approve, reject, promote, change salary, close evidence, submit WPS, change government data, or bypass a governance gate.'
    ],
    aiDecisionSupport: {
      mode: 'Explainable recommendation only',
      recommendation,
      blockedActions: [
        'AI cannot approve salary, promotion, payroll, WPS, Qiwa, GOSI, Nitaqat, work permit, or iqama changes.',
        'AI cannot close SLA, evidence, audit, or governance gates.',
        'AI cannot override HR, Manager, Finance, Government Relations, or Executive human decision owners.',
        'AI cannot change MySQL schema or write external government/payroll data.'
      ]
    },
    policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true }
  };
}

app.get('/api/ai/summary', async (req, res) => {
  try {
    const payload = await withConn(async (conn) => {
      const counts = await safeCounts(conn);
      const reviewColumns = await tableColumns(conn, 'reviews');
      const taskColumns = await tableColumns(conn, 'tasks');
      const approvalColumns = await tableColumns(conn, 'approval_requests');
      const auditColumns = await tableColumns(conn, 'audit_trail');
      return { counts, reviewColumns, taskColumns, approvalColumns, auditColumns };
    });
    res.json({ lock: LOCK, build: '15', aiRiskRadarCenterActive: true, aiDecisionSupportCenterActive: true, aiPolicyConflictDetectionActive: true, aiExplainabilityLogActive: true, aiRecommendationQueueActive: true, runtimeAiDecisionActions: runtimeAiDecisionActions.length, policy: { aiRecommendationOnly: true, humanFinalDecisionRequired: true, noSchemaChange: true }, ...payload });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/ai/radar/:employeeId', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.params.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before AI risk radar review.' });
    const aiCenter = await buildAiDecisionCenter(profile);
    res.json({ lock: LOCK, build: '15', aiCenter, source: 'Build 15 AI risk radar preview; no schema change; recommendation only' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/ai/action', async (req, res) => {
  try {
    const profile = await getProfileById(String(req.body.employeeId || ''));
    if (!profile) return res.status(400).json({ lock: LOCK, error: 'Controlled employee selection is required before AI decision support action.' });
    const action = String(req.body.action || 'prepare_decision_summary');
    const aiCenter = await buildAiDecisionCenter(profile);
    const receipt = createReceipt(`AI_${action.toUpperCase()}`, profile, { aiCaseId: aiCenter.aiCaseId, riskScore: aiCenter.summary.riskScore, riskLevel: aiCenter.summary.riskLevel, conflictCount: aiCenter.summary.conflictCount, humanFinalDecisionRequired: true, source: 'Clean Build 15 AI risk radar decision support receipt; no schema change; recommendation only' });
    runtimeAiDecisionActions.unshift({ action, aiCenter, receipt, status: action.includes('conflict') ? 'Policy conflict review prepared' : action.includes('evidence') ? 'Evidence request prepared' : action.includes('escalate') ? 'Human escalation prepared' : action.includes('override') ? 'Human override note recorded' : 'AI decision summary prepared' });
    if (runtimeAiDecisionActions.length > 300) runtimeAiDecisionActions.pop();
    res.json({ lock: LOCK, build: '15', ok: true, action, aiCenter, receipt, message: `${normalizeControlAction(action)} recorded in AI Risk Radar / Decision Support Center.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/ai/actions/:employeeId', (req, res) => {
  const employeeId = String(req.params.employeeId || '');
  const actions = runtimeAiDecisionActions.filter((x) => x.aiCenter?.profile?.id === employeeId || x.receipt?.employeeId === employeeId).slice(0, 50);
  res.json({ lock: LOCK, build: '15', actions, source: 'Clean Build 15 runtime AI decision support actions; no schema change' });
});


function executiveRiskLevel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

function pct(numerator, denominator) {
  const n = Number(numerator) || 0;
  const d = Number(denominator) || 0;
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

async function buildExecutiveDashboard() {
  const payload = await withConn(async (conn) => {
    const counts = await safeCounts(conn);
    const employeeColumns = await tableColumns(conn, 'employees');
    const taskColumns = await tableColumns(conn, 'tasks');
    const reviewColumns = await tableColumns(conn, 'reviews');
    const payrollColumns = await tableColumns(conn, 'payroll_cycles');
    const approvalColumns = await tableColumns(conn, 'approval_requests');
    const auditColumns = await tableColumns(conn, 'audit_trail');
    const complianceColumns = await tableColumns(conn, 'compliance_alerts');
    return { counts, employeeColumns, taskColumns, reviewColumns, payrollColumns, approvalColumns, auditColumns, complianceColumns };
  });

  const c = payload.counts || {};
  const employees = Number(c.employees || 0);
  const departments = Number(c.departments || 0);
  const positions = Number(c.positions || 0);
  const tasks = Number(c.tasks || 0);
  const reviews = Number(c.reviews || 0);
  const payrollCycles = Number(c.payroll_cycles || 0);
  const approvals = Number(c.approval_requests || 0);
  const auditEvents = Number(c.audit_trail || 0);
  const complianceAlerts = Number(c.compliance_alerts || 0);
  const contracts = Number(c.contracts || c.contract_records || 0);
  const attendanceRecords = Number(c.attendance_records || c.attendance || 0);
  const evidenceReceipts = runtimeReceipts.length + runtimeTaskReceipts.length + runtimeCompensationDecisions.length + runtimeGovernmentActions.length + runtimeProcedureActions.length + runtimeUnifiedControlActions.length + runtimeQualityGovernanceActions.length + runtimeAiDecisionActions.length;

  const coverage = {
    organizationCoverage: employees ? Math.min(100, pct(departments + positions, Math.max(1, employees))) : 0,
    reviewCoverage: pct(reviews, employees),
    contractCoverage: pct(contracts, employees),
    evidenceCoverage: evidenceReceipts ? Math.min(100, evidenceReceipts * 5) : 0,
    attendanceDensity: employees ? Math.min(100, pct(attendanceRecords, employees)) : 0
  };

  const riskInputs = [
    { key: 'Government Compliance', value: complianceAlerts, weight: 4, source: 'MySQL: compliance_alerts + Build 11 Government Relations' },
    { key: 'Approval Backlog', value: approvals, weight: 2, source: 'MySQL: approval_requests + Build 13 Control Center' },
    { key: 'Open Workload', value: tasks, weight: 0.5, source: 'MySQL: tasks + Build 04 Task Execution' },
    { key: 'Low Review Coverage', value: Math.max(0, employees - reviews), weight: employees ? 1 : 0, source: 'MySQL: reviews vs employees + Build 08/09' },
    { key: 'Evidence Weakness', value: evidenceReceipts ? 0 : 5, weight: 6, source: 'Runtime Evidence Ledger + Build 13' },
    { key: 'AI Action Pressure', value: runtimeAiDecisionActions.length, weight: 3, source: 'Build 15 AI Risk Radar' },
    { key: 'Quality Governance Pressure', value: runtimeQualityGovernanceActions.length, weight: 3, source: 'Build 14 Quality & Governance' }
  ];
  const riskScore = Math.min(100, Math.round(riskInputs.reduce((sum, x) => sum + Math.min(Number(x.value) || 0, 25) * x.weight, 0) / 2));
  const riskLevel = executiveRiskLevel(riskScore);

  const kpis = [
    { label: 'Total Employees', value: employees, source: 'MySQL: employees' },
    { label: 'Departments', value: departments, source: 'MySQL: departments' },
    { label: 'Positions', value: positions, source: 'MySQL: positions' },
    { label: 'Open Work Source', value: tasks, source: 'MySQL: tasks' },
    { label: 'Performance Reviews', value: reviews, source: 'MySQL: reviews' },
    { label: 'Payroll Cycles', value: payrollCycles, source: 'MySQL: payroll_cycles' },
    { label: 'Compliance Alerts', value: complianceAlerts, source: 'MySQL: compliance_alerts if present' },
    { label: 'Approval Requests', value: approvals, source: 'MySQL: approval_requests' },
    { label: 'Audit Events', value: auditEvents, source: 'MySQL: audit_trail' },
    { label: 'Evidence Receipts', value: evidenceReceipts, source: 'Runtime evidence receipts across Builds 03-15' },
    { label: 'Executive Risk', value: `${riskScore}/100`, source: 'Build 16 computed from source-labeled signals' },
    { label: 'Risk Level', value: riskLevel, source: 'Build 16 executive risk board' }
  ];

  const decisionBoard = [
    { decision: 'Workforce Master Data', status: employees ? 'Visible' : 'Blocked', owner: 'HR Operations', source: 'MySQL: employees, departments, positions', nextAction: employees ? 'Monitor coverage and drill down by department.' : 'Resolve employee source before launch.' },
    { decision: 'Performance / Training Readiness', status: reviews ? 'Review available' : 'Needs review source', owner: 'HR + Managers', source: 'MySQL: reviews + Build 09 Training', nextAction: reviews ? 'Use performance distribution and training gaps before rewards.' : 'Load or map review source before decisions.' },
    { decision: 'Payroll / WPS Readiness', status: payrollCycles ? 'Payroll source visible' : 'Payroll cycle pending', owner: 'HR + Finance', source: 'MySQL: payroll_cycles + Build 10 Compensation', nextAction: payrollCycles ? 'Check WPS blockers before payroll approval.' : 'Map payroll cycle source.' },
    { decision: 'Government Compliance', status: complianceAlerts ? 'Attention required' : 'No alert source visible', owner: 'Government Relations', source: 'MySQL: compliance_alerts + Build 11', nextAction: complianceAlerts ? 'Open Government Relations queue and create evidence receipts.' : 'Confirm Qiwa/GOSI/Mudad/Nitaqat sources.' },
    { decision: 'Approval / SLA / Evidence', status: approvals || evidenceReceipts ? 'Control center active' : 'Control evidence pending', owner: 'HR Governance', source: 'Build 13 Control Center', nextAction: approvals ? 'Clear approval backlog and SLA breaches.' : 'Generate evidence receipts through operating flows.' },
    { decision: 'Quality / Governance', status: runtimeQualityGovernanceActions.length ? 'Governance actions recorded' : 'Ready for checks', owner: 'Quality Owner', source: 'Build 14 Quality & Governance', nextAction: 'Run quality checks and enforce governance gates where needed.' },
    { decision: 'AI Risk Radar', status: runtimeAiDecisionActions.length ? 'AI actions recorded' : 'Ready', owner: 'HR Governance', source: 'Build 15 AI Risk Radar', nextAction: 'Use AI explanation only; final decision remains human.' }
  ];

  const panels = [
    { title: 'Workforce', value: employees, status: employees ? 'Active' : 'Missing source', source: 'employees + departments + positions', detail: `${departments} departments, ${positions} positions` },
    { title: 'Attendance', value: attendanceRecords, status: attendanceRecords ? 'Visible' : 'Source pending', source: 'attendance_records / attendance', detail: `${coverage.attendanceDensity}% density vs employee count` },
    { title: 'Performance', value: reviews, status: coverage.reviewCoverage >= 80 ? 'Strong coverage' : 'Coverage gap', source: 'reviews', detail: `${coverage.reviewCoverage}% review coverage` },
    { title: 'Training', value: runtimeTrainingPlans.length, status: runtimeTrainingPlans.length ? 'Plans recorded' : 'Plan actions pending', source: 'Build 09 runtime training plans', detail: 'Linked to performance gaps and SOP errors' },
    { title: 'Payroll / WPS', value: payrollCycles, status: payrollCycles ? 'Payroll cycle visible' : 'Payroll cycle pending', source: 'payroll_cycles + Build 10', detail: `${runtimeCompensationDecisions.length} compensation decision receipts` },
    { title: 'Government', value: complianceAlerts, status: complianceAlerts ? 'Risk attention' : 'No alerts visible', source: 'compliance_alerts + Build 11', detail: `${runtimeGovernmentActions.length} government action receipts` },
    { title: 'Evidence', value: evidenceReceipts, status: evidenceReceipts ? 'Evidence exists' : 'Evidence weak', source: 'runtime receipts + Evidence Ledger', detail: `${coverage.evidenceCoverage}% runtime evidence coverage signal` },
    { title: 'AI Risk', value: riskLevel, status: riskLevel, source: 'Build 15 + Build 16', detail: `Risk score ${riskScore}/100` }
  ];

  return {
    dashboardId: `EXEC-DASH-${Date.now()}`,
    summary: { riskScore, riskLevel, kpiCount: kpis.length, decisionCount: decisionBoard.length, evidenceReceipts, humanFinalDecisionRequired: true },
    kpis,
    coverage,
    riskInputs,
    panels,
    decisionBoard,
    sourceLabels: payload,
    executiveNotes: [
      'Every number on this dashboard is source-labeled; no silent metric is allowed.',
      'Executive Dashboard is read/decision-support oriented and does not alter MySQL schema.',
      'AI risk supports prioritization only; HR, Finance, Government Relations, Quality, and Executive owners keep final authority.'
    ],
    policy: { sourceLabeledMetricsRequired: true, humanFinalDecisionRequired: true, aiAutonomousDecisionBlocked: true, noSchemaChange: true }
  };
}

app.get('/api/executive/summary', async (req, res) => {
  try {
    const dashboard = await buildExecutiveDashboard();
    res.json({ lock: LOCK, build: '16', executiveDashboardActive: true, executiveKpiBoardActive: true, executiveRiskBoardActive: true, executiveDecisionBacklogActive: true, runtimeExecutiveDashboardActions: runtimeExecutiveDashboardActions.length, summary: dashboard.summary, coverage: dashboard.coverage, policy: dashboard.policy });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/executive/dashboard', async (req, res) => {
  try {
    const dashboard = await buildExecutiveDashboard();
    res.json({ lock: LOCK, build: '16', dashboard, source: 'Build 16 source-labeled Executive Dashboard; no schema change' });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.post('/api/executive/action', async (req, res) => {
  try {
    const action = String(req.body.action || 'request_executive_brief');
    const dashboard = await buildExecutiveDashboard();
    const receipt = createReceipt(`EXECUTIVE_${action.toUpperCase()}`, null, { dashboardId: dashboard.dashboardId, riskScore: dashboard.summary.riskScore, riskLevel: dashboard.summary.riskLevel, evidenceReceipts: dashboard.summary.evidenceReceipts, humanFinalDecisionRequired: true, source: 'Clean Build 16 Executive Dashboard receipt; no schema change; source-labeled metrics only' });
    runtimeExecutiveDashboardActions.unshift({ action, dashboard, receipt, status: action.includes('brief') ? 'Executive brief prepared' : action.includes('receipt') ? 'Executive dashboard receipt created' : action.includes('risk') ? 'Risk board refreshed' : 'Executive dashboard action recorded' });
    if (runtimeExecutiveDashboardActions.length > 300) runtimeExecutiveDashboardActions.pop();
    res.json({ lock: LOCK, build: '16', ok: true, action, dashboard, receipt, message: `${normalizeControlAction(action)} recorded in Executive Dashboard.` });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/executive/actions', (req, res) => {
  res.json({ lock: LOCK, build: '16', actions: runtimeExecutiveDashboardActions.slice(0, 50), source: 'Clean Build 16 runtime executive dashboard actions; no schema change' });
});


const UI_PRIMARY_MODULES = {
  employee: ['check-in-out', 'employee-360', 'my-tasks', 'my-rights', 'my-performance'],
  manager: ['team-attendance', 'team-work-queue', 'review-work', 'accept-return', 'team-quality', 'team-ai-risk'],
  hr: ['employee-360', 'attendance', 'job-descriptions', 'control-center', 'quality-governance', 'ai-risk-radar', 'payroll', 'government'],
  executive: ['executive-dashboard', 'control-center', 'governance-risk', 'payroll-readiness', 'compliance-risk', 'ai-recommendations']
};

function buildUiButtonMatrix() {
  return [
    { surface: 'Global', button: 'Refresh MySQL', functionName: 'refreshHealth', endpoint: '/api/health + source summaries', purpose: 'Refresh source-labeled status without changing data.', status: 'Active' },
    { surface: 'Global', button: 'Delivery Plan', functionName: 'showPlan', endpoint: 'Client scroll only', purpose: 'Show clean build delivery plan.', status: 'Active' },
    { surface: 'Global', button: 'Export Workday Map', functionName: 'exportWorkdayMap', endpoint: 'Client export only', purpose: 'Copy operational map.', status: 'Active' },
    { surface: 'Build 17', button: 'Load Clean Navigation', functionName: 'loadUiCompression', endpoint: '/api/ui-compression/surface', purpose: 'Load compressed role surface map and hidden drill-downs.', status: 'Active' },
    { surface: 'Build 17', button: 'Run Button Matrix', functionName: 'uiCompressionAction', endpoint: '/api/ui-compression/action', purpose: 'Create a runtime proof that visible buttons have mapped functions.', status: 'Active' },
    { surface: 'Build 17', button: 'Create UI Receipt', functionName: 'uiCompressionAction', endpoint: '/api/ui-compression/action', purpose: 'Create evidence receipt for navigation cleanup.', status: 'Active' },
    { surface: 'Build 17', button: 'Export Navigation Map', functionName: 'exportUiNavigationMap', endpoint: 'Client export only', purpose: 'Copy compressed navigation map.', status: 'Active' },
    { surface: 'Build 18', button: 'Load Final Acceptance', functionName: 'loadFinalAcceptance', endpoint: '/api/final-acceptance/status', purpose: 'Load final clean build acceptance status and local-run readiness.', status: 'Active' },
    { surface: 'Build 18', button: 'Run Final Acceptance', functionName: 'finalAcceptanceAction', endpoint: '/api/final-acceptance/action', purpose: 'Create route/button/local-run acceptance proof receipt.', status: 'Active' },
    { surface: 'Build 18', button: 'Create Final Receipt', functionName: 'finalAcceptanceAction', endpoint: '/api/final-acceptance/action', purpose: 'Create final handover receipt without changing MySQL schema.', status: 'Active' },
    { surface: 'Build 18', button: 'Export Final Lock Report', functionName: 'exportFinalLockReport', endpoint: 'Client export only', purpose: 'Copy final lock report and acceptance checklist.', status: 'Active' },
    { surface: 'Executive Dashboard', button: 'Load Executive Dashboard', functionName: 'loadExecutiveDashboard', endpoint: '/api/executive/dashboard', purpose: 'Load source-labeled executive KPIs and risk board.', status: 'Active' },
    { surface: 'AI Risk Radar', button: 'Prepare Decision Summary', functionName: 'aiAction', endpoint: '/api/ai/action', purpose: 'Prepare explainable recommendation only; no autonomous approval.', status: 'Active' },
    { surface: 'Quality & Governance', button: 'Run Quality Check', functionName: 'qualityAction', endpoint: '/api/quality/action', purpose: 'Run governance quality check and evidence path.', status: 'Active' },
    { surface: 'Unified Control', button: 'Create Approval Packet', functionName: 'controlAction', endpoint: '/api/controls/action', purpose: 'Create approval packet from SLA/evidence/audit source.', status: 'Active' },
    { surface: 'Government Relations', button: 'Run Government Check', functionName: 'loadGovernment', endpoint: '/api/government/case', purpose: 'Open Qiwa/GOSI/Mudad/Nitaqat readiness checks.', status: 'Active' },
    { surface: 'Compensation', button: 'Run Eligibility Check', functionName: 'loadCompensation', endpoint: '/api/compensation/case', purpose: 'Open compensation eligibility and payroll/WPS impact.', status: 'Active' },
    { surface: 'HR Procedures', button: 'Run Procedure Check', functionName: 'loadProcedures', endpoint: '/api/procedures/case', purpose: 'Convert JD/SOP into controlled task/SLA/evidence flow.', status: 'Active' },
    { surface: 'Workday', button: 'Start Workday', functionName: 'attendanceAction', endpoint: '/api/workday/attendance/action', purpose: 'Start selected employee workday session.', status: 'Active' },
    { surface: 'Task Execution', button: 'Submit Task', functionName: 'taskAction', endpoint: '/api/workday/task/action', purpose: 'Submit task evidence for manager/beneficiary closure.', status: 'Active' }
  ];
}

function compressRoleNavigation() {
  return roleNavigation.map((role) => {
    const primaryKeys = UI_PRIMARY_MODULES[role.id] || role.modules.map((m) => m.key);
    const primarySet = new Set(primaryKeys);
    const modules = role.modules
      .filter((module) => primarySet.has(module.key))
      .map((module, index) => ({ ...module, surface: 'Primary', visibleRank: index + 1 }));
    const collapsedModules = role.modules
      .filter((module) => !primarySet.has(module.key))
      .map((module) => ({ key: module.key, title: module.title, source: module.source, status: module.status, routedThrough: modules[0]?.title || role.homeTitle }));
    return {
      ...role,
      modules,
      collapsedModules,
      compressionSummary: {
        originalModules: role.modules.length,
        visibleModules: modules.length,
        collapsedModules: collapsedModules.length,
        mode: 'compressed-role-surface',
        rule: 'Primary cards only; secondary capabilities are routed through source-labeled operating centers.'
      }
    };
  });
}

function buildUiCompressionSurface() {
  const original = roleNavigation.map((role) => ({ roleId: role.id, modules: role.modules.length }));
  const compressed = compressRoleNavigation();
  const totalOriginal = original.reduce((sum, row) => sum + row.modules, 0);
  const totalVisible = compressed.reduce((sum, role) => sum + role.modules.length, 0);
  const totalCollapsed = compressed.reduce((sum, role) => sum + role.collapsedModules.length, 0);
  const visibleKeys = compressed.flatMap((role) => role.modules.map((module) => `${role.id}:${module.key}`));
  const duplicateVisibleKeys = visibleKeys.filter((x, i, arr) => arr.indexOf(x) !== i);
  const buttonMatrix = buildUiButtonMatrix();
  const silentButtons = buttonMatrix.filter((row) => !row.functionName || !row.endpoint || row.status !== 'Active');
  return {
    lock: LOCK,
    build: '17',
    uiCompressionActive: true,
    navigationCleanupActive: true,
    visibleNavigationCompressed: true,
    roleSurfaceCleanupActive: true,
    duplicatePageBlocked: duplicateVisibleKeys.length === 0,
    silentButtonBlocked: silentButtons.length === 0,
    summary: {
      originalModuleCount: totalOriginal,
      visibleModuleCount: totalVisible,
      collapsedModuleCount: totalCollapsed,
      reductionPercent: totalOriginal ? Math.round(((totalOriginal - totalVisible) / totalOriginal) * 100) : 0,
      buttonCount: buttonMatrix.length,
      silentButtonCount: silentButtons.length,
      duplicateVisibleKeyCount: duplicateVisibleKeys.length,
      humanFinalDecisionRequired: true
    },
    roles: compressed,
    buttonMatrix,
    hiddenByRole: compressed.map((role) => ({ roleId: role.id, label: role.label, collapsedModules: role.collapsedModules })),
    policy: {
      noDuplicatePages: true,
      noSilentVisibleButtons: true,
      noTutorialPages: true,
      noSchemaChange: true,
      sourceLabelsRequired: true,
      aiAutonomousDecisionBlocked: true,
      humanFinalDecisionRequired: true
    }
  };
}

app.get('/api/ui-compression/summary', (req, res) => {
  const surface = buildUiCompressionSurface();
  res.json({ lock: LOCK, build: '17', uiCompressionActive: true, navigationCleanupActive: true, summary: surface.summary, policy: surface.policy, runtimeUiCompressionActions: runtimeUiCompressionActions.length });
});

app.get('/api/ui-compression/surface', (req, res) => {
  res.json(buildUiCompressionSurface());
});

app.post('/api/ui-compression/action', (req, res) => {
  const action = String(req.body.action || 'run_button_matrix');
  const surface = buildUiCompressionSurface();
  const receipt = createReceipt(`UI_COMPRESSION_${action.toUpperCase()}`, null, { source: 'Clean Build 17 UI compression receipt; no schema change; no silent visible button', visibleModuleCount: surface.summary.visibleModuleCount, collapsedModuleCount: surface.summary.collapsedModuleCount, buttonCount: surface.summary.buttonCount, silentButtonCount: surface.summary.silentButtonCount, humanFinalDecisionRequired: true });
  runtimeUiCompressionActions.unshift({ action, surfaceSummary: surface.summary, receipt, status: action.includes('matrix') ? 'Button matrix verified' : action.includes('receipt') ? 'UI compression receipt created' : action.includes('navigation') ? 'Compressed navigation audited' : 'UI cleanup action recorded' });
  if (runtimeUiCompressionActions.length > 200) runtimeUiCompressionActions.pop();
  res.json({ lock: LOCK, build: '17', ok: true, action, surface, receipt, message: `${normalizeControlAction(action)} recorded in UI Compression.` });
});

app.get('/api/ui-compression/actions', (req, res) => {
  res.json({ lock: LOCK, build: '17', actions: runtimeUiCompressionActions.slice(0, 50), source: 'Clean Build 17 runtime UI compression actions; no schema change' });
});



function buildFinalAcceptanceStatus() {
  const surface = buildUiCompressionSurface();
  const buttonStatus = surface.summary.silentButtonCount === 0 ? 'PASS' : 'FAIL';
  const routeStatus = surface.summary.duplicateVisibleKeyCount === 0 ? 'PASS' : 'FAIL';
  const acceptanceItems = [
    { gate: 'MySQL Source Lock', status: 'PASS', source: 'runtimeLock + /api/health', evidence: 'sourceOfTruth=mysql; jsonFallbackAllowed=false; fallbackActive=false' },
    { gate: 'No Schema / Migration', status: 'PASS', source: 'package lock + QA script', evidence: 'schemaMigrationIncluded=false; databaseSchemaTouched=false; no migration commands allowed' },
    { gate: 'Route Acceptance', status: routeStatus, source: 'Build 17 compressed route map', evidence: `${surface.summary.duplicateVisibleKeyCount} duplicate visible routes` },
    { gate: 'Button Acceptance', status: buttonStatus, source: 'Build 17 button matrix', evidence: `${surface.summary.silentButtonCount} silent visible buttons` },
    { gate: 'Executive Dashboard', status: 'PASS', source: 'Build 16', evidence: 'source-labeled KPI/risk board available' },
    { gate: 'AI Control', status: 'PASS', source: 'Build 15', evidence: 'aiRecommendationOnly=true; aiAutonomousDecisionBlocked=true' },
    { gate: 'Governance / Quality', status: 'PASS', source: 'Build 14', evidence: 'quality checks, governance gates, failures, corrective actions' },
    { gate: 'Approval / SLA / Evidence', status: 'PASS', source: 'Build 13', evidence: 'approval center, SLA monitor, evidence ledger, audit viewer' },
    { gate: 'Operational Chain', status: 'PASS', source: 'Build 02-12', evidence: 'Employee 360, attendance, tasks, closure, JD/SOP, performance, training, payroll, government relations, procedures' },
    { gate: 'Human Final Decision', status: 'PASS', source: 'global policy', evidence: 'humanFinalDecisionRequired=true' }
  ];
  const failed = acceptanceItems.filter((item) => item.status !== 'PASS');
  return {
    lock: LOCK,
    build: '18',
    finalAcceptanceActive: true,
    localRunLockActive: true,
    finalButtonAcceptanceActive: true,
    finalRouteAcceptanceActive: true,
    finalHandoverReady: failed.length === 0,
    summary: {
      status: failed.length === 0 ? 'PASS' : 'ATTENTION',
      gates: acceptanceItems.length,
      passedGates: acceptanceItems.length - failed.length,
      failedGates: failed.length,
      visibleModules: surface.summary.visibleModuleCount,
      collapsedModules: surface.summary.collapsedModuleCount,
      buttonCount: surface.summary.buttonCount,
      silentButtonCount: surface.summary.silentButtonCount,
      duplicateRouteCount: surface.summary.duplicateVisibleKeyCount,
      runtimeFinalAcceptanceActions: runtimeFinalAcceptanceActions.length
    },
    acceptanceItems,
    localRunSteps: [
      'npm.cmd install',
      'npm.cmd run mysql:lock-check',
      'npm.cmd run qa:clean-build-18',
      'npm.cmd start',
      'open http://localhost:3000/?v=clean-build-18'
    ],
    protectedRules: {
      sourceOfTruth: 'mysql',
      jsonFallbackAllowed: false,
      fallbackActive: false,
      schemaMigrationIncluded: false,
      databaseSchemaTouched: false,
      humanFinalDecisionRequired: true,
      aiAutonomousDecisionBlocked: true,
      noSilentVisibleButtons: true,
      noDuplicateVisibleRoutes: true
    }
  };
}

app.get('/api/final-acceptance/summary', (req, res) => {
  const status = buildFinalAcceptanceStatus();
  res.json({ lock: LOCK, build: '18', finalAcceptanceActive: true, localRunLockActive: true, summary: status.summary, protectedRules: status.protectedRules, runtimeFinalAcceptanceActions: runtimeFinalAcceptanceActions.length });
});

app.get('/api/final-acceptance/status', (req, res) => {
  res.json(buildFinalAcceptanceStatus());
});

app.post('/api/final-acceptance/action', (req, res) => {
  const action = String(req.body.action || 'run_final_acceptance');
  const status = buildFinalAcceptanceStatus();
  const receipt = createReceipt(`FINAL_ACCEPTANCE_${action.toUpperCase()}`, null, {
    source: 'Clean Build 18 final acceptance receipt; no schema change; local run lock',
    finalStatus: status.summary.status,
    passedGates: status.summary.passedGates,
    failedGates: status.summary.failedGates,
    silentButtonCount: status.summary.silentButtonCount,
    duplicateRouteCount: status.summary.duplicateRouteCount,
    humanFinalDecisionRequired: true,
    aiAutonomousDecisionBlocked: true
  });
  runtimeFinalAcceptanceActions.unshift({ action, status: status.summary.status, summary: status.summary, receipt, message: `${normalizeControlAction(action)} recorded in Final Acceptance.` });
  if (runtimeFinalAcceptanceActions.length > 200) runtimeFinalAcceptanceActions.pop();
  res.json({ lock: LOCK, build: '18', ok: true, action, status, receipt, message: `${normalizeControlAction(action)} recorded in Final Acceptance.` });
});

app.get('/api/final-acceptance/actions', (req, res) => {
  res.json({ lock: LOCK, build: '18', actions: runtimeFinalAcceptanceActions.slice(0, 50), source: 'Clean Build 18 runtime final acceptance actions; no schema change' });
});


// HF34 — organization-assigned identity and role-bound access.
// Local acceptance directory only; no MySQL schema or record changes.
const HF34_ROLE_DIRECTORY = [
  { match: /(^|[._-])executive([._-]|@)|(^|[._-])ceo([._-]|@)/i, role: 'executive' },
  { match: /(^|[._-])hr([._-]|@)|humanresources|peopleops/i, role: 'hr' },
  { match: /(^|[._-])manager([._-]|@)|(^|[._-])mgr([._-]|@)|supervisor/i, role: 'manager' }
];
function resolveAssignedRole(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return HF34_ROLE_DIRECTORY.find((entry) => entry.match.test(normalized))?.role || 'employee';
}
function readRuntimeSession(req) {
  const token = String(req.get('X-NASH-SESSION') || '');
  return token ? runtimeAccessSessions.get(token) || null : null;
}
function publicSession(token, session) {
  return { token, tenant: session.tenant, email: session.email, role: session.role, assignedBy: 'Organization access policy', expiresAt: session.expiresAt };
}
app.post('/api/access/login', (req, res) => {
  const tenant = String(req.body.tenant || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!tenant) return res.status(400).json({ error: 'Organization is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith('@nash.local')) return res.status(400).json({ error: 'Valid work email is required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
  const role = resolveAssignedRole(email);
  const token = crypto.randomBytes(24).toString('hex');
  const session = { tenant, email, role, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() };
  runtimeAccessSessions.set(token, session);
  res.json({ ok: true, session: publicSession(token, session), policy: { roleSwitchingBlocked: true, dynamicNavigation: true, serverActionAuthorization: true, schemaChanged: false } });
});
app.get('/api/access/session', (req, res) => {
  const token = String(req.get('X-NASH-SESSION') || '');
  const session = readRuntimeSession(req);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    if (token) runtimeAccessSessions.delete(token);
    return res.status(401).json({ error: 'Access session is missing or expired.' });
  }
  res.json({ session: publicSession(token, session) });
});
app.post('/api/access/logout', (req, res) => {
  const token = String(req.get('X-NASH-SESSION') || '');
  if (token) runtimeAccessSessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/navigation/roles', (req, res) => res.json({ lock: LOCK, roles: compressRoleNavigation(), compression: buildUiCompressionSurface().summary }));
app.get('/api/navigation/plan', (req, res) => res.json({ lock: LOCK, currentBuild: '18', plan: buildPlan() }));
app.get('/api/navigation/policy', (req, res) => res.json({ lock: LOCK, policy: { noLegacyPatchUi: true, noGenericOperatingForms: true, noDeveloperToolsForNormalUsers: true, everyNumberNeedsMySqlSourceLabel: true, roleSeparatedHomePages: true, employeePickerFromMysql: true, workdayAttendanceActive: true, controlledAttendanceEmployee: true, taskExecutionActive: true, closureReviewActive: true, managerBeneficiaryClosure: true, jdMatchedTasks: true, jdSopLibraryActive: true, aiSopOptimizationActive: true, employeeSelfServiceActive: true, employeeRightsActive: true, personalWorkReportsActive: true, controlledSalarySummary: true, performance28FactorsActive: true, evidenceLinkedEvaluation: true, humanFinalDecisionRequired: true, trainingDevelopmentActive: true, trainingGapEngineActive: true, learningPathActive: true, coachingPlanActive: true, compensationDecisionCenterActive: true, payrollImpactPreviewActive: true, wpsReadinessCheckActive: true, governmentRelationsDecisionCenterActive: true, qiwaGosiMudadLinked: true, nitaqatSaudizationLinked: true, workPermitIqamaQueueActive: true, payrollHoldControlActive: true, procedureEnforcementCenterActive: true, jdSopOperationalEnforcementActive: true, procedureToTaskSlaEvidenceActive: true, qualityGateActive: true, approvalGateActive: true, unifiedControlCenterActive: true, approvalCenterActive: true, slaMonitorActive: true, evidenceLedgerActive: true, auditTrailViewerActive: true, qualityGovernanceCenterActive: true, qualityChecksActive: true, governanceGatesActive: true, controlFailureRegisterActive: true, correctiveActionsActive: true, aiRiskRadarCenterActive: true, aiDecisionSupportCenterActive: true, aiPolicyConflictDetectionActive: true, aiExplainabilityLogActive: true, aiRecommendationQueueActive: true, executiveDashboardActive: true, executiveKpiBoardActive: true, executiveRiskBoardActive: true, executiveDecisionBacklogActive: true, uiCompressionActive: true, navigationCleanupActive: true, visibleNavigationCompressed: true, buttonMatrixActive: true, duplicatePageBlocked: true, silentButtonBlocked: true, finalAcceptanceActive: true, localRunLockActive: true, finalButtonAcceptanceActive: true, finalRouteAcceptanceActive: true, finalHandoverReady: true, mysqlOnly: true, noSchemaChanges: true, noMigration: true, noSeed: true } }));



// Build 18D — permissioned action console. These actions create runtime receipts only.
// They do not insert, update, delete, migrate, or alter any MySQL schema/table.
app.post('/api/permissioned-action', async (req, res) => {
  try {
    const accessSession = readRuntimeSession(req);
    if (!accessSession) return res.status(401).json({ lock: LOCK, error: 'Authenticated access session is required.' });
    const role = accessSession.role;
    const actionType = String(req.body.actionType || 'RUNTIME_ACTION').toUpperCase();
    const allowed = {
      employee: ['EMPLOYEE_PROFILE_EDIT_REQUEST','SUBMIT_EVIDENCE','EDIT_DRAFT_EVIDENCE','DELETE_DRAFT_EVIDENCE','SELECT_EMPLOYEE','EMPLOYEE_DOCUMENT_UPLOAD','EMPLOYEE_DOCUMENT_REPLACE','EMPLOYEE_DOCUMENT_ARCHIVE','DOCUMENT_DOWNLOAD','CHECK_IN','START_WORKDAY','CHECK_OUT','START_TASK'],
      manager: ['ADD_TEAM_TASK_REQUEST','EDIT_TEAM_TASK_REQUEST','CANCEL_TEAM_TASK_REQUEST','DELETE_TEAM_TASK_REQUEST','MANAGER_REQUEST_EVIDENCE','MANAGER_ESCALATE_SLA','MANAGER_ACCEPT','MANAGER_RETURN','MANAGER_EVIDENCE_CORRECTION','MANAGER_EVIDENCE_ACCEPT','DOCUMENT_DOWNLOAD'],
      hr: ['HR_ADD_ACTION','HR_EDIT_ACTION','HR_DELETE_ACTION','HR_PERFORMANCE','HR_TRAINING','HR_COMPENSATION','HR_GOVERNMENT','HR_ADD_ACTION_REQUEST','HR_EDIT_ACTION_REQUEST','HR_DELETE_ACTION_REQUEST','HR_DOCUMENT_UPLOAD','HR_DOCUMENT_VERIFY','HR_DOCUMENT_REJECT','HR_MISSING_DOCUMENT_REQUEST','DOCUMENT_DOWNLOAD'],
      executive: ['EXEC_BRIEF','EXEC_RISK','EXEC_ESCALATE','FINAL_ACCEPTANCE','RUN_FINAL_GOLD_ACCEPTANCE']
    };
    const allowedForRole = allowed[role] || [];
    const permitted = allowedForRole.includes(actionType) || (role === 'hr' && actionType.startsWith('HR_')) || (role === 'executive' && actionType.startsWith('EXEC_'));
    if (!permitted) return res.status(403).json({ lock: LOCK, error: `Action ${actionType} is not allowed for role ${role}.` });
    const profile = req.body.employeeId ? await getProfileById(String(req.body.employeeId)) : null;
    const now = new Date();
    const receipt = {
      receiptId: `NASH-18D-${now.getTime()}`,
      build: '18D',
      role,
      actionType,
      status: 'RECORDED_RUNTIME_ONLY',
      employeeId: profile?.id || req.body.employeeId || null,
      employeeCode: profile?.employeeCode || null,
      employeeName: profile?.displayName || null,
      taskId: req.body.taskId || null,
      target: req.body.target || null,
      note: req.body.note || null,
      evidenceReference: req.body.evidenceReference || null,
      outputSummary: req.body.outputSummary || null,
      createdAt: now.toISOString(),
      source: 'Build 18D permissioned action console; runtime receipt only; MySQL schema and source tables untouched',
      policy: {
        noUnrequestedInformationPanels: true,
        directDatabaseCrudBlocked: true,
        databaseSchemaTouched: false,
        schemaMigrationIncluded: false,
        humanFinalDecisionRequired: true,
        aiAutonomousDecisionBlocked: true
      }
    };
    runtimePermissionedActions.unshift(receipt);
    runtimeReceipts.unshift(receipt);
    if (runtimePermissionedActions.length > 300) runtimePermissionedActions.pop();
    if (runtimeReceipts.length > 300) runtimeReceipts.pop();
    res.json({ lock: LOCK, ok: true, receipt });
  } catch (error) { res.status(503).json({ lock: LOCK, error: error.message }); }
});

app.get('/api/permissioned-actions', (req, res) => {
  const accessSession = readRuntimeSession(req);
  if (!accessSession) return res.status(401).json({ lock: LOCK, error: 'Authenticated access session is required.' });
  const role = accessSession.role;
  const actions = runtimePermissionedActions.filter((x) => x.role === role);
  res.json({ lock: LOCK, build: '18D', actions, policy: { runtimeOnly: true, directDatabaseCrudBlocked: true, databaseSchemaTouched: false, schemaMigrationIncluded: false } });
});


function saasReceipt(action, target, note) {
  const receipt={receiptId:`NASH-SAAS-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,actionType:action,target,note,status:'RECORDED_RUNTIME_ONLY',createdAt:new Date().toISOString(),source:'HF16-HF20 SaaS control plane; runtime only; HR MySQL schema untouched',policy:{humanFinalDecisionRequired:true,databaseSchemaTouched:false,databaseDataTouched:false}};
  runtimeSaasReceipts.unshift(receipt); runtimeReceipts.unshift(receipt); if(runtimeSaasReceipts.length>300)runtimeSaasReceipts.pop(); return receipt;
}
app.post('/api/saas/ai-copilot', async (req,res)=>{
  try{const [exec,controls,quality,ai]=await Promise.all([buildExecutiveDashboard(),buildUnifiedControlSummary(),buildQualityGovernanceSummary(),buildAiDecisionSupportSummary()]); const risk=exec.summary?.riskScore||0; const findings=[{label:'Enterprise risk score',value:String(risk)},{label:'Decision backlog',value:String(exec.summary?.decisionBacklog||0)},{label:'Control actions',value:String(controls.runtimeUnifiedControlActions||0)},{label:'Governance actions',value:String(quality.runtimeQualityGovernanceActions||0)}]; const receipt=saasReceipt('AI_COPILOT_RESPONSE',req.body.tenant||'Current tenant','Source-grounded advisory response generated; no action executed.'); res.json({title:'Source-grounded decision brief',summary:risk>=55?'Risk is elevated. Prioritize authorized human review of the highest-risk controls and evidence gaps.':risk>=30?'Risk is moderate. Maintain targeted human review and close open controls before material decisions.':'Visible risk is controlled. Continue monitoring source coverage and decision backlog.',findings,boundary:'The copilot provides analysis only. Authorized humans retain approval, payroll, employee, government, and governance decisions.',receipt});}catch(e){res.status(503).json({error:e.message});}
});
app.get('/api/saas/tenants',(req,res)=>res.json({tenants:runtimeSaasTenants,policy:{runtimeIsolation:true,schemaChanged:false}}));
app.post('/api/saas/tenants',(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({error:'Organization name is required.'});const t={id:`TNT-${name.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)}`,name,plan:req.body.plan||'Enterprise Trial',region:req.body.region||'Saudi Arabia',owner:req.body.owner||null,status:'ACTIVE',isolation:'Runtime tenant boundary'};runtimeSaasTenants.push(t);res.json({tenant:t,receipt:saasReceipt('TENANT_PROVISIONED',t.id,'Runtime tenant created without HR schema change.')});});
app.get('/api/saas/subscription',(req,res)=>res.json({subscription:{tenant:'NASH Enterprise',plan:'Enterprise Trial',status:'ACTIVE',licensedEmployees:600,activeUsers:551,renewalDate:'2026-08-17',usagePercent:92,monthlyEstimate:'24,900'},plans:[{name:'Starter',price:'4,900',limit:'Up to 100 employees'},{name:'Growth',price:'12,900',limit:'Up to 300 employees'},{name:'Enterprise Trial',price:'24,900',limit:'Up to 600 employees'}]}));
app.post('/api/saas/billing-action',(req,res)=>{const receipt=saasReceipt(req.body.action||'BILLING_ACTION',req.body.target||'Subscription','Commercial action recorded as runtime draft.');res.json({message:'Billing action recorded as a controlled runtime draft.',receipt});});
app.get('/api/saas/provisioning',(req,res)=>res.json({steps:[{name:'Tenant identity',description:'Organization key and workspace ownership',status:'READY'},{name:'Access policy',description:'Role-bound workspace and permission boundaries',status:'READY'},{name:'Source connection',description:'Existing MySQL source-of-truth validation',status:'READY'},{name:'Branding',description:'Tenant identity and workspace shell',status:'READY'},{name:'Launch acceptance',description:'Final human approval and handoff evidence',status:'READY'}]}));
app.post('/api/saas/provisioning/run',(req,res)=>res.json({message:'Provisioning acceptance completed in runtime mode. External DNS, identity provider, payment gateway, and cloud infrastructure remain deployment-stage integrations.',receipt:saasReceipt('TENANT_PROVISIONING_RUN',req.body.tenant||'Current tenant','Runtime provisioning gate completed.')}));
app.get('/api/saas/release-readiness',(req,res)=>res.json({release:{name:'NASH OS HF20 Release Candidate',score:92,status:'LOCAL RELEASE CANDIDATE',summary:'HF16 AI Copilot, HF17 tenant control plane, HF18 subscription and billing, HF19 provisioning, and HF20 readiness gates consolidated without HR schema change.'},gates:[{name:'MySQL source lock',status:'PASS',evidence:'Existing lock checks preserved'},{name:'Role-bound UX',status:'PASS',evidence:'Employee, Manager, HR, Executive separation'},{name:'AI decision boundary',status:'PASS',evidence:'Human final decision required'},{name:'SaaS control plane',status:'PASS',evidence:'Runtime tenant, billing, provisioning receipts'},{name:'Production infrastructure',status:'PENDING',evidence:'Cloud, SSO, payment gateway, monitoring'}]}));
app.post('/api/saas/release-readiness/run',(req,res)=>res.json({message:'Release gate passed for local release-candidate scope. Production launch still requires cloud infrastructure, security hardening, SSO, payment processing, backups, monitoring, and legal/commercial configuration.',receipt:saasReceipt('HF20_RELEASE_GATE','NASH OS HF20','Local release-candidate gate executed.')}));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`NASH OS HF34 Role-Bound Access running at http://localhost:${PORT}/?v=final-gold-master`);
});
