import { Mic } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function RecordingsPage() {
  return (
    <ComingSoon
      code="04"
      title="TAKE ARCHIVE"
      description="Every practice take, captured and scored against the original. Compare pitch and timing across sessions and watch your accuracy climb."
      icon={Mic}
    />
  )
}
