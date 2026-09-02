import axios from "axios"
import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { EtimsConfig } from "../models/EtimsConfig"
import { EtimsLog } from "../models/EtimsLog"
import { StockInvoice } from "../models/StockInvoice"

export class EtimsController {
  // === CONFIGURATION ===
  static async getConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const config = await EtimsConfig.findOne({ org_id: req.org_id })
      return res.status(200).json({ success: true, data: config })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch eTIMS config", error })
    }
  }

  static async saveConfig(req: AuthenticatedRequest, res: Response) {
    try {
      let config = await EtimsConfig.findOne({ org_id: req.org_id })
      if (config) {
        config.set(req.body)
        await config.save()
      } else {
        config = new EtimsConfig({
          ...req.body,
          org_id: req.org_id,
          createdBy: req.user?.userId
        })
        await config.save()
      }
      return res.status(200).json({ success: true, data: config })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to save eTIMS config", error })
    }
  }

  // === INITIALIZATION ===
  static async initializeDevice(req: AuthenticatedRequest, res: Response) {
    try {
      const config = await EtimsConfig.findOne({ org_id: req.org_id })
      if (!config) {
        return res.status(400).json({ success: false, message: "Save basic eTIMS config first before initializing." })
      }

      if (!config.deviceSerialNumber) {
        return res.status(400).json({ success: false, message: "Device Serial Number is required for initialization." })
      }

      const baseEndpoint = config.apiEndpoint.replace(/\/$/, '');
      const apiUrl = `${baseEndpoint}${baseEndpoint.endsWith('/etims-api') ? '' : '/etims-api'}/selectInitOsdcInfo`
      const payload = {
        tin: config.kraPin,
        bhfId: config.branchId,
        dvcSrlNo: config.deviceSerialNumber
      }

      const headers: any = { 
        'Content-Type': 'application/json'
      }
      if (config.oscuToken) {
        headers['Authorization'] = `Bearer ${config.oscuToken}`;
        headers['token'] = config.oscuToken;
      }

      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: 60000 // Increased to 60 seconds
      })

      if (response.data && response.data.resultCd === "000" && response.data.data?.info) {
        const info = response.data.data.info
        
        config.communicationKey = info.cmcKey
        config.deviceId = info.dvcId
        config.sdcId = info.sdcId
        config.companyName = info.taxprNm || config.companyName
        await config.save()

        return res.status(200).json({ 
          success: true, 
          message: "Device initialized successfully",
          data: config 
        })
      }

      return res.status(400).json({ 
        success: false, 
        message: response.data?.resultMsg || "Failed to initialize device" 
      })
    } catch (error: any) {
      const errorMsg = error.response?.data?.resultMsg || error.response?.data?.message || (error.response?.data ? JSON.stringify(error.response.data) : error.message);
      return res.status(500).json({ 
        success: false, 
        message: errorMsg || "Initialization request failed" 
      })
    }
  }

  // === DASHBOARD & LOGS ===
  static async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id
      const submitted = await EtimsLog.countDocuments({ org_id, submissionStatus: "Submitted" })
      const failed = await EtimsLog.countDocuments({ org_id, submissionStatus: "Failed" })
      const pending = await EtimsLog.countDocuments({ org_id, submissionStatus: "Processing" })

      const lastSuccess = await EtimsLog.findOne({ org_id, submissionStatus: "Submitted" })
        .sort({ responseTime: -1 })
        .select("responseTime")
      
      const lastError = await EtimsLog.findOne({ org_id, submissionStatus: "Failed" })
        .sort({ responseTime: -1 })
        .select("resultMessage responseTime")

      // Mock Connection Status based on whether config exists
      const config = await EtimsConfig.findOne({ org_id })
      const isConnected = !!config && config.status === "Active"

      return res.status(200).json({
        success: true,
        data: {
          submitted,
          failed,
          pending,
          isConnected,
          lastSuccessTime: lastSuccess?.responseTime,
          lastErrorMsg: lastError?.resultMessage,
          lastErrorTime: lastError?.responseTime,
        }
      })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch stats", error })
    }
  }

  static async getLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await EtimsLog.find({ org_id: req.org_id }).sort({ requestTime: -1 }).limit(100)
      return res.status(200).json({ success: true, data: logs })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to fetch logs", error })
    }
  }

  // === OPERATIONS ===
  static buildEtimsPayload(invoice: any, config: any) {
    // 16% VAT mapping
    const vatRate = 16;
    const items = invoice.items.map((item: any, index: number) => {
      const isOutsourced = item.isOutsourced || !item.kraItemClassificationCode;
      // Default to a generic classification code if missing
      const itemClsCd = isOutsourced ? "5059690800" : item.kraItemClassificationCode;
      
      const splyAmt = item.lineTotal;
      const taxblAmt = (splyAmt / (1 + vatRate / 100));
      const taxAmt = splyAmt - taxblAmt;

      return {
        itemSeq: index + 1,
        itemCd: item.productId.substring(0, 20),
        itemClsCd: itemClsCd,
        itemNm: item.productName.substring(0, 200),
        bcd: null,
        pkgUnitCd: "NT", // Net weight/packaging
        pkg: 1,
        qtyUnitCd: "U", // Unit
        qty: item.quantity,
        prc: item.unitPrice,
        splyAmt: Number(splyAmt.toFixed(2)),
        dcRt: 0,
        dcAmt: 0,
        taxTyCd: "B", // 16% VAT
        taxblAmt: Number(taxblAmt.toFixed(2)),
        taxAmt: Number(taxAmt.toFixed(2)),
        totAmt: Number(splyAmt.toFixed(2))
      };
    });

    const totTaxblAmt = items.reduce((sum: number, item: any) => sum + item.taxblAmt, 0);
    const totTaxAmt = items.reduce((sum: number, item: any) => sum + item.taxAmt, 0);
    const totAmt = invoice.subTotal;

    const payload = {
      tin: config.kraPin,
      bhfId: config.branchId,
      cmcKey: config.communicationKey,
      trdInvcNo: invoice.invoiceNumber,
      invcNo: parseInt(invoice.invoiceNumber.replace(/\D/g, '') || "0") || Math.floor(Math.random() * 100000),
      orgInvcNo: 0, // Only used for credit notes
      custTin: invoice.clientProfile?.kraPin || "",
      custNm: invoice.client.name.substring(0, 60),
      salesTyCd: "N", // N: Normal, C: Copy, P: Proforma
      rcptTyCd: "S", // S: Sale, C: Credit Note
      pmtTyCd: "01", // 01: Cash, 02: Credit, etc.
      salesSttsCd: "02", // 02: Approved
      cfmDt: new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14), // yyyyMMddHHmmss
      salesDt: new Date().toISOString().substring(0, 10).replace(/-/g, ''), // yyyyMMdd
      stockRlsDt: new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14),
      cnclReqDt: null,
      cnclDt: null,
      rfdDt: null,
      rfdRsnCd: null,
      totItemCnt: items.length,
      taxblAmtA: 0,
      taxblAmtB: Number(totTaxblAmt.toFixed(2)),
      taxblAmtC: 0,
      taxblAmtD: 0,
      taxblAmtE: 0,
      taxRtA: 0,
      taxRtB: vatRate,
      taxRtC: 0,
      taxRtD: 0,
      taxRtE: 0,
      taxAmtA: 0,
      taxAmtB: Number(totTaxAmt.toFixed(2)),
      taxAmtC: 0,
      taxAmtD: 0,
      taxAmtE: 0,
      totTaxblAmt: Number(totTaxblAmt.toFixed(2)),
      totTaxAmt: Number(totTaxAmt.toFixed(2)),
      totAmt: Number(totAmt.toFixed(2)),
      prchrAcptcYn: "N",
      remark: null,
      regrId: config.kraPin,
      regrNm: config.companyName,
      modrId: config.kraPin,
      modrNm: config.companyName,
      itemList: items
    };

    return payload;
  }

  static async submitInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { invoice_id } = req.body
      if (!invoice_id) return res.status(400).json({ success: false, message: "Invoice ID required" })

      const invoice = await StockInvoice.findOne({ _id: invoice_id, org_id: req.org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      const config = await EtimsConfig.findOne({ org_id: req.org_id })
      if (!config || config.status !== "Active") {
        return res.status(400).json({ success: false, message: "Active eTIMS config is required to submit" })
      }
      
      if (!config.communicationKey) {
        return res.status(400).json({ success: false, message: "eTIMS device is not initialized. Please configure a Device Serial Number and click 'Initialize Device' first." })
      }

      // Create Initial Log
      const baseEndpoint = config.apiEndpoint.replace(/\/$/, '');
      const apiUrl = `${baseEndpoint}${baseEndpoint.endsWith('/etims-api') ? '' : '/etims-api'}/saveTrnsSalesOsdc`
      const payload = EtimsController.buildEtimsPayload(invoice, config)

      const log = new EtimsLog({
        org_id: req.org_id,
        invoice_id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        apiEndpoint: apiUrl,
        requestPayload: JSON.stringify(payload),
        submissionStatus: "Processing",
        createdBy: req.user?.userId
      })
      await log.save()

      const headers: any = {
        'Content-Type': 'application/json',
        'tin': config.kraPin,
        'bhfId': config.branchId,
        'cmcKey': config.communicationKey
      };
      if (config.oscuToken) {
        headers['Authorization'] = `Bearer ${config.oscuToken}`;
        headers['token'] = config.oscuToken;
      }

      // --- REAL API CALL TO KRA ---
      try {
        const response = await axios.post(apiUrl, payload, {
          headers,
          timeout: 60000 // Increased to 60 seconds for KRA sandbox which can be very slow
        })

        log.responseTime = new Date()
        
        // KRA usually returns { resultCd: "000", resultMsg: "Success", ... }
        if (response.data && response.data.resultCd === "000") {
          log.submissionStatus = "Submitted"
          log.resultCode = response.data.resultCd
          log.resultMessage = response.data.resultMsg
          log.responsePayload = JSON.stringify(response.data)
          
          // Update Invoice
          invoice.etims = {
            status: "posted",
            kraInvoiceId: response.data.data?.rcptNo || response.data.data?.intrlData || "KRA-" + Date.now(),
            responseMessage: response.data.resultMsg,
            postedAt: new Date(),
            postedBy: req.user?.userId
          }
          await invoice.save()
        } else {
          log.submissionStatus = "Failed"
          log.resultCode = response.data?.resultCd || "999"
          log.resultMessage = response.data?.resultMsg || "Unknown Error"
          log.responsePayload = JSON.stringify(response.data)
          
          invoice.etims = {
            status: "failed",
            responseMessage: log.resultMessage
          }
          await invoice.save()
        }
      } catch (err: any) {
        log.responseTime = new Date()
        log.submissionStatus = "Failed"
        log.resultCode = err.response?.status?.toString() || "500"
        log.resultMessage = err.response?.data?.resultMsg || err.message || "Network Error"
        log.responsePayload = JSON.stringify(err.response?.data || { error: err.message })
        
        invoice.etims = {
          status: "failed",
          responseMessage: log.resultMessage
        }
        await invoice.save()
      }
      
      await log.save()

      return res.status(200).json({ success: true, message: "Submission processed", data: log })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Submission failed", error })
    }
  }

  static async validateCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const { customerPin } = req.body
      if (!customerPin) return res.status(400).json({ success: false, message: "Customer PIN required" })

      const config = await EtimsConfig.findOne({ org_id: req.org_id })
      if (!config || config.status !== "Active") {
        return res.status(400).json({ success: false, message: "Active eTIMS config is required" })
      }

      if (!config.communicationKey) {
        return res.status(400).json({ success: false, message: "eTIMS device is not initialized. Please click 'Initialize Device' first." })
      }

      const baseEndpoint = config.apiEndpoint.replace(/\/$/, '');
      const apiUrl = `${baseEndpoint}${baseEndpoint.endsWith('/etims-api') ? '' : '/etims-api'}/selectCustomer`
      const payload = {
        tin: config.kraPin,
        bhfId: config.branchId,
        cmcKey: config.communicationKey,
        custmTin: customerPin
      }

      const headers: any = {
        'Content-Type': 'application/json',
        'tin': config.kraPin,
        'bhfId': config.branchId,
        'cmcKey': config.communicationKey
      };
      if (config.oscuToken) {
        headers['Authorization'] = `Bearer ${config.oscuToken}`;
        headers['token'] = config.oscuToken;
      }

      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: 60000 // Increased to 60 seconds
      })

      if (response.data && response.data.resultCd === "000" && response.data.data?.custList?.length > 0) {
        const cust = response.data.data.custList[0]
        return res.status(200).json({
          success: true,
          data: {
            customerName: cust.taxprNm,
            taxpayerStatus: cust.taxprSttsCd === "A" ? "Active" : cust.taxprSttsCd,
            county: cust.prvncNm,
            subCounty: cust.dstrtNm
          }
        })
      }

      return res.status(400).json({ success: false, message: response.data?.resultMsg || "Validation failed or no customer found" })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.response?.data?.resultMsg || error.message || "Validation failed", error })
    }
  }
}
