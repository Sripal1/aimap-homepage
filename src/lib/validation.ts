import type { CreateFormData } from '@/types'

export type StepErrors = Record<string, string>

const SCHOLAR_URL_PATTERN = /scholar\.google\.com\/citations\?.*user=/

export function isValidScholarUrl(url: string): boolean {
  return SCHOLAR_URL_PATTERN.test(url.trim())
}

export function validateStep1(data: CreateFormData['department']): StepErrors {
  const errors: StepErrors = {}
  if (!data.universityName.trim()) {
    errors.universityName = 'University name is required.'
  }
  if (!data.departmentName.trim()) {
    errors.departmentName = 'Department name is required.'
  }
  return errors
}

export function validateStep2(data: CreateFormData['researchers']): StepErrors {
  const errors: StepErrors = {}
  if (data.method === 'csv') {
    if (!data.csvFile) {
      errors.csvFile = 'Please upload a CSV file.'
    } else if (!data.csvFile.name.endsWith('.csv')) {
      errors.csvFile = 'File must be a .csv file.'
    }
  } else {
    const urls = data.scholarUrls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    const validCount = urls.filter(isValidScholarUrl).length
    if (validCount < 1) {
      errors.scholarUrls = 'Enter at least one valid Google Scholar URL.'
    }
  }
  return errors
}

export function validateStep3(data: CreateFormData['aiSummaries']): StepErrors {
  const errors: StepErrors = {}
  if (!data.apiKey.trim()) {
    errors.apiKey = 'API key is required.'
  }
  return errors
}

const REPO_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export function validateStep4(data: CreateFormData['generation']): StepErrors {
  const errors: StepErrors = {}
  if (!data.repoName.trim()) {
    errors.repoName = 'Repository name is required.'
  } else if (!REPO_NAME_PATTERN.test(data.repoName)) {
    errors.repoName =
      'Must be lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'
  }
  return errors
}
