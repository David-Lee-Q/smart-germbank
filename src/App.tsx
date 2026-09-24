import { Navigate, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from './theme'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Accessions from './pages/Accessions'
import AccessionDetail from './pages/AccessionDetail'
import Inventory from './pages/Inventory'
import Viability from './pages/Viability'
import Regeneration from './pages/Regeneration'
import Distribution from './pages/Distribution'
import Analytics from './pages/Analytics'
import Environment from './pages/Environment'
import Alerts from './pages/Alerts'
import System from './pages/System'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accessions" element={<Accessions />} />
          <Route path="/accessions/:id" element={<AccessionDetail />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/viability" element={<Viability />} />
          <Route path="/regeneration" element={<Regeneration />} />
          <Route path="/distribution" element={<Distribution />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/environment" element={<Environment />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/system" element={<System />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
