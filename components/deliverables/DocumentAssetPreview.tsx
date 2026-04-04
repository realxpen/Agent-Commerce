"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { AlertCircle, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type DocumentAssetPreviewProps = {
  url: string
  title: string
  fileName?: string | null
  formatLabel?: string | null
  description?: string | null
  compact?: boolean
}

type TextDocumentBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; items: string[] }

function getFileExtension(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(value)
  return match?.[1]?.toLowerCase() ?? null
}

function normalizeFormatLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null
}

function looksLikeHtmlDocument(value: string) {
  return /<(html|body|article|section|p|div|h1|h2|h3|ul|ol|li|table|img)\b/i.test(value)
}

function sanitizeHtmlDocument(rawHtml: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(rawHtml, "text/html")

  document
    .querySelectorAll("script, style, iframe, object, embed, link, meta, noscript")
    .forEach((node) => node.remove())

  document.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value

      if (name.startsWith("on") || name === "style") {
        element.removeAttribute(attribute.name)
        continue
      }

      if (
        (name === "href" || name === "src") &&
        /^\s*javascript:/i.test(value)
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return document.body.innerHTML.trim()
}

function parseTextDocument(value: string): TextDocumentBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n")
  const blocks: TextDocumentBlock[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ""
    const trimmedLine = rawLine.trim()

    if (!trimmedLine) {
      index += 1
      continue
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const itemMatch = nextLine.match(/^[-*]\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "list",
        ordered: false,
        items,
      })
      continue
    }

    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const itemMatch = nextLine.match(/^\d+\.\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "list",
        ordered: true,
        items,
      })
      continue
    }

    const quoteMatch = trimmedLine.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const nextQuoteMatch = nextLine.match(/^>\s?(.*)$/)
        if (!nextQuoteMatch) {
          break
        }

        items.push(nextQuoteMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "quote",
        items,
      })
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const nextLine = lines[index] ?? ""
      const nextTrimmedLine = nextLine.trim()

      if (!nextTrimmedLine) {
        break
      }

      if (
        /^(#{1,3})\s+/.test(nextTrimmedLine) ||
        /^[-*]\s+/.test(nextTrimmedLine) ||
        /^\d+\.\s+/.test(nextTrimmedLine) ||
        /^>\s?/.test(nextTrimmedLine)
      ) {
        break
      }

      paragraphLines.push(nextTrimmedLine)
      index += 1
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    })
  }

  return blocks
}

function renderInlineText(value: string) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index))
    }

    const href = match[2] ?? match[3]
    const label = match[1] ?? href

    if (href) {
      nodes.push(
        <a
          key={`${href}-${match.index}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-4"
        >
          {label}
        </a>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : value
}

export function DocumentAssetPreview({
  url,
  title,
  fileName,
  formatLabel,
  description,
  compact = false,
}: DocumentAssetPreviewProps) {
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extension = useMemo(
    () => getFileExtension(fileName ?? url) ?? normalizeFormatLabel(formatLabel),
    [fileName, formatLabel, url],
  )

  useEffect(() => {
    let mounted = true

    if (!url) {
      setTextPreview(null)
      setHtmlPreview(null)
      setError("This document does not have a preview file attached yet.")
      setIsLoading(false)
      return
    }

    setTextPreview(null)
    setHtmlPreview(null)
    setError(null)
    setIsLoading(true)

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Document preview returned ${response.status}`)
        }

        const rawText = await response.text()
        if (!mounted) {
          return
        }

        if (extension === "docx" || looksLikeHtmlDocument(rawText)) {
          setHtmlPreview(sanitizeHtmlDocument(rawText))
          setTextPreview(null)
        } else {
          setTextPreview(rawText.trim())
          setHtmlPreview(null)
        }

        setIsLoading(false)
      })
      .catch((loadError) => {
        if (!mounted) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "This document could not be rendered inline."
        setError(message)
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [extension, url])

  const textBlocks = useMemo(
    () => (textPreview ? parseTextDocument(textPreview) : []),
    [textPreview],
  )

  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 sm:p-5">
      <div className="mx-auto overflow-hidden rounded-[22px] border border-black/10 bg-[#f6f1e8] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white/70 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Document preview
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatLabel ?? extension?.toUpperCase() ?? "Document"}
              </p>
            </div>
          </div>

          {description ? (
            <p className="max-w-md text-right text-xs leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        <div className="bg-[#e9e1d4] px-3 py-4 sm:px-5">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-[18px] border border-black/8 bg-white",
              compact ? "max-w-3xl" : "max-w-4xl",
            )}
          >
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                Rendering document...
              </div>
            ) : error ? (
              <div className="m-6 rounded-[18px] border border-rose-200 bg-rose-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
                  <div>
                    <p className="text-sm font-semibold text-rose-900">
                      Document preview unavailable
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <article
                className={cn(
                  "document-preview px-6 py-8 text-[#1f2937] sm:px-10 sm:py-12",
                  compact ? "max-h-[26rem] overflow-y-auto" : "max-h-[58vh] overflow-y-auto",
                  "[&_a]:text-indigo-700 [&_a]:underline [&_a]:decoration-indigo-300 [&_a]:underline-offset-4",
                  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:bg-slate-50 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-slate-700",
                  "[&_h1]:mt-2 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight",
                  "[&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
                  "[&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold",
                  "[&_img]:my-6 [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200",
                  "[&_li]:leading-8 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
                  "[&_p]:my-5 [&_p]:text-[15px] [&_p]:leading-8 [&_p]:text-slate-700",
                  "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden",
                  "[&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
                  "[&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left",
                  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
                )}
              >
                <header className="mb-8 border-b border-slate-200 pb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {formatLabel ?? extension?.toUpperCase() ?? "Document"}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {title}
                  </h1>
                </header>

                {htmlPreview ? (
                  <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                ) : textBlocks.length > 0 ? (
                  textBlocks.map((block, index) => {
                    if (block.type === "heading") {
                      const HeadingTag =
                        block.level === 1
                          ? "h1"
                          : block.level === 2
                            ? "h2"
                            : "h3"

                      return (
                        <HeadingTag key={`heading-${index}`}>
                          {renderInlineText(block.content)}
                        </HeadingTag>
                      )
                    }

                    if (block.type === "paragraph") {
                      return (
                        <p key={`paragraph-${index}`}>
                          {renderInlineText(block.content)}
                        </p>
                      )
                    }

                    if (block.type === "list") {
                      const ListTag = block.ordered ? "ol" : "ul"

                      return (
                        <ListTag key={`list-${index}`}>
                          {block.items.map((item, itemIndex) => (
                            <li key={`list-item-${index}-${itemIndex}`}>
                              {renderInlineText(item)}
                            </li>
                          ))}
                        </ListTag>
                      )
                    }

                    return (
                      <blockquote key={`quote-${index}`}>
                        {block.items.map((item, itemIndex) => (
                          <p key={`quote-item-${index}-${itemIndex}`}>
                            {renderInlineText(item)}
                          </p>
                        ))}
                      </blockquote>
                    )
                  })
                ) : (
                  <Fragment>
                    <p>{description ?? "This document is ready to download."}</p>
                  </Fragment>
                )}
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
