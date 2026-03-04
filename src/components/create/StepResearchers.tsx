import { useCallback } from 'react'
import { Download } from 'lucide-react'
import type { ResearchersData } from '@/types'
import type { StepErrors } from '@/lib/validation'
import { isValidScholarUrl } from '@/lib/validation'
import FormField from '@/components/ui/FormField'
import FileUpload from '@/components/ui/FileUpload'

interface StepResearchersProps {
  data: ResearchersData
  errors: StepErrors
  onChange: (updates: Partial<ResearchersData>) => void
}

function downloadTemplate() {
  const csv = 'name,google_scholar_url\nJane Doe,https://scholar.google.com/citations?user=EXAMPLE1\nJohn Smith,https://scholar.google.com/citations?user=EXAMPLE2\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'researchers_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function StepResearchers({
  data,
  errors,
  onChange,
}: StepResearchersProps) {
  const handleUrlsChange = useCallback(
    (value: string) => {
      const count = value
        .split('\n')
        .map((u) => u.trim())
        .filter(isValidScholarUrl).length
      onChange({ scholarUrls: value, detectedCount: count })
    },
    [onChange],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Researchers</h2>
        <p className="mt-1 text-sm text-stone-500">
          Provide the Google Scholar profiles for faculty in your department.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ method: 'csv' })}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            data.method === 'csv'
              ? 'bg-brand-teal text-white'
              : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Upload CSV
        </button>
        <button
          type="button"
          onClick={() => onChange({ method: 'scholar-urls' })}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            data.method === 'scholar-urls'
              ? 'bg-brand-teal text-white'
              : 'border border-stone-300 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Paste Scholar URLs
        </button>
      </div>

      {data.method === 'csv' ? (
        <div className="space-y-3">
          <FormField
            label="CSV File"
            required
            description="Two columns: name and google_scholar_url."
            error={errors.csvFile}
          >
            <FileUpload
              accept=".csv"
              label="Drop a CSV file here, or click to browse"
              file={data.csvFile}
              hasError={!!errors.csvFile}
              onChange={(file) => onChange({ csvFile: file })}
            />
          </FormField>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm text-brand-teal hover:text-brand-teal-dark transition-colors"
          >
            <Download className="h-4 w-4" />
            Download CSV template
          </button>
        </div>
      ) : (
        <FormField
          label="Google Scholar URLs"
          required
          description="One URL per line."
          error={errors.scholarUrls}
        >
          <textarea
            rows={6}
            placeholder={
              'https://scholar.google.com/citations?user=abc123\nhttps://scholar.google.com/citations?user=def456'
            }
            value={data.scholarUrls}
            onChange={(e) => handleUrlsChange(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-colors ${
              errors.scholarUrls ? 'border-red-300' : 'border-stone-300'
            }`}
          />
          {data.detectedCount > 0 && (
            <span className="inline-block mt-1.5 rounded-full bg-brand-teal-light text-brand-teal px-3 py-0.5 text-xs font-medium">
              {data.detectedCount} researcher{data.detectedCount !== 1 && 's'}{' '}
              detected
            </span>
          )}
        </FormField>
      )}
    </div>
  )
}
