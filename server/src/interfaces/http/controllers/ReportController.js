const { body } = require('express-validator');
const ReportService = require('../../../application/services/ReportService');
const { writeAudit } = require('../../../infrastructure/database/audit');
const { validate } = require('../middleware/error');
const { REPORT_TYPES, SEVERITIES, PUBLIC_CATEGORIES, INTERNAL_CATEGORIES } = require('../../../shared/constants');

const createRules = [
  body('reporterCategory')
    .isIn([...PUBLIC_CATEGORIES, ...INTERNAL_CATEGORIES])
    .withMessage('Invalid user category'),
  body('reportType').isIn(REPORT_TYPES).withMessage('Invalid report type'),
  body('severity').isIn(SEVERITIES).withMessage('Invalid severity'),
  body('locationId').notEmpty().withMessage('Location is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Describe the hazard in at least 10 characters'),
  validate,
];

async function create(req, res, next) {
  try {
    const extraFields = req.body.extraFields
      ? typeof req.body.extraFields === 'string'
        ? JSON.parse(req.body.extraFields)
        : req.body.extraFields
      : null;
    const report = await ReportService.createReport(
      { ...req.body, extraFields, isAnonymous: req.body.isAnonymous === 'true' || req.body.isAnonymous === true },
      req.files,
      req.user
    );
    await writeAudit(req, { action: 'create_report', entity: 'report', entityId: report.id, metadata: { reportNo: report.reportNo } });
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const reports = await ReportService.listReports(req.query, req.user);
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const report = await ReportService.getReportById(req.params.id, req.user);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

async function track(req, res, next) {
  try {
    const report = await ReportService.getReportByNumber(req.params.reportNo);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

async function status(req, res, next) {
  try {
    const report = await ReportService.changeStatus(req.params.id, req.body, req.user);
    await writeAudit(req, { action: 'status_change', entity: 'report', entityId: report.id, metadata: { status: report.status } });
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const report = await ReportService.assignReport(req.params.id, req.body, req.user);
    await writeAudit(req, { action: 'assign_report', entity: 'report', entityId: report.id });
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, track, status, assign, createRules };
