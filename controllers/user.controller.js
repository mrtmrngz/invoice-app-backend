import db from "../libs/db.js";

export const controller_name = async (req, res) => {
    try {
        //codes here
    }catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}

export const get_user = async (req, res) => {

    const userId = parseInt(req.userId)
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID", success: false })
    }

    try {
        const existingUser = await db.user.findUnique({
            where: {id: userId},
            select: {
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                address: true,
                createdAt: true,
                updatedAt: true
            }
        })

        if(!existingUser) {
            return res.status(404).json({error: "User not found", success: false})
        }

        return  res.status(200).json({user: existingUser, success: true})

    }catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}