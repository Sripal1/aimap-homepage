import type { DepartmentData } from '@/types'
import type { StepErrors } from '@/lib/validation'
import FormField from '@/components/ui/FormField'
import TextInput from '@/components/ui/TextInput'
import ColorSwatchPicker from '@/components/ui/ColorSwatchPicker'

interface StepDepartmentProps {
  data: DepartmentData
  errors: StepErrors
  onChange: (updates: Partial<DepartmentData>) => void
}

export default function StepDepartment({
  data,
  errors,
  onChange,
}: StepDepartmentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">
          Department Information
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Tell us about the department this research map represents.
        </p>
      </div>

      <FormField label="University Name" required error={errors.universityName}>
        <TextInput
          placeholder="e.g. Georgia Institute of Technology"
          value={data.universityName}
          hasError={!!errors.universityName}
          onChange={(e) => onChange({ universityName: e.target.value })}
        />
      </FormField>

      <FormField label="Department Name" required error={errors.departmentName}>
        <TextInput
          placeholder="e.g. School of Computer Science"
          value={data.departmentName}
          hasError={!!errors.departmentName}
          onChange={(e) => onChange({ departmentName: e.target.value })}
        />
      </FormField>

      <FormField
        label="Color Theme"
        description="Choose a primary color for your map's interface."
      >
        <ColorSwatchPicker
          value={data.colorTheme}
          onChange={(hex) => onChange({ colorTheme: hex })}
        />
      </FormField>
    </div>
  )
}
