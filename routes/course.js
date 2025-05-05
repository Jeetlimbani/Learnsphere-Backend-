import express from 'express';
import pkg from '@prisma/client';  
const { PrismaClient } = pkg;
import authenticateUser from '../middleware/auth1.js'; 

const router = express.Router();
const prisma = new PrismaClient();

// Create a new course
router.post('/', authenticateUser, async (req, res) => {
  const { title, description, category } = req.body;
  const userRole = req.user.role;

  try {
    if (userRole === 'instructor') {
      const instructorId = req.user.id;

      const course = await prisma.course.create({
        data: { title, description, category, instructorId },
      });

      res.status(201).json(course);
    } else {
      res.status(403).json({ error: 'Only instructors can create courses' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create course', details: error.message });
  }
});

// View courses by instructor
router.get('/instructor/:instructorId', async (req, res) => {
  const { instructorId } = req.params;
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: parseInt(instructorId) },
      include: { // Include the sessions here
        sessions: true,
      },
    });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Edit a course
router.put('/:courseId', authenticateUser, async (req, res) => {
  const { courseId } = req.params;
  const { title, description, category } = req.body;

  console.log('Update Request - CourseID:', courseId);
  console.log('Logged-in Instructor:', req.user);

  if (!req.user || req.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Unauthorized: Only instructors can update courses' });
  }

  try {
    const course = await prisma.course.findFirst({
      where: {
        id: parseInt(courseId),
      },
    });

    console.log('Fetched Course:', course);

    if (!course) {
      return res.status(404).json({ error: 'Course not found or you do not have permission to update it' });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: course.id },
      data: { title, description, category },
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete a course
router.delete('/:courseId', authenticateUser, async (req, res) => {
  const { courseId } = req.params;

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Only instructors can delete courses' });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });

    if (!course || course.instructorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own courses' });
    }

    await prisma.course.delete({
      where: { id: parseInt(courseId) },
    });

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// View published courses
router.get('/published', async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch published courses' });
  }
});

// View courses by category
// router.get('/published', async (req, res) => {
//   const { category } = req.query;
//   try {
//     const courses = await prisma.course.findMany({
//       where: { category },
//     });
//     res.status(200).json(courses);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch courses by category' });
//   }
// });

router.get('/:courseId/sessions/:sessionId', async (req, res) => {
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
    console.error('Error fetching specific session:', error);
    res.status(500).json({ error: 'Failed to fetch session details.', details: error.message });
  }
});


export default router;

