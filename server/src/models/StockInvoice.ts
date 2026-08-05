import mongoose, { Schema } from "mongoose"

interface IInvoiceItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  description?: string
  productDescription?: string
  productType?: string
  kraItemClassificationCode?: string
  isOutsourced?: boolean
}

interface IInvoiceClient {
  name: string
  number: string
  location: string
}

export interface IStockInvoice {
  _id?: string
  org_id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  quotationId?: string
  quotationNumber?: string
  client: IInvoiceClient
  clientProfileId?: string
  items: IInvoiceItem[]
  subTotal: number
  etims?: {
    status: "not_posted" | "posted" | "failed"
    kraInvoiceId?: string
    postedAt?: Date
    postedBy?: string
    responseMessage?: string
  }
  status: "issued" | "paid" | "cancelled"
  dispatch?: {
    status: "not_assigned" | "assigned" | "packing" | "packed" | "dispatched" | "delivered"
    assignedToUserId?: string
    assignedByUserId?: string
    assignedAt?: Date
    packingItems: Array<{
      productId: string
      productName: string
      requiredQuantity: number
      packedQuantity: number
    }>
    packingCompleted: boolean
    packingCompletedAt?: Date
    dispatchedAt?: Date
    dispatchedByUserId?: string
    transportMeans?: string
    courier?: {
      courierId?: string
      name: string
      contactName: string
      contactNumber: string
      isNewCourier?: boolean
    }
    inquiries: Array<{
      mode: "client" | "courier"
      method: "call"
      note?: string
      createdBy: string
      createdAt: Date
    }>
    delivery?: {
      received: boolean
      condition: "good" | "not_good"
      arrivalTime: Date
      everythingPacked: boolean
      note?: string
      confirmedBy: string
      confirmedAt: Date
    }
  }
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    description: { type: String },
    productDescription: { type: String },
    productType: { type: String },
    kraItemClassificationCode: { type: String },
    isOutsourced: { type: Boolean, default: false },
  },
  { _id: false },
)

const stockInvoiceSchema = new Schema<IStockInvoice>(
  {
    org_id: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    deliveryNoteNumber: { type: String, required: true, index: true },
    quotationId: { type: String },
    quotationNumber: { type: String },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
    },
    clientProfileId: { type: String },
    items: { type: [invoiceItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    etims: {
      status: {
        type: String,
        enum: ["not_posted", "posted", "failed"],
        default: "not_posted",
      },
      kraInvoiceId: { type: String },
      postedAt: { type: Date },
      postedBy: { type: String },
      responseMessage: { type: String },
    },
    status: {
      type: String,
      enum: ["issued", "paid", "cancelled"],
      default: "issued",
    },
    dispatch: {
      status: {
        type: String,
        enum: ["not_assigned", "assigned", "packing", "packed", "dispatched", "delivered"],
        default: "not_assigned",
      },
      assignedToUserId: { type: String },
      assignedByUserId: { type: String },
      assignedAt: { type: Date },
      packingItems: [
        {
          _id: false,
          productId: { type: String, required: true },
          productName: { type: String, required: true },
          requiredQuantity: { type: Number, required: true, min: 1 },
          packedQuantity: { type: Number, required: true, min: 0, default: 0 },
        },
      ],
      packingCompleted: { type: Boolean, default: false },
      packingCompletedAt: { type: Date },
      dispatchedAt: { type: Date },
      dispatchedByUserId: { type: String },
      transportMeans: { type: String },
      courier: {
        courierId: { type: String },
        name: { type: String },
        contactName: { type: String },
        contactNumber: { type: String },
        isNewCourier: { type: Boolean, default: false },
      },
      inquiries: [
        {
          _id: false,
          mode: { type: String, enum: ["client", "courier"], required: true },
          method: { type: String, enum: ["call"], default: "call" },
          note: { type: String },
          createdBy: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      delivery: {
        received: { type: Boolean },
        condition: { type: String, enum: ["good", "not_good"] },
        arrivalTime: { type: Date },
        everythingPacked: { type: Boolean },
        note: { type: String },
        confirmedBy: { type: String },
        confirmedAt: { type: Date },
      },
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockInvoiceSchema.index({ org_id: 1, invoiceNumber: 1 }, { unique: true })
stockInvoiceSchema.index({ org_id: 1, deliveryNoteNumber: 1 }, { unique: true })

stockInvoiceSchema.pre("validate", function (next) {
  const dispatch = (this as any).dispatch
  if (dispatch) {
    if (dispatch.courier === undefined) delete dispatch.courier
    if (dispatch.delivery === undefined) delete dispatch.delivery
    if (dispatch.transportMeans === undefined) delete dispatch.transportMeans
    if (dispatch.dispatchedAt === undefined) delete dispatch.dispatchedAt
    if (dispatch.dispatchedByUserId === undefined) delete dispatch.dispatchedByUserId
  }
  next()
})

stockInvoiceSchema.pre("save", function (next) {
  const dispatch = (this as any).dispatch
  if (dispatch) {
    if (dispatch.courier === undefined) delete dispatch.courier
    if (dispatch.delivery === undefined) delete dispatch.delivery
    if (dispatch.transportMeans === undefined) delete dispatch.transportMeans
    if (dispatch.dispatchedAt === undefined) delete dispatch.dispatchedAt
    if (dispatch.dispatchedByUserId === undefined) delete dispatch.dispatchedByUserId
  }
  next()
})

export const StockInvoice = mongoose.model<IStockInvoice>("StockInvoice", stockInvoiceSchema)
