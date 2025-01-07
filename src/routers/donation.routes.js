import { Router } from "express";
import {
  createDonation,
  createDonationRecord,
  deleteDonation,
  getActiveDonations,
  getSpecificUserDonationRecord,
  updateDonation,
} from "../controllers/donation.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/createDonation", createDonation);
router.get("/getActiveDonations", getActiveDonations);
router.put("/updateDonation/:id", updateDonation);
router.delete("/deleteDonation/:id", deleteDonation);
router.post("/createDonationRecord", verifyJWT(["therapist"]), createDonationRecord);
router.get("/getSpecificUserDonationRecord", verifyJWT(["therapist"]), getSpecificUserDonationRecord);

export { router as donationRoutes };
