/** Public marketing / careers site (not the HR app host). */
export const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://www.elevatehub.co.ke").replace(/\/$/, "")

export const publicCareersUrl = (shareLink: string) =>
  `${PUBLIC_SITE_URL}/careers/${shareLink}`

export const JOB_APPLICATION_MAX_FILE_BYTES = 2 * 1024 * 1024
