import "dotenv/config"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"

import { Company } from "../models/Company"
import { User } from "../models/User"
import { KPI } from "../models/KPI"
import { Performance } from "../models/Performance"
import { PDP } from "../models/PDP"
import { Feedback } from "../models/Feedback"
import { Attendance } from "../models/Attendance"
import { LeaveBalance } from "../models/LeaveBalance"
import { LeaveRequest } from "../models/LeaveRequest"
import { Payroll } from "../models/Payroll"
import { Meeting } from "../models/Meeting"
import { Task } from "../models/Task"
import { Suggestion } from "../models/Suggestion"
import { Poll } from "../models/Poll"
import Alert from "../models/Alert"
import { Notification } from "../models/Notification"
import { Message } from "../models/Message"
import { Award, AwardNomination } from "../models/Award"
import { Report } from "../models/Report"
import { Resource, ResourceBooking } from "../models/ResourceBooking"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"
import { StockEntry } from "../models/StockEntry"
import { StockSale } from "../models/StockSale"
import { StockCourier } from "../models/StockCourier"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"

type AnyDoc = Record<string, any>

const FIRST_NAMES = ["Ava", "Noah", "Liam", "Emma", "Mia", "Ethan", "Grace", "Seth", "Olivia", "Jay"]
const LAST_NAMES = ["Mwangi", "Otieno", "Kimani", "Achieng", "Njoroge", "Wanjiru", "Maina", "Kariuki", "Mutua"]
const DEPARTMENTS = ["HR", "Finance", "Operations", "Engineering", "Sales", "Support"]
const KPI_CATEGORIES = ["performance", "quality", "productivity", "attendance", "customer"]
const SUGGESTION_CATEGORIES = ["workplace", "culture", "process", "benefits", "technology", "other"]
const MEETING_TOPICS = ["Sprint Planning", "Quarterly Review", "Client Follow-up", "Performance Coaching", "Ops Standup"]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

async function insertInChunks(model: any, docs: AnyDoc[], chunkSize: number) {
  if (!docs.length) return 0
  let inserted = 0
  for (const chunk of chunkArray(docs, chunkSize)) {
    const res = await model.insertMany(chunk, { ordered: false })
    inserted += Array.isArray(res) ? res.length : 0
  }
  return inserted
}

async function seedSystemActivityData(orgArg?: string, scale = 1) {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error("MONGODB_URI is not set")

  await mongoose.connect(mongoUri)

  const company = orgArg ? await Company.findById(orgArg) : await Company.findOne().sort({ createdAt: 1 })
  if (!company) throw new Error("No company found. Pass org_id explicitly.")

  const org_id = String(company._id)
  const tag = `${Date.now()}`
  const chunkSize = Math.max(20, 50 * scale)

  let users = await User.find({ org_id })
  let admin = users.find((u) => u.role === "company_admin") || users[0]

  if (!admin) {
    const hashed = await bcrypt.hash("TempPassword123!", 10)
    admin = await User.create({
      org_id,
      firstName: "System",
      lastName: "Admin",
      email: `admin.${tag}@seed.local`,
      password: hashed,
      role: "company_admin",
      status: "active",
      department: "HR",
      position: "Administrator",
    })
    users = [admin]
  }

  const employeesNeeded = Math.max(12, 20 * scale)
  if (users.length < employeesNeeded) {
    const toCreate = employeesNeeded - users.length
    const hashed = await bcrypt.hash("TempPassword123!", 10)
    const newUsers = []
    for (let i = 0; i < toCreate; i++) {
      const firstName = pick(FIRST_NAMES)
      const lastName = pick(LAST_NAMES)
      const role = i % 12 === 0 ? "manager" : i % 9 === 0 ? "hr" : "employee"
      newUsers.push({
        org_id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${tag}.${i}@seed.local`,
        password: hashed,
        role,
        status: "active",
        department: pick(DEPARTMENTS),
        position: role === "manager" ? "Team Lead" : role === "hr" ? "HR Officer" : "Staff",
      })
    }
    await insertInChunks(User, newUsers, chunkSize)
    users = await User.find({ org_id })
  }

  const userIds = users.map((u) => String(u._id))
  const managerIds = users.filter((u) => u.role === "manager" || u.role === "company_admin").map((u) => String(u._id))

  const kpiDocs = Array.from({ length: 15 * scale }).map((_, i) => ({
    org_id,
    name: `Seed KPI ${tag}-${i + 1}`,
    description: "Auto-generated KPI for activity seeding",
    category: pick(KPI_CATEGORIES),
    weight: randomInt(5, 20),
    target: randomInt(50, 120),
    unit: i % 2 === 0 ? "%" : "points",
  }))
  await insertInChunks(KPI, kpiDocs, chunkSize)
  const kpis = await KPI.find({ org_id }).sort({ createdAt: -1 }).limit(30)

  const periods = ["2026-Q1", "2026-Q2", "2026-Q3"]
  const performanceDocs: AnyDoc[] = []
  for (const userId of userIds.slice(0, Math.max(12, 18 * scale))) {
    for (const period of periods) {
      const selectedKpis = kpis.slice(0, 5).map((kpi) => ({
        kpi_id: String(kpi._id),
        score: randomInt(55, 98),
        achieved: randomInt(60, 110),
        target: randomInt(70, 120),
      }))
      performanceDocs.push({
        org_id,
        user_id: userId,
        period,
        kpi_scores: selectedKpis,
        overall_score: randomInt(60, 95),
        attendance_score: randomInt(65, 100),
        feedback_score: randomInt(60, 100),
        status: pick(["pending", "completed", "reviewed"]),
        reviewed_by: pick(managerIds),
        reviewedAt: daysAgo(randomInt(1, 70)),
      })
    }
  }
  await insertInChunks(Performance, performanceDocs, chunkSize)

  const pdpDocs = userIds.slice(0, Math.max(10, 15 * scale)).map((userId, i) => ({
    org_id,
    user_id: userId,
    period: "2026",
    title: `Personal Development Plan ${tag}-${i + 1}`,
    description: "Auto-generated PDP",
    goals: [
      {
        title: "Improve team collaboration",
        description: "Participate in cross-functional sessions",
        category: "career",
        timeframe: "short_term",
        progress: randomInt(10, 90),
        status: pick(["not_started", "in_progress", "completed"]),
      },
    ],
    skills: [
      {
        name: "Communication",
        category: "soft",
        currentLevel: "intermediate",
        targetLevel: "advanced",
        priority: "high",
      },
    ],
    overallProgress: randomInt(5, 90),
    status: pick(["draft", "submitted", "approved"]),
    manager_id: pick(managerIds),
  }))
  await insertInChunks(PDP, pdpDocs, chunkSize)

  const feedbackDocs: AnyDoc[] = []
  for (let i = 0; i < 80 * scale; i++) {
    const fromUser = pick(userIds)
    let toUser = pick(userIds)
    if (toUser === fromUser) toUser = pick(userIds)
    feedbackDocs.push({
      org_id,
      from_user_id: fromUser,
      to_user_id: toUser,
      rating: randomInt(3, 5),
      type: pick(["general", "praise", "constructive", "recognition"]),
      feedback_text: "Great collaboration and consistency in deliverables.",
      status: "delivered",
      createdAt: daysAgo(randomInt(1, 90)),
      updatedAt: new Date(),
    })
  }
  await insertInChunks(Feedback, feedbackDocs, chunkSize)

  const attendanceDocs: AnyDoc[] = []
  for (const userId of userIds.slice(0, Math.max(10, 16 * scale))) {
    for (let d = 0; d < 28; d++) {
      attendanceDocs.push({
        org_id,
        user_id: userId,
        date: daysAgo(d),
        status: pick(["present", "present", "present", "late", "half_day", "absent"]),
        hoursWorked: randomInt(5, 9),
        remarks: "Seeded attendance record",
      })
    }
  }
  await insertInChunks(Attendance, attendanceDocs, chunkSize)

  const year = new Date().getFullYear()
  for (const userId of userIds) {
    await LeaveBalance.updateOne(
      { user_id: userId, year },
      {
        $set: {
          org_id,
          annual_total: 21,
          annual_used: randomInt(0, 10),
          sick_total: 14,
          sick_used: randomInt(0, 5),
          unpaid_used: randomInt(0, 3),
        },
      },
      { upsert: true }
    )
  }

  const leaveDocs = Array.from({ length: 40 * scale }).map((_, i) => {
    const start = daysAgo(randomInt(1, 120))
    const end = new Date(start)
    end.setDate(start.getDate() + randomInt(1, 5))
    return {
      org_id,
      user_id: pick(userIds),
      type: pick(["Annual", "Sick", "Unpaid", "Other"]),
      startDate: start,
      endDate: end,
      reason: `Seed leave request ${i + 1}`,
      status: pick(["pending", "approved", "rejected"]),
      manager_id: pick(managerIds),
      manager_comment: "Reviewed during seeding",
    }
  })
  await insertInChunks(LeaveRequest, leaveDocs, chunkSize)

  const payrollMonths = ["2026-01", "2026-02", "2026-03"]
  for (const userId of userIds.slice(0, Math.max(10, 16 * scale))) {
    for (const month of payrollMonths) {
      const base = randomInt(60000, 220000)
      const bonus = randomInt(0, 18000)
      const deductions = [
        { name: "PAYE", amount: randomInt(5000, 25000) },
        { name: "NSSF", amount: randomInt(500, 2500) },
      ]
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
      await Payroll.updateOne(
        { user_id: userId, month },
        {
          $set: {
            org_id,
            base_salary: base,
            bonus,
            deduction_items: deductions,
            total_deductions: totalDeductions,
            net_pay: base + bonus - totalDeductions,
            status: pick(["processed", "paid", "draft"]),
            generated_at: daysAgo(randomInt(1, 90)),
          },
        },
        { upsert: true }
      )
    }
  }

  const meetingDocs: AnyDoc[] = []
  for (let i = 0; i < 30 * scale; i++) {
    const organizer = pick(managerIds)
    const attendeePool = userIds.filter((id) => id !== organizer).slice(0, randomInt(3, 8))
    const start = daysAgo(randomInt(1, 90))
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + randomInt(30, 90))
    meetingDocs.push({
      org_id,
      title: `${pick(MEETING_TOPICS)} #${i + 1}`,
      description: "Seeded meeting activity",
      scheduled_at: start,
      duration_minutes: randomInt(30, 90),
      meeting_type: pick(["video", "audio", "in-person"]),
      meeting_id: `SEED-${tag}-${i + 1}`,
      meeting_link: `https://hr.codewithseth.co.ke/meeting/SEED-${tag}-${i + 1}`,
      require_password: false,
      status: pick(["completed", "completed", "scheduled", "cancelled"]),
      organizer_id: organizer,
      attendees: attendeePool.map((id) => ({
        user_id: id,
        status: "accepted",
        attended: Math.random() > 0.2,
        joined_at: start,
        left_at: end,
        duration_minutes: randomInt(20, 90),
      })),
      actual_start_time: start,
      actual_end_time: end,
      transcript: "Seed transcript: reviewed progress, blockers, and action items.",
      ai_summary: "Seed AI summary for meeting.",
      key_points: ["Reviewed KPIs", "Resolved blockers", "Planned next sprint"],
      action_items: [
        {
          description: "Follow up on assigned tasks",
          assigned_to: pick(userIds),
          due_date: daysAgo(-7),
        },
      ],
      ai_processed: true,
      ai_processing_status: "completed",
    })
  }
  await insertInChunks(Meeting, meetingDocs, chunkSize)

  const taskDocs = Array.from({ length: 70 * scale }).map((_, i) => ({
    org_id,
    title: `Seed Task ${i + 1}`,
    description: "System generated task for module activity",
    assigned_to: pick(userIds),
    assigned_by: pick(managerIds),
    priority: pick(["low", "medium", "high", "urgent"]),
    status: pick(["pending", "in_progress", "completed", "cancelled"]),
    due_date: daysAgo(-randomInt(1, 21)),
    notes: "Seed note",
  }))
  await insertInChunks(Task, taskDocs, chunkSize)

  const suggestionDocs = Array.from({ length: 35 * scale }).map((_, i) => ({
    org_id,
    user_id: pick(userIds),
    is_anonymous: Math.random() > 0.7,
    title: `Suggestion ${i + 1}`,
    description: "Improve process efficiency in daily operations.",
    category: pick(SUGGESTION_CATEGORIES),
    status: pick(["submitted", "under_review", "approved", "implemented"]),
    priority: pick(["low", "medium", "high"]),
    upvotes: randomInt(0, 20),
  }))
  await insertInChunks(Suggestion, suggestionDocs, chunkSize)

  const pollDocs = Array.from({ length: 12 * scale }).map((_, i) => ({
    org_id,
    created_by: pick(managerIds),
    title: `Company Poll ${i + 1}`,
    description: "Seeded poll for engagement",
    poll_type: pick(["general", "policy_change", "department"]),
    options: [
      { text: "Option A", votes: randomInt(1, 20), voted_by: [] },
      { text: "Option B", votes: randomInt(1, 20), voted_by: [] },
      { text: "Option C", votes: randomInt(1, 20), voted_by: [] },
    ],
    start_date: daysAgo(randomInt(1, 30)),
    end_date: daysAgo(-randomInt(1, 15)),
    status: pick(["active", "closed", "draft"]),
    total_votes: randomInt(5, 60),
  }))
  await insertInChunks(Poll, pollDocs, chunkSize)

  const notificationDocs = Array.from({ length: 120 * scale }).map(() => ({
    org_id,
    user_id: pick(userIds),
    title: "System Update",
    message: "A new activity was recorded in your workspace.",
    type: pick(["info", "alert", "reminder", "achievement"]),
    isRead: Math.random() > 0.5,
  }))
  await insertInChunks(Notification, notificationDocs, chunkSize)

  const alertDocs = Array.from({ length: 60 * scale }).map(() => ({
    org_id,
    user_id: pick(userIds),
    alert_type: pick([
      "contract_expiry",
      "incomplete_pdp",
      "attendance_anomaly",
      "task_overload",
      "performance_low",
      "leave_balance_low",
      "project_deadline",
      "feedback_pending",
    ]),
    severity: pick(["low", "medium", "high", "critical"]),
    title: "Attention Required",
    message: "Seed alert generated for testing and analytics.",
  }))
  await insertInChunks(Alert, alertDocs, chunkSize)

  const messageDocs = Array.from({ length: 90 * scale }).map(() => {
    const from = pick(userIds)
    let to = pick(userIds)
    if (to === from) to = pick(userIds)
    return {
      org_id,
      from_user_id: from,
      to_user_id: to,
      subject: "Seed Message",
      body: "This is a seeded internal communication message.",
      is_read: Math.random() > 0.5,
    }
  })
  await insertInChunks(Message, messageDocs, chunkSize)

  const awardDocs = Array.from({ length: 8 * scale }).map((_, i) => ({
    org_id,
    name: `Award ${i + 1}`,
    description: "Seeded award",
    type: pick(["monthly", "quarterly", "special", "recognition"]),
    criteria: "Consistent high performance",
  }))
  await insertInChunks(Award, awardDocs, chunkSize)
  const awards = await Award.find({ org_id }).sort({ createdAt: -1 }).limit(12)

  const nominationDocs = Array.from({ length: 30 * scale }).map(() => ({
    org_id,
    award_id: String(pick(awards)._id),
    user_id: pick(userIds),
    nominator_id: pick(managerIds),
    period: "2026-Q2",
    score: randomInt(70, 100),
    reason: "Outstanding contribution",
    status: pick(["pending", "approved", "rejected"]),
  }))
  await insertInChunks(AwardNomination, nominationDocs, chunkSize)

  // Reports use ObjectId refs
  const orgObjectId = new mongoose.Types.ObjectId(org_id)
  const reportDocs = Array.from({ length: 30 * scale }).map((_, i) => ({
    org_id: orgObjectId,
    user_id: new mongoose.Types.ObjectId(pick(userIds)),
    type: pick(["daily", "weekly", "monthly", "quarterly"]),
    title: `Seed Report ${i + 1}`,
    content: "Generated report content for seeded activities.",
    status: pick(["draft", "submitted", "approved"]),
    submitted_at: daysAgo(randomInt(1, 40)),
    tags: ["seed", "activity"],
  }))
  await insertInChunks(Report, reportDocs, chunkSize)

  const resourceDocs = Array.from({ length: 12 * scale }).map((_, i) => ({
    org_id,
    name: `Resource ${i + 1}`,
    type: pick(["desk", "car", "meeting_room", "parking", "equipment"]),
    location: `Floor ${randomInt(1, 5)}`,
    is_available: true,
    requires_approval: Math.random() > 0.5,
  }))
  await insertInChunks(Resource, resourceDocs, chunkSize)
  const resources = await Resource.find({ org_id }).limit(20)

  const bookingDocs = Array.from({ length: 35 * scale }).map(() => {
    const start = daysAgo(randomInt(1, 45))
    const end = new Date(start)
    end.setHours(end.getHours() + randomInt(1, 4))
    const resource = pick(resources)
    return {
      org_id,
      user_id: pick(userIds),
      resource_type: resource.type,
      resource_id: String(resource._id),
      resource_name: resource.name,
      start_date: start,
      end_date: end,
      status: pick(["pending", "approved", "completed", "cancelled"]),
      purpose: "Seed booking",
    }
  })
  await insertInChunks(ResourceBooking, bookingDocs, chunkSize)

  // Stock + dispatch activity
  const categoryDocs = ["Consumables", "Diagnostics", "PPE", "Emergency", "General"].map((name) => ({
    org_id,
    name: `${name}-${tag}`,
    description: "Seed category",
    createdBy: String(admin._id),
  }))
  await insertInChunks(StockCategory, categoryDocs, chunkSize)
  const categories = await StockCategory.find({ org_id }).sort({ createdAt: -1 }).limit(10)

  const productDocs = Array.from({ length: 40 * scale }).map((_, i) => ({
    org_id,
    name: `Seed Product ${tag}-${i + 1}`,
    category: String(pick(categories)._id),
    startingPrice: randomInt(100, 2000),
    sellingPrice: randomInt(200, 3000),
    minAlertQuantity: randomInt(5, 20),
    currentQuantity: randomInt(50, 500),
    assignedUsers: [pick(userIds)],
    createdBy: String(admin._id),
    isActive: true,
  }))
  await insertInChunks(StockProduct, productDocs, chunkSize)
  const products = await StockProduct.find({ org_id }).sort({ createdAt: -1 }).limit(80)

  const courierDocs = Array.from({ length: 8 * scale }).map((_, i) => ({
    org_id,
    name: `Seed Courier ${tag}-${i + 1}`,
    contactName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    contactNumber: `+2547${randomInt(10000000, 99999999)}`,
    createdBy: String(admin._id),
    isActive: true,
  }))
  await insertInChunks(StockCourier, courierDocs, chunkSize)
  const couriers = await StockCourier.find({ org_id }).sort({ createdAt: -1 }).limit(20)

  const quotationDocs: AnyDoc[] = []
  const invoiceDocs: AnyDoc[] = []
  const entryDocs: AnyDoc[] = []
  const saleDocs: AnyDoc[] = []

  for (let i = 0; i < 35 * scale; i++) {
    const productA = pick(products)
    const productB = pick(products)
    const qtyA = randomInt(2, 12)
    const qtyB = randomInt(1, 8)
    const lineA = qtyA * Number(productA.sellingPrice)
    const lineB = qtyB * Number(productB.sellingPrice)
    const total = lineA + lineB

    const quotationNumber = `QUO-${tag}-${1000 + i}`
    const invoiceNumber = `INV-${tag}-${1000 + i}`
    const deliveryNoteNumber = `DN-${tag}-${1000 + i}`
    const courier = pick(couriers)
    const assignedUser = pick(userIds)
    const dispatchAt = daysAgo(randomInt(1, 60))
    const deliveryAt = new Date(dispatchAt)
    deliveryAt.setHours(deliveryAt.getHours() + randomInt(2, 30))

    quotationDocs.push({
      org_id,
      quotationNumber,
      client: {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        number: `+2547${randomInt(10000000, 99999999)}`,
        location: pick(["Nairobi", "Mombasa", "Kisumu", "Nakuru"]),
      },
      items: [
        {
          productId: String(productA._id),
          productName: productA.name,
          quantity: qtyA,
          unitPrice: productA.sellingPrice,
          lineTotal: lineA,
        },
      ],
      subTotal: lineA,
      status: pick(["draft", "converted"]),
      createdBy: String(admin._id),
    })

    invoiceDocs.push({
      org_id,
      invoiceNumber,
      deliveryNoteNumber,
      quotationNumber,
      client: {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        number: `+2547${randomInt(10000000, 99999999)}`,
        location: pick(["Nairobi", "Mombasa", "Kisumu", "Nakuru"]),
      },
      items: [
        {
          productId: String(productA._id),
          productName: productA.name,
          quantity: qtyA,
          unitPrice: productA.sellingPrice,
          lineTotal: lineA,
        },
        {
          productId: String(productB._id),
          productName: productB.name,
          quantity: qtyB,
          unitPrice: productB.sellingPrice,
          lineTotal: lineB,
        },
      ],
      subTotal: total,
      status: pick(["issued", "paid"]),
      dispatch: {
        status: pick(["assigned", "packing", "dispatched", "delivered"]),
        assignedToUserId: assignedUser,
        assignedByUserId: String(admin._id),
        assignedAt: daysAgo(randomInt(2, 70)),
        packingItems: [
          {
            productId: String(productA._id),
            productName: productA.name,
            requiredQuantity: qtyA,
            packedQuantity: qtyA,
          },
          {
            productId: String(productB._id),
            productName: productB.name,
            requiredQuantity: qtyB,
            packedQuantity: qtyB,
          },
        ],
        packingCompleted: true,
        packingCompletedAt: daysAgo(randomInt(1, 60)),
        dispatchedAt: dispatchAt,
        dispatchedByUserId: assignedUser,
        transportMeans: pick(["bike", "van", "truck"]),
        courier: {
          courierId: String(courier._id),
          name: courier.name,
          contactName: courier.contactName,
          contactNumber: courier.contactNumber,
        },
        inquiries: [],
        delivery: {
          received: true,
          condition: Math.random() > 0.85 ? "not_good" : "good",
          arrivalTime: deliveryAt,
          everythingPacked: Math.random() > 0.1,
          confirmedBy: assignedUser,
          confirmedAt: deliveryAt,
        },
      },
      createdBy: String(admin._id),
    })

    entryDocs.push({
      org_id,
      productId: String(productA._id),
      quantityAdded: randomInt(5, 40),
      expiryEnabled: false,
      addedBy: String(admin._id),
      note: "Seed stock entry",
    })

    saleDocs.push({
      org_id,
      productId: String(productA._id),
      quantitySold: randomInt(1, 8),
      soldPrice: Number(productA.sellingPrice),
      soldBy: pick(userIds),
      buyerName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      buyerNumber: `+2547${randomInt(10000000, 99999999)}`,
      buyerLocation: pick(["Nairobi", "Mombasa", "Kisumu", "Nakuru"]),
      isWalkInClient: false,
      isSalesCompany: false,
      receiptNumber: `RCPT-${tag}-${10000 + i}`,
      remainingQuantity: randomInt(10, 120),
    })
  }

  await insertInChunks(StockQuotation, quotationDocs, chunkSize)
  await insertInChunks(StockInvoice, invoiceDocs, chunkSize)
  await insertInChunks(StockEntry, entryDocs, chunkSize)
  await insertInChunks(StockSale, saleDocs, chunkSize)

  const summary = {
    users: await User.countDocuments({ org_id }),
    kpis: await KPI.countDocuments({ org_id }),
    performance: await Performance.countDocuments({ org_id }),
    pdps: await PDP.countDocuments({ org_id }),
    feedback: await Feedback.countDocuments({ org_id }),
    attendance: await Attendance.countDocuments({ org_id }),
    leaveRequests: await LeaveRequest.countDocuments({ org_id }),
    payroll: await Payroll.countDocuments({ org_id }),
    meetings: await Meeting.countDocuments({ org_id }),
    tasks: await Task.countDocuments({ org_id }),
    suggestions: await Suggestion.countDocuments({ org_id }),
    polls: await Poll.countDocuments({ org_id }),
    notifications: await Notification.countDocuments({ org_id }),
    alerts: await Alert.countDocuments({ org_id }),
    messages: await Message.countDocuments({ org_id }),
    awards: await Award.countDocuments({ org_id }),
    nominations: await AwardNomination.countDocuments({ org_id }),
    resources: await Resource.countDocuments({ org_id }),
    bookings: await ResourceBooking.countDocuments({ org_id }),
    stockCategories: await StockCategory.countDocuments({ org_id }),
    stockProducts: await StockProduct.countDocuments({ org_id }),
    stockEntries: await StockEntry.countDocuments({ org_id }),
    stockSales: await StockSale.countDocuments({ org_id }),
    stockCouriers: await StockCourier.countDocuments({ org_id }),
    quotations: await StockQuotation.countDocuments({ org_id }),
    invoices: await StockInvoice.countDocuments({ org_id }),
  }

  console.log("\n✅ Seed completed for org:", org_id)
  console.table(summary)

  await mongoose.disconnect()
}

const orgIdArg = process.argv[2]
const scaleArg = Number(process.argv[3] || "1")

seedSystemActivityData(orgIdArg, Number.isFinite(scaleArg) && scaleArg > 0 ? scaleArg : 1)
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("❌ Seed failed:", error)
    try {
      await mongoose.disconnect()
    } catch {}
    process.exit(1)
  })
