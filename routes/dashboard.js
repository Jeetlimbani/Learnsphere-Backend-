// routes/dashboard.js
import express from 'express';
import pkg from '@prisma/client';
import authenticateUser, { authorizestudent } from '../middleware/auth1.js'; // Import the middleware

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// Fetch student dashboard data
router.get('/student/:studentId', authenticateUser, authorizestudent, async (req, res) => {
  const { studentId } = req.params;

  try {
    if (parseInt(studentId) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own dashboard.' });
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: parseInt(studentId) },
      include: {
        course: {
          include: { sessions: true }, // Include all sessions in the course
        },
        completedSessions: true, // Include completed sessions for the student
      },
    });

    // Map dashboard data
    const dashboardData = enrollments.map((enrollment) => {
      const totalSessions = enrollment.course.sessions.length;
      const completedSessionsCount = enrollment.completedSessions.length;

      return {
        courseId: enrollment.courseId,
        title: enrollment.course.title,
        totalSessions,
        completedSessions: completedSessionsCount,
        progress: `${completedSessionsCount}/${totalSessions}`, 
      };
    });

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

export default router;

