import { useEffect, useState } from 'react'
import { findTheme } from './themes'
import { readStorage, writeStorage } from './hooks/useProgress'
import { Workspace } from './components/Workspace'

const THEME_KEY = 'appsql:theme'

export default function App() {
  const [theme, setTheme] = useState(() => findTheme(readStorage<string | null>(THEME_KEY, null)))

  // En <html> para que el fondo de toda la página también tome el tema.
  useEffect(() => {
    document.documentElement.dataset.theme = theme.id
  }, [theme.id])

  function changeTheme(id: string) {
    const next = findTheme(id)
    writeStorage(THEME_KEY, next.id)
    setTheme(next)
  }

  // key: al cambiar de tema se remonta todo (progreso, base y ejercicio activo).
  return <Workspace key={theme.id} theme={theme} onThemeChange={changeTheme} />
}
