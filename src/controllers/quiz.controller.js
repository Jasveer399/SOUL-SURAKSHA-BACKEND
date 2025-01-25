import { prisma } from "../db/prismaClientConfig.js";
import { z } from "zod";

// Enhanced validation schema
const QuizSchema = z.object({
  question: z
    .string()
    .min(5, { message: "Question must be at least 5 characters long" })
    .max(500, { message: "Question cannot exceed 500 characters" }),
  option1: z
    .string()
    .min(1, { message: "Option 1 cannot be empty" })
    .max(200, { message: "Option 1 cannot exceed 200 characters" }),
  option2: z
    .string()
    .min(1, { message: "Option 2 cannot be empty" })
    .max(200, { message: "Option 2 cannot exceed 200 characters" }),
  option3: z
    .string()
    .min(1, { message: "Option 3 cannot be empty" })
    .max(200, { message: "Option 3 cannot exceed 200 characters" }),
  option4: z
    .string()
    .min(1, { message: "Option 4 cannot be empty" })
    .max(200, { message: "Option 4 cannot exceed 200 characters" }),
  answer: z.string().min(1, { message: "Answer cannot be empty" }),
});

const QuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answer: z.string().min(1, { message: "Answer cannot be empty" }),
});

// Enhanced quiz controller
const createQuiz = async (req, res) => {
  try {
    const validated = QuizSchema.parse(req.body);

    const newQuiz = await prisma.quiz.create({
      data: validated,
    });

    return res.status(201).json({
      data: newQuiz,
      message: "Quiz created successfully",
      status: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
        status: false,
      });
    }
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const getQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 10, activequiz } = req.query;
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    console.log("activequiz: >>", activequiz);

    const where = {};
    if (activequiz !== undefined) {
      where.isActive = activequiz === "true";
    }

    const [quizzes, totalQuizzes] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quiz.count({ where }),
    ]);

    const totalPages = Math.ceil(totalQuizzes / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: quizzes,
      pagination: {
        totalQuizzes,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        currentPage: Number(page),
      },
      message: "Quizzes fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const editQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const validated = QuizSchema.parse(req.body);

    const updatedquiz = await prisma.quiz.update({
      where: {
        id,
      },
      data: validated,
    });

    return res.status(200).json({
      data: updatedquiz,
      message: "quiz updated successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const submitQuizAttempt = async (req, res) => {
  try {
    const studentId = req.user.id; // Assuming you have authentication middleware
    const { quizId, answer } = QuizAttemptSchema.parse(req.body);

    // Get the quiz to check the correct answer
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
        status: false,
      });
    }

    // Create the attempt
    await prisma.quizAttempt.create({
      data: {
        studentId,
        quizId,
        answer,
        isCorrect: answer === quiz.answer,
      },
    });

    if (quiz.answer === answer) {
      prisma.student.update({
        where: {
          id: studentId,
        },
        data: {
          quizScore: { increment: 1 },
        },
      });
      return res.status(200).json({
        message: "You have given the correct answer",
        iscorrect: true,
        status: true,
      });
    } else {
      return res.status(200).json({
        message: "You have given the wrong answer",
        iscorrect: false,
        status: true,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
        status: false,
      });
    }
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const getStudentQuizResults = async (req, res) => {
  try {
    const studentId = req.user.id; // Assuming you have authentication middleware
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { studentId },
        include: {
          quiz: true,
        },
        skip,
        take: Number(limit),
        orderBy: { attemptedAt: "desc" },
      }),
      prisma.quizAttempt.count({
        where: { studentId },
      }),
    ]);

    return res.status(200).json({
      data: attempts,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        limit: Number(limit),
      },
      message: "Quiz results fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const toogleisActive = async (req, res) => {
  try {
    const { id, isActive } = req.params;

    console.log("isActive: >>", typeof isActive);
    const updatedQuiz = await prisma.quiz.update({
      where: {
        id,
      },
      data: {
        isActive: isActive === "true" ? true : false,
      },
    });

    return res.status(200).json({
      data: updatedQuiz,
      message: "Quiz status updated successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

const getUnattemptedQuizzes = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10, activequiz } = req.query;
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const where = {
      AND: [
        activequiz !== undefined ? { isActive: activequiz === "true" } : {},
        {
          NOT: {
            attempts: {
              some: {
                studentId,
              },
            },
          },
        },
      ],
    };

    // Get unattempted quizzes and total count
    const [quizzes, totalQuizzes] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { attempts: true },
          },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    const totalPages = Math.ceil(totalQuizzes / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: quizzes,
      pagination: {
        totalQuizzes,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        currentPage: Number(page),
      },
      message: "Unattempted quizzes fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};
export {
  createQuiz,
  getQuizzes,
  editQuiz,
  submitQuizAttempt,
  getStudentQuizResults,
  toogleisActive,
  getUnattemptedQuizzes,
};
