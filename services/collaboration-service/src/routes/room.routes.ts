import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as roomController from '../controllers/room.controller';

const router = Router();
router.use(authenticate);

router.post('/join/:code', roomController.joinByInviteCode);

router.get('/', roomController.listRooms);
router.post('/', roomController.createRoom);
router.get('/:id', roomController.getRoom);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);
router.post('/:id/join', roomController.joinRoom);
router.post('/:id/leave', roomController.leaveRoom);
router.get('/:id/members', roomController.getMembers);
router.post('/:id/invite', roomController.inviteByCode);

export { router as roomRouter };
