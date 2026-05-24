import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as fileController from '../controllers/file.controller';

const router = Router();
router.use(authenticate);

router.get('/room/:roomId', fileController.listFiles);
router.post('/room/:roomId', fileController.createFile);
router.get('/:id', fileController.getFile);
router.put('/:id', fileController.updateFile);
router.delete('/:id', fileController.deleteFile);

export { router as fileRouter };
