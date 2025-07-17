import express from 'express'
import authRoute from "./auth.route.js";
import userRoute from "./user.route.js";
import invoiceRoute from './invoice.route.js'
const router = express.Router()

router.use('/auth', authRoute)
router.use('/users', userRoute)
router.use('/invoices', invoiceRoute)

export default router