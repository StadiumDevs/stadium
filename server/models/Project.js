import mongoose from "mongoose";
import { generateId } from "../api/utils/id.js";

const ProjectSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  projectName: { type: String, required: true },
  teamMembers: [{
    _id: false,
    name: { type: String, required: true },
    customUrl: { type: String },
    walletAddress: { type: String },
    role: { type: String },
    twitter: { type: String },
    github: { type: String },
    linkedin: { type: String }
  }],
  description: { type: String, required: true },
  hackathon: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    endDate: { type: Date, required: true },
    eventStartedAt: { type: String }
  },
  projectRepo: { type: String },
  demoUrl: { type: String },
  slidesUrl: { type: String },
  /** Live/production website URL (e.g. https://kleo.finance/) */
  liveUrl: { type: String },
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
  // M2 Incubator Program fields
  m2Status: { 
    type: String, 
    enum: ['building', 'under_review', 'completed'],
    default: undefined
  },
  m2Agreement: {
    mentorName: { type: String },
    agreedDate: { type: Date },
    agreedFeatures: [{ type: String, maxlength: 500 }],
    documentation: [{ type: String, maxlength: 500 }],
    successCriteria: { type: String, maxlength: 2000 },
    lastUpdatedBy: { type: String, enum: ['team', 'admin'] },
    lastUpdatedDate: { type: Date }
  },
  finalSubmission: {
    repoUrl: { type: String, required: function() { return this.m2Status === 'under_review' || this.m2Status === 'completed'; } },
    demoUrl: { type: String, required: function() { return this.m2Status === 'under_review' || this.m2Status === 'completed'; } },
    docsUrl: { type: String, required: function() { return this.m2Status === 'under_review' || this.m2Status === 'completed'; } },
    summary: { type: String, minlength: 10, maxlength: 1000, required: function() { return this.m2Status === 'under_review' || this.m2Status === 'completed'; } },
    submittedDate: { type: Date },
    submittedBy: { type: String }
  },
  changesRequested: {
    feedback: { type: String },
    requestedBy: { type: String },
    requestedDate: { type: Date }
  },
  completionDate: { type: Date },
  submittedDate: { type: Date },
  totalPaid: [{
    milestone: { type: String, enum: ['M1', 'M2', 'BOUNTY'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USDC', 'DOT'], required: true },
    transactionProof: { type: String, required: true }, // URL to transaction proof
    bountyName: { type: String }, // Only for BOUNTY milestone type - name from bountyPrize
    paidDate: { type: Date, default: Date.now }
  }]
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
