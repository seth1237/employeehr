import { Company } from "../models/Company"
import { User } from "../models/User"
import { FeedbackPool } from "../models/FeedbackPool"
import { PoolMember } from "../models/PoolMember"
import { PasswordReset } from "../models/PasswordReset"
import { OwnerActionOtp } from "../models/OwnerActionOtp"
import { StockInvoicePayment } from "../models/StockInvoicePayment"
import { CreditNote } from "../models/CreditNote"
import { DispatchNotification } from "../models/DispatchNotification"
import { QuotationFollowUp } from "../models/QuotationFollowUp"
import { StockInvoice } from "../models/StockInvoice"
import { StockQuotation } from "../models/StockQuotation"
import { StockSale } from "../models/StockSale"
import { StockEntry } from "../models/StockEntry"
import { StockCheck } from "../models/StockCheck"
import { StockExpense } from "../models/StockExpense"
import { StockRepeatBill } from "../models/StockRepeatBill"
import { StockTender } from "../models/StockTender"
import { StockServiceJob } from "../models/StockServiceJob"
import { StockService } from "../models/StockService"
import { MachineService } from "../models/MachineService"
import { InstalledMachine } from "../models/InstalledMachine"
import { StockProductLocation } from "../models/StockProductLocation"
import { ProductLocation } from "../models/ProductLocation"
import { StockProduct } from "../models/StockProduct"
import { StockCategory } from "../models/StockCategory"
import { StockManufacturer } from "../models/StockManufacturer"
import { StockCourier } from "../models/StockCourier"
import { StockClientGroup } from "../models/StockClientGroup"
import { StockClient } from "../models/StockClient"
import { StockLocation } from "../models/StockLocation"
import { Warehouse } from "../models/Warehouse"
import { Location } from "../models/Location"
import { EtimsLog } from "../models/EtimsLog"
import { EtimsConfig } from "../models/EtimsConfig"
import { VehicleAlert } from "../models/VehicleAlert"
import { VehicleTrip } from "../models/VehicleTrip"
import { Vehicle } from "../models/Vehicle"
import { ClientComplaint } from "../models/ClientComplaint"
import { ClientConversation } from "../models/ClientConversation"
import { Appointment } from "../models/Appointment"
import { CallLog } from "../models/CallLog"
import { Lead } from "../models/Lead"
import { Customer } from "../models/Customer"
import { Ticket } from "../models/Ticket"
import { BulkSmsCampaign } from "../models/BulkSmsCampaign"
import { CommunicationRoom } from "../models/CommunicationRoom"
import { FeedbackResponse } from "../models/FeedbackResponse"
import { FeedbackSurvey } from "../models/FeedbackSurvey"
import { SurveyResponse } from "../models/SurveyResponse"
import { Feedback } from "../models/Feedback"
import { Poll, VoteRecord } from "../models/Poll"
import { Suggestion } from "../models/Suggestion"
import { Attendance } from "../models/Attendance"
import { LeaveRequest } from "../models/LeaveRequest"
import { LeaveBalance } from "../models/LeaveBalance"
import { Holiday } from "../models/Holiday"
import { Payroll } from "../models/Payroll"
import { Meeting } from "../models/Meeting"
import { Task } from "../models/Task"
import { PDP } from "../models/PDP"
import { Performance } from "../models/Performance"
import { KPI } from "../models/KPI"
import { Award, AwardNomination } from "../models/Award"
import { Badge, UserBadge } from "../models/Badge"
import Stamp from "../models/Stamp"
import Alert from "../models/Alert"
import { ContractAlert } from "../models/ContractAlert"
import { Message } from "../models/Message"
import { Notification } from "../models/Notification"
import { Report } from "../models/Report"
import { LearningRequest } from "../models/LearningRequest"
import JobApplication from "../models/JobApplication"
import ApplicationForm from "../models/ApplicationForm"
import JobAnalytics from "../models/JobAnalytics"
import Job from "../models/Job"
import { Resource, ResourceBooking } from "../models/ResourceBooking"
import { ResourceAllocation } from "../models/ResourceAllocation"
import { ResourceProduct } from "../models/ResourceProduct"
import { ResourceDepartment } from "../models/ResourceDepartment"
import Invitation from "../models/Invitation"
import { LoginOtp } from "../models/LoginOtp"
import SentEmail from "../models/SentEmail"
import AuditLog from "../models/AuditLog"
import { Department } from "../models/Department"
import { Branch } from "../models/Branch"
import { SecondaryStorageService } from "./secondaryStorageService"

type ModelLike = {
  deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount?: number }>
}

async function wipe(
  label: string,
  model: ModelLike,
  filter: Record<string, unknown>,
  counts: Record<string, number>,
  errors: string[],
) {
  try {
    const result = await model.deleteMany(filter)
    counts[label] = Number(result.deletedCount || 0)
  } catch (error: any) {
    errors.push(`${label}: ${error?.message || "delete failed"}`)
    counts[label] = 0
  }
}

export async function permanentlyDeleteCompany(companyId: string) {
  const company = await Company.findById(companyId)
  if (!company) {
    throw new Error("Company not found")
  }

  const orgId = String(company._id)
  const counts: Record<string, number> = {}
  const errors: string[] = []

  // Feedback pool members (no org_id)
  try {
    const pools = await FeedbackPool.find({ org_id: orgId }).select("_id").lean()
    const poolIds = pools.map((pool) => String(pool._id))
    if (poolIds.length > 0) {
      const result = await PoolMember.deleteMany({ pool_id: { $in: poolIds } })
      counts.PoolMember = Number(result.deletedCount || 0)
    } else {
      counts.PoolMember = 0
    }
  } catch (error: any) {
    errors.push(`PoolMember: ${error?.message || "delete failed"}`)
  }

  const orgModels: Array<[string, ModelLike]> = [
    ["StockInvoicePayment", StockInvoicePayment],
    ["CreditNote", CreditNote],
    ["DispatchNotification", DispatchNotification],
    ["QuotationFollowUp", QuotationFollowUp],
    ["StockInvoice", StockInvoice],
    ["StockQuotation", StockQuotation],
    ["StockSale", StockSale],
    ["StockEntry", StockEntry],
    ["StockCheck", StockCheck],
    ["StockExpense", StockExpense],
    ["StockRepeatBill", StockRepeatBill],
    ["StockTender", StockTender],
    ["StockServiceJob", StockServiceJob],
    ["StockService", StockService],
    ["MachineService", MachineService],
    ["InstalledMachine", InstalledMachine],
    ["StockProductLocation", StockProductLocation],
    ["ProductLocation", ProductLocation],
    ["StockProduct", StockProduct],
    ["StockCategory", StockCategory],
    ["StockManufacturer", StockManufacturer],
    ["StockCourier", StockCourier],
    ["StockClientGroup", StockClientGroup],
    ["StockClient", StockClient],
    ["StockLocation", StockLocation],
    ["Warehouse", Warehouse],
    ["Location", Location],
    ["EtimsLog", EtimsLog],
    ["EtimsConfig", EtimsConfig],
    ["VehicleAlert", VehicleAlert],
    ["VehicleTrip", VehicleTrip],
    ["Vehicle", Vehicle],
    ["ClientComplaint", ClientComplaint],
    ["ClientConversation", ClientConversation],
    ["Appointment", Appointment],
    ["CallLog", CallLog],
    ["Lead", Lead],
    ["Customer", Customer],
    ["Ticket", Ticket],
    ["BulkSmsCampaign", BulkSmsCampaign],
    ["CommunicationRoom", CommunicationRoom],
    ["FeedbackResponse", FeedbackResponse],
    ["FeedbackSurvey", FeedbackSurvey],
    ["SurveyResponse", SurveyResponse],
    ["Feedback", Feedback],
    ["VoteRecord", VoteRecord],
    ["Poll", Poll],
    ["Suggestion", Suggestion],
    ["Attendance", Attendance],
    ["LeaveRequest", LeaveRequest],
    ["LeaveBalance", LeaveBalance],
    ["Holiday", Holiday],
    ["Payroll", Payroll],
    ["Meeting", Meeting],
    ["Task", Task],
    ["PDP", PDP],
    ["Performance", Performance],
    ["KPI", KPI],
    ["AwardNomination", AwardNomination],
    ["Award", Award],
    ["UserBadge", UserBadge],
    ["Badge", Badge],
    ["Stamp", Stamp],
    ["Alert", Alert],
    ["ContractAlert", ContractAlert],
    ["Message", Message],
    ["Notification", Notification],
    ["Report", Report],
    ["LearningRequest", LearningRequest],
    ["JobApplication", JobApplication],
    ["ApplicationForm", ApplicationForm],
    ["JobAnalytics", JobAnalytics],
    ["Job", Job],
    ["ResourceBooking", ResourceBooking],
    ["Resource", Resource],
    ["Invitation", Invitation],
    ["LoginOtp", LoginOtp],
    ["SentEmail", SentEmail],
    ["AuditLog", AuditLog],
    ["Department", Department],
    ["Branch", Branch],
    ["FeedbackPool", FeedbackPool],
  ]

  for (const [label, model] of orgModels) {
    await wipe(label, model, { org_id: orgId }, counts, errors)
  }

  const companyIdModels: Array<[string, ModelLike]> = [
    ["ResourceAllocation", ResourceAllocation],
    ["ResourceProduct", ResourceProduct],
    ["ResourceDepartment", ResourceDepartment],
  ]
  for (const [label, model] of companyIdModels) {
    await wipe(label, model, { company_id: orgId }, counts, errors)
  }

  try {
    const users = await User.find({ org_id: orgId }).select("email").lean()
    const emails = users
      .map((user) => String(user.email || "").toLowerCase())
      .filter(Boolean)
    if (emails.length > 0) {
      const result = await PasswordReset.deleteMany({ email: { $in: emails } })
      counts.PasswordReset = Number(result.deletedCount || 0)
    } else {
      counts.PasswordReset = 0
    }
  } catch (error: any) {
    errors.push(`PasswordReset: ${error?.message || "delete failed"}`)
  }

  try {
    const users = await User.find({ org_id: orgId }).select("_id").lean()
    for (const user of users) {
      try {
        await SecondaryStorageService.syncUserToMySQL(user, "DELETE")
      } catch {
        // best-effort
      }
    }
    const userResult = await User.deleteMany({ org_id: orgId })
    counts.User = Number(userResult.deletedCount || 0)
  } catch (error: any) {
    errors.push(`User: ${error?.message || "delete failed"}`)
  }

  try {
    await SecondaryStorageService.syncCompanyToMySQL(company, "DELETE")
  } catch {
    // best-effort
  }

  await Company.deleteOne({ _id: orgId })
  counts.Company = 1

  try {
    const otpResult = await OwnerActionOtp.deleteMany({ companyId: orgId })
    counts.OwnerActionOtp = Number(otpResult.deletedCount || 0)
  } catch (error: any) {
    errors.push(`OwnerActionOtp: ${error?.message || "delete failed"}`)
  }

  return {
    companyId: orgId,
    companyName: company.name,
    companySlug: company.slug,
    deletedCounts: counts,
    errors,
  }
}
