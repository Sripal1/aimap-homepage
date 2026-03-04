import type { AISummariesData, LLMProvider } from '@/types'
import type { StepErrors } from '@/lib/validation'
import FormField from '@/components/ui/FormField'
import TextInput from '@/components/ui/TextInput'

interface StepAISummariesProps {
  data: AISummariesData
  errors: StepErrors
  onChange: (updates: Partial<AISummariesData>) => void
}

const PROVIDERS: { id: LLMProvider; label: string; description: string }[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Uses the Gemini API to generate research summaries.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Uses the OpenAI API (GPT models) for summaries.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Uses the Anthropic API (Claude models) for summaries.',
  },
]

export default function StepAISummaries({
  data,
  errors,
  onChange,
}: StepAISummariesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">
          AI-Generated Summaries
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          AI Map uses a large language model to generate plain-English research
          summaries for each faculty member. Choose a provider and supply your
          API key.
        </p>
      </div>

      <FormField label="LLM Provider" required>
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                data.provider === p.id
                  ? 'border-brand-teal bg-brand-teal-light/50'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={data.provider === p.id}
                onChange={() => onChange({ provider: p.id })}
                className="mt-0.5 accent-brand-teal"
              />
              <div>
                <span className="text-sm font-medium text-stone-800">
                  {p.label}
                </span>
                <p className="text-xs text-stone-500">{p.description}</p>
              </div>
            </label>
          ))}
        </div>
      </FormField>

      <FormField label="API Key" required error={errors.apiKey}>
        <TextInput
          type="password"
          placeholder="Paste your API key"
          value={data.apiKey}
          hasError={!!errors.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
        />
        <p className="mt-1 text-xs text-stone-400">
          Your key is only used during generation and is never stored on our
          servers.
        </p>
      </FormField>
    </div>
  )
}
