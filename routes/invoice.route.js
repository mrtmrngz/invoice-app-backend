import express from 'express'
import {verifyToken} from "../middlewares/verifyToken.js";
import {
    change_status,
    create_invoice,
    download_invoice_as_pdf,
    get_user_invoices
} from "../controllers/invoice.controller.js";


const router = express.Router()

router.get('/user-invoice', verifyToken, get_user_invoices)
router.post('/', verifyToken, create_invoice)
router.get('/download/:id', verifyToken, download_invoice_as_pdf)
router.patch('/cancelled-status/:id', verifyToken, change_status)

export default router