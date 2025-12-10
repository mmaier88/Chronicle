// Citation formatting utilities

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee'

export interface SourceMetadata {
  title: string
  authors?: string[]
  year?: number
  publisher?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  url?: string
  accessDate?: string
}

export interface Citation {
  id: string
  sourceId: string
  metadata: SourceMetadata
  pageNumber?: number
  quotedText?: string
}

// Format author names according to style
function formatAuthorsAPA(authors: string[]): string {
  if (!authors || authors.length === 0) return ''

  if (authors.length === 1) {
    const parts = authors[0].split(' ')
    const lastName = parts.pop() || ''
    const initials = parts.map(n => n[0] + '.').join(' ')
    return `${lastName}, ${initials}`
  }

  if (authors.length === 2) {
    const formatted = authors.map(author => {
      const parts = author.split(' ')
      const lastName = parts.pop() || ''
      const initials = parts.map(n => n[0] + '.').join(' ')
      return `${lastName}, ${initials}`
    })
    return formatted.join(' & ')
  }

  // More than 2 authors
  const firstAuthor = authors[0].split(' ')
  const lastName = firstAuthor.pop() || ''
  const initials = firstAuthor.map(n => n[0] + '.').join(' ')
  return `${lastName}, ${initials} et al.`
}

function formatAuthorsMLA(authors: string[]): string {
  if (!authors || authors.length === 0) return ''

  if (authors.length === 1) {
    const parts = authors[0].split(' ')
    const lastName = parts.pop() || ''
    const firstName = parts.join(' ')
    return `${lastName}, ${firstName}`
  }

  if (authors.length === 2) {
    const first = authors[0].split(' ')
    const lastName1 = first.pop() || ''
    const firstName1 = first.join(' ')
    return `${lastName1}, ${firstName1}, and ${authors[1]}`
  }

  const first = authors[0].split(' ')
  const lastName1 = first.pop() || ''
  const firstName1 = first.join(' ')
  return `${lastName1}, ${firstName1}, et al.`
}

function formatAuthorsChicago(authors: string[]): string {
  if (!authors || authors.length === 0) return ''

  if (authors.length === 1) {
    const parts = authors[0].split(' ')
    const lastName = parts.pop() || ''
    const firstName = parts.join(' ')
    return `${lastName}, ${firstName}`
  }

  const first = authors[0].split(' ')
  const lastName1 = first.pop() || ''
  const firstName1 = first.join(' ')

  if (authors.length === 2) {
    return `${lastName1}, ${firstName1}, and ${authors[1]}`
  }

  if (authors.length === 3) {
    return `${lastName1}, ${firstName1}, ${authors[1]}, and ${authors[2]}`
  }

  return `${lastName1}, ${firstName1}, et al.`
}

function formatAuthorsHarvard(authors: string[]): string {
  return formatAuthorsAPA(authors) // Similar to APA
}

function formatAuthorsIEEE(authors: string[]): string {
  if (!authors || authors.length === 0) return ''

  const formatted = authors.slice(0, 3).map(author => {
    const parts = author.split(' ')
    const lastName = parts.pop() || ''
    const initials = parts.map(n => n[0] + '.').join(' ')
    return `${initials} ${lastName}`
  })

  if (authors.length > 3) {
    return formatted.join(', ') + ', et al.'
  }

  return formatted.join(', ')
}

// Format a citation in the specified style
export function formatCitation(citation: Citation, style: CitationStyle): string {
  const { metadata } = citation
  const { title, authors, year, publisher, journal, volume, issue, pages, doi, url } = metadata

  switch (style) {
    case 'apa':
      return formatAPA(metadata)
    case 'mla':
      return formatMLA(metadata)
    case 'chicago':
      return formatChicago(metadata)
    case 'harvard':
      return formatHarvard(metadata)
    case 'ieee':
      return formatIEEE(metadata)
    default:
      return formatAPA(metadata)
  }
}

function formatAPA(m: SourceMetadata): string {
  const parts: string[] = []

  if (m.authors?.length) {
    parts.push(formatAuthorsAPA(m.authors))
  }

  if (m.year) {
    parts.push(`(${m.year}).`)
  }

  if (m.title) {
    parts.push(`${m.title}.`)
  }

  if (m.journal) {
    parts.push(`*${m.journal}*`)
    if (m.volume) {
      parts.push(`, ${m.volume}`)
      if (m.issue) {
        parts.push(`(${m.issue})`)
      }
    }
    if (m.pages) {
      parts.push(`, ${m.pages}.`)
    }
  } else if (m.publisher) {
    parts.push(`${m.publisher}.`)
  }

  if (m.doi) {
    parts.push(`https://doi.org/${m.doi}`)
  } else if (m.url) {
    parts.push(m.url)
  }

  return parts.join(' ')
}

function formatMLA(m: SourceMetadata): string {
  const parts: string[] = []

  if (m.authors?.length) {
    parts.push(formatAuthorsMLA(m.authors) + '.')
  }

  if (m.title) {
    parts.push(`"${m.title}."`)
  }

  if (m.journal) {
    parts.push(`*${m.journal}*`)
    if (m.volume) {
      parts.push(`, vol. ${m.volume}`)
      if (m.issue) {
        parts.push(`, no. ${m.issue}`)
      }
    }
    if (m.year) {
      parts.push(`, ${m.year}`)
    }
    if (m.pages) {
      parts.push(`, pp. ${m.pages}.`)
    }
  } else {
    if (m.publisher) {
      parts.push(`${m.publisher}`)
    }
    if (m.year) {
      parts.push(`, ${m.year}.`)
    }
  }

  return parts.join(' ')
}

function formatChicago(m: SourceMetadata): string {
  const parts: string[] = []

  if (m.authors?.length) {
    parts.push(formatAuthorsChicago(m.authors) + '.')
  }

  if (m.title) {
    parts.push(`"${m.title}."`)
  }

  if (m.journal) {
    parts.push(`*${m.journal}*`)
    if (m.volume) {
      parts.push(` ${m.volume}`)
      if (m.issue) {
        parts.push(`, no. ${m.issue}`)
      }
    }
    if (m.year) {
      parts.push(` (${m.year})`)
    }
    if (m.pages) {
      parts.push(`: ${m.pages}.`)
    }
  } else {
    if (m.publisher) {
      parts.push(`${m.publisher}`)
    }
    if (m.year) {
      parts.push(`, ${m.year}.`)
    }
  }

  return parts.join(' ')
}

function formatHarvard(m: SourceMetadata): string {
  const parts: string[] = []

  if (m.authors?.length) {
    parts.push(formatAuthorsHarvard(m.authors))
  }

  if (m.year) {
    parts.push(`(${m.year})`)
  }

  if (m.title) {
    parts.push(`'${m.title}',`)
  }

  if (m.journal) {
    parts.push(`*${m.journal}*`)
    if (m.volume) {
      parts.push(`, ${m.volume}`)
      if (m.issue) {
        parts.push(`(${m.issue})`)
      }
    }
    if (m.pages) {
      parts.push(`, pp. ${m.pages}.`)
    }
  } else if (m.publisher) {
    parts.push(`${m.publisher}.`)
  }

  return parts.join(' ')
}

function formatIEEE(m: SourceMetadata): string {
  const parts: string[] = []

  if (m.authors?.length) {
    parts.push(formatAuthorsIEEE(m.authors) + ',')
  }

  if (m.title) {
    parts.push(`"${m.title},"`)
  }

  if (m.journal) {
    parts.push(`*${m.journal}*`)
    if (m.volume) {
      parts.push(`, vol. ${m.volume}`)
      if (m.issue) {
        parts.push(`, no. ${m.issue}`)
      }
    }
    if (m.pages) {
      parts.push(`, pp. ${m.pages}`)
    }
    if (m.year) {
      parts.push(`, ${m.year}.`)
    }
  } else {
    if (m.publisher) {
      parts.push(`${m.publisher}`)
    }
    if (m.year) {
      parts.push(`, ${m.year}.`)
    }
  }

  return parts.join(' ')
}

// Format in-text citation
export function formatInTextCitation(citation: Citation, style: CitationStyle): string {
  const { metadata, pageNumber } = citation
  const { authors, year } = metadata

  const authorStr = authors?.length
    ? authors.length > 2
      ? authors[0].split(' ').pop() + ' et al.'
      : authors.map(a => a.split(' ').pop()).join(' & ')
    : 'Unknown'

  switch (style) {
    case 'apa':
    case 'harvard':
      return pageNumber
        ? `(${authorStr}, ${year || 'n.d.'}, p. ${pageNumber})`
        : `(${authorStr}, ${year || 'n.d.'})`

    case 'mla':
      return pageNumber
        ? `(${authorStr} ${pageNumber})`
        : `(${authorStr})`

    case 'chicago':
      return pageNumber
        ? `(${authorStr} ${year || 'n.d.'}, ${pageNumber})`
        : `(${authorStr} ${year || 'n.d.'})`

    case 'ieee':
      return `[ref]` // IEEE uses numbered references

    default:
      return `(${authorStr}, ${year || 'n.d.'})`
  }
}

// Export citations as formatted text
export function exportCitations(citations: Citation[], style: CitationStyle): string {
  const header = `Bibliography (${style.toUpperCase()} Style)\n${'='.repeat(40)}\n\n`

  const formatted = citations
    .map((citation, index) => {
      const formatted = formatCitation(citation, style)
      return style === 'ieee'
        ? `[${index + 1}] ${formatted}`
        : formatted
    })
    .join('\n\n')

  return header + formatted
}

// Export citations as BibTeX
export function exportBibTeX(citations: Citation[]): string {
  return citations.map((citation, index) => {
    const { metadata } = citation
    const key = `ref${index + 1}`

    const fields: string[] = []

    if (metadata.authors?.length) {
      fields.push(`  author = {${metadata.authors.join(' and ')}}`)
    }
    if (metadata.title) {
      fields.push(`  title = {${metadata.title}}`)
    }
    if (metadata.year) {
      fields.push(`  year = {${metadata.year}}`)
    }
    if (metadata.journal) {
      fields.push(`  journal = {${metadata.journal}}`)
    }
    if (metadata.volume) {
      fields.push(`  volume = {${metadata.volume}}`)
    }
    if (metadata.issue) {
      fields.push(`  number = {${metadata.issue}}`)
    }
    if (metadata.pages) {
      fields.push(`  pages = {${metadata.pages}}`)
    }
    if (metadata.publisher) {
      fields.push(`  publisher = {${metadata.publisher}}`)
    }
    if (metadata.doi) {
      fields.push(`  doi = {${metadata.doi}}`)
    }
    if (metadata.url) {
      fields.push(`  url = {${metadata.url}}`)
    }

    const entryType = metadata.journal ? 'article' : 'book'

    return `@${entryType}{${key},\n${fields.join(',\n')}\n}`
  }).join('\n\n')
}

// Citation style display names
export const CITATION_STYLES: Record<CitationStyle, string> = {
  apa: 'APA (7th Edition)',
  mla: 'MLA (9th Edition)',
  chicago: 'Chicago (17th Edition)',
  harvard: 'Harvard',
  ieee: 'IEEE'
}
