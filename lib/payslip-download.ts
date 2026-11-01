export type EmployeePayslipDownload = {
  payslip: {
    month: string
    base_salary: number
    bonus: number
    deduction_items?: { name: string; amount: number }[]
    total_deductions: number
    net_pay: number
    generated_at?: string
  }
  user: {
    firstName?: string
    lastName?: string
    first_name?: string
    last_name?: string
    employee_id?: string
    position?: string
    department?: string
  }
  company: {
    name?: string
    logo?: string
    email?: string
    phone?: string
    city?: string
    state?: string
    country?: string
  }
}

function money(value: number) {
  return Number(value || 0).toLocaleString()
}

function periodLabel(month: string) {
  const parsed = new Date(`${month}-01`)
  if (Number.isNaN(parsed.getTime())) return month
  return parsed.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function downloadEmployeePayslip(
  detail: EmployeePayslipDownload,
  primaryColor = "#0f766e",
) {
  const { payslip, user, company } = detail
  const firstName = user.firstName || user.first_name || ""
  const lastName = user.lastName || user.last_name || ""
  const generatedAt = payslip.generated_at ? new Date(payslip.generated_at) : new Date()
  const generatedLabel = Number.isNaN(generatedAt.getTime())
    ? ""
    : generatedAt.toLocaleDateString()

  const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payslip.month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-logo { max-width: 150px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; margin: 10px 0; color: ${primaryColor}; }
          .payslip-title { font-size: 20px; color: #666; margin-top: 20px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; padding: 4px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .net-pay { font-size: 18px; color: #059669; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${company.logo ? `<img src="${company.logo}" alt="${company.name || ""}" class="company-logo" />` : ""}
          <div class="company-name">${company.name || ""}</div>
          <div>${company.email || ""} ${company.phone ? "• " + company.phone : ""}</div>
          <div>${[company.city, company.state, company.country].filter(Boolean).join(", ")}</div>
          <div class="payslip-title">PAYSLIP - ${periodLabel(payslip.month)}</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Employee Name:</span>
            <span>${firstName} ${lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Employee ID:</span>
            <span>${user.employee_id || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Position:</span>
            <span>${user.position || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Department:</span>
            <span>${user.department || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span>${generatedLabel}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td>
              <td style="text-align: right;">KES ${money(payslip.base_salary)}</td>
            </tr>
            ${payslip.bonus > 0 ? `
            <tr>
              <td>Bonus</td>
              <td style="text-align: right;">KES ${money(payslip.bonus)}</td>
            </tr>
            ` : ""}
            <tr class="total-row">
              <td>Gross Pay</td>
              <td style="text-align: right;">KES ${money(Number(payslip.base_salary || 0) + Number(payslip.bonus || 0))}</td>
            </tr>
            ${(payslip.deduction_items || []).map((item) => `
            <tr>
              <td>${item.name} (Deduction)</td>
              <td style="text-align: right; color: #dc2626;">- KES ${money(item.amount)}</td>
            </tr>
            `).join("")}
            <tr class="total-row">
              <td>Total Deductions</td>
              <td style="text-align: right; color: #dc2626;">- KES ${money(payslip.total_deductions)}</td>
            </tr>
            <tr class="total-row net-pay">
              <td>NET PAY</td>
              <td style="text-align: right;">KES ${money(payslip.net_pay)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `

  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    window.alert("Allow pop-ups to download the payslip")
    return
  }
  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 250)
}
