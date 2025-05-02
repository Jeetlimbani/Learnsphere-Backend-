import jwt from "jsonwebtoken";


const authenticateUser = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token not provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded)
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
