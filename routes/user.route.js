import express from 'express'
import {get_user} from "../controllers/user.controller.js";
import {verifyToken} from "../middlewares/verifyToken.js";


const router = express.Router()

router.get('/user-info', verifyToken, get_user)

export default router