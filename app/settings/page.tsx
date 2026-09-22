import { Settings2 } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function SettingsPage() {
  return (
    <ComingSoon
      code="05"
      title="CONTROL PANEL"
      description="Instrument presets, input calibration, latency tuning, and account preferences will be wired up here for a dialed-in workstation."
      icon={Settings2}
    />
  )
}
