import { Router } from "express";
import {
  createDonation,
  createDonationRecord,
  createOrder,
  deleteDonation,
  getActiveDonations,
  getInavtiveDonations,
  getSpecificDonation,
  getSpecificUserDonationRecord,
  updateDonation,
} from "../controllers/donation.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/createDonation", createDonation);
router.get("/getActiveDonations", getActiveDonations);
router.put("/updateDonation/:id", updateDonation);
router.delete("/deleteDonation/:id", deleteDonation);
router.get("/getSpecificDonation/:id", getSpecificDonation);
router.get("/getSpecificUserDonationRecord", verifyJWT(["therapist"]), getSpecificUserDonationRecord);
router.get("/getInavtiveDonations", verifyJWT(["therapist"]), getInavtiveDonations);
router.post("/createOrder", verifyJWT(["therapist"]), createOrder);
router.post("/createDonationRecord", verifyJWT(["therapist"]), createDonationRecord);

export { router as donationRoutes };
