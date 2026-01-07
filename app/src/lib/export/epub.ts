import epub from 'epub-gen-memory/bundle'

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

export async function generateEPUB(options: ExportOptions): Promise<Blob> {
  const { title, coverUrl, chapters } = options

  // Build content for each chapter
  const content = chapters.map((chapter, idx) => {
    // Build HTML for sections
    const sectionsHtml = chapter.sections
      .map((section) => {
        const sectionTitle =
          chapter.sections.length > 1 && section.title
            ? `<h2>${escapeHtml(section.title)}</h2>`
            : ''

        const paragraphs = section.content
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
          .join('\n')

        return `${sectionTitle}\n${paragraphs}`
      })
      .join('\n<hr/>\n')

    return {
      title: chapter.title,
      content: `<h1>Chapter ${idx + 1}: ${escapeHtml(chapter.title)}</h1>\n${sectionsHtml}`,
    }
  })

  // Generate EPUB using the function: epub(options, content)
  const epubOptions = {
    title,
    author: 'Chronicle',
    publisher: 'Chronicle',
    cover: coverUrl || undefined,
    css: `
      body {
        font-family: Georgia, serif;
        line-height: 1.6;
        max-width: 32em;
        margin: 0 auto;
        padding: 1em;
      }
      h1 {
        font-size: 1.5em;
        margin-bottom: 1em;
        text-align: center;
      }
      h2 {
        font-size: 1.2em;
        margin-top: 2em;
        margin-bottom: 0.5em;
      }
      p {
        text-indent: 1.5em;
        margin: 0.5em 0;
      }
      p:first-of-type {
        text-indent: 0;
      }
      hr {
        border: none;
        border-top: 1px solid #ccc;
        margin: 2em 0;
      }
    `,
  }

  return epub(epubOptions, content)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
