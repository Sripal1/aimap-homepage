import { Search, Cpu, Rocket } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: 'Scrape',
    description:
      'Collects publication data from Google Scholar profiles using ScholarMine.',
  },
  {
    icon: Cpu,
    title: 'Process',
    description:
      'Generates research summaries with an LLM, computes embeddings, and runs UMAP for 2D layout.',
  },
  {
    icon: Rocket,
    title: 'Deploy',
    description:
      'Builds a static site and deploys to GitHub Pages via GitHub Actions.',
  },
]

export default function Pipeline() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-stone-900">How it works</h2>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-teal-light text-brand-teal text-sm font-bold">
                  {i + 1}
                </span>
                <step.icon className="w-5 h-5 text-brand-teal" />
                <h3 className="font-bold text-stone-900">{step.title}</h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
