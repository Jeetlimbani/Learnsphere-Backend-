import express from 'express';
import pkg from '@prisma/client';
import authenticateUser, { authorizestudent } from '../middleware/auth1.js';

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
      const completedSessionIds = enrollment.completedSessions.map(cs => cs.sessionId);

      return {
        courseId: enrollment.courseId,
        title: enrollment.course.title,
        totalSessions,
        completedSessions: completedSessionIds, // Return the IDs of completed sessions
        completedSessionsCount: completedSessionIds.length,
        progress: `${completedSessionIds.length}/${totalSessions}`,
      };
    });

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

// Mark a session as completed
router.post(
  '/student/:studentId/courses/:courseId/sessions/:sessionId/complete',
  authenticateUser,
  authorizestudent,
  async (req, res) => {
    const { studentId, courseId, sessionId } = req.params;

    if (parseInt(studentId) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    try {
      // Check if the student is enrolled in the course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId),
        },
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Student is not enrolled in this course.' });
      }

      // Check if session exists and belongs to this course
      const session = await prisma.session.findFirst({
        where: {
          id: parseInt(sessionId),
          courseId: parseInt(courseId),
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found in this course.' });
      }

      // Check if already completed
      const alreadyCompleted = await prisma.completedSession.findFirst({
        where: {
          studentId: parseInt(studentId),
          sessionId: parseInt(sessionId),
        },
      });

      if (alreadyCompleted) {
        return res.status(200).json({ message: 'Session already marked as completed.' });
      }

      // Mark session as completed
      const completedSession = await prisma.completedSession.create({
        data: {
          studentId: parseInt(studentId),
          sessionId: parseInt(sessionId),
          enrollmentId: enrollment.id,
        },
      });

      return res.status(200).json({
        message: 'Session marked as completed.',
        completedSession,
      });
    } catch (error) {
      console.error('Error completing session:', error);
      return res.status(500).json({ error: 'Failed to complete session.', details: error.message });
    }
  }
);

// Endpoint to submit a rating for a session
router.post('/sessions/:sessionId/rate', authenticateUser, authorizestudent, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  const { rating } = req.body;
  const studentId = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  try {
    // Check if the session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Find the enrollment for this student and the session's course
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: studentId,
        courseId: session.courseId,
      },
    });
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found for this session.' });
    }

    // Check if the student has already rated this session
    const existingRating = await prisma.rating.findUnique({
      where: {
        studentId_sessionId: {
          studentId: studentId,
          sessionId: sessionId,
        },
      },
    });

    if (existingRating) {
      return res.status(409).json({ error: 'You have already rated this session.' });
    }

    // Create the new rating
    const newRating = await prisma.rating.create({
      data: {
        rating: rating,
        studentId: studentId,
        sessionId: sessionId,
        enrollmentId: enrollment.id,
      },
    });

    return res.status(201).json(newRating);
  } catch (error) {
    console.error('Error submitting rating:', error);
    return res.status(500).json({ error: 'Failed to submit rating.', details: error.message });
  }
});

router.get('/sessions/:sessionId/rating-status', authenticateUser, authorizestudent, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  const studentId = req.user.id;

  try {
    const existingRating = await prisma.rating.findUnique({
      where: {
        studentId_sessionId: {
          studentId: studentId,
          sessionId: sessionId,
        },
      },
    });

    res.json({ hasRated: !!existingRating });
  } catch (error) {
    console.error('Error checking rating status:', error);
    res.status(500).json({ error: 'Failed to check rating status.' });
  }
});
// Fetch all sessions for a specific course
router.get('/courses/:courseId/sessions', authenticateUser, async (req, res) => {
  const { courseId } = req.params;
  try {
    const sessions = await prisma.session.findMany({
      where: { courseId: parseInt(courseId) },
      orderBy: { order: 'asc' }, // Adjust ordering as needed
    });
    res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// Fetch a specific session by course ID and session ID
router.get('/courses/:courseId/sessions/:sessionId', authenticateUser, async (req, res) => {
  const { courseId, sessionId } = req.params;
  try {
    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        courseId: parseInt(courseId),
      },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found in this course.' });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
});

// Fetch a specific session by session ID
router.get('/sessions/:sessionId', authenticateUser, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
});

export default router;

