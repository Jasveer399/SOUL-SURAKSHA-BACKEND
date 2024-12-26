import { prisma } from "../DB/prismaClientConfig.js";

const sendMessage = async (req, res) => {
  try {
    const { recipientId, message, senderType } = req.body;
    const senderId = req.user.id;

    // First find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            AND: [{ studentId: senderId }, { therapistId: recipientId }],
          },
          {
            AND: [{ studentId: recipientId }, { therapistId: senderId }],
          },
        ],
      },
    });

    // If no conversation exists, create one
    if (!conversation) {
      // Determine which ID belongs to student/therapist based on senderType
      const conversationData =
        senderType === "STUDENT"
          ? {
              studentId: senderId,
              therapistId: recipientId,
            }
          : {
              studentId: recipientId,
              therapistId: senderId,
            };

      conversation = await prisma.conversation.create({
        data: conversationData,
      });
    }

    // Create the new message
    const newMessage = await prisma.message.create({
      data: {
        content: message,
        senderId: senderId,
        senderType: senderType,
        conversationId: conversation.id,
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: new Date(),
        lastMessage: message,
      },
    });

    // If using Socket.IO
    // if (req.io) {
    //   const recipientSocketId = getRecipientSocketId(recipientId);
    //   if (recipientSocketId) {
    //     req.io.to(recipientSocketId).emit("newMessage", newMessage);
    //   }
    // }

    return res.status(200).json({
      data: newMessage,
      message: "Message sent successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Failed to send message",
      status: false,
    });
  }
};

const getMessages = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user?.id;
  const userType =
    req.user.userType !== "parent" && req.user.userType === "therapist"
      ? "THERAPIST"
      : "STUDENT"; // Assuming we know if user is STUDENT or THERAPIST

  try {
    // Find conversation based on user types
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            AND: [
              { studentId: userType === "STUDENT" ? userId : otherUserId },
              { therapistId: userType === "THERAPIST" ? userId : otherUserId },
            ],
          },
          {
            AND: [
              { studentId: userType === "THERAPIST" ? otherUserId : userId },
              { therapistId: userType === "STUDENT" ? otherUserId : userId },
            ],
          },
        ],
      },
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found", status: false });
    }

    // Get all messages for this conversation
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        conversation: {
          include: {
            student: {
              select: {
                id: true,
                userName: true,
              },
            },
            therapist: {
              select: {
                id: true,
                userName: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      data: messages,
      message: "Messages retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({
      error: error.message,
      status: false,
      message: "Failed to retrieve messages",
    });
  }
};

const getConversation = async (req, res) => {
  const userId = req.user.id;
  const userType = req.user.userType; // Assuming we know if user is STUDENT or THERAPIST

  try {
    const conversations = await prisma.conversation.findMany({
      where:
        userType === "STUDENT"
          ? { studentId: userId }
          : { therapistId: userId },
      include: {
        student: {
          select: {
            id: true,
            userName: true,
            studentImage: true,
            email: true,
          },
        },
        therapist: {
          select: {
            id: true,
            userName: true,
            therapistImage: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get only the last message
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    // Transform the response to match the expected format
    // and remove the current user from the data
    const transformedConversations = conversations.map((conv) => {
      const otherUser = userType === "STUDENT" ? conv.therapist : conv.student;
      return {
        id: conv.id,
        lastMessage: conv.messages[0] || null,
        otherUser: {
          id: otherUser.id,
          userName: otherUser.userName,
          profilePic:
            userType === "STUDENT"
              ? otherUser.therapistImage
              : otherUser.studentImage,
          email: otherUser.email,
        },
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
      };
    });

    res.status(200).json({
      data: transformedConversations,
      message: "Conversations retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error("Error in getConversations:", error);
    res.status(500).json({ error: error.message });
  }
};

export { sendMessage, getMessages, getConversation };
