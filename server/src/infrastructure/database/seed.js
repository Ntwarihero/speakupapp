const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const QRCode = require('qrcode');
const { env } = require('../../config/env');
const { hashPassword } = require('../auth/password');
const { migrate } = require('./migrate');
const { query } = require('./pool');

const LOCATIONS = [
  { code: 'GATE1', name: 'Gate 1', slug: 'gate-1', lat: -1.9708, lng: 30.1396, order: 1 },
  { code: 'GATE2', name: 'Gate 2', slug: 'gate-2', lat: -1.9714, lng: 30.1408, order: 2 },
  { code: 'WHA', name: 'Warehouse A', slug: 'warehouse-a', lat: -1.9722, lng: 30.1389, order: 3 },
  { code: 'WHB', name: 'Warehouse B', slug: 'warehouse-b', lat: -1.9729, lng: 30.1399, order: 4 },
  { code: 'LOAD', name: 'Loading Bay', slug: 'loading-bay', lat: -1.9718, lng: 30.1378, order: 5 },
  { code: 'PARK', name: 'Parking', slug: 'parking', lat: -1.9701, lng: 30.1382, order: 6 },
  { code: 'FUEL', name: 'Fuel Station', slug: 'fuel-station', lat: -1.9695, lng: 30.1401, order: 7 },
  { code: 'YARD', name: 'Container Yard', slug: 'container-yard', lat: -1.9736, lng: 30.1412, order: 8 },
  { code: 'CUST', name: 'Customs Area', slug: 'customs', lat: -1.9710, lng: 30.1420, order: 9 },
  { code: 'ROAD', name: 'Main Road', slug: 'main-road', lat: -1.9698, lng: 30.1370, order: 10 },
  { code: 'OFF', name: 'Office Block', slug: 'office-block', lat: -1.9704, lng: 30.1415, order: 11 },
  { code: 'OTHER', name: 'Other', slug: 'other', lat: -1.9715, lng: 30.1395, order: 12 },
];

const CATEGORIES = [
  { code: 'unsafe_condition', name: 'Unsafe Condition', module: 'general', order: 1 },
  { code: 'unsafe_act', name: 'Unsafe Act', module: 'general', order: 2 },
  { code: 'near_miss', name: 'Near Miss', module: 'general', order: 3 },
  { code: 'fire_hazard', name: 'Fire Hazard', module: 'general', order: 4 },
  { code: 'traffic_hazard', name: 'Traffic Hazard', module: 'traffic', order: 5 },
  { code: 'environmental_hazard', name: 'Environmental Hazard', module: 'general', order: 6 },
  { code: 'security_concern', name: 'Security Concern', module: 'general', order: 7 },
  { code: 'equipment_failure', name: 'Equipment Failure', module: 'general', order: 8 },
  { code: 'warehouse_hazard', name: 'Warehouse Hazard', module: 'warehouse', order: 9 },
  { code: 'ppe_violation', name: 'PPE Violation', module: 'general', order: 10 },
  { code: 'spill_or_leak', name: 'Spill or Leak', module: 'general', order: 11 },
  { code: 'damage_to_infrastructure', name: 'Damage to Infrastructure', module: 'general', order: 12 },
  { code: 'forklift_hazard', name: 'Forklift Hazard', module: 'forklift', order: 13 },
  { code: 'container_yard_hazard', name: 'Container Yard Hazard', module: 'container_yard', order: 14 },
  { code: 'damaged_container', name: 'Damaged Container', module: 'damaged_container', order: 15 },
  { code: 'other', name: 'Other', module: 'general', order: 16 },
];

const SETTINGS = [
  ['site_name', 'SpeakUp'],
  ['site_title', 'DP World Kigali Safety Reporting System'],
  ['qr_base_url', 'https://safety.dpworldkigali.com'],
  ['session_timeout_minutes', '30'],
  ['alert_high_critical', 'true'],
  ['allow_anonymous', 'true'],
];

async function seed() {
  await migrate();

  const existing = await query('SELECT COUNT(*) AS c FROM users');
  if (existing[0].c > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const users = [
    {
      username: 'admin',
      password: 'Admin@SpeakUp2026',
      full_name: 'System Administrator',
      email: 'admin@dpworldkigali.com',
      phone: '+250788000001',
      department: 'HSE',
      role: 'administrator',
    },
    {
      username: 'smanager',
      password: 'Manager@SpeakUp2026',
      full_name: 'Aline Uwase',
      email: 'safety.manager@dpworldkigali.com',
      phone: '+250788000002',
      department: 'HSE',
      role: 'safety_manager',
    },
    {
      username: 'sofficer',
      password: 'Officer@SpeakUp2026',
      full_name: 'Jean Bosco Niyonzima',
      email: 'safety.officer@dpworldkigali.com',
      phone: '+250788000003',
      department: 'HSE',
      role: 'safety_officer',
    },
    {
      username: 'employee',
      password: 'Employee@SpeakUp2026',
      full_name: 'Diane Mukamana',
      email: 'diane.mukamana@dpworldkigali.com',
      phone: '+250788000004',
      department: 'Operations',
      role: 'employee',
    },
  ];

  const userIds = {};
  for (const u of users) {
    const id = uuid();
    userIds[u.role === 'administrator' ? 'admin' : u.username] = id;
    await query(
      `INSERT INTO users (id, username, password_hash, full_name, email, phone, department, role, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, u.username, await hashPassword(u.password), u.full_name, u.email, u.phone, u.department, u.role, id]
    );
  }

  const locationIds = {};
  for (const loc of LOCATIONS) {
    const id = uuid();
    locationIds[loc.code] = id;
    await query(
      `INSERT INTO locations (id, code, name, qr_slug, latitude, longitude, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, loc.code, loc.name, loc.slug, loc.lat, loc.lng, loc.order]
    );
  }

  for (const cat of CATEGORIES) {
    await query(
      `INSERT INTO report_categories (id, code, name, module, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [uuid(), cat.code, cat.name, cat.module, cat.order]
    );
  }

  for (const [k, v] of SETTINGS) {
    await query('INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)', [
      k,
      v,
      userIds.admin,
    ]);
  }

  await query('INSERT INTO report_sequences (year_key, last_number) VALUES (?, ?)', [new Date().getFullYear(), 8]);

  const sampleReports = [
    {
      no: 'SAF-2026-000001',
      cat: 'driver',
      type: 'traffic_hazard',
      sev: 'high',
      loc: 'GATE1',
      status: 'under_investigation',
      desc: 'Truck reversing without banksman at Gate 1 during peak inbound. Near collision with pedestrian marshal.',
      lat: -1.9708,
      lng: 30.1396,
      name: 'Patrick Habimana',
      company: 'Kigali Freight Ltd',
      module: 'traffic',
    },
    {
      no: 'SAF-2026-000002',
      cat: 'contractor',
      type: 'unsafe_condition',
      sev: 'critical',
      loc: 'YARD',
      status: 'assigned',
      desc: 'Damaged twist lock left on the ground in the container yard. High risk of puncture injury and tyre damage.',
      lat: -1.9736,
      lng: 30.1412,
      name: 'Eric Kagame',
      company: 'Yard Services RW',
      module: 'container_yard',
    },
    {
      no: 'SAF-2026-000003',
      cat: 'employee',
      type: 'near_miss',
      sev: 'medium',
      loc: 'WHA',
      status: 'corrective_action',
      desc: 'Pallet stack in Warehouse A leaned during pick. Operator stepped back; stack settled without collapse.',
      lat: -1.9722,
      lng: 30.1389,
      name: 'Diane Mukamana',
      company: 'DP World Kigali',
      module: 'warehouse',
      user: userIds.employee,
    },
    {
      no: 'SAF-2026-000004',
      cat: 'visitor',
      type: 'ppe_violation',
      sev: 'low',
      loc: 'LOAD',
      status: 'closed',
      desc: 'Visitor observed walking on loading bay without high-visibility vest.',
      lat: -1.9718,
      lng: 30.1378,
      name: null,
      company: null,
      module: 'general',
      anonymous: 1,
    },
    {
      no: 'SAF-2026-000005',
      cat: 'driver',
      type: 'forklift_hazard',
      sev: 'high',
      loc: 'WHB',
      status: 'open',
      desc: 'Forklift travelling with elevated load near pedestrian walkway in Warehouse B.',
      lat: -1.9729,
      lng: 30.1399,
      name: 'Hassan Mwangi',
      company: 'East Africa Logistics',
      module: 'forklift',
    },
    {
      no: 'SAF-2026-000006',
      cat: 'customer',
      type: 'spill_or_leak',
      sev: 'critical',
      loc: 'FUEL',
      status: 'awaiting_verification',
      desc: 'Diesel sheen observed around fuel station bund. Potential environmental release to storm drain.',
      lat: -1.9695,
      lng: 30.1401,
      name: 'Claudine Iradukunda',
      company: 'Rwanda Oil Partners',
      module: 'general',
    },
    {
      no: 'SAF-2026-000007',
      cat: 'contractor',
      type: 'damaged_container',
      sev: 'medium',
      loc: 'YARD',
      status: 'open',
      desc: '40ft container with bent corner casting and hole in right-side panel. Cargo integrity unknown.',
      lat: -1.9734,
      lng: 30.1410,
      name: 'Samuel Otieno',
      company: 'Intermodal RW',
      module: 'damaged_container',
    },
    {
      no: 'SAF-2026-000008',
      cat: 'employee',
      type: 'fire_hazard',
      sev: 'high',
      loc: 'OFF',
      status: 'assigned',
      desc: 'Blocked fire extinguisher and obstructed emergency exit behind stacked cartons in office block corridor.',
      lat: -1.9704,
      lng: 30.1415,
      name: 'Diane Mukamana',
      company: 'DP World Kigali',
      module: 'general',
      user: userIds.employee,
    },
  ];

  for (const r of sampleReports) {
    const id = uuid();
    await query(
      `INSERT INTO reports (
        id, report_no, reporter_category, is_anonymous, reporter_name, company, phone, email,
        reporter_user_id, report_type, module, severity, location_id, description, latitude, longitude,
        status, assigned_to, assigned_department, occurred_at, closed_at, first_response_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        r.no,
        r.cat,
        r.anonymous || 0,
        r.name,
        r.company,
        r.anonymous ? null : '+250788111222',
        r.anonymous ? null : 'reporter@example.com',
        r.user || null,
        r.type,
        r.module,
        r.sev,
        locationIds[r.loc],
        r.desc,
        r.lat,
        r.lng,
        r.status,
        r.status === 'open' ? null : userIds.sofficer,
        r.status === 'open' ? null : 'HSE',
        new Date(Date.now() - Math.floor(Math.random() * 12) * 86400000),
        r.status === 'closed' ? new Date() : null,
        r.status === 'open' ? null : new Date(Date.now() - 2 * 86400000),
      ]
    );
    await query(
      `INSERT INTO report_status_history (id, report_id, from_status, to_status, note, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), id, null, 'open', 'Report submitted', r.user || null]
    );
  }

  await query(
    `INSERT INTO announcements (id, title, body, created_by) VALUES (?, ?, ?, ?)`,
    [
      uuid(),
      'Speed limit 20 km/h inside the yard',
      'All vehicles including forklifts must observe 20 km/h. Banksman required for reversing at Gate 1 and Gate 2.',
      userIds.admin,
    ]
  );
  await query(
    `INSERT INTO announcements (id, title, body, created_by) VALUES (?, ?, ?, ?)`,
    [
      uuid(),
      'PPE at Loading Bay is mandatory',
      'Safety shoes, high-visibility vest and hard hat are required in all operational areas. Report PPE gaps immediately in SpeakUp.',
      userIds.admin,
    ]
  );

  await query(
    `INSERT INTO training_materials (id, title, description, url, category) VALUES (?, ?, ?, ?, ?)`,
    [
      uuid(),
      'Forklift pedestrian separation',
      'Required briefing for warehouse and yard operators.',
      'https://www.dpworld.com',
      'Forklift',
    ]
  );
  await query(
    `INSERT INTO training_materials (id, title, description, url, category) VALUES (?, ?, ?, ?, ?)`,
    [
      uuid(),
      'Spill response — first 5 minutes',
      'Contain, isolate drains, notify HSE. Do not wash product to storm water.',
      'https://www.dpworld.com',
      'Environment',
    ]
  );

  const qrDir = path.resolve(__dirname, '../../../../client/public/qr');
  fs.mkdirSync(qrDir, { recursive: true });
  const base = env.appUrl.replace(/\/$/, '');
  for (const loc of LOCATIONS) {
    const url = `${base}/?loc=${loc.slug}`;
    await QRCode.toFile(path.join(qrDir, `${loc.slug}.png`), url, {
      width: 640,
      margin: 2,
      color: { dark: '#5C2D91', light: '#FFFFFF' },
    });
  }

  console.log('Seed complete.');
  console.log('Internal logins:');
  console.log('  admin / Admin@SpeakUp2026');
  console.log('  smanager / Manager@SpeakUp2026');
  console.log('  sofficer / Officer@SpeakUp2026');
  console.log('  employee / Employee@SpeakUp2026');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed, LOCATIONS };
