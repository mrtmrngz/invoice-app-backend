import db from "../libs/db.js";
import bcrypt from 'bcrypt'
import {generateToken} from "../utils/generateTokens.js";

export const register = async (req, res) => {

    const {email, password, firstName, lastName, phone, address} = req.body

    try {

        const existingUser = await db.user.findUnique({where: {email}})

        if(existingUser) {
            return res.status(409).json({error: "User already exist"})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await db.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                ...(phone && {phone: phone}),
                ...(address && {address: address})
            }
        })

        res.status(201).json({message: "User created successfully", success: true})

    }catch (err) {
        return res.status(500).json({error: "Register Error"})
    }
}

export const login = async (req, res) => {

    const {email, password} = req.body

    try {

        const existingUser = await db.user.findUnique({
            where: {
                email
            }
        })

        if(!existingUser) {
            return res.status(404).json({error: "Invalid Credentials!"})
        }

        const comparedPassword = await bcrypt.compare(password, existingUser.password)

        if(!comparedPassword) {
            return res.status(404).json({error: "Invalid Credentials!"})
        }

        const token = generateToken(existingUser)

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
            maxAge: 1000 * 60 * 60 * 24 * 7
        }).status(200).json({message: "Login Success", success: true})

    }catch (err) {
        return res.status(500).json({error: "Login Error"})
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
        }).status(200).json({message: "Logout Success", success: true})
    }catch (err) {
        return res.status(500).json({error: "Logout Error"})
    }
}