import { Check } from 'lucide-react'
import { COLOR_PRESETS } from '@/types'

interface ColorSwatchPickerProps {
  value: string
  onChange: (hex: string) => void
}

export default function ColorSwatchPicker({
  value,
  onChange,
}: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {COLOR_PRESETS.map((swatch) => {
        const selected = value === swatch.hex
        return (
          <button
            key={swatch.hex}
            type="button"
            title={swatch.name}
            onClick={() => onChange(swatch.hex)}
            className="relative h-9 w-9 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{
              backgroundColor: swatch.hex,
              boxShadow: selected
                ? `0 0 0 2px white, 0 0 0 4px ${swatch.hex}`
                : undefined,
            }}
          >
            {selected && (
              <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
            )}
          </button>
        )
      })}
    </div>
  )
}
