'use client'

import { BaseAudioPlayer } from './BaseAudioPlayer'

interface Section {
  id: string
  title: string
  chapterTitle: string
  chapterIndex: number
  sectionIndex: number
}

interface BookAudioPlayerProps {
  bookTitle: string
  sections: Section[]
}

export function BookAudioPlayer({ bookTitle, sections }: BookAudioPlayerProps) {
  return (
    <BaseAudioPlayer
      bookTitle={bookTitle}
      sections={sections}
      getAudioEndpoint={(sectionId) => `/api/tts/section/${sectionId}`}
    />
  )
}
