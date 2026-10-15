'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface AccessibilityContextType {
  isSeniorMode: boolean
  toggleSeniorMode: () => void
  setSeniorMode: (enabled: boolean) => void
  userAge: number | null
  setUserAge: (age: number | null) => void
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  isSeniorMode: false,
  toggleSeniorMode: () => {},
  setSeniorMode: () => {},
  userAge: null,
  setUserAge: () => {},
})

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isSeniorMode, setIsSeniorModeState] = useState(false)
  const [userAge, setUserAgeState] = useState<number | null>(null)

  useEffect(() => {
    // Cargar preferencia guardada en localStorage
    try {
      const stored = localStorage.getItem('audenti_senior_mode')
      const storedAge = localStorage.getItem('audenti_user_age')
      if (stored !== null) {
        setIsSeniorModeState(stored === 'true')
      }
      if (storedAge !== null) {
        const parsed = parseInt(storedAge, 10)
        if (!isNaN(parsed)) {
          setUserAgeState(parsed)
          if (parsed >= 50 && stored === null) {
            setIsSeniorModeState(true)
          }
        }
      }
    } catch (e) {
      // Ignorar en SSR o modo privado
    }
  }, [])

  const setSeniorMode = (enabled: boolean) => {
    setIsSeniorModeState(enabled)
    try {
      localStorage.setItem('audenti_senior_mode', String(enabled))
    } catch {}
  }

  const toggleSeniorMode = () => {
    setSeniorMode(!isSeniorMode)
  }

  const setUserAge = (age: number | null) => {
    setUserAgeState(age)
    if (age !== null) {
      try {
        localStorage.setItem('audenti_user_age', String(age))
      } catch {}
      if (age >= 50) {
        setSeniorMode(true)
      }
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        isSeniorMode,
        toggleSeniorMode,
        setSeniorMode,
        userAge,
        setUserAge,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  return useContext(AccessibilityContext)
}
