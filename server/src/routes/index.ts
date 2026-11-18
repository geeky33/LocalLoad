import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import * as insights from '../controllers/insights.controller';
import * as notifications from '../controllers/notification.controller';
import * as reports from '../controllers/report.controller';
import * as routes from '../controllers/route.controller';
import * as stations from '../controllers/station.controller';
import * as tracking from '../controllers/tracking.controller';
import * as trains from '../controllers/train.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CROWD_LEVELS, DELAY_CATEGORIES, LINES } from '../types';

const r = Router();
const mongoId = (field: string) => body(field).isMongoId().withMessage(`${field} is invalid`);
const idParam = (name: string) => param(name).isMongoId().withMessage('Invalid id');
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------- Auth ----------
r.post(
  '/auth/register',
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  auth.register,
);
r.post(
  '/auth/login',
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  auth.login,
);
r.get('/auth/me', requireAuth, auth.me);

// ---------- Stations & trains (public read-only) ----------
r.get('/stations', stations.listStations);
r.get(
  '/stations/nearest',
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),
  validate,
  stations.nearestStations,
);
r.get('/stations/:id', idParam('id'), validate, stations.getStation);
r.get('/trains', trains.listTrains);
r.get('/trains/search', trains.listTrains);
r.get('/trains/:id', idParam('id'), validate, trains.getTrain);
r.get('/trains/:id/status', idParam('id'), validate, trains.trainStatus);

// ---------- Tracking (simulated) ----------
r.get('/tracking/active', tracking.activeTrains);
r.get('/tracking/:trainInstanceId', tracking.trackInstance);

// ---------- Reports ----------
const reportBase = [requireAuth, mongoId('trainInstanceId'), mongoId('stationId')];
r.post('/reports/crowd', ...reportBase, body('level').isIn(CROWD_LEVELS).withMessage('Choose green, yellow or red'), validate, reports.submitCrowd);
r.post('/reports/delay', ...reportBase, body('category').isIn(DELAY_CATEGORIES).withMessage('Choose a delay option'), validate, reports.submitDelay);
r.get('/reports/crowd/:trainInstanceId', idParam('trainInstanceId'), validate, reports.crowdReportsFor);
r.get('/crowd/recent', reports.recentCrowd);
r.get('/crowd/status/:trainInstanceId', idParam('trainInstanceId'), validate, reports.crowdStatus);
r.get('/delay/status/:trainInstanceId', idParam('trainInstanceId'), validate, reports.delayStatus);

// ---------- Saved routes ----------
const routeBody = [
  body('name').trim().isLength({ min: 1, max: 40 }).withMessage('Route name is required'),
  mongoId('sourceId'),
  mongoId('destinationId'),
  body('preferredTime').matches(HHMM).withMessage('Preferred time must be HH:mm'),
  body('line').isIn(LINES).withMessage('Choose a railway line'),
  body('preference').optional().isIn(['fast', 'slow', 'any']).withMessage('Preference must be fast, slow or any'),
  validate,
];
r.post('/routes', requireAuth, ...routeBody, routes.createRoute);
r.get('/routes', requireAuth, routes.listRoutes);
r.put('/routes/:id', requireAuth, idParam('id'), ...routeBody, routes.updateRoute);
r.delete('/routes/:id', requireAuth, idParam('id'), validate, routes.deleteRoute);

// ---------- Insights (sample historical data) ----------
r.get('/insights/overview', insights.overview);
r.get('/insights/weekly', insights.weekly);
r.get('/insights/station/:stationId', idParam('stationId'), validate, insights.stationInsights);

// ---------- Notifications ----------
r.get('/notifications', requireAuth, notifications.listNotifications);
r.put('/notifications/settings', requireAuth, notifications.updateSettings);
r.put('/notifications/read', requireAuth, notifications.markAllRead);

// ---------- Admin / development ----------
r.use('/admin', requireAuth, requireAdmin);
r.get('/admin/users', admin.users);
r.get('/admin/reports', admin.reports);
r.get('/admin/verification', admin.verification);
r.get('/admin/simulation/status', admin.simulationStatus);
r.post('/admin/simulation/start', admin.startSimulation);
r.post('/admin/simulation/stop', admin.stopSimulation);
r.post('/admin/simulation/reset', admin.resetSimulation);
r.post('/admin/simulation/speed', admin.setSpeed);

export default r;
