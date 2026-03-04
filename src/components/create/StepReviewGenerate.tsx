import type { CreateFormData } from '@/types'
import type { StepErrors } from '@/lib/validation'
import FormField from '@/components/ui/FormField'
import TextInput from '@/components/ui/TextInput'

interface StepReviewGenerateProps {
  data: CreateFormData
  errors: StepErrors
  onChange: (repoName: string) => void
}

export default function StepReviewGenerate({
  data,
  errors,
  onChange,
}: StepReviewGenerateProps) {
  const researcherSummary =
    data.researchers.method === 'csv'
      ? data.researchers.csvFile?.name ?? 'No file'
      : `${data.researchers.detectedCount} Scholar URL${data.researchers.detectedCount !== 1 ? 's' : ''}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">
          Review &amp; Generate
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Confirm your settings before generating the map.
        </p>
      </div>

      <div className="rounded-md border border-stone-200 divide-y divide-stone-100">
        <SummaryRow label="University" value={data.department.universityName} />
        <SummaryRow label="Department" value={data.department.departmentName} />
        <SummaryRow
          label="Color Theme"
          value={
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: data.department.colorTheme }}
              />
              {data.department.colorTheme}
            </span>
          }
        />
        <SummaryRow label="Researchers" value={researcherSummary} />
        <SummaryRow
          label="LLM Provider"
          value={data.aiSummaries.provider.charAt(0).toUpperCase() + data.aiSummaries.provider.slice(1)}
        />
      </div>

      <FormField
        label="GitHub Repository Name"
        required
        description="This will be the name of the generated repository. Use lowercase letters, numbers, and hyphens."
        error={errors.repoName}
      >
        <TextInput
          placeholder="e.g. cs-department-aimap"
          value={data.generation.repoName}
          hasError={!!errors.repoName}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-800">{value}</span>
    </div>
  )
}
