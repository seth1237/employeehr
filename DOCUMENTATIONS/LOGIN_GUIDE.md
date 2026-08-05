# Login Methods Quick Reference

## 🔐 Different Ways to Login

### 1. **Admin/HR Login** (Main Portal)

**Who:** Company Admins and HR Officers
**URL:** `http://localhost:3000/auth/login`
**Production:** `https://yourapp.com/auth/login`

**Steps:**
1. Visit main login page
2. Enter email and password
3. Click "Sign In"
4. Redirected to Admin Dashboard (`/admin`)

**Use this when:**
- You are the company administrator
- You are an HR officer
- You need full system access

---

### 2. **Employee/Manager Login** (Company Portal)

**Who:** Employees and Managers
**URL:** `http://localhost:3000/company/[your-company-slug]`
**Example:** `http://localhost:3000/company/acme-corp`

**Steps:**
1. Visit your company's specific login page
2. See your company logo and branding
3. Enter your email and password
4. Click "Login"
5. Redirected based on role:
   - Manager → `/manager` dashboard
   - Employee → `/employee` dashboard

**How to find your company login URL:**
- Ask your HR department or company admin
- It's based on your company name (slugified)
  - "Acme Corporation" → `/company/acme-corp`
  - "Tech Startup Inc" → `/company/tech-startup-inc`
  - "Big Enterprise" → `/company/big-enterprise`

---

## 🏢 Company Slug Examples

| Company Name | Slug | Login URL |
|-------------|------|-----------|
| Acme Corporation | `acme-corporation` | `/company/acme-corporation` |
| TechStart Inc | `techstart-inc` | `/company/techstart-inc` |
| Global Enterprises | `global-enterprises` | `/company/global-enterprises` |
| ABC Company | `abc-company` | `/company/abc-company` |
| XYZ Corp | `xyz-corp` | `/company/xyz-corp` |

---

## 👤 What Happens After Login?

### For Company Admins (`company_admin`):
```
Login → /admin dashboard
Access to:
- Manage all users
- Configure KPIs
- Manage awards
- View analytics
- Company settings
```

### For HR Officers (`hr`):
```
Login → /admin dashboard
Access to:
- Manage users
- View analytics
- HR operations
- Reports
```

### For Managers (`manager`):
```
Login → /manager dashboard
Access to:
- View team members
- Approve PDPs
- Conduct evaluations
- Submit feedback
- Team analytics
```

### For Employees (`employee`):
```
Login → /employee dashboard
Access to:
- Personal performance
- PDPs and goals
- Feedback inbox
- Awards received
- Self-evaluation
```

---

## ❓ FAQ

### Q: I'm an admin, can I use the company login page?
**A:** Yes! You can login via `/company/your-slug` or the main `/auth/login`. Both will redirect you to `/admin`.

### Q: Can employees use the main login page?
**A:** No. Employees and managers should use the company-specific login page (`/company/your-slug`).

### Q: What if I forget my company's login URL?
**A:** Contact your HR department or company administrator. They can provide your company's unique login URL.

### Q: Can I have multiple companies?
**A:** Yes! Each company has its own login URL and separate data. Your account is specific to one company.

### Q: What if my company slug is already taken?
**A:** The system automatically adds a number if needed:
- `acme-corp` (taken)
- `acme-corp-1` (available)
- `acme-corp-2` (available)

---

## 🔒 Security Notes

1. **Company Validation:** The system checks if your company exists and is active before showing the login page.

2. **User Validation:** Your email must be registered with that specific company to login.

3. **Role-Based Redirect:** You're automatically sent to the correct dashboard based on your role.

4. **Session Management:** Login sessions expire after 7 days. You'll need to login again.

5. **Tenant Isolation:** You can only see data from your company, never other companies.

---

## 📞 Need Help?

**For Employees/Managers:**
- Contact your HR department
- Email: hr@yourcompany.com

**For Admins:**
- Technical support: support@elevate-hr.com
- Documentation: https://docs.elevate-hr.com

---

## 🚀 Quick Start Guide

### For New Companies:

1. **Register Your Company:**
   - Visit `/auth/signup`
   - Fill in company details
   - Create admin account
   - Get your company slug

2. **Share Login URL with Employees:**
   - Your URL: `/company/your-slug`
   - Send to all employees
   - Include temporary passwords

3. **Employees Login:**
   - Visit company login page
   - Use provided credentials
   - Change password on first login

---

**Last Updated:** December 10, 2025
