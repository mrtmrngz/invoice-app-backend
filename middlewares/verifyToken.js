import jwt from "jsonwebtoken";


export const verifyToken = async (req, res, next) => {

    const token = req.cookies['jwt']

    if(!token) {
        return res.status(401).json({error: "Unauthorized!"})
    }

    try {

        jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
            if(err) {
                return res.status(403).json({error: "Invalid Token!"})
            }

            req.userId = payload.id
            next()
        })

    }catch {
        return res.status(500).json({error: "Error verify token!"})
    }
}