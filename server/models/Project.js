import mongoose from "mongoose";
import { generateId } from "../api/utils/id.js";

const ProjectSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  projectName: { type: String, required: true },
  teamMembers: [{
    _id: false,
    name: { type: String, required: true },
    customUrl: { type: String },
    walletAddress: { type: String }
  }],
  description: { type: String, required: true },
  hackathon: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    endDate: { type: Date, required: true }
  },
  projectRepo: { type: String },
  demoUrl: { type: String },
  slidesUrl: { type: String },
  techStack: { type: [String], required: true },
  categories: { type: [String], default: [] },
  milestones: [{
    description: { type: String, required: true },
    // currator on chain metadata
    createdAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
    updatedAt: { type: Date, required: true },
    updatedBy: { type: String, required: true },
  }],
  bountyPrize: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    hackathonWonAtId: { type: String, required: true },
  }],
  donationAddress: { type: String, required: false },
  projectState: { type: String, required: true },
  // Flag to indicate if all milestones/bounties have been paid out or finalized (i.e. project abandoned).
  bountiesProcessed: { type: Boolean, default: false, required: true },
}, { timestamps: true, versionKey: false, toJSON: { virtuals: true, transform: (_doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.createdAt;
  return ret;
}}, toObject: { virtuals: true } });

// Auto-generate ids if not provided
ProjectSchema.pre('validate', function(next) {
  if (!this._id) {
    this._id = generateId(this.projectName);
  }
  next();
});

export default mongoose.model("Project", ProjectSchema, "projects");
