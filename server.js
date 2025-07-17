import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from "helmet";
import morgan from 'morgan'
import mainRoutes from './routes/index.js'
import rateLimit from "express-rate-limit";
import 'dotenv/config';

const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(helmet())
app.use(helmet.crossOriginResourcePolicy({policy: 'cross-origin'}))
app.use(morgan('common'))
app.use(cors())

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 429,
        message: "You have sent too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
})

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: {
        status: 429,
        message: "You have made too many login/registration attempts, please try again in 5 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
})

app.use("/api/auth", loginLimiter)
app.use("/api", apiLimiter)

app.use("/api", mainRoutes)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})