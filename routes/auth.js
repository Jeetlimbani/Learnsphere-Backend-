import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pkg from '@prisma/client';  
const { PrismaClient } = pkg; 
import authenticateUser from '../middleware/auth1.js';

const prisma = new PrismaClient();
const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role },
    });

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });


    res.cookie('authToken', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, 
    });
    
    res.json({ message: 'Logged in successfully', token: token }); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');  // Clear the cookie
  res.json({ message: 'Logged out successfully' });
});
router.get('/user', authenticateUser, async (req, res) => {
  try {
    // req.user contains the decoded JWT payload (user ID)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true }, // Select only the data you need
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // Handle the case where the user is not found
    }

    res.json(user); // Send the user data
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});
export default router;
