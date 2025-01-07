import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";

const DonationSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" }),
  desc: z.string().min(1, { message: "Description cannot be empty" }),
  image: z.string().optional(),
  totalAmount: z
    .number()
    .positive({ message: "Total amount must be positive" })
    .min(1, { message: "Total amount must be at least 1" }),
  timePeriod: z.string().datetime(), // Changed this to handle ISO string
  organizedBy: z.string().min(1, { message: "Organizer name is required" }), // Added based on your model
});

const createDonation = async (req, res) => {
  try {
    const validatedData = DonationSchema.parse(req.body);

    const donation = await prisma.donation.create({
      data: {
        title: validatedData.title,
        desc: validatedData.desc,
        imgUrl: validatedData.image || null,
        totalAmount: parseFloat(validatedData.totalAmount),
        timePeriod: new Date(validatedData.timePeriod),
        organizedBy: validatedData.organizedBy,
        isDonationActive: true,
      },
    });

    return res.status(200).json({
      message: "Donation created successfully",
      data: donation,
      status: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
        status: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: false,
    });
  }
};

const updateDonation = async (req, res) => {
  try {
    const validatedData = DonationSchema.parse(req.body);

    const { id } = req.params;

    const donation = await prisma.donation.update({
      where: {
        id,
      },
      data: {
        title: validatedData.title,
        desc: validatedData.desc,
        imgUrl: validatedData.image || null,
        totalAmount: parseFloat(validatedData.totalAmount),
        timePeriod: new Date(validatedData.timePeriod),
        organizedBy: validatedData.organizedBy,
        isDonationActive: true,
      },
    });

    return res.status(200).json({
      message: "Donation updated successfully",
      data: donation,
      status: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
        status: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: false,
    });
  }
};

const getActiveDonations = async (req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      where: {
        isDonationActive: true,
      },
    });

    return res.status(200).json({
      message: "Active donations fetched successfully",
      data: donations,
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: false,
    });
  }
};

const deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.donation.delete({
      where: {
        id,
      },
    });
    return res.status(200).json({
      message: "Donation deleted successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: false,
    });
  }
};

const createDonationRecord = async (req, res) => {
  try {
    const { amount, donationId } = req.body;

    const therapistId = req.role === "therapist" ? req.user?.id : null;
    const parentId = req.role === "parent" ? req.user?.id : null;

    await prisma.$transaction(async (prisma) => {
      await prisma.donationRecord.create({
        data: {
          amount,
          donationId,
          parentId,
          therapistId,
        },
      });

      await prisma.donation.update({
        where: {
          id: donationId,
        },
        data: {
          receivedAmount: {
            increment: amount,
          },
        },
      });
    });

    return res.status(200).json({
      message: "Donation record created successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while creating donation record",
      error: error.message,
      status: false,
    });
  }
};

const getSpecificUserDonationRecord = async (req, res) => {
  try {
    let records;

    if (req.role === "therapist") {
      records = await prisma.donationRecord.findMany({
        where: {
          therapistId: req.user?.id,
        },
        include: {
          donation: {
            select: {
              id: true,
              imgUrl: true,
              title: true,
              desc: true,
              organizedBy: true,
            },
          },
        },
      });
    } else if (req.role === "parent") {
      records = await prisma.donationRecord.findMany({
        where: {
          parentId: req.user?.id,
        },
        include: {
          donation: {
            select: {
              id: true,
              imgUrl: true,
              title: true,
              desc: true,
              organizedBy: true,
            },
          },
        },
      });
    }

    // Group records by donationId and calculate total amount for each donation
    const groupedDonations = records.reduce((acc, record) => {
      const donationId = record.donation.id;

      if (!acc[donationId]) {
        acc[donationId] = {
          donationInfo: record.donation,
          totalAmount: 0,
        };
      }

      acc[donationId].totalAmount += record.amount || 0;

      return acc;
    }, {});

    // Convert the grouped object to an array
    const formattedRecords = Object.values(groupedDonations);

    return res.status(200).json({
      data: formattedRecords,
      message: "Donation record fetched successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while getting donation record",
      error: error.message,
      status: false,
    });
  }
};

export {
  createDonation,
  getActiveDonations,
  updateDonation,
  deleteDonation,
  createDonationRecord,
  getSpecificUserDonationRecord,
};
