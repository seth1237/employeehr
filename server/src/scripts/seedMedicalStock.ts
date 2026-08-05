import "dotenv/config"
import mongoose from "mongoose"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"

const CATEGORY_NAMES = [
  "Consumables",
  "Diagnostics",
  "PPE",
  "Wound Care",
  "Surgical",
  "Pharmacy",
  "Laboratory",
  "IV & Infusion",
  "Patient Monitoring",
  "Orthopedic",
  "Dental",
  "Emergency",
]

const BASE_ITEMS = [
  "Surgical Gloves",
  "Examination Gloves",
  "N95 Respirator",
  "Surgical Mask",
  "Face Shield",
  "Alcohol Swabs",
  "Cotton Wool",
  "Sterile Gauze",
  "Adhesive Bandage",
  "Elastic Bandage",
  "Medical Tape",
  "Syringe",
  "Needle",
  "IV Cannula",
  "IV Giving Set",
  "Saline Solution",
  "Ringer Lactate",
  "Dextrose 5%",
  "Urine Bag",
  "Urinalysis Strip",
  "Blood Glucose Strip",
  "Glucometer",
  "Digital Thermometer",
  "Infrared Thermometer",
  "Pulse Oximeter",
  "Blood Pressure Cuff",
  "Stethoscope",
  "Nebulizer Kit",
  "Oxygen Mask",
  "Nasal Cannula",
  "Suction Catheter",
  "Catheter Foley",
  "ECG Electrodes",
  "Specimen Container",
  "Vacutainer Tube",
  "Lancet",
  "Microscope Slide",
  "Cover Slip",
  "Rapid Test Kit",
  "Pregnancy Test Kit",
  "Malaria Test Kit",
  "HIV Test Kit",
  "Covid Antigen Kit",
  "Suture Nylon",
  "Suture Vicryl",
  "Scalpel Blade",
  "Surgical Blade Handle",
  "Forceps",
  "Artery Clamp",
  "Sterile Drapes",
  "Surgical Gown",
  "Sterile Cotton Bud",
  "Hydrogen Peroxide",
  "Chlorhexidine",
  "Povidone Iodine",
  "Burn Dressing",
  "Wound Dressing Pack",
  "Plaster of Paris",
  "Crutch",
  "Wheelchair",
  "Walker",
  "Cervical Collar",
  "Knee Brace",
  "Ankle Support",
  "Orthopedic Cast Padding",
  "Dental Bib",
  "Dental Needle",
  "Dental Mirror",
  "Dental Probe",
  "Tooth Extraction Forceps",
  "Anesthetic Cartridge",
  "Paracetamol Tablets",
  "Ibuprofen Tablets",
  "Amoxicillin Capsules",
  "Metronidazole Tablets",
  "Omeprazole Capsules",
  "ORS Sachet",
  "Zinc Tablets",
  "Vitamin C Tablets",
  "Cetirizine Tablets",
  "Cough Syrup",
  "Antiseptic Cream",
  "Hydrocortisone Cream",
  "Insulin Syringe",
  "Insulin Pen Needle",
  "Heparin Injection",
  "Adrenaline Injection",
  "Diazepam Injection",
  "Ceftriaxone Injection",
  "Normal Saline Flush",
  "Blood Transfusion Set",
  "Tourniquet",
  "Spinal Needle",
  "Lumbar Puncture Kit",
  "Resuscitation Bag",
  "Defibrillator Pad",
  "Airway Oropharyngeal",
  "Laryngoscope Blade",
  "Endotracheal Tube",
  "Tracheostomy Tube",
]

const SIZE_VARIANTS = ["Small", "Medium", "Large"]

function pickCategory(index: number) {
  return CATEGORY_NAMES[index % CATEGORY_NAMES.length]
}

function basePrice(index: number) {
  return Number((2 + (index % 25) * 0.8).toFixed(2))
}

async function seedMedicalStock(orgId: string, createdBy: string) {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set")
  }

  await mongoose.connect(mongoUri)

  const categoryMap = new Map<string, string>()

  for (const categoryName of CATEGORY_NAMES) {
    const category = await StockCategory.findOneAndUpdate(
      { org_id: orgId, name: categoryName },
      {
        $setOnInsert: {
          org_id: orgId,
          name: categoryName,
          description: `${categoryName} medical supplies`,
          createdBy,
        },
      },
      { upsert: true, new: true },
    )

    categoryMap.set(categoryName, String(category._id))
  }

  const products: Array<any> = []
  let idx = 0

  while (products.length < 300) {
    const item = BASE_ITEMS[idx % BASE_ITEMS.length]
    const variant = SIZE_VARIANTS[Math.floor(idx / BASE_ITEMS.length) % SIZE_VARIANTS.length]
    const categoryName = pickCategory(idx)
    const categoryId = categoryMap.get(categoryName)

    if (!categoryId) {
      idx += 1
      continue
    }

    const name = `${item} ${variant}`
    const start = basePrice(idx)
    const sell = Number((start * 1.35).toFixed(2))
    const qty = 20 + (idx % 80)
    const alert = Math.max(5, Math.floor(qty * 0.3))

    products.push({
      org_id: orgId,
      name,
      category: categoryId,
      startingPrice: start,
      sellingPrice: sell,
      minAlertQuantity: alert,
      currentQuantity: qty,
      assignedUsers: [],
      createdBy,
      isActive: true,
    })

    idx += 1
  }

  let inserted = 0
  let updated = 0

  for (const product of products) {
    const exists = await StockProduct.findOne({ org_id: orgId, name: product.name })
    if (exists) {
      await StockProduct.updateOne(
        { _id: exists._id },
        {
          $set: {
            category: product.category,
            startingPrice: product.startingPrice,
            sellingPrice: product.sellingPrice,
            minAlertQuantity: product.minAlertQuantity,
            isActive: true,
          },
          $setOnInsert: { createdBy },
        },
      )
      updated += 1
    } else {
      await StockProduct.create(product)
      inserted += 1
    }
  }

  console.log(`Seed complete for org ${orgId}`)
  console.log(`Categories ensured: ${CATEGORY_NAMES.length}`)
  console.log(`Products inserted: ${inserted}`)
  console.log(`Products updated: ${updated}`)

  await mongoose.disconnect()
}

const orgId = process.argv[2]
const createdBy = process.argv[3] || process.argv[2]

if (!orgId) {
  console.error("Usage: npx tsx src/scripts/seedMedicalStock.ts <org_id> [createdByUserId]")
  process.exit(1)
}

seedMedicalStock(orgId, createdBy)
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Seed failed:", error)
    try {
      await mongoose.disconnect()
    } catch {}
    process.exit(1)
  })
