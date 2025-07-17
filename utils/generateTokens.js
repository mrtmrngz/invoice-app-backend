import jwt from 'jsonwebtoken'


export function generateToken(user){
    return jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: '7d'})
}