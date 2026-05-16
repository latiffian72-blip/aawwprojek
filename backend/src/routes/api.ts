import { Router } from 'express';
import { getSensorHistory } from '../controllers/sensorController';
import { getDevices, registerDevice } from '../controllers/deviceController';

const router = Router();

// Device routes
router.get('/devices', getDevices);
router.post('/devices', registerDevice);

// Sensor routes
router.get('/sensors/:device_id/history', getSensorHistory);

export default router;
