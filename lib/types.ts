// TypeScript interfaces matching backend models

// Frontend User interface (snake_case)
export interface User {
    _id: string
    email: string
    first_name: string
    last_name: string
    role: 'company_admin' | 'admin' | 'hr' | 'manager' | 'employee'
    org_id: string
    department?: string
    position?: string
    manager_id?: string
    hire_date?: string
    status: 'active' | 'inactive'
    sha_id?: string
    kra_pin?: string
    national_id?: string
    nssf_number?: string
    bankDetails?: {
        accountName?: string
        accountNumber?: string
        bankName?: string
        bankBranch?: string
    }
    createdAt: string
    updatedAt: string
}

// Backend User interface (camelCase - as returned from API)
export interface BackendUser {
    _id: string
    email: string
    firstName: string
    lastName: string
    role: 'company_admin' | 'admin' | 'hr' | 'manager' | 'employee'
    org_id: string
    department?: string
    manager_id?: string
    status: 'active' | 'inactive'
    sha_id?: string
    kra_pin?: string
    national_id?: string
    nssf_number?: string
    bankDetails?: {
        accountName?: string
        accountNumber?: string
        bankName?: string
        bankBranch?: string
    }
    createdAt: string
    updatedAt: string
}

export interface Award {
    _id: string
    title: string
    description: string
    recipient_id: string
    recipient?: User
    awarded_by: string
    awarded_by_user?: User
    org_id: string
    award_date: string
    category: string
    createdAt: string
    updatedAt: string
}

export interface KPI {
    _id: string
    name: string
    description: string
    category: string
    weight: number
    org_id: string
    target_value?: number
    measurement_unit?: string
    createdAt: string
    updatedAt: string
}

export interface PerformanceReview {
    _id: string
    employee_id: string
    employee?: User
    reviewer_id: string
    reviewer?: User
    org_id: string
    review_period_start: string
    review_period_end: string
    overall_rating: number
    kpi_scores: Array<{
        kpi_id: string
        score: number
        comments?: string
    }>
    strengths?: string
    areas_for_improvement?: string
    goals?: string
    status: 'draft' | 'submitted' | 'completed'
    createdAt: string
    updatedAt: string
}

export interface Feedback {
    _id: string
    from_user_id: string
    from_user?: User
    to_user_id: string
    to_user?: User
    org_id: string
    feedback_type: 'positive' | 'constructive' | 'general'
    content: string
    is_anonymous: boolean
    createdAt: string
    updatedAt: string
}

export interface PDP {
    _id: string
    employee_id: string
    employee?: User
    org_id: string
    title: string
    description: string
    goals: Array<{
        title: string
        description: string
        target_date: string
        status: 'not_started' | 'in_progress' | 'completed'
        progress: number
    }>
    status: 'active' | 'completed' | 'archived'
    start_date: string
    end_date: string
    createdAt: string
    updatedAt: string
}

export interface Attendance {
    _id: string
    employee_id: string
    employee?: User
    org_id: string
    date: string
    status: 'present' | 'absent' | 'late' | 'half_day' | 'leave'
    check_in_time?: string
    check_out_time?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface Organization {
    _id: string
    name: string
    slug: string // Unique company identifier for login URLs
    email: string
    phone?: string
    website?: string
    industry: string
    employeeCount: string
    size: string
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    subscription?: 'starter' | 'professional' | 'enterprise'
    status?: 'active' | 'suspended' | 'inactive'
    settings?: {
        working_hours?: number
        leave_policy?: any
    }
    createdAt: string
    updatedAt: string
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// Auth types
export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    success: boolean
    token: string
    user: User
}

export interface RegisterCompanyRequest {
    name: string
    email: string
    adminEmail: string
    adminPassword: string
    adminName: string
    industry: string
    employeeCount: string
    phone?: string
    website?: string
    country?: string
    state?: string
    city?: string
    countryCode?: string
}

export interface RegisterCompanyResponse {
    success: boolean
    token: string
    user: BackendUser
    company: Organization
}

// Request payload types
export interface CreateUserRequest {
    email: string
    password: string
    first_name: string
    last_name: string
    role: User['role']
    department?: string
    position?: string
    manager_id?: string
    hire_date?: string
}

export interface UpdateUserRequest {
    first_name?: string
    last_name?: string
    department?: string
    position?: string
    manager_id?: string
    status?: User['status']
    sha_id?: string
    kra_pin?: string
    national_id?: string
    nssf_number?: string
    bankDetails?: {
        accountName?: string
        accountNumber?: string
        bankName?: string
        bankBranch?: string
    }
}

export interface CreateAwardRequest {
    title: string
    description: string
    recipient_id: string
    category: string
    award_date?: string
}

export interface CreateKPIRequest {
    name: string
    description: string
    category: string
    weight: number
    target_value?: number
    measurement_unit?: string
}

export interface CreateFeedbackRequest {
    to_user_id: string
    feedback_type: Feedback['feedback_type']
    content: string
    is_anonymous?: boolean
}

export interface CreatePDPRequest {
    employee_id: string
    title: string
    description: string
    goals: PDP['goals']
    start_date: string
    end_date: string
}

// Meeting types
export interface MeetingAttendee {
    user_id: string
    user?: User
    joined_at?: string
    left_at?: string
    duration_minutes?: number
    status: 'invited' | 'joined' | 'left'
}

export interface Meeting {
    _id: string
    title: string
    description?: string
    scheduled_start: string
    scheduled_end: string
    actual_start_time?: string
    actual_end_time?: string
    meeting_type: 'team' | 'one_on_one' | 'company_wide' | 'client' | 'other'
    meeting_id: string
    meeting_link?: string
    password?: string
    require_password: boolean
    organizer_id: string
    organizer?: User
    attendees: MeetingAttendee[]
    meeting_link?: string
    location?: string
    agenda?: string
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    ai_transcript?: string
    ai_summary?: string
    ai_action_items?: Array<{
        description: string
        assigned_to: string
        due_date?: string
        priority?: 'low' | 'medium' | 'high'
    }>
    recording_url?: string
    org_id: string
    createdAt: string
    updatedAt: string
}

export interface CreateMeetingRequest {
    title: string
    description?: string
    scheduled_start: string
    scheduled_end: string
    meeting_type: Meeting['meeting_type']
    attendees?: string[] // Array of user IDs
    meeting_link?: string
    location?: string
    agenda?: string
    require_password?: boolean
    password?: string
}
