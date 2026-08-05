import mongoose, { Schema } from "mongoose"

// Personal Profile
const personalProfileSchema = new Schema({
  background: { type: String },
  personalityType: { type: String }, // MBTI, Big Five, Enneagram
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  values: [{ type: String }],
  guidingPrinciples: [{ type: String }],
})

// Vision & Mission
const visionMissionSchema = new Schema({
  lifeVision: { type: String }, // 10-20 years
  missionStatement: { type: String },
  purpose: { type: String },
  legacy: { type: String },
})

// Goals
const milestoneSchema = new Schema({
  title: { type: String, required: true },
  dueDate: { type: Date },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
})

const goalSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ["career", "education", "finance", "health", "relationships", "mental_health", "other"],
  },
  timeframe: {
    type: String,
    enum: ["short_term", "long_term"], // short: 1-12 months, long: 1-5 years
  },
  linkedKPI: { type: String },
  targetDate: { type: Date },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "at_risk"],
    default: "not_started",
  },
  milestones: [milestoneSchema],
})

// Action Plan
const actionPlanSchema = new Schema({
  goalId: { type: String },
  whatToAchieve: { type: String, required: true },
  howToAchieve: { type: String },
  resourcesRequired: [{ type: String }],
  expectedChallenges: [{ type: String }],
  solutions: [{ type: String }],
  timeline: { type: String },
  kpis: [{ type: String }], // Success indicators
})

// Skill Assessment
const skillSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String },
  currentLevel: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert"],
  },
  targetLevel: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert"],
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  learningResources: [{ type: String }],
  dueDate: { type: Date },
})

// Habit Development
const habitSchema = new Schema({
  name: { type: String, required: true },
  frequency: { type: String }, // daily, weekly, etc.
  timeOfDay: { type: String },
  stackedWith: { type: String }, // habit stacking
  progress: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastCompleted: { type: Date },
})

// Self-Reflection & Journaling
const journalEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ["daily", "weekly", "monthly", "quarterly"],
  },
  wins: [{ type: String }],
  challenges: [{ type: String }],
  lessonsLearned: [{ type: String }],
  emotionalPatterns: { type: String },
  affirmations: [{ type: String }],
  notes: { type: String },
})

// Life Domains
const careerDomainSchema = new Schema({
  careerRoadmap: { type: String },
  networkingPlan: { type: String },
  cvGoals: [{ type: String }],
  portfolioGoals: [{ type: String }],
})

const educationDomainSchema = new Schema({
  certifications: [{ name: String, targetDate: Date, completed: Boolean }],
  courses: [{ name: String, platform: String, status: String }],
  booksToRead: [{ title: String, author: String, completed: Boolean }],
  researchPlans: [{ type: String }],
})

const financeDomainSchema = new Schema({
  budgetingPlan: { type: String },
  savingGoals: [{ amount: Number, purpose: String, targetDate: Date }],
  investmentPlan: { type: String },
})

const healthDomainSchema = new Schema({
  fitnessGoals: [{ type: String }],
  nutritionStrategy: { type: String },
  stressManagement: [{ type: String }],
  sleepImprovement: { type: String },
})

const relationshipDomainSchema = new Schema({
  familyGoals: [{ type: String }],
  friendshipGoals: [{ type: String }],
  mentorshipPlan: { type: String },
  socialContribution: [{ type: String }],
})

const mentalHealthDomainSchema = new Schema({
  moodTracking: { type: String },
  emotionalTriggers: [{ type: String }],
  copingMechanisms: [{ type: String }],
  mindfulnessPractices: [{ type: String }],
})

// Reviews & Tracking
const reviewSchema = new Schema({
  type: {
    type: String,
    enum: ["weekly", "monthly", "quarterly"],
    required: true,
  },
  date: { type: Date, default: Date.now },
  progress: { type: String },
  achievements: [{ type: String }],
  challenges: [{ type: String }],
  adjustments: [{ type: String }],
  skillsDeveloped: [{ type: String }],
  notes: { type: String },
})

// Main PDP Schema
const pdpSchema = new Schema(
  {
    org_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    period: { type: String, required: true }, // e.g., "2024-Q1", "2024"
    title: { type: String, required: true },
    description: { type: String },

    // Core Components
    personalProfile: personalProfileSchema,
    visionMission: visionMissionSchema,
    goals: [goalSchema],
    actionPlans: [actionPlanSchema],
    skills: [skillSchema],
    habits: [habitSchema],
    journalEntries: [journalEntrySchema],

    // Life Domains
    careerDomain: careerDomainSchema,
    educationDomain: educationDomainSchema,
    financeDomain: financeDomainSchema,
    healthDomain: healthDomainSchema,
    relationshipDomain: relationshipDomainSchema,
    mentalHealthDomain: mentalHealthDomainSchema,

    // Reviews
    reviews: [reviewSchema],

    // Overall Progress & Status
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "completed"],
      default: "draft",
    },
    manager_id: { type: String },
    manager_feedback: { type: String },
    approvedAt: { type: Date },
    trustee_id: { type: String }, // Colleague who can view this PDP
  },
  { timestamps: true },
)

pdpSchema.index({ org_id: 1, user_id: 1 })
pdpSchema.index({ org_id: 1, period: 1 })

export const PDP = mongoose.model("PDP", pdpSchema)
