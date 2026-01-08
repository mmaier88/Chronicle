'use client'

import { BaseAudioPlayer } from './BaseAudioPlayer'

interface Section {
  id: string
  title: string
  chapterTitle: string
  chapterIndex: number
  sectionIndex: number
}

interface SharedBookAudioPlayerProps {
  bookTitle: string
  sections: Section[]
  shareToken: string
}

export function SharedBookAudioPlayer({ bookTitle, sections, shareToken }: SharedBookAudioPlayerProps) {
  return (
    <BaseAudioPlayer
      bookTitle={bookTitle}
      sections={sections}
      getAudioEndpoint={(sectionId) => `/api/tts/shared/${shareToken}/section/${sectionId}`}
    />
  )
}
