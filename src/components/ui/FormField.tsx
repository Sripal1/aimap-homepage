interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export default function FormField({
  label,
  description,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-800">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-sm text-stone-500">{description}</p>
      )}
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
