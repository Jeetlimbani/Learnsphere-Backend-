import express from 'express';
import pkg from '@prisma/client';  
const { PrismaClient } = pkg;
import authenticateUser from '../middleware/auth1.js';  

const router = express.Router();
const prisma = new PrismaClient();

//  Enroll in a course (only for students)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const user = req.user; //  comes from the token
    if (!user || user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can enroll in courses' });
    }

    const { courseId } = req.body;

    // Optional: Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: user.id,
        courseId: parseInt(courseId),
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    //  Create the enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: user.id,
        courseId: parseInt(courseId),
      },
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

//  View enrolled courses for a student
router.get('/student/:studentId', authenticateUser, async (req, res) => {
  const { studentId } = req.params;

  // Optional: Check that the student is accessing their own data
  if (parseInt(studentId) !== req.user.id && req.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: parseInt(studentId) },
      include: { course: true },
    });
    res.status(200).json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
});

export default router;
