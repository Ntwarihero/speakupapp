const PUBLIC_CATEGORIES = ['visitor', 'customer', 'contractor', 'driver'];
const INTERNAL_CATEGORIES = ['employee', 'safety_officer', 'safety_manager', 'administrator'];

const ROLES = {
  EMPLOYEE: 'employee',
  SAFETY_OFFICER: 'safety_officer',
  SAFETY_MANAGER: 'safety_manager',
  ADMINISTRATOR: 'administrator',
};

const REPORT_STATUSES = [
  'open',
  'assigned',
  'under_investigation',
  'corrective_action',
  'awaiting_verification',
  'closed',
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ALERT_SEVERITIES = ['high', 'critical'];

const REPORT_TYPES = [
  'unsafe_condition',
  'unsafe_act',
  'near_miss',
  'fire_hazard',
  'traffic_hazard',
  'environmental_hazard',
  'security_concern',
  'equipment_failure',
  'warehouse_hazard',
  'ppe_violation',
  'spill_or_leak',
  'damage_to_infrastructure',
  'forklift_hazard',
  'container_yard_hazard',
  'damaged_container',
  'other',
];

const MODULES = ['general', 'forklift', 'traffic', 'container_yard', 'warehouse', 'damaged_container'];

const STATUS_TRANSITIONS = {
  open: ['assigned', 'under_investigation', 'closed'],
  assigned: ['under_investigation', 'open'],
  under_investigation: ['corrective_action', 'assigned'],
  corrective_action: ['awaiting_verification', 'under_investigation'],
  awaiting_verification: ['closed', 'corrective_action'],
  closed: [],
};

module.exports = {
  PUBLIC_CATEGORIES,
  INTERNAL_CATEGORIES,
  ROLES,
  REPORT_STATUSES,
  SEVERITIES,
  ALERT_SEVERITIES,
  REPORT_TYPES,
  MODULES,
  STATUS_TRANSITIONS,
};
