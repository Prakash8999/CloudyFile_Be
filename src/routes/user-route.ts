import express from 'express';
import { googleAuth, insertUser, loginUser, logoutUser, readUser, tokenRegen, userExist, verifyUser } from '../controllers/UserCtrl';
import { authUser } from '../helper/middleware/authUser';
const router = express.Router();


router.post('/google-auth', googleAuth)
router.post('/sign-up', insertUser)
router.post('/login', loginUser)
router.post('/verify', verifyUser)

// protected routes
router.get('/read', authUser, readUser)
router.get('/regen',authUser, tokenRegen)
router.post('/logout', authUser,logoutUser)

router.get('/read-clbrtr', authUser, userExist)

export default router;