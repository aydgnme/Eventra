import { FileText, Image, Presentation } from 'lucide-react'

export default function FileTypeIcon({ fileType, className = 'w-5 h-5' }) {
  if (fileType === 'pdf') {
    return <FileText className={`${className} text-red-500`} />
  }
  if (fileType === 'image') {
    return <Image className={`${className} text-blue-500`} />
  }
  if (fileType === 'presentation') {
    return <Presentation className={`${className} text-orange-500`} />
  }
  return <FileText className={`${className} text-fg-3`} />
}
