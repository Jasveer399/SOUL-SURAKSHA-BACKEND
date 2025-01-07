import { Router } from "express";
import {
  createDonation,
  deleteDonation,
  getActiveDonations,
  updateDonation,
} from "../controllers/donation.controller.js";

const router = Router();

router.post("/createDonation", createDonation);
router.get("/getActiveDonations", getActiveDonations);
router.put("/updateDonation/:id", updateDonation);
router.delete("/deleteDonation/:id", deleteDonation);

export { router as donationRoutes };
