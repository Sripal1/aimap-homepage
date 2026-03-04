import { cn } from '@/lib/utils'

interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export default function TextInput({
  hasError,
  className,
  ...props
}: TextInputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-md border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400',
        'focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal',
        'transition-colors',
        hasError
          ? 'border-red-300 focus:ring-red-300/40 focus:border-red-500'
          : 'border-stone-300',
        className,
      )}
      {...props}
    />
  )
}
