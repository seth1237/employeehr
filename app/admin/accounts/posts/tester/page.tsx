"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { AccountsModuleNav } from "@/components/admin/accounts-module-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Code2, RefreshCw } from "lucide-react"

const POSTMAN_APIS = [
  {
    name: "OSCU Initialization (selectInitOsdcInfo)",
    url: "/selectInitOsdcInfo",
    description: "Registers the device and retrieves the primary communication key (cmcKey).",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"dvcSrlNo\": \"{{dvcSrlNo}}\"\n}"
  },
  {
    name: "Look Up List of Code (selectCodeList)",
    url: "/selectCodeList",
    description: "Lookup common code list registered in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Look Up Item Classification (selectItemClsList)",
    url: "/selectItemClsList",
    description: "Lookup list of item classification registered in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Look Up Branch List (selectBhfList)",
    url: "/selectBhfList",
    description: "Lookup list of taxpayer branch information registered in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Look Up Notices List (selectNoticeList)",
    url: "/selectNoticeList",
    description: "Lookup the list of notice in taxpayer client.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Get Customer Information (selectCustomer)",
    url: "/selectCustomer",
    description: "Lookup taxpayer’s information registered in server with this function.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"custmTin\": \"P000000000X\"\n}"
  },
  {
    name: "Save Customer Branch (saveBhfCustomer)",
    url: "/saveBhfCustomer",
    description: "Save branch customer information.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"custNo\": \"CUST-001\",\n  \"custNm\": \"Sample Customer\",\n  \"custTin\": \"P000000000X\"\n}"
  },
  {
    name: "Save Branch User Account (saveBhfUser)",
    url: "/saveBhfUser",
    description: "Save branch user account information.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"userId\": \"USER01\",\n  \"userNm\": \"Admin User\",\n  \"useYn\": \"Y\"\n}"
  },
  {
    name: "Save Branch Insurances (saveBhfInsurance)",
    url: "/saveBhfInsurance",
    description: "Save branch insurance company information.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"isrCd\": \"INS001\",\n  \"isrNm\": \"Sample Insurance\",\n  \"useYn\": \"Y\"\n}"
  },
  {
    name: "Look Up Product List (selectItemList)",
    url: "/selectItemList",
    description: "Lookup the list of Item information in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Save Item (saveItem)",
    url: "/saveItem",
    description: "Save the product information in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"itemCd\": \"ITM-001\",\n  \"itemClsCd\": \"10101501\",\n  \"itemNm\": \"Surgical Gloves\",\n  \"pkgUnitCd\": \"BX\",\n  \"qtyUnitCd\": \"PCS\",\n  \"vatTyCd\": \"A\",\n  \"dftPrc\": 1000,\n  \"useYn\": \"Y\"\n}"
  },
  {
    name: "Look Up Imported Item List (selectImportItemList)",
    url: "/selectImportItemList",
    description: "Lookup list of taxpayer’s imported item in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"lastReqDt\": \"20260101000000\"\n}"
  },
  {
    name: "Save Sales Transaction (saveTrnsSalesOsdc)",
    url: "/saveTrnsSalesOsdc",
    description: "Save sales transaction and sales invoice information in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"invcNo\": 1,\n  \"orgInvcNo\": 0,\n  \"custTin\": \"P000000000X\",\n  \"custNm\": \"Test Customer\",\n  \"salesTyCd\": \"N\",\n  \"rcptTyCd\": \"S\",\n  \"pmtTyCd\": \"01\",\n  \"salesSttsCd\": \"02\",\n  \"cfmDt\": \"20260902143000\",\n  \"salesDt\": \"20260902\",\n  \"totItemCnt\": 1,\n  \"taxblAmtA\": 1000,\n  \"taxAmtA\": 160,\n  \"totTaxblAmt\": 1000,\n  \"totTaxAmt\": 160,\n  \"totAmt\": 1160,\n  \"itemList\": []\n}"
  },
  {
    name: "Save Purchases Information (saveTrnsPurchase)",
    url: "/saveTrnsPurchase",
    description: "Store purchases info in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"sllrTin\": \"P011111111Z\",\n  \"sllrNm\": \"Vendor Ltd\",\n  \"sllrBhfId\": \"00\",\n  \"sllrInvcNo\": 101,\n  \"pchsSttsCd\": \"02\",\n  \"pchsDt\": \"20260902\",\n  \"totAmt\": 5000,\n  \"itemList\": []\n}"
  },
  {
    name: "Save Stock-Master Information (saveStockMaster)",
    url: "/saveStockMaster",
    description: "Store the stock master information in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"itemCd\": \"ITM-001\",\n  \"rsdQty\": 100\n}"
  },
  {
    name: "Save Stock In/Out (saveStockIO)",
    url: "/saveStockIO",
    description: "Store taxpayer stock in/out information in server.",
    body: "{\n  \"tin\": \"{{tin}}\",\n  \"bhfId\": \"{{bhfId}}\",\n  \"sarNo\": 1,\n  \"ocrnDt\": \"20260902\",\n  \"sarTyCd\": \"01\",\n  \"totItemCnt\": 1,\n  \"totTaxblAmt\": 1000,\n  \"totTaxAmt\": 160,\n  \"totAmt\": 1160,\n  \"itemList\": []\n}"
  }
];

export default function EtimsTesterPage() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<any>(null)
  
  const [selectedApiUrl, setSelectedApiUrl] = useState<string>("/selectCodeList")
  const [payloadStr, setPayloadStr] = useState<string>("")
  const [useCmcKey, setUseCmcKey] = useState<boolean>(true)
  
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await api.etims.getConfig()
      if (res.success) {
        setConfig(res.data)
        
        // Initialize with default API
        handleApiSelect("/selectCodeList", res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApiSelect = (url: string, currentConfig = config) => {
    setSelectedApiUrl(url)
    
    // Auto-disable cmcKey for initialization endpoint
    if (url === "/selectInitOsdcInfo") {
      setUseCmcKey(false)
    } else {
      setUseCmcKey(true)
    }

    const apiDef = POSTMAN_APIS.find(a => a.url === url)
    if (apiDef && currentConfig) {
      // Replace variables
      let body = apiDef.body
        .replace(/{{tin}}/g, currentConfig.kraPin || "")
        .replace(/{{bhfId}}/g, currentConfig.branchId || "00")
        .replace(/{{dvcSrlNo}}/g, currentConfig.deviceSerialNumber || "")
      setPayloadStr(body)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      let parsedPayload = {}
      if (payloadStr) {
        try {
          parsedPayload = JSON.parse(payloadStr)
        } catch (e) {
          throw new Error("Invalid JSON in payload")
        }
      }

      // Add Headers
      const additionalHeaders: any = {}
      if (useCmcKey && config?.communicationKey) {
        additionalHeaders["cmcKey"] = config.communicationKey
      }
      if (config?.kraPin) {
        additionalHeaders["tin"] = config.kraPin
      }
      if (config?.branchId) {
        additionalHeaders["bhfId"] = config.branchId
      }
      if (config?.oscuToken) {
        // WSO2 API Gateway Authentication
        additionalHeaders['Authorization'] = `Bearer ${config.oscuToken}`;
      }

      const res = await api.etims.testKRAApi({
        endpoint: selectedApiUrl,
        method: "POST",
        payload: parsedPayload,
        additionalHeaders
      })

      setTestResult(res)
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Failed to execute request",
        error: error.response?.data || error
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading Tester" rows={5} />

  const selectedApi = POSTMAN_APIS.find(a => a.url === selectedApiUrl)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => window.location.href = "/admin/accounts/posts"}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">eTIMS API Connectivity Tester</h1>
          <p className="text-sm text-muted-foreground mt-1">Execute direct test requests against KRA's eTIMS endpoints based on the Postman specification.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5" /> Request Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Endpoint</Label>
              <Select value={selectedApiUrl} onValueChange={(val) => handleApiSelect(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select API to test" />
                </SelectTrigger>
                <SelectContent>
                  {POSTMAN_APIS.map(api => (
                    <SelectItem key={api.url} value={api.url}>{api.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedApi && <p className="text-xs text-muted-foreground">{selectedApi.description}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>JSON Payload</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleApiSelect(selectedApiUrl)}>Reset to Template</Button>
              </div>
              <Textarea 
                value={payloadStr} 
                onChange={(e) => setPayloadStr(e.target.value)} 
                className="font-mono text-sm h-64"
                placeholder="{\n  // JSON body here\n}"
              />
            </div>

            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-md border text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useCmcKey} 
                  onChange={(e) => setUseCmcKey(e.target.checked)} 
                  className="rounded border-gray-300"
                />
                Include <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">cmcKey</code> in Headers
              </label>
              <span className="text-muted-foreground text-xs">(Required for all requests EXCEPT initialization)</span>
            </div>

            <Button onClick={handleTest} disabled={testing} className="w-full gap-2">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testing ? "Sending to KRA..." : "Send Request to KRA"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {testResult?.success ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : testResult ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Code2 className="h-5 w-5" />}
              Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <div className="space-y-4">
                <div className={`p-3 rounded-md border ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`font-medium ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    HTTP Status: {testResult.status || (testResult.success ? 200 : 'Unknown')}
                  </p>
                  {!testResult.success && testResult.message && (
                    <p className="text-sm mt-1 text-red-600">{testResult.message}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Raw Response Data</Label>
                  <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto text-xs max-h-[500px]">
                    {JSON.stringify(testResult.data || testResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 border border-dashed rounded-md">
                <Send className="h-8 w-8 mb-2 opacity-20" />
                <p>Send a request to view the response</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}