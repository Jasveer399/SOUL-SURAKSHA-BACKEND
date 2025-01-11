import { prisma } from "../db/prismaClientConfig.js";

// Get all statistics
const getStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Get all counts in parallel for better performance
    const [
      therapistsCount,
      studentsCount,
      parentsCount,
      activeDonationsCount,
      totalBlogViews,
      activeDonations,
      studentsMonthly,
      parentsMonthly,
    ] = await Promise.all([
      prisma.therapist.count(),
      prisma.student.count(),
      prisma.parent.count(),
      prisma.donation.count({
        where: { isDonationActive: true },
      }),
      prisma.blog.aggregate({
        _sum: { viewCount: true },
      }),
      prisma.donation.findMany({
        where: { isDonationActive: true },
        select: {
          title: true,
          totalAmount: true,
          receivedAmount: true,
          timePeriod: true,
        },
      }),
      // Get students created each month
      prisma.student.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: {
            gte: new Date(currentYear, 0, 1), // Start of current year
            lt: new Date(currentYear + 1, 0, 1), // Start of next year
          },
        },
      }),
      // Get parents created each month
      prisma.parent.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1),
          },
        },
      }),
    ]);

    // Calculate stats
    const statsCardData = {
      totalTherapists: therapistsCount,
      totalUsers: studentsCount + parentsCount,
      activedonations: activeDonationsCount,
      totalBlogViews: totalBlogViews._sum.viewCount || 0,
    };

    // Process monthly data
    const monthlyData = new Map();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize all months with zero counts
    months.forEach((month) => {
      monthlyData.set(month, { Students: 0, Parents: 0 });
    });

    // Count students per month
    studentsMonthly.forEach((record) => {
      const month = record.createdAt.toLocaleString("default", {
        month: "short",
      });
      const currentData = monthlyData.get(month);
      if (currentData) {
        currentData.Students++;
      }
    });

    // Count parents per month
    parentsMonthly.forEach((record) => {
      const month = record.createdAt.toLocaleString("default", {
        month: "short",
      });
      const currentData = monthlyData.get(month);
      if (currentData) {
        currentData.Parents++;
      }
    });

    // Convert map to array in required format
    const userStats = Array.from(monthlyData, ([month, data]) => ({
      month,
      ...data,
    }));

    const calculateDaysLeft = (timePeriod) => {
      const endDate = new Date(timePeriod);
      const currentDate = new Date();
      const timeDiff = endDate - currentDate;
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return Math.max(0, daysLeft); // Ensure we don't show negative days
    };

    const activeDonationsData = activeDonations.map((donation) => ({
      title: donation.title,
      progress: Number(
        (((donation.receivedAmount || 0) / donation.totalAmount) * 100).toFixed(
          2
        )
      ),
      receivedAmount: donation.receivedAmount || 0,
      daysLeft: calculateDaysLeft(donation.timePeriod),
    }));

    return res.status(200).json({
      data: {
        statsCardData,
        userStats,
        activeDonationsData,
      },
      status: true,
      message: "Statistics fetched successfully",
    });
  } catch (error) {
    console.error("Error in getStats:", error);
    return res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

// Get top rated therapists
const getTopRatedTherapists = async (req, res) => {
  try {
    const topTherapists = await prisma.therapist.findMany({
      where: {
        ratings: { not: null },
      },
      select: {
        userName: true,
        ratings: true,
        id: true,
      },
      orderBy: {
        ratings: "desc",
      },
      take: 5,
    });

    return res.status(200).json({
      data: topTherapists,
      status: true,
      message: "Top rated therapists fetched successfully",
    });
  } catch (error) {
    console.error("Error in getTopRatedTherapists:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch top rated therapists" });
  }
};

const getBlogViewsStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // January 1st
    const endDate = new Date(currentYear, 11, 31); // December 31st

    // Get all blogs for the current year
    const blogs = await prisma.blog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        viewCount: true,
      },
    });

    // Initialize monthly data structure
    const months = [
      { month: "Jan", views: 0 },
      { month: "Feb", views: 0 },
      { month: "Mar", views: 0 },
      { month: "Apr", views: 0 },
      { month: "May", views: 0 },
      { month: "Jun", views: 0 },
      { month: "Jul", views: 0 },
      { month: "Aug", views: 0 },
      { month: "Sep", views: 0 },
      { month: "Oct", views: 0 },
      { month: "Nov", views: 0 },
      { month: "Dec", views: 0 },
    ];

    // Aggregate views by month
    blogs.forEach((blog) => {
      const monthIndex = blog.createdAt.getMonth();
      months[monthIndex].views += blog.viewCount;
    });

    return res.status(200).json({
      success: true,
      data: months,
    });
  } catch (error) {
    console.error("Error getting blog stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get blog statistics",
    });
  }
};

export { getStats, getTopRatedTherapists, getBlogViewsStats };
