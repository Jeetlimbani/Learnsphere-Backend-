import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/course.js';
import sessionRoutes from './routes/session.js';
import enrollmentRoutes from './routes/enrollment.js';
import dashboardRoutes from './routes/dashboard.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

dotenv.config();
const prisma = new PrismaClient();
const app = express();

const corsOptions = {
    origin: 'http://localhost:5173', // Replace with your frontend's *exact* origin
    credentials: true,
  };
  
app.use(cors(corsOptions)); 
app.use(express.json());
app.use(cookieParser()); 

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // This line applies the course routes
app.use('/api/courses', sessionRoutes); // This line also applies routes under /api/courses
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
