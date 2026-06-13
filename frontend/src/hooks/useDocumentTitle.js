import { useEffect } from 'react'

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} — Eventra` : 'Eventra — University Event Management'
    return () => { document.title = prev }
  }, [title])
}
