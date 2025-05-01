import express from 'express';
import pkg from '@prisma/client';  
import authenticateUser from '../middleware/auth1.js';
const { PrismaClient } = pkg;

const router = express.Router();
const prisma = new PrismaClient();

// Add a new session to a course
router.post('/:courseId/sessions', authenticateUser, async (req, res) => {
  const { courseId } = req.params;
  const { title, videoLink, explanation } = req.body;

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'Only instructors can add sessions' });
    }

    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only add sessions to your own courses' });
    }

    // Create the session
    const session = await prisma.session.create({
      data: {
        courseId: parseInt(courseId),
        title,
        videoLink,
        explanation,
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add session', details: error.message });
  }
});

// View sessions for a specific course
router.get('/:courseId/sessions', authenticateUser, async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role === 'instructor') {
      if (course.instructorId !== req.user.id) {
        return res.status(403).json({ error: 'You can only view sessions for your own courses' });
      }
    } 
    else if (req.user.role === 'student') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: parseInt(courseId),
          studentId: req.user.id,
        },
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'You must be enrolled to view sessions of this course' });
      }
      
    } 

    const sessions = await prisma.session.findMany({
      where: { courseId: parseInt(courseId) },
    });

    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// Edit a specific session
router.put('/sessions/:sessionId', authenticateUser, async (req, res) => {
  const { sessionId } = req.params;
  const { title, videoLink, explanation } = req.body;
  
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if the user is the instructor of the course
    const course = await prisma.course.findUnique({
      where: { id: session.courseId },
    });

    // Ensure only the instructor can edit sessions in their own courses
    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit sessions in your own courses' });
    }

    const updatedSession = await prisma.session.update({
      where: { id: parseInt(sessionId) },
      data: { title, videoLink, explanation },
    });

    res.status(200).json(updatedSession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
});

// Delete a specific session
router.delete('/sessions/:sessionId', authenticateUser, async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Validate if sessionId is a valid integer
    const sessionIntId = parseInt(sessionId);
    if (isNaN(sessionIntId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionIntId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const course = await prisma.course.findUnique({
      where: { id: session.courseId },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found for this session' });
    }

    if (course.instructorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete sessions from your own courses' });
    }

    await prisma.session.delete({
      where: { id: sessionIntId },
    });

    res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session', details: error.message });
  }
});

export default router;
