import type { CreateFormData } from '@/types'

export function buildConfigYaml(data: CreateFormData): string {
  const providerMap: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  }

  const lines = [
    `# University / department metadata`,
    `university_name: "${data.department.universityName}"`,
    `department_name: "${data.department.departmentName}"`,
    `color_theme: "${data.department.colorTheme}"`,
    ``,
    `# LLM configuration`,
    `llm_provider: "${data.aiSummaries.provider}"`,
    `llm_api_key_env: "${providerMap[data.aiSummaries.provider]}"`,
    ``,
    `# Scraper settings`,
    `researchers_file: "researchers.csv"`,
    `scraper_max_threads: 10`,
    `scraper_max_requests_per_ip: 10`,
    `scraper_max_retries: 10`,
    `chunk_size: 50`,
    ``,
    `# Pipeline settings`,
    `profiles_dir: "Researcher_Profiles"`,
    `output_dir: "pipeline-output"`,
  ]

  return lines.join('\n') + '\n'
}

export function buildResearchersCsv(data: CreateFormData): string {
  if (data.researchers.method === 'csv' && data.researchers.csvFile) {
    // CSV file content will be read separately — return empty as placeholder
    // The actual file content is handled by the generation hook
    return ''
  }

  // Parse Scholar URLs into CSV rows (name,google_scholar_url format for ScholarMine)
  // Handles both plain URLs and CSV-style input (e.g. "Name,URL" lines)
  const lines = data.researchers.scholarUrls
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const rows = ['name,google_scholar_url']
  for (const line of lines) {
    // Extract the Scholar URL from anywhere in the line
    const urlMatch = line.match(/(https?:\/\/scholar\.google\.com\/citations\?[^\s,]+)/)
    if (!urlMatch) continue
    const scholarUrl = urlMatch[1]

    const idMatch = scholarUrl.match(/[?&]user=([^&]+)/)
    const placeholderName = idMatch ? `researcher_${idMatch[1]}` : 'unknown'
    rows.push(`${placeholderName},${scholarUrl}`)
  }

  return rows.join('\n') + '\n'
}
