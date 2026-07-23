'use strict';

// Stateless payroll rules. Persistence and approval are deliberately handled by
// the API adapter so MySQL remains the source of truth for employee data.
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value) => Math.max(0, round(value));

function calculatePayroll(input = {}) {
  const basic = money(input.basicSalary);
  const allowances = (input.allowances || []).reduce((sum, item) => sum + money(item.amount), 0);
  const overtime = (input.overtimeHours || 0) * (basic / 30 / 8) * Math.max(1, Number(input.overtimeMultiplier) || 1.5);
  const leaveImpact = money(input.unpaidLeaveDays) * (basic / 30);
  const deductions = (input.deductions || []).reduce((sum, item) => sum + money(item.amount), 0);
  const loanInstallment = money(input.loanInstallment);
  const bonus = money(input.bonus);
  const gosiEmployee = input.saudi === false ? 0 : round(basic * 0.0975);
  const gross = round(basic + allowances + overtime + bonus);
  const totalDeductions = round(leaveImpact + deductions + loanInstallment + gosiEmployee);
  return { basic, allowances: round(allowances), overtime: round(overtime), leaveImpact: round(leaveImpact), deductions: round(deductions), loanInstallment, bonus, gosiEmployee, gross, totalDeductions, net: round(Math.max(0, gross - totalDeductions)) };
}

function validateSaudiCompliance(input = {}, result = calculatePayroll(input)) {
  const issues = [];
  if (!input.employeeCode) issues.push('Employee code is required for WPS and Mudad export.');
  if (!input.bankIban) issues.push('Verified bank IBAN is required before WPS export.');
  if (!input.periodStart || !input.periodEnd) issues.push('Payroll period boundaries are required.');
  if (result.basic <= 0) issues.push('Basic salary must be greater than zero.');
  if (input.saudi !== false && result.gosiEmployee <= 0) issues.push('GOSI employee contribution could not be calculated.');
  if (result.net <= 0) issues.push('Net pay must be greater than zero for payment export.');
  return { ready: issues.length === 0, issues, gosiEmployeeRate: input.saudi === false ? 0 : 0.0975, wpsStatus: issues.length ? 'BLOCKED' : 'READY', mudadStatus: issues.length ? 'NOT_READY' : 'READY' };
}

function endOfService(monthlyWage, years) {
  const wage = money(monthlyWage); const service = Math.max(0, Number(years) || 0);
  return round(Math.min(service, 5) * wage * 0.5 + Math.max(service - 5, 0) * wage);
}

module.exports = { calculatePayroll, validateSaudiCompliance, endOfService };
