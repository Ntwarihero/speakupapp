const { query } = require('../../infrastructure/database/pool');

async function kpis() {
  const [totals] = await query(`
    SELECT
      COUNT(*) AS totalReports,
      SUM(status <> 'closed') AS openReports,
      SUM(status = 'closed') AS closedReports,
      SUM(report_type = 'near_miss') AS nearMisses,
      SUM(severity = 'high') AS highRisk,
      SUM(severity = 'critical') AS criticalHazards,
      AVG(CASE WHEN first_response_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, first_response_at) END) AS avgResponseHours,
      AVG(CASE WHEN closed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, closed_at) END) AS avgClosureHours
    FROM reports
  `);

  const byCategory = await query(
    `SELECT report_type AS name, COUNT(*) AS value FROM reports GROUP BY report_type ORDER BY value DESC`
  );
  const byLocation = await query(
    `SELECT l.name, COUNT(*) AS value
     FROM reports r JOIN locations l ON l.id = r.location_id
     GROUP BY l.id, l.name ORDER BY value DESC`
  );
  const bySeverity = await query(
    `SELECT severity AS name, COUNT(*) AS value FROM reports GROUP BY severity`
  );
  const monthly = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS name, COUNT(*) AS value
     FROM reports GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY name`
  );
  const yearly = await query(
    `SELECT YEAR(created_at) AS name, COUNT(*) AS value FROM reports GROUP BY YEAR(created_at) ORDER BY name`
  );
  const openVsClosed = await query(
    `SELECT CASE WHEN status = 'closed' THEN 'Closed' ELSE 'Open' END AS name, COUNT(*) AS value
     FROM reports GROUP BY CASE WHEN status = 'closed' THEN 'Closed' ELSE 'Open' END`
  );
  const heatmap = await query(
    `SELECT COALESCE(r.latitude, l.latitude) AS lat, COALESCE(r.longitude, l.longitude) AS lng,
            r.severity, r.report_no AS reportNo, l.name AS locationName
     FROM reports r JOIN locations l ON l.id = r.location_id
     WHERE COALESCE(r.latitude, l.latitude) IS NOT NULL
       AND COALESCE(r.longitude, l.longitude) IS NOT NULL`
  );
  const team = await query(
    `SELECT u.full_name AS name, u.role,
            COUNT(r.id) AS assigned,
            SUM(r.status = 'closed') AS closed
     FROM users u
     LEFT JOIN reports r ON r.assigned_to = u.id
     WHERE u.role IN ('safety_officer','safety_manager')
     GROUP BY u.id, u.full_name, u.role`
  );

  return {
    totals: {
      totalReports: Number(totals.totalReports || 0),
      openReports: Number(totals.openReports || 0),
      closedReports: Number(totals.closedReports || 0),
      nearMisses: Number(totals.nearMisses || 0),
      highRisk: Number(totals.highRisk || 0),
      criticalHazards: Number(totals.criticalHazards || 0),
      avgResponseHours: totals.avgResponseHours ? Number(Number(totals.avgResponseHours).toFixed(1)) : 0,
      avgClosureHours: totals.avgClosureHours ? Number(Number(totals.avgClosureHours).toFixed(1)) : 0,
    },
    byCategory,
    byLocation,
    bySeverity,
    monthly,
    yearly,
    openVsClosed,
    heatmap: heatmap.map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      severity: p.severity,
      reportNo: p.reportNo,
      locationName: p.locationName,
    })),
    team,
  };
}

module.exports = { kpis };
