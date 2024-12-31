import { prisma } from "../DB/prismaClientConfig.js";
import { getRecipientSocketId, io } from "../socket/socket.js";

const sendMessage = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const senderId = req.user.id;
    const senderType =
      req.user.userType !== "parent" && req.user.userType === "student"
        ? "STUDENT"
        : "THERAPIST";

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

    const recipientSocketId = getRecipientSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", newMessage);
    }

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
      select: {
        id: true,
        content: true,
        senderId: true,
        senderType: true,
        seen: true,
      },
      // include: {
      //   conversation: {
      //     include: {
      //       student: {
      //         select: {
      //           id: true,
      //           fullName: true,
      //         },
      //       },
      //       therapist: {
      //         select: {
      //           id: true,
      //           userName: true,
      //         },
      //       },
      //     },
      //   },
      // },
    });

    res.status(200).json({
      data: { data: messages, userType },
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
  const userType = req.user?.userType?.toUpperCase();

  console.log("userId: >>", userId);
  console.log("userType: >>", userType);

  try {
    const conversations = await prisma.conversation.findMany({
      where:
        userType === "STUDENT"
          ? { studentId: userId }
          : { therapistId: userId },
      include: {
        // Only include therapist data if user is a student
        ...(userType === "STUDENT" && {
          therapist: {
            select: {
              id: true,
              userName: true,
              therapistImage: true,
              email: true,
            },
          },
        }),
        // Only include student data if user is not a student (i.e., is a therapist)
        ...(userType !== "STUDENT" && {
          student: {
            select: {
              id: true,
              fullName: true,
              studentImage: true,
              email: true,
            },
          },
        }),
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                seen: false,
                NOT: {
                  senderId: userId // Don't count user's own messages
                }
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    // Transform the response to include unread count
    const transformedConversations = conversations.map(conv => ({
      ...conv,
      unreadCount: conv._count.messages,
      _count: undefined // Remove the _count field from response
    }));

    res.status(200).json({
      data: transformedConversations,
      message: "Conversations retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error("Error in getConversations:", error);
    res.status(500).json({
      error: error.message,
      message: "Failed to retrieve conversations",
      status: false,
    });
  }
};

export { sendMessage, getMessages, getConversation };
