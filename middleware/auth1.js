import jwt from "jsonwebtoken";

const SECRET_KEY = 'b5e8a29fe93002fe51503e544bc9f2aafc78d36f8986172dac42e7ccbb1f902b013be565d821d5e036ef81aed68d0fe064592b1eee46b2a3174c974ac8cceed7';

const authenticateUser = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token not provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const authorizestudent=(req,res,next)=>{
if(req.user.role!=="student"){
  return res.status(403).json({ error: 'Access denied. Students only.' })
}
next();
}

export default authenticateUser;
