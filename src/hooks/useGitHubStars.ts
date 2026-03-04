import { useState, useEffect } from 'react'

export function useGitHubStars(repo: string): number | null {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.stargazers_count === 'number') {
          setStars(data.stargazers_count)
        }
      })
      .catch(() => {
        // Silently fail — star count is non-critical
      })
  }, [repo])

  return stars
}
