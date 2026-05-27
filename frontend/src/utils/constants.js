export const API_BASE = 'http://127.0.0.1:8000'

export const DEPARTMENTS = [
  { value: 'public',      label: 'public (all roles)' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'HR',          label: 'HR' },
  { value: 'Finance',     label: 'Finance' },
  { value: 'Marketing',   label: 'Marketing' },
]

export const MIN_ROLES = [
  { value: 'guest',    label: 'min role: guest (everyone)' },
  { value: 'employee', label: 'min role: employee' },
  { value: 'manager',  label: 'min role: manager' },
  { value: 'admin',    label: 'min role: admin' },
]

export const SAMPLE_QUESTIONS = [
  'Which department does Karthik work in?',
  'Who has the highest salary?',
  'What is Priya Sharma\'s salary?',
  'List all employees in Engineering',
]

export const AUDIT_ACTIONS = [
  { value: '',       label: 'all actions' },
  { value: 'login',  label: 'login' },
  { value: 'query',  label: 'query' },
  { value: 'upload', label: 'upload' },
  { value: 'denied', label: 'denied' },
  { value: 'reset',  label: 'reset' },
  { value: 'admin',  label: 'admin' },
]
