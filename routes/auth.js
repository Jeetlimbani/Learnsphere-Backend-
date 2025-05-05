import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import pkg from '@prisma/client';  
const { PrismaClient } = pkg; 
import authenticateUser from '../middleware/auth1.js';

const prisma = new PrismaClient();
const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
    
    res.json({ message: 'Logged in successfully', token: token,role: user.role }); 
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

// Google login/signup route
router.post('/google-login', async (req, res) => {
  const { credential } = req.body;

  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // User exists, create and send JWT token
      const token = jwt.sign(
        { id: existingUser.id, role: existingUser.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );

      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000,
      });

      return res.json({
        message: 'Google login successful',
        token,
        role: existingUser.role
      });
    } else {
      // New user, send back Google user info for role selection
      return res.json({
        isNewUser: true,
        googleUser: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name,
          picture: payload.picture
        }
      });
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Complete Google registration with role
router.post('/google-register', async (req, res) => {
  const { googleUser, role } = req.body;

  if (!googleUser || !role) {
    return res.status(400).json({ error: 'Missing required information' });
  }

  try {
    // Generate a random password for Google users
    const randomPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: googleUser.email,
        password: hashedPassword,
        role: role
      }
    });
    console.log('Created user with role:', newUser.role);


    // Create and send JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
    });

    return res.json({
      message: 'Google registration successful',
      token,
      role: newUser.role
    });
  } catch (error) {
    console.error('Google registration error:', error);
    res.status(500).json({ error: 'Google registration failed' });
  }
});



export default router;
