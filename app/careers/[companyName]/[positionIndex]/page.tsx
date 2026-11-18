'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tinos } from 'next/font/google';
import { useToast } from '@/hooks/use-toast';
import API_URL from '@/lib/apiBase';
import {
  JOB_APPLICATION_MAX_FILE_BYTES,
  JOB_APPLICATION_MAX_FILE_LABEL,
  PUBLIC_SITE_URL,
} from '@/lib/publicSite';
import { LOGIN_HREF, NAV, SIGNUP_HREF } from '@/lib/landing/site';
import '@/components/home/landing.css';

const tinos = Tinos({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
});

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  application_deadline?: string;
  company_name: string;
  created_at: string;
}

interface FormField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  min_value?: number;
  max_value?: number;
}

interface ApplicationForm {
  _id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

function lines(value?: string[] | string) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(/\n+/)
    .map((item) => item.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);
}

function formatSalary(range?: Job['salary_range']) {
  if (!range || range.min == null || range.max == null) return null;
  const currency = range.currency || 'KES';
  return `${currency} ${Number(range.min).toLocaleString()} – ${Number(range.max).toLocaleString()}`;
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PublicJobPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const { toast } = useToast();

  const getDeviceFingerprint = () => {
    if (typeof window === 'undefined') return '';
    const storageKey = 'elevate_job_device_id';
    let deviceId = localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    fetchJob();
  }, [params]);

  useEffect(() => {
    if (!job?._id || typeof window === 'undefined') return;
    const deviceId = getDeviceFingerprint();
    const applied = localStorage.getItem(`job_applied_${job._id}_${deviceId}`) === 'true';
    setAlreadyApplied(applied);
    if (applied) setSubmitted(true);
  }, [job?._id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const companyNameParam = Array.isArray(params.companyName) ? params.companyName[0] : params.companyName;
      const positionIndexParam = Array.isArray(params.positionIndex) ? params.positionIndex[0] : params.positionIndex;

      if (!companyNameParam || !positionIndexParam) {
        throw new Error('Invalid job link');
      }
      const response = await fetch(
        `${API_URL}/api/jobs/public/${encodeURIComponent(String(companyNameParam))}/${encodeURIComponent(String(positionIndexParam))}`
      );
      const data = await response.json();

      if (data?.success) {
        setJob(data.data);
        fetchApplicationForm(data.data._id);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching job:', err);
      setError('This job posting is not available.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationForm = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/application-forms/job/${jobId}`);
      const data = await response.json();
      if (data?.success) setApplicationForm(data.data);
    } catch (err) {
      console.error('Error fetching form:', err);
    }
  };

  const setFieldValue = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId: string, file?: File) => {
    if (!file) return;
    if (file.size > JOB_APPLICATION_MAX_FILE_BYTES) {
      toast({
        title: 'Document too large',
        description: `Upload a file of ${JOB_APPLICATION_MAX_FILE_LABEL} or less.`,
        variant: 'destructive',
      });
      setFieldValue(fieldId, undefined);
      return;
    }
    setFieldValue(fieldId, file);
  };

  const handleSubmitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!job || !applicationForm) return;

    if (!formData.email) {
      toast({
        title: 'Email required',
        description: 'Enter your email address before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const missingFields = applicationForm.fields
      .filter((field) => {
        if (!field.required) return false;
        const value = formData[field.field_id];
        if (field.type === 'checkbox') return value === undefined || value === null;
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      })
      .map((field) => field.label);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const oversizedField = applicationForm.fields.find((field) => {
      if (field.type !== 'file') return false;
      const file = formData[field.field_id];
      return file instanceof File && file.size > JOB_APPLICATION_MAX_FILE_BYTES;
    });
    if (oversizedField) {
      toast({
        title: 'Document too large',
        description: `Upload a file of ${JOB_APPLICATION_MAX_FILE_LABEL} or less.`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('job_id', job._id);
      submitData.append('form_id', applicationForm._id);
      submitData.append('applicant_name', formData.full_name || formData.name || 'Unknown');
      submitData.append('applicant_email', formData.email);
      submitData.append('applicant_phone', formData.phone || '');
      submitData.append('device_fingerprint', getDeviceFingerprint());

      const answers = (applicationForm.fields || []).map((field) => ({
        field_id: field.field_id,
        label: field.label,
        value: field.type === 'file' ? 'File uploaded' : (formData[field.field_id] ?? null),
      }));
      submitData.append('answers', JSON.stringify(answers));
      if (formData.resume_url) submitData.append('resume_url', formData.resume_url);
      if (formData.cover_letter) submitData.append('cover_letter', formData.cover_letter);
      submitData.append('source', new URLSearchParams(window.location.search).get('source') || 'direct');

      applicationForm.fields.forEach((field) => {
        if (field.type === 'file' && formData[field.field_id] instanceof File) {
          submitData.append(field.field_id, formData[field.field_id] as File);
        }
      });

      const response = await fetch(`${API_URL}/api/job-applications/submit`, {
        method: 'POST',
        body: submitData,
      });
      const data = await response.json();

      if (data?.success) {
        const deviceId = getDeviceFingerprint();
        localStorage.setItem(`job_applied_${job._id}_${deviceId}`, 'true');
        localStorage.setItem(`job_applied_${job._id}`, 'true');
        setSubmitted(true);
        setAlreadyApplied(true);
        toast({
          title: 'Application received',
          description: `Submitted for ${job.title}.`,
        });
        setTimeout(() => {
          window.location.assign(`${PUBLIC_SITE_URL}/`);
        }, 900);
      } else {
        throw new Error(data.message || (response.status === 413 ? 'Document too large' : 'Submission failed'));
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('already applied')) {
        setAlreadyApplied(true);
        setSubmitted(true);
        toast({
          title: 'Already applied',
          description: 'An application from this email or device is already on file.',
        });
        return;
      }
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const responsibilities = lines(job?.responsibilities);
  const requirements = lines(job?.requirements);
  const benefits = lines(job?.benefits);
  const salary = formatSalary(job?.salary_range);
  const closed = submitted || alreadyApplied;

  return (
    <div className={`elevate-landing elevate-careers ${tinos.variable}`}>
      <header className="careers-header">
        <Link href="/" className="brand" aria-label="Elevate home">
          <img src="/elevate-logo.png" alt="Elevate" />
        </Link>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="nav-hide">
              {item.label}
            </Link>
          ))}
          <Link href={LOGIN_HREF}>Login</Link>
          <Link href={SIGNUP_HREF}>Signup</Link>
        </nav>
      </header>

      {loading ? (
        <p className="state-note">Loading posting…</p>
      ) : error || !job ? (
        <p className="state-note">
          {error || 'This job posting is no longer available.'}{' '}
          <a href={PUBLIC_SITE_URL}>Back to Elevate</a>
        </p>
      ) : (
        <main className="careers-wrap">
          <p className="job-kicker">{job.company_name}</p>
          <h1 className="job-title">{job.title}</h1>
          <div className="job-meta">
            {job.location && <span>{job.location}</span>}
            {job.employment_type && <span className="capitalize">{job.employment_type.replace(/-/g, ' ')}</span>}
            {job.department && <span>{job.department}</span>}
            {salary && <span>{salary}</span>}
            {job.application_deadline && <span>Apply by {formatDate(job.application_deadline)}</span>}
            {job.created_at && <span>Posted {formatDate(job.created_at)}</span>}
          </div>

          <div className="job-body">
            {job.description && (
              <section>
                <h2>Role</h2>
                {String(job.description)
                  .split(/\n{2,}/)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </section>
            )}

            {responsibilities.length > 0 && (
              <section>
                <h2>Responsibilities</h2>
                <ul>
                  {responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {requirements.length > 0 && (
              <section>
                <h2>Requirements</h2>
                <ul>
                  {requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {benefits.length > 0 && (
              <section>
                <h2>Benefits</h2>
                <ul>
                  {benefits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="apply-panel" id="apply">
            <h2>{closed ? 'Application on file' : applicationForm?.title || 'Apply'}</h2>
            <p className="apply-lead">
              {closed
                ? 'This device already submitted an application for this posting.'
                : applicationForm?.description ||
                  (applicationForm
                    ? `Complete the form for ${job.title}. Files must be ${JOB_APPLICATION_MAX_FILE_LABEL} or smaller.`
                    : 'An application form has not been published for this posting yet.')}
            </p>

            {!closed && applicationForm && (
              <form className="apply-fields" onSubmit={handleSubmitApplication}>
                {applicationForm.fields.map((field) => (
                  <div key={field.field_id}>
                    <label htmlFor={field.field_id}>
                      {field.label}
                      {field.required && <span className="req"> *</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.field_id}
                        placeholder={field.placeholder}
                        value={formData[field.field_id] || ''}
                        onChange={(e) => setFieldValue(field.field_id, e.target.value)}
                        rows={4}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.field_id}
                        value={formData[field.field_id] || ''}
                        onChange={(e) => setFieldValue(field.field_id, e.target.value)}
                      >
                        <option value="">{field.placeholder || 'Select'}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="choice">
                        <input
                          id={field.field_id}
                          type="checkbox"
                          checked={!!formData[field.field_id]}
                          onChange={(e) => setFieldValue(field.field_id, e.target.checked)}
                        />
                        {field.placeholder && field.placeholder !== field.label ? field.placeholder : 'Yes'}
                      </label>
                    ) : field.type === 'file' ? (
                      <>
                        <input
                          id={field.field_id}
                          type="file"
                          accept={field.placeholder || '.pdf,.doc,.docx,.txt,image/*'}
                          onChange={(e) => {
                            handleFileChange(field.field_id, e.target.files?.[0]);
                            if (e.target.files?.[0] && e.target.files[0].size > JOB_APPLICATION_MAX_FILE_BYTES) {
                              e.target.value = '';
                            }
                          }}
                        />
                        <p className="hint">Maximum {JOB_APPLICATION_MAX_FILE_LABEL}</p>
                      </>
                    ) : field.type === 'radio' ? (
                      <div>
                        {field.options?.map((option) => (
                          <label key={option} className="choice">
                            <input
                              type="radio"
                              name={field.field_id}
                              value={option}
                              checked={formData[field.field_id] === option}
                              onChange={(e) => setFieldValue(field.field_id, e.target.value)}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        id={field.field_id}
                        type={field.type === 'phone' ? 'tel' : field.type || 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.field_id] || ''}
                        onChange={(e) => setFieldValue(field.field_id, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <div className="apply-actions">
                  <button type="submit" className="primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit application'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>
      )}

      <footer className="site-footer elevate-careers-footer">
        <Link href="/" className="brand" aria-label="Elevate home">
          <img src="/elevate-logo.png" alt="Elevate" />
        </Link>
        <nav aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={LOGIN_HREF}>Login</Link>
          <Link href={SIGNUP_HREF}>Signup</Link>
        </nav>
        <p>Elevate — inventory, payroll, procurement, and manufacturing in one hub.</p>
      </footer>
    </div>
  );
}
