// Centralized API service for all HTTP requests

import { getToken, logout } from "./auth";
import API_URL from "./apiBase";
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterCompanyRequest,
  RegisterCompanyResponse,
  User,
  Award,
  KPI,
  PerformanceReview,
  Feedback,
  PDP,
  Attendance,
  CreateUserRequest,
  UpdateUserRequest,
  CreateAwardRequest,
  CreateKPIRequest,
  CreateFeedbackRequest,
  CreatePDPRequest,
  Meeting,
  CreateMeetingRequest,
} from "./types";

// HTTP client with error handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = getToken();
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string>),
    };
    if (isFormData) {
      delete headers["Content-Type"];
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      let data: any = null;
      let text: string | null = null;
      try {
        const body = await response.text();
        text = body;
        data = body ? JSON.parse(body) : null;
      } catch {
        // If the response is not JSON, preserve the raw text
        data = null;
      }

      // Handle 401 Unauthorized
      if (response.status === 401) {
        const isAuthEndpoint = endpoint.startsWith("/api/auth/");
        if (!isAuthEndpoint && token) {
          console.error("Auth failed - logging out user", {
            endpoint,
            message: data?.message || text,
          });
          logout();
          throw new Error("Session expired or invalid. Please login again.");
        }
        throw new Error(data?.message || data?.error || text || "Unauthorized");
      }

      if (!response.ok) {
        const errorInfo = {
          endpoint: endpoint || "unknown",
          status: response.status || "unknown",
          statusText: response.statusText || "unknown",
          message: data?.message || null,
          error: data?.error || null,
          success: data?.success || null,
          rawText: text,
          headers: {
            contentType: response.headers?.get?.("content-type"),
          },
          timestamp: new Date().toISOString(),
        };
        console.error(
          `API request failed: ${errorInfo.status} ${errorInfo.endpoint}`,
          errorInfo,
        );
        console.error("Full response body:", text);

        let errorMessage = "Request failed";
        if (response.status === 400) {
          errorMessage = data?.message || data?.error || text || "Bad request";
        } else if (response.status === 403) {
          errorMessage =
            data?.message || data?.error || text || "Access denied";
        } else if (response.status === 404) {
          errorMessage = `Endpoint not found: ${endpoint}`;
        } else if (response.status === 500) {
          errorMessage = data?.message || data?.error || text || "Server error";
        } else if (response.status >= 500) {
          errorMessage = `Server error (${response.status})`;
        }

        throw new Error(data?.message || data?.error || errorMessage);
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const fullError =
        error instanceof Error ? error : new Error(String(error));

      console.error("API Error:", {
        endpoint,
        message: errorMessage,
        name: fullError.name,
        stack: fullError.stack,
      });
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      method: "POST",
      body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

const client = new ApiClient(API_URL);

// Authentication API
export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>("/api/auth/login", data),

  forgotPassword: (data: { email: string }) =>
    client.post("/api/auth/forgot-password", data),

  verifyOtp: (data: { email: string; otp: string }) =>
    client.post("/api/auth/verify-otp", data),

  verifyLoginOtp: (data: {
    email: string;
    otp: string;
    challengeId: string;
    loginType: "standard" | "company" | "employee";
  }) => client.post("/api/auth/verify-login-otp", data),

  resendLoginOtp: (data: {
    email: string;
    challengeId: string;
    loginType: "standard" | "company" | "employee";
  }) => client.post("/api/auth/resend-login-otp", data),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    client.post("/api/auth/reset-password", data),

  registerCompany: (data: RegisterCompanyRequest) =>
    client.post<RegisterCompanyResponse>("/api/auth/register-company", data),

  changePassword: (oldPassword: string, newPassword: string) =>
    client.post("/api/auth/change-password", { oldPassword, newPassword }),
};

// Users API
export const usersApi = {
  getAll: () => client.get<User[]>("/api/users"),

  getById: (userId: string) => client.get<User>(`/api/users/${userId}`),

  create: (data: CreateUserRequest) => client.post<User>("/api/users", data),

  update: (userId: string, data: UpdateUserRequest) =>
    client.put<User>(`/api/users/${userId}`, data),

  delete: (userId: string) => client.delete(`/api/users/${userId}`),

  getTeamMembers: (managerId: string) =>
    client.get<User[]>(`/api/users/team/${managerId}`),
};

// Awards API
export const awardsApi = {
  getAll: () => client.get<Award[]>("/api/awards"),

  getById: (id: string) => client.get<Award>(`/api/awards/${id}`),

  create: (data: CreateAwardRequest) => client.post<Award>("/api/awards", data),

  update: (id: string, data: Partial<CreateAwardRequest>) =>
    client.put<Award>(`/api/awards/${id}`, data),

  delete: (id: string) => client.delete(`/api/awards/${id}`),

  getLeaderboard: () => client.get<any[]>("/api/awards/leaderboard/top"),
};

// KPIs API
export const kpisApi = {
  getAll: (departmentId?: string) =>
    client.get<KPI[]>(
      `/api/kpis${departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ""}`,
    ),

  getById: (id: string) => client.get<KPI>(`/api/kpis/${id}`),

  create: (data: CreateKPIRequest & { department_id?: string }) =>
    client.post<KPI>("/api/kpis", data),

  update: (id: string, data: Partial<CreateKPIRequest>) =>
    client.put<KPI>(`/api/kpis/${id}`, data),

  delete: (id: string) => client.delete(`/api/kpis/${id}`),
};

// Performance API
export const performanceApi = {
  getAll: () => client.get<PerformanceReview[]>("/api/performance"),

  getById: (id: string) =>
    client.get<PerformanceReview>(`/api/performance/${id}`),

  create: (data: any) =>
    client.post<PerformanceReview>("/api/performance", data),

  update: (id: string, data: any) =>
    client.put<PerformanceReview>(`/api/performance/${id}`, data),
};

// Feedback API
export const feedbackApi = {
  getAll: () => client.get<Feedback[]>("/api/feedback"),

  create: (data: CreateFeedbackRequest) =>
    client.post<Feedback>("/api/feedback", data),
};

// PDPs API
export const pdpsApi = {
  getAll: () => client.get<PDP[]>("/api/pdps"),

  getById: (id: string) => client.get<PDP>(`/api/pdps/${id}`),

  create: (data: CreatePDPRequest) => client.post<PDP>("/api/pdps", data),

  update: (id: string, data: Partial<CreatePDPRequest>) =>
    client.put<PDP>(`/api/pdps/${id}`, data),

  delete: (id: string) => client.delete(`/api/pdps/${id}`),
};

// Tasks API
export const tasksApi = {
  getAll: () => client.get<any[]>("/api/tasks"),

  getById: (id: string) => client.get<any>(`/api/tasks/${id}`),

  create: (data: any) => client.post<any>("/api/tasks", data),

  update: (id: string, data: any) => client.put<any>(`/api/tasks/${id}`, data),

  complete: (id: string, data?: { notes?: string }) =>
    client.post<any>(`/api/tasks/${id}/complete`, data || {}),

  delete: (id: string) => client.delete<any>(`/api/tasks/${id}`),
};

// Attendance API
export const attendanceApi = {
  getAll: () => client.get<Attendance[]>("/api/attendance"),

  create: (data: any) => client.post<Attendance>("/api/attendance", data),
};

// Invitations API
export const invitationsApi = {
  send: (data: {
    team_members: Array<{ email: string; role: string }>;
    company_domain?: string;
  }) => client.post<any>("/api/invitations/send", data),

  accept: (data: {
    invite_token: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => client.post<any>("/api/invitations/accept", data),

  getPending: () => client.get<any[]>("/api/invitations/pending"),

  resend: (data: { invitation_id: string; company_domain?: string }) =>
    client.post<any>("/api/invitations/resend", data),
};

// Reports API
export const reportsApi = {
  save: (data: {
    report_id?: string;
    type: string;
    title: string;
    content: string;
    tags?: string[];
  }) => client.post<any>("/api/reports/save", data),

  submit: (data: { report_id: string }) =>
    client.post<any>("/api/reports/submit", data),

  getMyReports: (type?: string, status?: string) => {
    let url = "/api/reports/my-reports";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (status) params.append("status", status);
    if (params.toString()) url += "?" + params.toString();
    return client.get<any[]>(url);
  },

  getReport: (report_id: string) =>
    client.get<any>(`/api/reports/${report_id}`),

  deleteReport: (report_id: string) =>
    client.delete<any>(`/api/reports/${report_id}`),

  getAllSubmitted: (type?: string, status?: string, user_id?: string) => {
    let url = "/api/reports/admin/all";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (status) params.append("status", status);
    if (user_id) params.append("user_id", user_id);
    if (params.toString()) url += "?" + params.toString();
    return client.get<any[]>(url);
  },

  approve: (data: { report_id: string }) =>
    client.post<any>("/api/reports/admin/approve", data),

  reject: (data: { report_id: string; reason?: string }) =>
    client.post<any>("/api/reports/admin/reject", data),

  getAnalytics: (type?: string, month?: string) => {
    let url = "/api/reports/admin/analytics";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (month) params.append("month", month);
    if (params.toString()) url += "?" + params.toString();
    return client.get<any>(url);
  },

  generateSummary: (data: { fromType: string; toType: string }) =>
    client.post<any>("/api/reports/generate-summary", data),
  getGeneral: () => client.get<any>("/api/reports/general"),
};

export const companyApi = {
  getBranding: () => client.get<any>("/api/company/branding"),
  getInvoiceSettings: () => client.get<any>("/api/company/invoice-settings"),
  updateInvoiceSettings: (data: {
    invoiceEmail: string;
    contactPhone?: string;
    officeLocation?: string;
    secondLocation?: string;
    useBothLocations?: boolean;
    contactEmail?: string;
    website?: string;
    vatNumber?: string;
    pinNumber?: string;
    termsAndConditions: string;
    includeQuotationReference?: boolean;
    includeDeliveryNoteNumber?: boolean;
    includePreparedBy?: boolean;
    includeVat?: boolean;
    includePaymentChannels?: boolean;
    paymentChannels?: Array<{
      paymentType?: string;
      mpesaMode?: string;
      channelName?: string;
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
      paybillNumber?: string;
      tillNumber?: string;
      branch?: string;
      notes?: string;
    }>;
  }) => client.post<any>("/api/company/invoice-settings", data),
  getPageAccess: () => client.get<any>("/api/company/page-access"),
  updatePageAccess: (data: {
    adminSectionsByRole: {
      admin: string[];
      hr: string[];
      manager: string[];
      employee: string[];
    };
    adminSectionsByUser?: Record<string, string[]>;
    adminSectionsByDepartment?: Record<string, string[]>;
    adminSectionsByBranch?: Record<string, string[]>;
    permissionMatrixByRole?: Record<string, string[]>;
    permissionMatrixByUser?: Record<string, string[]>;
  }) => client.post<any>("/api/company/page-access", data),
  updateBranding: async (data: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    fontFamily?: string;
    buttonStyle?: string;
    logoFile?: File;
    logoUrl?: string;
    country?: string;
    state?: string;
    city?: string;
    countryCode?: string;
    // Advanced branding
    glassEnabled?: boolean;
    glassOpacity?: number;
    glassBlur?: number;
    glassTint?: string;
    buttonShadow?: string;
    hoverAnimation?: string;
    buttonGradient?: boolean;
    glowEffect?: string;
    transparency?: number;
    rippleEffect?: boolean;
    animationSpeed?: string;
    cardStyle?: string;
    sidebarStyle?: string;
    borderStyle?: string;
    cornerStyle?: string;
    pageBackground?: string;
    iconStyle?: string;
    buttonSize?: string;
    buttonPadding?: string;
    navigationAnimation?: string;
    themePreset?: string;
    salesNightOutAmount?: number;
  }) => {
    // If logoFile is provided, use FormData instead of JSON
    if (data.logoFile) {
      const token = getToken();
      const formData = new FormData();
      formData.append("logo", data.logoFile);
      if (data.primaryColor) formData.append("primaryColor", data.primaryColor);
      if (data.secondaryColor)
        formData.append("secondaryColor", data.secondaryColor);
      if (data.accentColor) formData.append("accentColor", data.accentColor);
      if (data.backgroundColor)
        formData.append("backgroundColor", data.backgroundColor);
      if (data.textColor) formData.append("textColor", data.textColor);
      if (data.borderRadius) formData.append("borderRadius", data.borderRadius);
      if (data.fontFamily) formData.append("fontFamily", data.fontFamily);
      if (data.buttonStyle) formData.append("buttonStyle", data.buttonStyle);
      if (data.country) formData.append("country", data.country);
      if (data.state) formData.append("state", data.state);
      if (data.city) formData.append("city", data.city);
      if (data.countryCode) formData.append("countryCode", data.countryCode);
      // Advanced branding
      if (data.glassEnabled !== undefined)
        formData.append("glassEnabled", String(data.glassEnabled));
      if (data.glassOpacity !== undefined)
        formData.append("glassOpacity", String(data.glassOpacity));
      if (data.glassBlur !== undefined)
        formData.append("glassBlur", String(data.glassBlur));
      if (data.glassTint) formData.append("glassTint", data.glassTint);
      if (data.buttonShadow) formData.append("buttonShadow", data.buttonShadow);
      if (data.hoverAnimation)
        formData.append("hoverAnimation", data.hoverAnimation);
      if (data.buttonGradient !== undefined)
        formData.append("buttonGradient", String(data.buttonGradient));
      if (data.glowEffect) formData.append("glowEffect", data.glowEffect);
      if (data.transparency !== undefined)
        formData.append("transparency", String(data.transparency));
      if (data.rippleEffect !== undefined)
        formData.append("rippleEffect", String(data.rippleEffect));
      if (data.animationSpeed)
        formData.append("animationSpeed", data.animationSpeed);
      if (data.cardStyle) formData.append("cardStyle", data.cardStyle);
      if (data.sidebarStyle) formData.append("sidebarStyle", data.sidebarStyle);
      if (data.borderStyle) formData.append("borderStyle", data.borderStyle);
      if (data.cornerStyle) formData.append("cornerStyle", data.cornerStyle);
      if (data.pageBackground)
        formData.append("pageBackground", data.pageBackground);
      if (data.iconStyle) formData.append("iconStyle", data.iconStyle);
      if (data.buttonSize) formData.append("buttonSize", data.buttonSize);
      if (data.buttonPadding)
        formData.append("buttonPadding", data.buttonPadding);
      if (data.navigationAnimation)
        formData.append("navigationAnimation", data.navigationAnimation);
      if (data.themePreset) formData.append("themePreset", data.themePreset);
      if (data.salesNightOutAmount !== undefined)
        formData.append("salesNightOutAmount", String(data.salesNightOutAmount));

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/company/branding`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: "Upload failed" };
        }
        throw new Error(errorData.message || "Upload failed");
      }

      return response.json();
    }

    // Otherwise use JSON
    return client.post<any>("/api/company/branding", {
      // Basic branding
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      borderRadius: data.borderRadius,
      fontFamily: data.fontFamily,
      buttonStyle: data.buttonStyle,
      logoUrl: data.logoUrl,
      country: data.country,
      state: data.state,
      city: data.city,
      countryCode: data.countryCode,
      // Advanced branding
      glassEnabled: data.glassEnabled,
      glassOpacity: data.glassOpacity,
      glassBlur: data.glassBlur,
      glassTint: data.glassTint,
      buttonShadow: data.buttonShadow,
      hoverAnimation: data.hoverAnimation,
      buttonGradient: data.buttonGradient,
      glowEffect: data.glowEffect,
      transparency: data.transparency,
      rippleEffect: data.rippleEffect,
      animationSpeed: data.animationSpeed,
      cardStyle: data.cardStyle,
      sidebarStyle: data.sidebarStyle,
      borderStyle: data.borderStyle,
      cornerStyle: data.cornerStyle,
      pageBackground: data.pageBackground,
      iconStyle: data.iconStyle,
      buttonSize: data.buttonSize,
      buttonPadding: data.buttonPadding,
      navigationAnimation: data.navigationAnimation,
      themePreset: data.themePreset,
      salesNightOutAmount: data.salesNightOutAmount,
    });
  },

  // Email configuration
  getEmailConfig: () => client.get<any>("/api/company/email-config"),
  // Departments
  getDepartments: () => client.get<any[]>("/api/company/departments"),
  createDepartment: (data: { name: string }) =>
    client.post<any>("/api/company/departments", data),
  updateDepartment: (
    id: string,
    data: { name?: string; managerId?: string; sidebarSections?: string[] },
  ) => client.put<any>(`/api/company/departments/${id}`, data),
  deleteDepartment: (id: string) =>
    client.delete<any>(`/api/company/departments/${id}`),

  updateEmailConfig: (data: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpUsername?: string;
    smtpPassword?: string;
    fromEmail?: string;
    fromName?: string;
    enabled?: boolean;
    smtp?: {
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
    };
  }) => {
    const payload = {
      enabled: data.enabled,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      smtp: {
        host: data.smtp?.host ?? data.smtpHost,
        port: data.smtp?.port ?? data.smtpPort,
        secure: data.smtp?.secure ?? false,
        username: data.smtp?.username ?? data.smtpUsername ?? data.smtpUser,
        password: data.smtp?.password ?? data.smtpPassword,
      },
    };

    return client.post<any>("/api/company/email-config", payload);
  },

  verifyEmailConfig: () =>
    client.post<any>("/api/company/email-config/verify", {}),

  disableEmailConfig: () =>
    client.post<any>("/api/company/email-config/disable", {}),
};

export const holidayApi = {
  sync: (data: { year: number }) =>
    client.post<any>("/api/holidays/sync", data),
  getAll: (year?: number) =>
    client.get<any>(`/api/holidays${year ? `?year=${year}` : ""}`),
};

export const leaveApi = {
  apply: (data: {
    type: string;
    startDate: Date;
    endDate: Date;
    reason: string;
  }) => client.post<any>("/api/leave/apply", data),

  getMyRequests: () => client.get<any[]>("/api/leave/my-requests"),

  getBalance: () => client.get<any>("/api/leave/balance"),

  getTeamRequests: () => client.get<any[]>("/api/leave/team-requests"),

  updateStatus: (
    id: string,
    data: { status: "approved" | "rejected"; comment?: string },
  ) => client.put<any>(`/api/leave/request/${id}`, data),

  getAllRequests: () => client.get<any[]>("/api/leave/admin/all"),

  getAllBalances: (year?: number) =>
    client.get<any[]>(
      `/api/leave/admin/balances${year ? `?year=${year}` : ""}`,
    ),

  updateBalance: (
    userId: string,
    data: Record<string, number | string | undefined>,
  ) => client.put<any>(`/api/leave/admin/balances/${userId}`, data),

  getCalendar: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    return client.get<any[]>(`/api/leave/admin/calendar${q ? `?${q}` : ""}`);
  },
};

export const onboardingApi = {
  list: () => client.get<any[]>("/api/onboarding"),
  getByUser: (userId: string) =>
    client.get<any>(`/api/onboarding/user/${userId}`),
  create: (data: {
    userId: string;
    templateName?: string;
    startDate?: string;
  }) => client.post<any>("/api/onboarding", data),
  toggleTask: (
    checklistId: string,
    taskId: string,
    data?: { completed?: boolean; notes?: string },
  ) =>
    client.patch<any>(
      `/api/onboarding/${checklistId}/tasks/${taskId}`,
      data || {},
    ),
};

export const jobApplicationsApi = {
  hire: (
    applicationId: string,
    data?: {
      department?: string;
      position?: string;
      role?: string;
      manager_id?: string;
      salary?: number;
      dateOfJoining?: string;
      employmentType?: string;
      createOnboarding?: boolean;
      probationDays?: number;
    },
  ) =>
    client.post<any>(`/api/job-applications/${applicationId}/hire`, data || {}),
};

export const payrollApi = {
  getMyPayslips: () => client.get<any[]>("/api/payroll/my-payslips"),

  getPayslipDetails: (id: string) =>
    client.get<any>(`/api/payroll/payslip/${id}`),

  generate: (data: {
    user_id: string;
    month: string;
    bonus?: number;
    other_bonus_items?: { name: string; amount: number }[];
    deduction_items?: { name: string; amount: number }[];
    base_salary?: number;
    standard_deduction_overrides?: Record<string, string | number>;
    deductions_disabled?: boolean;
  }) => client.post<any>("/api/payroll/generate", data),

  update: (id: string, data: any) =>
    client.put<any>(`/api/payroll/${id}`, data),

  getAll: (month?: string) =>
    client.get<any[]>(`/api/payroll/all${month ? `?month=${month}` : ""}`),
};

// Meetings API
export const meetingsApi = {
  getAll: () => client.get<Meeting[]>("/api/meetings"),

  getById: (id: string) => client.get<Meeting>(`/api/meetings/${id}`),

  create: (data: CreateMeetingRequest) =>
    client.post<Meeting>("/api/meetings", data),

  update: (id: string, data: Partial<CreateMeetingRequest>) =>
    client.put<Meeting>(`/api/meetings/${id}`, data),

  delete: (id: string) => client.delete(`/api/meetings/${id}`),

  start: (id: string) => client.post<Meeting>(`/api/meetings/${id}/start`, {}),

  end: (id: string, transcript?: string) =>
    client.post<Meeting>(
      `/api/meetings/${id}/end`,
      transcript ? { transcript } : {},
    ),

  join: (id: string) => client.post<Meeting>(`/api/meetings/${id}/join`, {}),

  leave: (id: string) => client.post<Meeting>(`/api/meetings/${id}/leave`, {}),

  processWithAI: (id: string, audioFile?: File) => {
    if (audioFile) {
      // Handle file upload
      const token = getToken();
      const formData = new FormData();
      formData.append("audio", audioFile);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      return fetch(`${API_URL}/api/meetings/${id}/process-ai`, {
        method: "POST",
        headers,
        body: formData,
      }).then(async (res) => {
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          if (!res.ok) throw new Error(`AI Processing failed (${res.status})`);
          return null;
        }
      });
    }
    return client.post<Meeting>(`/api/meetings/${id}/process-ai`, {});
  },

  getReport: (id: string) => client.get<any>(`/api/meetings/${id}/report`),

  getUserStats: () => client.get<any>("/api/meetings/stats/user"),

  getTeamStats: () => client.get<any>("/api/meetings/stats/team"),
};

// Stock API
export const stockApi = {
  getClients: () => client.get<any[]>("/api/stock/clients"),
  getClientInsights: () => client.get<any>("/api/stock/clients/insights"),
  getSavedClients: (page?: number, limit?: number) =>
    client.get<any[]>(
      `/api/stock/clients/saved${
        page || limit
          ? `?page=${page || 1}&limit=${limit || 20}`
          : ""
      }`,
    ),
  getClientContactRoles: () =>
    client.get<string[]>("/api/stock/clients/contact-roles"),
  renameClientContactRole: (data: { fromRole: string; toRole: string }) =>
    client.post<any>("/api/stock/clients/contact-roles/rename", data),
  saveClientContacts: (data: {
    sourceName: string
    sourceNumber: string
    sourceLocation: string
    legalName?: string
    contacts: Array<{
      role: string
      name: string
      phone?: string
      email?: string
      notes?: string
      isActive?: boolean
    }>
  }) => client.put<any>("/api/stock/clients/contacts", data),
  updateSavedClient: (data: {
    originalSourceName: string
    originalSourceNumber: string
    originalSourceLocation: string
    sourceName: string
    sourceNumber: string
    sourceLocation: string
    legalName?: string
    contactPerson?: string
    email?: string
  }) => client.put<any>("/api/stock/clients/profile", data),
  deleteSavedClient: (data: {
    sourceName: string
    sourceNumber: string
    sourceLocation: string
  }) =>
    client.delete<any>(
      `/api/stock/clients/profile?sourceName=${encodeURIComponent(data.sourceName)}&sourceNumber=${encodeURIComponent(data.sourceNumber)}&sourceLocation=${encodeURIComponent(data.sourceLocation)}`,
    ),
  deleteAllSavedClients: (confirm: string) =>
    client.post<any>("/api/stock/clients/purge-all", { confirm }),
  getClientGroups: () => client.get<any[]>("/api/stock/clients/groups"),
  createClientGroup: (data: {
    name: string
    description?: string
    memberKeys?: string[]
  }) => client.post<any>("/api/stock/clients/groups", data),
  updateClientGroup: (
    groupId: string,
    data: { name?: string; description?: string; memberKeys?: string[] },
  ) => client.put<any>(`/api/stock/clients/groups/${groupId}`, data),
  mergeClientGroups: (data: { groupIds: string[]; name: string }) =>
    client.post<any>("/api/stock/clients/groups/merge", data),
  addClientsToGroup: (groupId: string, memberKeys: string[]) =>
    client.post<any>(`/api/stock/clients/groups/${groupId}/members`, {
      memberKeys,
    }),
  removeClientFromGroup: (groupId: string, memberKey: string) =>
    client.post<any>(`/api/stock/clients/groups/${groupId}/remove-member`, {
      memberKey,
    }),
  deleteClientGroup: (groupId: string) =>
    client.delete<any>(`/api/stock/clients/groups/${groupId}`),

  getProducts: () => client.get<any[]>("/api/stock/products"),
  deleteAllInventory: (confirm: string) =>
    client.post<any>("/api/stock/products/purge-all", { confirm }),
  deleteAllCategories: (confirm: string) =>
    client.post<any>("/api/stock/categories/purge-all", { confirm }),

  globalSearch: (q: string) =>
    client.get<{
      invoices: any[]
      quotations: any[]
      products: any[]
      clients: any[]
    }>(`/api/stock/global-search?q=${encodeURIComponent(q)}`),

  getInvoices: () => client.get<any[]>("/api/stock/invoices"),
  getInvoiceById: (invoiceId: string) =>
    client.get<any>(`/api/stock/invoices/${invoiceId}`),
  getInvoiceLifecycle: (invoiceId: string) =>
    client.get<any>(`/api/stock/invoices/${invoiceId}/lifecycle`),

  getQuotations: (page?: number, limit?: number) =>
    client.get<any[]>(
      `/api/stock/quotations${
        page || limit
          ? `?page=${page || 1}&limit=${limit || 20}`
          : ""
      }`,
    ),
  createQuotation: (data: any) => client.post<any>("/api/stock/quotations", data),
  updateQuotation: (quotationId: string, data: any) =>
    client.put<any>(`/api/stock/quotations/${quotationId}`, data),
  getQuotationById: (quotationId: string) =>
    client.get<any>(`/api/stock/quotations/${quotationId}`),

  getWarehouses: () => client.get<any[]>("/api/stock/warehouses"),
  createWarehouse: (data: any) =>
    client.post<any>("/api/stock/warehouses", data),
  updateWarehouse: (warehouseId: string, data: any) =>
    client.put<any>(`/api/stock/warehouses/${warehouseId}`, data),
  uploadWarehouseLogo: async (warehouseId: string, file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(
      `${API_URL}/api/stock/warehouses/${warehouseId}/logo`,
      { method: "POST", headers, body: form },
    );
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  },
  getWarehouseLocations: (warehouseId: string) =>
    client.get<any[]>(`/api/stock/warehouses/${warehouseId}/locations`),
  // Installed machines
  getInstalledMachines: (page?: number, limit?: number) =>
    client.get<any[]>(
      `/api/stock/installed-machines${
        page || limit
          ? `?page=${page || 1}&limit=${limit || 20}`
          : ""
      }`,
    ),
  createInstalledMachine: (data: any) =>
    client.post<any>("/api/stock/installed-machines", data),
  updateInstalledMachine: (id: string, data: any) =>
    client.patch<any>(`/api/stock/installed-machines/${id}`, data),
  deleteInstalledMachine: (id: string) =>
    client.delete<any>(`/api/stock/installed-machines/${id}`),
  bulkUploadInstalledMachines: async (file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(
      `${API_URL}/api/stock/installed-machines/bulk`,
      {
        method: "POST",
        headers,
        body: form,
      },
    );
    const data = await response.text().then((text) => {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    });

    if (!response.ok) {
      throw new Error(data?.message || "Upload failed");
    }
    return data;
  },
  // Machine services
  getMachineServices: (params?: {
    machineId?: string;
    status?: string;
    withinDays?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.machineId) search.set("machineId", params.machineId);
    if (params?.status) search.set("status", params.status);
    if (params?.withinDays) search.set("withinDays", String(params.withinDays));
    const query = search.toString();
    return client.get<any[]>(`/api/stock/machine-services${query ? `?${query}` : ""}`);
  },
  getMachineService: (id: string) =>
    client.get<any>(`/api/stock/machine-services/${id}`),
  createMachineService: (data: any) =>
    client.post<any>("/api/stock/machine-services", data),
  updateMachineService: (id: string, data: any) =>
    client.put<any>(`/api/stock/machine-services/${id}`, data),
  deleteMachineService: (id: string) =>
    client.delete<any>(`/api/stock/machine-services/${id}`),
  // Candidates
  getInstallableCandidates: () =>
    client.get<any>(`/api/stock/installed-candidates`),
  assignProductLocation: (
    productId: string,
    data: { locationId: string; quantity: number; notes?: string },
  ) => client.post<any>(`/api/stock/products/${productId}/locations`, data),
  getProductLocationsByProduct: (productId: string) =>
    client.get<any[]>(`/api/stock/products/${productId}/locations`),

  convertQuotation: (
    quotationId: string,
    data?: { transportCost?: number; transportNote?: string },
  ) =>
    client.post<any>(`/api/stock/quotations/${quotationId}/convert`, data || {}),
  approveInvoice: (invoiceId: string) =>
    client.post<any>(`/api/stock/invoices/${invoiceId}/approve`, {}),
  postInvoice: (invoiceId: string) =>
    client.post<any>(`/api/stock/invoices/${invoiceId}/post`, {}),
  updateDraftInvoice: (
    invoiceId: string,
    data: {
      client?: { name?: string; number?: string; location?: string }
      items?: Array<Record<string, unknown>>
      transportCost?: number
      transportNote?: string
    },
  ) => client.put<any>(`/api/stock/invoices/${invoiceId}`, data),
  cancelInvoice: (invoiceId: string) =>
    client.post<any>(`/api/stock/invoices/${invoiceId}/cancel`, {}),
  reviseInvoice: (invoiceId: string) =>
    client.post<any>(`/api/stock/invoices/${invoiceId}/revise`, {}),
  rejectInvoice: (invoiceId: string) =>
    client.post<any>(`/api/stock/invoices/${invoiceId}/reject`, {}),
  addQuotationFollowUp: (
    quotationId: string,
    data: { note: string; callMade?: boolean; outcome?: string },
  ) => client.post<any>(`/api/stock/quotations/${quotationId}/followups`, data),
  getQuotationFollowUps: (quotationId: string) =>
    client.get<any[]>(`/api/stock/quotations/${quotationId}/followups`),

  getAccountsClients: (page?: number, limit?: number) =>
    client.get<any[]>(
      `/api/stock/accounts/clients${
        page || limit
          ? `?page=${page || 1}&limit=${limit || 20}`
          : ""
      }`,
    ),
  saveClient: (data: {
    sourceName: string;
    sourceNumber: string;
    sourceLocation: string;
    legalName?: string;
    contactPerson?: string;
    contactPersonRole?: string;
    kraPin?: string;
    email?: string;
    branchId?: string;
  }) => client.post<any>("/api/stock/accounts/clients", data),

  bulkUploadClients: async (file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_URL}/api/stock/clients/bulk`, {
      method: "POST",
      headers,
      body: form,
    });
    const data = await response.text().then((text) => {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    });

    if (!response.ok) {
      throw new Error(data?.message || "Upload failed");
    }
    return data;
  },

  getAccountsPosts: () => client.get<any[]>("/api/stock/accounts/posts"),

  saveInvoiceClientProfile: (
    invoiceId: string,
    data: {
      legalName: string;
      kraPin: string;
      email?: string;
      branchId?: string;
    },
  ) => client.put<any>(`/api/stock/accounts/posts/${invoiceId}/client`, data),

  postInvoiceToEtims: (invoiceId: string) =>
    client.post<any>(`/api/stock/accounts/posts/${invoiceId}/post-etims`, {}),

  getAccountsPayments: () => client.get<any[]>("/api/stock/accounts/payments"),

  addInvoicePayment: (
    invoiceId: string,
    data: {
      amount: number;
      paymentMethod?: string;
      reference?: string;
      note?: string;
      paidAt?: string;
    },
  ) => client.post<any>(`/api/stock/accounts/payments/${invoiceId}`, data),

  getDebtManagement: () => client.get<any[]>("/api/stock/accounts/debts"),
  getAgingDebtReport: () => client.get<any>("/api/stock/accounts/debts/aging"),
  getProfitMargins: () =>
    client.get<any>("/api/stock/analytics/profit-margins"),
  getMovementForecast: () =>
    client.get<any[]>("/api/stock/analytics/movement-forecast"),
  getInventoryValuation: () =>
    client.get<any>("/api/stock/analytics/valuation"),
  getFinancialBreakdown: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return client.get<any>(`/api/stock/analytics/financial-breakdown${query}`);
  },

  getExpenses: () => client.get<any[]>("/api/stock/accounts/expenses"),
  getExpensesSummary: () =>
    client.get<{
      totalSpend: number
      transportTotal: number
      expenseCount: number
      completedCount: number
      pendingApproval: number
      byCategory: Array<{ category: string; amount: number; count: number }>
      transportExpenses: any[]
      recentExpenses: any[]
    }>("/api/stock/accounts/expenses/summary"),

  initiateExpense: (data: {
    payerPhone: string;
    payeePhone: string;
    amount: number;
    purpose: string;
  }) => client.post<any>("/api/stock/accounts/expenses/initiate", data),

  createManualExpense: (data: {
    payerPhone?: string;
    payeePhone: string;
    amount: number;
    purpose: string;
    description?: string;
    category?: string;
    categoryId?: string;
    branch?: string;
    department?: string;
    vat?: number;
    paymentMethod?: string;
    workflowStatus?: string;
    expenseDate?: string;
    receiptNote?: string;
    isRecurring?: boolean;
    recurDate?: string;
    proofUrl?: string;
    proofFileName?: string;
    proofOriginalName?: string;
  }) => client.post<any>("/api/stock/accounts/expenses/manual", data),

  uploadExpenseProof: (file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_URL}/api/stock/accounts/expenses/proof`, {
      method: "POST",
      headers,
      body: form,
    }).then(async (res) => {
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!res.ok) {
        throw new Error(parsed?.message || `Upload failed (${res.status})`);
      }
      return parsed;
    });
  },

  updateExpenseWorkflow: (expenseId: string, workflowStatus: string) =>
    client.patch<any>(`/api/stock/accounts/expenses/${expenseId}/workflow`, {
      workflowStatus,
    }),

  getExpenseCategories: () =>
    client.get<
      Array<{
        _id: string
        name: string
        description?: string
        expenseCount?: number
        totalAmount?: number
      }>
    >("/api/stock/accounts/expenses/categories"),

  getExpenseCategoryDetail: (categoryId: string) =>
    client.get<{
      category: any
      expenses: any[]
      summary: {
        expenseCount: number
        completedCount: number
        totalAmount: number
        totalVat: number
      }
    }>(`/api/stock/accounts/expenses/categories/${categoryId}`),

  createExpenseCategory: (data: { name: string; code?: string; description?: string }) =>
    client.post<any>("/api/stock/accounts/expenses/categories", data),

  deleteExpenseCategory: (categoryId: string) =>
    client.delete<any>(`/api/stock/accounts/expenses/categories/${categoryId}`),

  getExpenseClaims: () =>
    client.get<any[]>("/api/stock/accounts/expenses/claims"),

  createExpenseClaim: (data: {
    employeeId: string;
    employeeName: string;
    items: { description: string; amount: number; category?: string }[];
    purpose: string;
    receiptNote?: string;
    status?: string;
  }) => client.post<any>("/api/stock/accounts/expenses/claims", data),

  updateExpenseClaimStatus: (
    claimId: string,
    data: { status: string; rejectionReason?: string },
  ) =>
    client.patch<any>(`/api/stock/accounts/expenses/claims/${claimId}/status`, data),

  getReceivablesSummary: () =>
    client.get<any>("/api/stock/accounts/receivables/summary"),

  getReceivablesClients: () =>
    client.get<any[]>("/api/stock/accounts/receivables/clients"),

  getCustomerStatement: (params: {
    clientName: string;
    clientNumber: string;
    clientLocation?: string;
    from?: string;
    to?: string;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return client.get<any>(`/api/stock/accounts/receivables/statement?${query}`);
  },

  getRepeatBills: () => client.get<any[]>("/api/stock/accounts/repeat-bills"),

  createRepeatBill: (data: {
    payerPhone: string;
    payeePhones: string[];
    amount: number;
    purpose: string;
    sendNow?: boolean;
  }) => client.post<any>("/api/stock/accounts/repeat-bills", data),

  runRepeatBill: (repeatBillId: string) =>
    client.post<any>(
      `/api/stock/accounts/repeat-bills/${repeatBillId}/run`,
      {},
    ),

  bulkUploadProducts: (file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_URL}/api/stock/products/bulk`, {
      method: "POST",
      headers,
      body: form,
    }).then(async (res) => {
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        return null;
      }
    });
  },
};

// Setup API for onboarding wizard
const setupApi = {
  getProgress: () => client.get<any>("/api/setup/progress"),

  updateStep: (data: { step: string; data: any; completed: boolean }) =>
    client.post<any>("/api/setup/step", data),

  complete: () => client.post<any>("/api/setup/complete", {}),

  skip: (data: { step: string }) => client.post<any>("/api/setup/skip", data),

  reset: () => client.post<any>("/api/setup/reset", {}),
};

// Stamps API for document stamping
const stampsApi = {
  getAll: () => client.get<any>("/api/stamps"),

  getById: (id: string) => client.get<any>(`/api/stamps/${id}`),

  getDefault: () => client.get<any>("/api/stamps/default"),

  create: (data: any) => client.post<any>("/api/stamps", data),

  update: (id: string, data: any) => client.put<any>(`/api/stamps/${id}`, data),

  delete: (id: string) => client.delete<any>(`/api/stamps/${id}`),

  generatePreview: (config: any) =>
    client.post<any>("/api/stamps/preview", config),

  getSvg: (id: string, params?: Record<string, string>) => {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return client.get<any>(`/api/stamps/${id}/svg${queryString}`);
  },
};

// Client Complaints API
const complaintsApi = {
  getAll: (filters?: Record<string, string>) => {
    const queryString = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return client.get<any>(`/api/complaints${queryString}`);
  },

  getById: (id: string) => client.get<any>(`/api/complaints/${id}`),

  create: (data: any) => client.post<any>("/api/complaints", data),

  update: (id: string, data: any) =>
    client.put<any>(`/api/complaints/${id}`, data),

  assign: (id: string, assignedTo: string) =>
    client.patch<any>(`/api/complaints/${id}/assign`, { assignedTo }),

  addNote: (id: string, note: string) =>
    client.post<any>(`/api/complaints/${id}/notes`, { note }),

  communicate: (id: string, message: string, senderRole: string = "staff") =>
    client.post<any>(`/api/complaints/${id}/communicate`, {
      message,
      senderRole,
    }),

  resolve: (id: string, data: any) =>
    client.patch<any>(`/api/complaints/${id}/resolve`, data),

  close: (id: string) => client.patch<any>(`/api/complaints/${id}/close`, {}),

  getStats: () => client.get<any>("/api/complaints/stats"),
};

// Branches API for multi-location management
const branchesApi = {
  getAll: (filters?: { active?: boolean }) => {
    const query = new URLSearchParams();
    if (filters?.active !== undefined)
      query.append("active", String(filters.active));
    const queryStr = query.toString();
    return client.get<any[]>(`/api/branches${queryStr ? "?" + queryStr : ""}`);
  },

  getById: (id: string) => client.get<any>(`/api/branches/${id}`),

  create: (data: {
    name: string;
    code: string;
    location: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    description?: string;
  }) => client.post<any>("/api/branches", data),

  update: (
    id: string,
    data: Partial<{
      name: string;
      code: string;
      location: string;
      city: string;
      state: string;
      country: string;
      phone: string;
      email: string;
      description: string;
      isActive: boolean;
    }>,
  ) => client.put<any>(`/api/branches/${id}`, data),

  allocateManager: (branchId: string, managerId: string) =>
    client.post<any>("/api/branches/allocate", { branchId, managerId }),

  removeManager: (branchId: string) =>
    client.post<any>(`/api/branches/${branchId}/remove-manager`, {}),

  delete: (id: string) => client.delete<any>(`/api/branches/${id}`),

  getAnalytics: (branchId: string) =>
    client.get<any>(`/api/branches/${branchId}/analytics`),
};

// Credit Notes API for invoice adjustments
const creditNoteApi = {
  getInvoicesForCreditNote: () =>
    client.get<any[]>("/api/stock/credit-notes/invoices-for-credit-note"),

  getReasons: () =>
    client.get<Record<string, string>>("/api/stock/credit-notes/reasons"),

  create: (data: {
    invoiceId: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
    reason: string;
    reasonDetails?: string;
  }) => client.post<any>("/api/stock/credit-notes", data),

  getAll: (filters?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (filters?.status) query.append("status", filters.status);
    if (filters?.page) query.append("page", String(filters.page));
    if (filters?.limit) query.append("limit", String(filters.limit));
    const queryStr = query.toString();
    return client.get<any>(
      `/api/stock/credit-notes${queryStr ? "?" + queryStr : ""}`,
    );
  },

  getById: (id: string) => client.get<any>(`/api/stock/credit-notes/${id}`),

  update: (
    id: string,
    data: {
      items?: Array<any>;
      reason?: string;
      reasonDetails?: string;
      status?: string;
    },
  ) => client.put<any>(`/api/stock/credit-notes/${id}`, data),

  issue: (id: string) =>
    client.post<any>(`/api/stock/credit-notes/${id}/issue`, {}),

  downloadPdf: async (id: string) => {
    const token = getToken();
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch(
        `${API_URL}/api/stock/credit-notes/${id}/pdf`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `credit-note-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Error downloading PDF:", error);
      throw error;
    }
  },

  delete: (id: string) => client.delete<any>(`/api/stock/credit-notes/${id}`),
};

const debitNoteApi = {
  getInvoicesForDebitNote: () =>
    client.get<any[]>("/api/stock/debit-notes/invoices-for-debit-note"),

  getReasons: () =>
    client.get<Record<string, string>>("/api/stock/debit-notes/reasons"),

  create: (data: {
    invoiceId: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      description?: string;
    }>;
    reason: string;
    reasonDetails?: string;
  }) => client.post<any>("/api/stock/debit-notes", data),

  getAll: (filters?: { status?: string }) => {
    const query = new URLSearchParams();
    if (filters?.status) query.append("status", filters.status);
    const queryStr = query.toString();
    return client.get<any[]>(
      `/api/stock/debit-notes${queryStr ? "?" + queryStr : ""}`,
    );
  },

  issue: (id: string) =>
    client.post<any>(`/api/stock/debit-notes/${id}/issue`, {}),

  downloadPdf: async (id: string, numberHint?: string) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/api/stock/debit-notes/${id}/pdf`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("Failed to download debit note PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `debit-note-${numberHint || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  delete: (id: string) => client.delete<any>(`/api/stock/debit-notes/${id}`),
};

const cashBankingApi = {
  getOverview: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return client.get<any>(`/api/accounts/cash-banking/overview${qs ? `?${qs}` : ""}`);
  },

  listAccounts: (params?: { type?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return client.get<any[]>(
      `/api/accounts/cash-banking/accounts${qs ? `?${qs}` : ""}`,
    );
  },

  createAccount: (data: Record<string, unknown>) =>
    client.post<any>("/api/accounts/cash-banking/accounts", data),

  updateAccount: (id: string, data: Record<string, unknown>) =>
    client.patch<any>(`/api/accounts/cash-banking/accounts/${id}`, data),

  listTransactions: (params?: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value) q.set(key, value);
    });
    const qs = q.toString();
    return client.get<any>(
      `/api/accounts/cash-banking/transactions${qs ? `?${qs}` : ""}`,
    );
  },

  createTransaction: (data: Record<string, unknown>) =>
    client.post<any>("/api/accounts/cash-banking/transactions", data),

  listTransfers: () => client.get<any[]>("/api/accounts/cash-banking/transfers"),

  createTransfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    occurredAt?: string;
    note?: string;
    reference?: string;
  }) => client.post<any>("/api/accounts/cash-banking/transfers", data),

  reconcile: (data: { transactionIds: string[]; reconciled?: boolean }) =>
    client.post<any>("/api/accounts/cash-banking/reconcile", data),

  syncFromOperations: () =>
    client.post<any>("/api/accounts/cash-banking/sync", {}),
};

export type AiChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export const aiAssistantApi = {
  getStatus: () =>
    client.get<{ enabled: boolean; model?: string; provider?: string }>(
      "/api/ai-assistant/status",
    ),

  chat: (message: string, history: AiChatTurn[] = []) =>
    client.post<{ answer: string; toolsUsed?: string[] }>(
      "/api/ai-assistant/chat",
      {
        message,
        history,
      },
    ),
};

export const etimsApi = {
  getConfig: () => client.get<any>("/api/etims/config"),
  saveConfig: (data: any) => client.post<any>("/api/etims/config", data),
  initDevice: () => client.post<any>("/api/etims/init-device"),
  getStats: () => client.get<any>("/api/etims/stats"),
  getLogs: () => client.get<any[]>("/api/etims/logs"),
  submitInvoice: (data: any) => client.post<any>("/api/etims/submit-invoice", data),
  validateCustomer: (data: any) => client.post<any>("/api/etims/validate-customer", data),
};

export const crmApi = {
  getConversations: (query?: {
    roomName?: string
    clientName?: string
    relatedMachineId?: string
    source?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.roomName) params.append("roomName", query.roomName)
    if (query?.clientName) params.append("clientName", query.clientName)
    if (query?.relatedMachineId) params.append("relatedMachineId", query.relatedMachineId)
    if (query?.source) params.append("source", query.source)
    return client.get<any[]>(`/api/crm/conversations?${params.toString()}`)
  },
  createConversation: (data: any) => client.post<any>("/api/crm/conversations", data),
  getCallPurposes: () => client.get<any>("/api/crm/call-purposes"),
  addCallPurpose: (purpose: string) =>
    client.post<any>("/api/crm/call-purposes", { purpose }),
  getCustomers: () => client.get<any[]>("/api/crm/customers"),
  createCustomer: (data: any) => client.post<any>("/api/crm/customers", data),
  getLeads: () => client.get<any[]>("/api/crm/leads"),
  createLead: (data: any) => client.post<any>("/api/crm/leads", data),
  updateLeadStatus: (id: string, data: { to: string; reason?: string; conversation_id?: string }) =>
    client.patch<any>(`/api/crm/leads/${id}/status`, data),
  setTelesalesLeadStatus: (data: {
    to: string
    conversationId?: string
    leadId?: string
    clientName?: string
    clientPhone?: string
    customer_id?: string
    callPurpose?: string
    reason?: string
    note?: string
  }) => client.post<any>("/api/crm/telesales/lead-status", data),
  getClientTelesalesHistory: (query?: {
    conversationId?: string
    leadId?: string
    clientName?: string
    clientPhone?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.conversationId) params.append("conversationId", query.conversationId)
    if (query?.leadId) params.append("leadId", query.leadId)
    if (query?.clientName) params.append("clientName", query.clientName)
    if (query?.clientPhone) params.append("clientPhone", query.clientPhone)
    const qs = params.toString()
    return client.get<any>(`/api/crm/telesales/client-history${qs ? `?${qs}` : ""}`)
  },
  getCallLogs: () => client.get<any[]>("/api/crm/call-logs"),
  createCallLog: (data: any) => client.post<any>("/api/crm/call-logs", data),
  getTickets: (machine_id?: string) => {
    const params = new URLSearchParams()
    if (machine_id) params.append("machine_id", machine_id)
    return client.get<any[]>(`/api/crm/tickets?${params.toString()}`)
  },
  createTicket: (data: any) => client.post<any>("/api/crm/tickets", data),
  updateTicket: (id: string, data: any) => client.patch<any>(`/api/crm/tickets/${id}`, data),
  resolveTicket: (
    id: string,
    data: {
      action: "resolved" | "escalate_service"
      resolutionNote?: string
      notes?: string
      machineId?: string
      serviceType?: string
      scheduledDate?: string | null
      technician?: string
      cost?: number | string
    },
  ) => client.post<any>(`/api/crm/tickets/${id}/resolve`, data),
  getTelesalesActivity: (query?: { from?: string; to?: string; userId?: string }) => {
    const params = new URLSearchParams()
    if (query?.from) params.append("from", query.from)
    if (query?.to) params.append("to", query.to)
    if (query?.userId) params.append("userId", query.userId)
    const qs = params.toString()
    return client.get<any>(`/api/crm/telesales/activity${qs ? `?${qs}` : ""}`)
  },
};

export const salesApi = {
  getDashboard: (date?: string) =>
    client.get<any>(`/api/sales/dashboard${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  getReport: (date?: string) =>
    client.get<any>(`/api/sales/report${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  updateReport: (data: any) => client.patch<any>("/api/sales/report", data),
  startDay: (data?: any) => client.post<any>("/api/sales/report/start", data || {}),
  endDay: (data?: any) => client.post<any>("/api/sales/report/end", data || {}),
  submitReport: (id: string) => client.post<any>(`/api/sales/report/${id}/submit`, {}),
  createVisit: (data: any, photo?: File | null) => {
    if (photo) {
      const form = new FormData()
      Object.entries(data || {}).forEach(([key, value]) => {
        if (value == null || value === "") return
        form.append(key, typeof value === "object" ? JSON.stringify(value) : String(value))
      })
      form.append("photo", photo)
      return client.post<any>("/api/sales/visits", form)
    }
    return client.post<any>("/api/sales/visits", data)
  },
  getCategories: () => client.get<any[]>("/api/sales/categories"),
  searchStock: (q: string, inStockOnly = true) =>
    client.get<any[]>(
      `/api/sales/stock?q=${encodeURIComponent(q)}&inStockOnly=${inStockOnly ? "1" : "0"}`,
    ),
  searchClients: (q: string) =>
    client.get<any[]>(`/api/sales/clients/search?q=${encodeURIComponent(q)}`),
  listMyClients: (q?: string) =>
    client.get<any>(`/api/sales/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClientOptions: () => client.get<any>("/api/sales/clients/options"),
  createClient: (data: any) => client.post<any>("/api/sales/clients", data),
  getClientBook: (id: string) => client.get<any>(`/api/sales/clients/${id}`),
  addClientContact: (id: string, data: any) =>
    client.post<any>(`/api/sales/clients/${encodeURIComponent(id)}/contacts`, data),
  logClientActivity: (id: string, data: any) =>
    client.post<any>(`/api/sales/clients/${encodeURIComponent(id)}/activity`, data),
  listQuotes: () => client.get<any[]>("/api/sales/quotes"),
  createQuote: (data: any) => client.post<any>("/api/sales/quotes", data),
  updateQuote: (id: string, data: any) => client.patch<any>(`/api/sales/quotes/${id}`, data),
  submitQuote: (id: string) => client.post<any>(`/api/sales/quotes/${id}/submit`, {}),
  markQuoteDownloaded: (id: string) =>
    client.post<any>(`/api/sales/quotes/${id}/downloaded`, {}),
  getHistory: () => client.get<any>("/api/sales/history"),
  adminList: (status?: string) =>
    client.get<any>(`/api/sales/admin${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  adminListVisits: (params?: { from?: string; to?: string; q?: string }) => {
    const search = new URLSearchParams()
    if (params?.from) search.set("from", params.from)
    if (params?.to) search.set("to", params.to)
    if (params?.q) search.set("q", params.q)
    const qs = search.toString()
    return client.get<any>(`/api/sales/admin/visits${qs ? `?${qs}` : ""}`)
  },
  adminRevokeVisit: (id: string, data?: { note?: string }) =>
    client.post<any>(`/api/sales/admin/visits/${id}/revoke`, data || {}),
  adminUpdateReport: (id: string, data: any) =>
    client.patch<any>(`/api/sales/admin/reports/${id}`, data),
  adminUpdateQuote: (id: string, data: any) =>
    client.patch<any>(`/api/sales/admin/quotes/${id}`, data),
  adminReviewReport: (id: string, data: { action: "approve" | "revision"; note?: string }) =>
    client.post<any>(`/api/sales/admin/reports/${id}/review`, data),
  adminReviewQuote: (id: string, data: { action: "approve" | "reject"; note?: string }) =>
    client.post<any>(`/api/sales/admin/quotes/${id}/review`, data),
  getPlanners: () => client.get<any>("/api/sales/planner"),
  createPlanner: (data: any) => client.post<any>("/api/sales/planner", data),
  adminGetPlanners: (status?: string) => client.get<any>(`/api/sales/admin/planner${status ? `?status=${status}` : ""}`),
  adminReviewPlanner: (id: string, data: { action: "approve" | "reject"; note?: string }) => client.patch<any>(`/api/sales/admin/planner/${id}/review`, data),
  adminGetPerformance: () => client.get<any>("/api/sales/admin/performance"),
  adminSetTarget: (
    userId: string,
    data: { weeklyAmount: number; monthlyAmount: number; quarterlyAmount: number },
  ) => client.patch<any>(`/api/sales/admin/performance/${encodeURIComponent(userId)}`, data),
};

// Export all APIs
export const api = {
  auth: authApi,
  users: usersApi,
  awards: awardsApi,
  kpis: kpisApi,
  performance: performanceApi,
  feedback: feedbackApi,
  pdps: pdpsApi,
  tasks: tasksApi,
  attendance: attendanceApi,
  invitations: invitationsApi,
  reports: reportsApi,
  company: companyApi,
  holidays: holidayApi,
  leave: leaveApi,
  onboarding: onboardingApi,
  jobApplications: jobApplicationsApi,
  payroll: payrollApi,
  meetings: meetingsApi,
  stock: stockApi,
  creditNotes: creditNoteApi,
  debitNotes: debitNoteApi,
  cashBanking: cashBankingApi,
  setup: setupApi,
  stamps: stampsApi,
  complaints: complaintsApi,
  branches: branchesApi,
  aiAssistant: aiAssistantApi,
  crm: crmApi,
  sales: salesApi,
  etims: etimsApi,
  dashboard: {
    getStats: () => client.get<any>("/api/dashboard/stats"),
  },
};

export default api;
