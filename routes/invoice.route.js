import express from 'express'
import {verifyToken} from "../middlewares/verifyToken.js";
import {create_invoice, get_all_invoices, get_user_invoices} from "../controllers/invoice.controller.js";


const router = express.Router()

router.get('/', verifyToken, get_all_invoices)
router.get('/user-invoice', verifyToken, get_user_invoices)
router.post('/', verifyToken, create_invoice)

export default router