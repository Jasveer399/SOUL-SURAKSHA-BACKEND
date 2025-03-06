import { prisma } from "../db/prismaClientConfig.js";
import { z } from "zod";

// Enhanced validation schema for Quiz
const CreateQuizSchema = z.object({
  title: z
    .string()
    .min(5, { message: "Title must be at least 5 characters long" })
    .max(200, { message: "Title cannot exceed 200 characters" }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" })
    .max(1000, { message: "Description cannot exceed 1000 characters" }),
  imageUrl: z.string().url({ message: "Invalid URL format" }).optional(),
  totalQuestions: z.number().int().min(1).optional(), // Total questions can be updated later
});

// Enhanced validation schema for Quiz Questions
const CreateQuizQuestionSchema = z.object({
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
  id: z.string().uuid().optional(), // Include id for updating existing questions
});

const QuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answer: z.string().min(1, { message: "Answer cannot be empty" }),
});

// Enhanced quiz controller
const createQuiz = async (req, res) => {
  try {
    const validated = CreateQuizSchema.parse(req.body);

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

const addQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const validated = CreateQuizQuestionSchema.parse(req.body);

    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
        status: false,
      });
    }

    const newQuizQuestion = await prisma.quizQuestion.create({
      data: {
        ...validated,
        quizId: quizId,
      },
    });

    // Optionally, update the totalQuestions count in the quiz
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        totalQuestions: {
          increment: 1,
        },
      },
    });

    return res.status(201).json({
      data: newQuizQuestion,
      message: "Quiz question added successfully",
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
      message: "Something went wrong while adding quiz question",
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
        include: {
          questions: true,
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
    const validatedQuiz = CreateQuizSchema.parse(req.body);

    // Update quiz details
    const updatedQuiz = await prisma.quiz.update({
      where: {
        id,
      },
      data: validatedQuiz,
    });

    // Handle question updates (assuming questions are sent in the request body)
    if (req.body.questions && Array.isArray(req.body.questions)) {
      for (const questionData of req.body.questions) {
        const validatedQuestion = CreateQuizQuestionSchema.parse(questionData);

        if (validatedQuestion.id) {
          // Update existing question
          await prisma.quizQuestion.update({
            where: { id: validatedQuestion.id },
            data: {
              question: validatedQuestion.question,
              option1: validatedQuestion.option1,
              option2: validatedQuestion.option2,
              option3: validatedQuestion.option3,
              option4: validatedQuestion.option4,
              answer: validatedQuestion.answer,
            },
          });
        } else {
          // Create new question
          await prisma.quizQuestion.create({
            data: {
              ...validatedQuestion,
              quizId: id,
            },
          });
        }
      }
    }

    return res.status(200).json({
      data: updatedQuiz,
      message: "Quiz updated successfully",
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

const submitQuizAttempt = async (req, res) => {
  try {
    const studentId = req.user.id; // Assuming you have authentication middleware
    const { quizId, answer } = QuizAttemptSchema.parse(req.body);

    // Get the quiz to check the correct answer
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true, // Include questions to find the correct answer
      },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
        status: false,
      });
    }

    // Find the question being answered
    const question = quiz.questions.find((q) => q.id === questionId);

    if (!question) {
      return res.status(404).json({
        message: "Question not found in the quiz",
        status: false,
      });
    }

    // Create the attempt
    await prisma.quizAttempt.create({
      data: {
        studentId,
        quizId,
        questionId: question.id,
        answer,
        isCorrect: answer === question.answer,
      },
    });

    if (question.answer === answer) {
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

const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: id },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
        status: false,
      });
    }

    // Delete related QuizQuestion records
    await prisma.quizQuestion.deleteMany({
      where: {
        quizId: id,
      },
    });

    // Delete the quiz
    await prisma.quiz.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Quiz deleted successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong while deleting the quiz",
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
  addQuizQuestion,
  deleteQuiz,
};
