import { ScrollText } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function NotationPage() {
  return (
    <ComingSoon
      code="03"
      title="NOTATION VAULT"
      description="Full-score editing, transposition, and export to MusicXML and PDF land here. Fine-tune every transcribed note before you take it to the stage."
      icon={ScrollText}
    />
  )
}
