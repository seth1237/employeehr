import { NextRequest, NextResponse } from "next/server"

function getErpBaseUrl() {
  return process.env.ERP_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:5010"
}

function getOrgId(request: NextRequest) {
  return (
    request.nextUrl.searchParams.get("orgId") ||
    request.nextUrl.searchParams.get("tenantId") ||
    request.headers.get("x-org-id") ||
    request.headers.get("x-tenant-id") ||
    request.headers.get("x-tenantid") ||
    ""
  )
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orgId = getOrgId(request)

    if (!id) {
      return NextResponse.json({ success: false, message: "Invoice id is required" }, { status: 400 })
    }

    if (!orgId) {
      return NextResponse.json({ success: false, message: "orgId is required" }, { status: 400 })
    }

    const upstreamUrl = new URL(`/api/stock/public/invoices/${encodeURIComponent(id)}/pdf`, getErpBaseUrl())
    upstreamUrl.searchParams.set("orgId", orgId)

    const headers = new Headers()
    headers.set("Accept", "application/pdf")

    const apiToken = process.env.ERP_API_TOKEN || process.env.ERP_API_KEY || process.env.API_KEY
    if (apiToken) {
      headers.set("x-api-key", apiToken)
      headers.set("authorization", `Bearer ${apiToken}`)
    }

    const authorization = request.headers.get("authorization")
    if (authorization) {
      headers.set("authorization", authorization)
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers,
    })

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text()
      return new NextResponse(errorText || "Failed to fetch invoice PDF", {
        status: upstreamResponse.status,
        headers: {
          "content-type": upstreamResponse.headers.get("content-type") || "application/json",
        },
      })
    }

    const responseHeaders = new Headers()
    const contentType = upstreamResponse.headers.get("content-type") || "application/pdf"
    const contentDisposition = upstreamResponse.headers.get("content-disposition")

    responseHeaders.set("content-type", contentType)
    responseHeaders.set("cache-control", "no-store")

    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition)
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error("Invoice PDF proxy failed:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to proxy invoice PDF" },
      { status: 502 },
    )
  }
}
