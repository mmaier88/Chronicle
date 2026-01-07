import { jsPDF } from 'jspdf'

interface Chapter {
  title: string
  sections: {
    title: string
    content: string
  }[]
}

interface ExportOptions {
  title: string
  coverUrl?: string | null
  chapters: Chapter[]
}

// A5 dimensions in mm (148 x 210)
const PAGE_WIDTH = 148
const PAGE_HEIGHT = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export async function generatePDF(options: ExportOptions): Promise<Blob> {
  const { title, coverUrl, chapters } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  })

  // Set default font
  doc.setFont('times', 'normal')

  // Title page
  let yPosition = 60

  // Add cover image if available
  if (coverUrl) {
    try {
      const response = await fetch(coverUrl)
      const blob = await response.blob()
      const dataUrl = await blobToDataUrl(blob)

      // Center the cover image
      const imgWidth = 80
      const imgHeight = 120
      const imgX = (PAGE_WIDTH - imgWidth) / 2
      doc.addImage(dataUrl, 'PNG', imgX, 30, imgWidth, imgHeight)
      yPosition = 160
    } catch (err) {
      console.error('Failed to load cover image:', err)
    }
  }

  // Title
  doc.setFontSize(24)
  doc.setFont('times', 'bold')
  const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH)
  const titleHeight = titleLines.length * 10
  doc.text(titleLines, PAGE_WIDTH / 2, yPosition, { align: 'center' })

  // Chronicle branding
  doc.setFontSize(10)
  doc.setFont('times', 'italic')
  doc.setTextColor(128, 128, 128)
  doc.text('Made with Chronicle', PAGE_WIDTH / 2, PAGE_HEIGHT - 20, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  // Table of contents
  doc.addPage()
  doc.setFontSize(18)
  doc.setFont('times', 'bold')
  doc.text('Contents', MARGIN, 30)

  doc.setFontSize(12)
  doc.setFont('times', 'normal')
  yPosition = 45

  chapters.forEach((chapter, idx) => {
    const chapterNum = String(idx + 1).padStart(2, '0')
    doc.text(`${chapterNum}  ${chapter.title}`, MARGIN, yPosition)
    yPosition += 8

    if (yPosition > PAGE_HEIGHT - 30) {
      doc.addPage()
      yPosition = 30
    }
  })

  // Chapters
  for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
    const chapter = chapters[chIdx]

    // Chapter title page
    doc.addPage()
    yPosition = 60

    // Chapter number
    doc.setFontSize(12)
    doc.setFont('times', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(`Chapter ${chIdx + 1}`, PAGE_WIDTH / 2, yPosition, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    // Chapter title
    doc.setFontSize(20)
    doc.setFont('times', 'bold')
    yPosition += 12
    const chapterTitleLines = doc.splitTextToSize(chapter.title, CONTENT_WIDTH)
    doc.text(chapterTitleLines, PAGE_WIDTH / 2, yPosition, { align: 'center' })

    // Start content on next page
    doc.addPage()
    yPosition = 30

    // Sections
    for (const section of chapter.sections) {
      // Section title
      if (chapter.sections.length > 1 && section.title) {
        doc.setFontSize(14)
        doc.setFont('times', 'bold')
        const sectionTitleLines = doc.splitTextToSize(section.title, CONTENT_WIDTH)
        doc.text(sectionTitleLines, MARGIN, yPosition)
        yPosition += sectionTitleLines.length * 6 + 4
      }

      // Section content
      doc.setFontSize(11)
      doc.setFont('times', 'normal')

      // Split content into paragraphs
      const paragraphs = section.content.split(/\n\n+/)

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) continue

        const lines = doc.splitTextToSize(paragraph.trim(), CONTENT_WIDTH)

        for (const line of lines) {
          if (yPosition > PAGE_HEIGHT - 25) {
            doc.addPage()
            yPosition = 30
          }
          doc.text(line, MARGIN, yPosition)
          yPosition += 5
        }

        // Paragraph spacing
        yPosition += 3
      }

      // Section spacing
      yPosition += 5
    }
  }

  // End page
  doc.addPage()
  doc.setFontSize(16)
  doc.setFont('times', 'italic')
  doc.setTextColor(128, 128, 128)
  doc.text('— The End —', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: 'center' })

  return doc.output('blob')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
