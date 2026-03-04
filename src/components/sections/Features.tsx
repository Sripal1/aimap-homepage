import { Server, Key, Zap, Database, FileText, Globe } from 'lucide-react'

const features = [
  {
    icon: Server,
    text: 'Runs entirely on GitHub Actions — no server infrastructure',
  },
  {
    icon: Key,
    text: 'Supports Gemini, OpenAI, and Anthropic for research summaries',
  },
  {
    icon: Zap,
    text: 'Parallelized scraping with configurable chunk size (up to 20 concurrent jobs)',
  },
  {
    icon: Database,
    text: "All data stored in the user's own GitHub repository",
  },
  {
    icon: FileText,
    text: 'Configuration via a single YAML file',
  },
  {
    icon: Globe,
    text: 'Static output — deploys to GitHub Pages with no runtime dependencies',
  },
]

export default function Features() {
  return (
    <section className="py-16 sm:py-20 bg-stone-50">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-stone-900">Details</h2>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <li
              key={feature.text}
              className="flex items-start gap-3 text-sm text-stone-600"
            >
              <feature.icon className="w-4 h-4 mt-0.5 text-brand-teal shrink-0" />
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
