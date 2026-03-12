import { useState, useCallback } from 'react'
import type { CreateFormData } from '@/types'
import { getSessionJSON, setSessionJSON, removeSession } from '@/lib/storage'

const DATA_KEY = 'wizard:data'
const STEP_KEY = 'wizard:step'
const CSV_NAME_KEY = 'wizard:csvFileName'

interface SerializableFormData {
  department: CreateFormData['department']
  researchers: Omit<CreateFormData['researchers'], 'csvFile'> & { csvFile: null }
  aiSummaries: CreateFormData['aiSummaries']
  generation: CreateFormData['generation']
}

function serializeData(data: CreateFormData): SerializableFormData {
  return {
    ...data,
    researchers: { ...data.researchers, csvFile: null },
  }
}

export function useWizardState(initialData: CreateFormData) {
  const [data, setData] = useState<CreateFormData>(() => {
    const stored = getSessionJSON<SerializableFormData>(DATA_KEY)
    if (stored) {
      return { ...stored, researchers: { ...stored.researchers, csvFile: null } }
    }
    return initialData
  })

  const [step, setStep] = useState<number>(() => {
    return getSessionJSON<number>(STEP_KEY) ?? 0
  })

  const previousCsvFileName = getSessionJSON<string>(CSV_NAME_KEY)

  const updateData = useCallback((updated: CreateFormData) => {
    setData(updated)
    setSessionJSON(DATA_KEY, serializeData(updated))
    if (updated.researchers.csvFile) {
      setSessionJSON(CSV_NAME_KEY, updated.researchers.csvFile.name)
    }
  }, [])

  const updateStep = useCallback((newStep: number) => {
    setStep(newStep)
    setSessionJSON(STEP_KEY, newStep)
  }, [])

  const updateSlice = useCallback(
    <K extends keyof CreateFormData>(key: K, updates: Partial<CreateFormData[K]>) => {
      setData((prev) => {
        const next = { ...prev, [key]: { ...prev[key], ...updates } }
        setSessionJSON(DATA_KEY, serializeData(next))
        if (key === 'researchers' && (updates as Partial<CreateFormData['researchers']>).csvFile) {
          const file = (updates as Partial<CreateFormData['researchers']>).csvFile
          if (file) setSessionJSON(CSV_NAME_KEY, file.name)
        }
        return next
      })
    },
    [],
  )

  const clearWizard = useCallback(() => {
    setData(initialData)
    setStep(0)
    removeSession(DATA_KEY)
    removeSession(STEP_KEY)
    removeSession(CSV_NAME_KEY)
  }, [initialData])

  return {
    data,
    step,
    previousCsvFileName,
    updateData,
    updateStep,
    updateSlice,
    clearWizard,
  }
}
