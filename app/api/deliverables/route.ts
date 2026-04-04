import { NextRequest, NextResponse } from "next/server"
import {
  Document as WordDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import { PDFDocument, StandardFonts } from "pdf-lib"
import * as XLSX from "xlsx"
import { getPublicEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getAllowedOrigins() {
  const env = getPublicEnv()
  const origins = new Set<string>()
  const configuredOrigin = normalizeOrigin(env.apiBaseUrl)

  if (configuredOrigin) {
    origins.add(configuredOrigin)
  }

  origins.add("http://127.0.0.1:4000")
  origins.add("http://localhost:4000")

  return origins
}

function sanitizeFileName(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()

  return normalized.length > 0 ? normalized.slice(0, 180) : null
}

function inferExtension(input: {
  fileName?: string | null
  rawUrl?: string | null
  format?: string | null
}) {
  const source = input.fileName ?? input.rawUrl ?? ""
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(source)
  if (match?.[1]) {
    return match[1].toLowerCase()
  }

  return input.format?.trim().toLowerCase() ?? null
}

function isArtifactUrl(url: URL) {
  return /\/artifacts\/[^/]+$/i.test(url.pathname)
}

type ArtifactMetadata = {
  fileName: string
  contentType: string
  title?: string | null
}

type RequestedExportFormat = "source" | "html" | "docx" | "pdf" | "xlsx"
type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; items: string[] }
  | { type: "code"; language: string | null; content: string }
  | { type: "table"; header: string[]; rows: string[][] }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderInlineMarkdown(value: string) {
  let output = escapeHtml(value)

  output = output.replace(/`([^`]+)`/g, (_match, code) => `<code>${escapeHtml(code)}</code>`)
  output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, href) => {
    const safeHref = escapeHtml(href)
    return `<a href="${safeHref}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
  })
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>")

  return output
}

function isMarkdownTableDivider(value: string) {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(value.trim())
}

function splitMarkdownTableRow(value: string) {
  return value
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

function stripInternalBundleSections(value: string) {
  const blockedHeadings = new Set([
    "downloadable artifacts",
    "tool runner notes",
    "customer message",
    "follow-up questions",
  ])
  const lines = value.replace(/\r\n?/g, "\n").split("\n")
  const sanitized: string[] = []
  let skipping = false

  for (const line of lines) {
    const headingMatch = line.trim().match(/^##\s+(.+)$/)
    if (headingMatch) {
      const heading = headingMatch[1].trim().toLowerCase()
      skipping = blockedHeadings.has(heading)
      if (skipping) {
        continue
      }
    }

    if (skipping) {
      continue
    }

    sanitized.push(line)
  }

  return sanitized
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ""
    const trimmedLine = rawLine.trim()

    if (!trimmedLine) {
      index += 1
      continue
    }

    if (trimmedLine.startsWith("```")) {
      const language = trimmedLine.slice(3).trim() || null
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "")
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({
        type: "code",
        language,
        content: codeLines.join("\n").trimEnd(),
      })
      continue
    }

    const nextLine = (lines[index + 1] ?? "").trim()
    if (trimmedLine.includes("|") && isMarkdownTableDivider(nextLine)) {
      const header = splitMarkdownTableRow(trimmedLine)
      const rows: string[][] = []
      index += 2

      while (index < lines.length) {
        const candidate = (lines[index] ?? "").trim()
        if (!candidate || !candidate.includes("|")) {
          break
        }

        rows.push(splitMarkdownTableRow(candidate))
        index += 1
      }

      blocks.push({
        type: "table",
        header,
        rows,
      })
      continue
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const candidate = (lines[index] ?? "").trim()
        const itemMatch = candidate.match(/^[-*]\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({ type: "list", ordered: false, items })
      continue
    }

    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const candidate = (lines[index] ?? "").trim()
        const itemMatch = candidate.match(/^\d+\.\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({ type: "list", ordered: true, items })
      continue
    }

    const quoteMatch = trimmedLine.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const candidate = (lines[index] ?? "").trim()
        const itemMatch = candidate.match(/^>\s?(.*)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({ type: "quote", items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const candidate = (lines[index] ?? "").trim()
      if (
        !candidate ||
        candidate.startsWith("```") ||
        /^(#{1,3})\s+/.test(candidate) ||
        /^[-*]\s+/.test(candidate) ||
        /^\d+\.\s+/.test(candidate) ||
        /^>\s?/.test(candidate) ||
        (candidate.includes("|") && isMarkdownTableDivider((lines[index + 1] ?? "").trim()))
      ) {
        break
      }

      paragraphLines.push(candidate)
      index += 1
    }

    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") })
  }

  return blocks
}

function stripMarkdownSyntax(value: string) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[_~]/g, "")
    .trim()
}

function renderMarkdownToHtml(markdown: string) {
  return parseMarkdownBlocks(markdown)
    .map((block) => {
      if (block.type === "heading") {
        const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3"
        return `<${tag}>${renderInlineMarkdown(block.content)}</${tag}>`
      }

      if (block.type === "paragraph") {
        return `<p>${renderInlineMarkdown(block.content)}</p>`
      }

      if (block.type === "list") {
        const tag = block.ordered ? "ol" : "ul"
        return `<${tag}>${block.items
          .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
          .join("")}</${tag}>`
      }

      if (block.type === "quote") {
        return `<blockquote>${block.items
          .map((item) => `<p>${renderInlineMarkdown(item)}</p>`)
          .join("")}</blockquote>`
      }

      if (block.type === "code") {
        const language = block.language ? escapeHtml(block.language) : ""
        return `<section class="code-block">${
          language ? `<div class="code-label">${language}</div>` : ""
        }<pre><code>${escapeHtml(block.content)}</code></pre></section>`
      }

      return `<div class="table-wrap"><table><thead><tr>${block.header
        .map((cell, cellIndex) => `<th>${renderInlineMarkdown(cell || `Column ${cellIndex + 1}`)}</th>`)
        .join("")}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${block.header
              .map((_, cellIndex) => `<td>${renderInlineMarkdown(row[cellIndex] || "")}</td>`)
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></div>`
    })
    .join("\n")
}

function buildRenderedDocumentHtml(input: {
  title: string
  bodyHtml: string
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #e9e1d4;
        color: #1f2937;
        font-family: "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.7;
      }
      main {
        padding: 28px 20px 40px;
      }
      article {
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.14);
        overflow: hidden;
      }
      header {
        padding: 20px 28px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.7);
      }
      .eyebrow {
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      .title {
        margin: 12px 0 0;
        font-size: 32px;
        line-height: 1.2;
        font-weight: 700;
        color: #0f172a;
      }
      .content {
        padding: 28px 32px 36px;
      }
      h1, h2, h3 { color: #0f172a; line-height: 1.25; margin: 1.6em 0 0.6em; }
      h1 { font-size: 2.25rem; margin-top: 0.2em; }
      h2 { font-size: 1.7rem; }
      h3 { font-size: 1.3rem; }
      p { margin: 1em 0; font-size: 15px; }
      ul, ol { margin: 1.2em 0; padding-left: 1.5rem; }
      li { margin: 0.45em 0; }
      a { color: #4338ca; text-decoration: underline; text-underline-offset: 4px; }
      code {
        background: rgba(15, 23, 42, 0.06);
        border-radius: 6px;
        padding: 0.14rem 0.4rem;
        font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
        font-size: 0.92em;
      }
      .code-block {
        margin: 1.5em 0;
        overflow: hidden;
        border-radius: 18px;
        background: #0f172a;
        color: #e2e8f0;
      }
      .code-label {
        padding: 10px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255,255,255,0.62);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }
      pre {
        margin: 0;
        padding: 18px 16px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      pre code {
        background: transparent;
        padding: 0;
        color: inherit;
      }
      blockquote {
        margin: 1.5em 0;
        padding: 14px 18px;
        border-left: 4px solid #94a3b8;
        background: #f8fafc;
      }
      .table-wrap {
        margin: 1.5em 0;
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f8fafc;
        font-weight: 600;
      }
      @media (max-width: 640px) {
        header { padding: 18px 20px; }
        .content { padding: 22px 20px 28px; }
        .title { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <main>
      <article>
        <header>
          <div class="eyebrow">Document Export</div>
          <h1 class="title">${escapeHtml(input.title)}</h1>
        </header>
        <div class="content">${input.bodyHtml}</div>
      </article>
    </main>
  </body>
</html>`
}

function extractDocumentTitle(input: {
  resolvedFileName: string | null
  artifactMetadata: ArtifactMetadata | null
}) {
  return (
    input.artifactMetadata?.title ??
    input.resolvedFileName?.replace(/\.[a-z0-9]+$/i, "") ??
    "Document export"
  )
}

function isDocumentLike(input: {
  resolvedExtension: string | null
  artifactMetadata: ArtifactMetadata | null
}) {
  const contentType = input.artifactMetadata?.contentType?.toLowerCase() ?? ""

  return (
    ["md", "markdown", "txt", "html", "htm"].includes(input.resolvedExtension ?? "") ||
    contentType === "text/markdown" ||
    contentType === "text/plain" ||
    contentType === "text/html"
  )
}

function isSpreadsheetLike(input: {
  resolvedExtension: string | null
  artifactMetadata: ArtifactMetadata | null
}) {
  const contentType = input.artifactMetadata?.contentType?.toLowerCase() ?? ""

  return (
    ["csv", "json"].includes(input.resolvedExtension ?? "") ||
    contentType === "text/csv" ||
    contentType === "application/json"
  )
}

function isCodeLike(input: {
  resolvedExtension: string | null
  artifactMetadata: ArtifactMetadata | null
}) {
  const contentType = input.artifactMetadata?.contentType?.toLowerCase() ?? ""

  return (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "go",
      "java",
      "rs",
      "sol",
      "move",
      "sh",
      "bash",
      "css",
      "scss",
      "sql",
      "yaml",
      "yml",
      "toml",
    ].includes(input.resolvedExtension ?? "") ||
    contentType.startsWith("text/") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript") ||
    contentType.includes("json")
  )
}

function isPdfConvertibleImage(input: {
  resolvedExtension: string | null
  artifactMetadata: ArtifactMetadata | null
  contentType: string | null
}) {
  const contentType = input.contentType?.toLowerCase() ?? input.artifactMetadata?.contentType?.toLowerCase() ?? ""

  return (
    ["png", "jpg", "jpeg"].includes(input.resolvedExtension ?? "") ||
    contentType === "image/png" ||
    contentType === "image/jpeg"
  )
}

function resolveRequestedExportFormat(input: {
  requested: string | null
  mode: "preview" | "download"
  resolvedExtension: string | null
  artifactMetadata: ArtifactMetadata | null
}): RequestedExportFormat {
  const requested = input.requested?.toLowerCase()
  if (requested === "source" || requested === "html" || requested === "docx" || requested === "pdf" || requested === "xlsx") {
    return requested
  }

  if (input.mode !== "download") {
    return "source"
  }

  if (isDocumentLike(input)) {
    return "docx"
  }

  if (isSpreadsheetLike(input)) {
    return "xlsx"
  }

  if (isCodeLike(input)) {
    return "pdf"
  }

  return "source"
}

function markdownBlocksToDocxChildren(markdown: string) {
  const children: Array<Paragraph | Table> = []

  for (const block of parseMarkdownBlocks(markdown)) {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          text: stripMarkdownSyntax(block.content),
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
        }),
      )
      continue
    }

    if (block.type === "paragraph") {
      children.push(new Paragraph({ text: stripMarkdownSyntax(block.content) }))
      continue
    }

    if (block.type === "list") {
      block.items.forEach((item, itemIndex) => {
        children.push(
          new Paragraph({
            text: block.ordered
              ? `${itemIndex + 1}. ${stripMarkdownSyntax(item)}`
              : `• ${stripMarkdownSyntax(item)}`,
          }),
        )
      })
      continue
    }

    if (block.type === "quote") {
      block.items.forEach((item) => {
        children.push(
          new Paragraph({
            text: stripMarkdownSyntax(item),
            indent: { left: 420 },
          }),
        )
      })
      continue
    }

    if (block.type === "code") {
      if (block.language) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.language.toUpperCase(),
                bold: true,
              }),
            ],
          }),
        )
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.content,
              font: "Courier New",
            }),
          ],
        }),
      )
      continue
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: block.header.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ text: stripMarkdownSyntax(cell) })],
                }),
            ),
          }),
          ...block.rows.map(
            (row) =>
              new TableRow({
                children: block.header.map(
                  (_, cellIndex) =>
                    new TableCell({
                      children: [new Paragraph({ text: stripMarkdownSyntax(row[cellIndex] || "") })],
                    }),
                ),
              }),
          ),
        ],
      }),
    )
  }

  return children
}

async function buildDocxExportBuffer(input: {
  title: string
  rawText: string
}) {
  const document = new WordDocument({
    sections: [
      {
        children: [
          new Paragraph({
            text: input.title,
            heading: HeadingLevel.TITLE,
          }),
          ...markdownBlocksToDocxChildren(input.rawText),
        ],
      },
    ],
  })

  return Packer.toBuffer(document)
}

function wrapPdfLine(input: {
  text: string
  maxWidth: number
  fontSize: number
}) {
  const words = input.text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  const averageCharWidth = input.fontSize * 0.52
  const maxChars = Math.max(20, Math.floor(input.maxWidth / averageCharWidth))

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines.length > 0 ? lines : [""]
}

async function buildPdfExportBytes(input: {
  title: string
  rawText: string
}) {
  const pdf = await PDFDocument.create()
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page = pdf.addPage([595.28, 841.89])
  const margin = 48
  const maxWidth = page.getWidth() - margin * 2
  let cursorY = page.getHeight() - margin

  const ensureSpace = (height: number) => {
    if (cursorY - height < margin) {
      page = pdf.addPage([595.28, 841.89])
      cursorY = page.getHeight() - margin
    }
  }

  const drawLine = (text: string, options?: { fontSize?: number; bold?: boolean }) => {
    const fontSize = options?.fontSize ?? 11
    const font = options?.bold ? boldFont : regularFont
    const lines = wrapPdfLine({
      text,
      maxWidth,
      fontSize,
    })

    for (const line of lines) {
      ensureSpace(fontSize + 8)
      page.drawText(line, {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
      })
      cursorY -= fontSize + 6
    }
  }

  drawLine(input.title, { fontSize: 20, bold: true })
  cursorY -= 6

  for (const block of parseMarkdownBlocks(input.rawText)) {
    if (block.type === "heading") {
      cursorY -= 6
      drawLine(stripMarkdownSyntax(block.content), {
        fontSize: block.level === 1 ? 18 : block.level === 2 ? 15 : 13,
        bold: true,
      })
      cursorY -= 2
      continue
    }

    if (block.type === "paragraph") {
      drawLine(stripMarkdownSyntax(block.content))
      cursorY -= 4
      continue
    }

    if (block.type === "list") {
      block.items.forEach((item, itemIndex) => {
        drawLine(
          block.ordered
            ? `${itemIndex + 1}. ${stripMarkdownSyntax(item)}`
            : `• ${stripMarkdownSyntax(item)}`,
        )
      })
      cursorY -= 4
      continue
    }

    if (block.type === "quote") {
      block.items.forEach((item) => {
        drawLine(`> ${stripMarkdownSyntax(item)}`)
      })
      cursorY -= 4
      continue
    }

    if (block.type === "code") {
      drawLine(block.language ? `[${block.language}]` : "[code]", { bold: true })
      block.content.split("\n").forEach((line) => {
        drawLine(line, { fontSize: 10 })
      })
      cursorY -= 4
      continue
    }

    drawLine(block.header.map(stripMarkdownSyntax).join(" | "), { bold: true })
    block.rows.forEach((row) => {
      drawLine(row.map((cell) => stripMarkdownSyntax(cell)).join(" | "))
    })
    cursorY -= 4
  }

  return pdf.save()
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function createWorkbookFromText(input: {
  rawText: string
  resolvedExtension: string | null
  title: string
}) {
  const workbook = XLSX.utils.book_new()
  const extension = input.resolvedExtension ?? ""

  if (extension === "csv") {
    const csvWorkbook = XLSX.read(input.rawText, { type: "string" })
    if (csvWorkbook.SheetNames.length > 0) {
      csvWorkbook.SheetNames.forEach((sheetName) => {
        XLSX.utils.book_append_sheet(workbook, csvWorkbook.Sheets[sheetName], sheetName)
      })
      return workbook
    }
  }

  if (extension === "json") {
    try {
      const parsed = JSON.parse(input.rawText)

      if (Array.isArray(parsed) && parsed.every((value) => value && typeof value === "object")) {
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(parsed as Record<string, unknown>[]),
          "Data",
        )
        return workbook
      }

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const rows = Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
          key,
          value:
            value && typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? ""),
        }))
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Data")
        return workbook
      }
    } catch {
      // fall through to raw sheet
    }
  }

  const rows = input.rawText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => [line])

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Export"], ...rows]),
    input.title.slice(0, 31) || "Data",
  )
  return workbook
}

function isAllowedTarget(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false
    }

    return getAllowedOrigins().has(parsed.origin)
  } catch {
    return false
  }
}

async function fetchArtifactMetadata(rawUrl: string) {
  const metadataUrl = new URL(rawUrl)
  metadataUrl.searchParams.set("meta", "1")

  const response = await fetch(metadataUrl.toString(), {
    cache: "no-store",
    redirect: "follow",
  })

  if (!response.ok) {
    throw new Error(`Metadata lookup returned ${response.status}`)
  }

  return (await response.json()) as ArtifactMetadata
}

function buildUpstreamUrl(input: {
  rawUrl: string
  mode: "preview" | "download"
  fileName?: string | null
  format?: string | null
  resolvedExtension?: string | null
}) {
  const upstream = new URL(input.rawUrl)
  const extension =
    input.resolvedExtension ??
    inferExtension({
      fileName: input.fileName,
      rawUrl: input.rawUrl,
      format: input.format,
    })

  if (isArtifactUrl(upstream)) {
    if (input.mode === "download") {
      upstream.searchParams.set("download", "1")
    }

    if (input.mode === "preview" && extension === "docx") {
      upstream.searchParams.set("preview", "html")
    }
  }

  return upstream.toString()
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")
  const preferMetadata = request.nextUrl.searchParams.get("meta") === "1"
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "preview"
  const requestedExport = request.nextUrl.searchParams.get("export")
  const fileName = sanitizeFileName(request.nextUrl.searchParams.get("fileName"))
  const format = request.nextUrl.searchParams.get("format")

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing deliverable URL." },
      { status: 400 },
    )
  }

  if (!isAllowedTarget(rawUrl)) {
    return NextResponse.json(
      { error: "This deliverable source is not allowed through the file proxy." },
      { status: 403 },
    )
  }

  let artifactMetadata: ArtifactMetadata | null = null
  let resolvedFileName = fileName
  let resolvedExtension = inferExtension({
    fileName,
    rawUrl,
    format,
  })

  try {
    const parsed = new URL(rawUrl)
    if (isArtifactUrl(parsed)) {
      artifactMetadata = await fetchArtifactMetadata(rawUrl)
      resolvedFileName = resolvedFileName ?? sanitizeFileName(artifactMetadata.fileName)
      resolvedExtension =
        resolvedExtension ??
        inferExtension({
          fileName: artifactMetadata.fileName,
          rawUrl,
          format: artifactMetadata.contentType,
        })
    }
  } catch {
    artifactMetadata = null
  }
  const exportFormat = resolveRequestedExportFormat({
    requested: requestedExport,
    mode,
    resolvedExtension,
    artifactMetadata,
  })

  if (preferMetadata) {
    if (!artifactMetadata) {
      return NextResponse.json(
        { error: "Deliverable metadata is unavailable for this asset." },
        { status: 404 },
      )
    }

    return NextResponse.json(artifactMetadata, {
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  const upstreamUrl = buildUpstreamUrl({
    rawUrl,
    mode,
    fileName: resolvedFileName,
    format,
    resolvedExtension,
  })

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      redirect: "follow",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Deliverable proxy request failed.",
        upstreamUrl,
        details: error instanceof Error ? error.message : "Unknown fetch error",
      },
      { status: 502 },
    )
  }
  const upstreamContentType = upstreamResponse.headers.get("content-type")?.toLowerCase() ?? null

  if (mode === "download" && exportFormat !== "source") {
    const documentTitle = extractDocumentTitle({
      resolvedFileName,
      artifactMetadata,
    })

    if (
      exportFormat === "pdf" &&
      isPdfConvertibleImage({
        resolvedExtension,
        artifactMetadata,
        contentType: upstreamContentType,
      })
    ) {
      const imageBytes = new Uint8Array(await upstreamResponse.arrayBuffer())
      const pdf = await PDFDocument.create()
      const image =
        (resolvedExtension === "png" || upstreamContentType === "image/png")
          ? await pdf.embedPng(imageBytes)
          : await pdf.embedJpg(imageBytes)
      const page = pdf.addPage([595.28, 841.89])
      const maxWidth = page.getWidth() - 64
      const maxHeight = page.getHeight() - 64
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
      const width = image.width * scale
      const height = image.height * scale
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      })

      const pdfBytes = await pdf.save()
      const pdfArrayBuffer = new ArrayBuffer(pdfBytes.length)
      new Uint8Array(pdfArrayBuffer).set(pdfBytes)
      const pdfFileName = (
        resolvedFileName?.replace(/\.[a-z0-9]+$/i, ".pdf") ?? "deliverable.pdf"
      ).replace(/"/g, "")

      return new NextResponse(new Blob([pdfArrayBuffer]), {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${pdfFileName}"`,
        },
      })
    }

    const rawText = await upstreamResponse.text()
    const sanitizedText = stripInternalBundleSections(rawText)

    if (exportFormat === "html") {
      const renderedHtml = buildRenderedDocumentHtml({
        title: documentTitle,
        bodyHtml: renderMarkdownToHtml(sanitizedText),
      })
      const htmlFileName = (
        resolvedFileName?.replace(/\.[a-z0-9]+$/i, ".html") ?? "deliverable.html"
      ).replace(/"/g, "")

      return new NextResponse(renderedHtml, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "text/html; charset=utf-8",
          "content-disposition": `attachment; filename="${htmlFileName}"`,
        },
      })
    }

    if (exportFormat === "docx") {
      const docxBuffer = await buildDocxExportBuffer({
        title: documentTitle,
        rawText:
          artifactMetadata?.contentType?.toLowerCase() === "text/html"
            ? stripHtmlTags(rawText)
            : sanitizedText,
      })
      const docxArrayBuffer = new ArrayBuffer(docxBuffer.length)
      new Uint8Array(docxArrayBuffer).set(docxBuffer)
      const docxFileName = (
        resolvedFileName?.replace(/\.[a-z0-9]+$/i, ".docx") ?? "deliverable.docx"
      ).replace(/"/g, "")

      return new NextResponse(new Blob([docxArrayBuffer]), {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "content-disposition": `attachment; filename="${docxFileName}"`,
        },
      })
    }

    if (exportFormat === "pdf") {
      const pdfBytes = await buildPdfExportBytes({
        title: documentTitle,
        rawText:
          artifactMetadata?.contentType?.toLowerCase() === "text/html"
            ? stripHtmlTags(rawText)
            : sanitizedText,
      })
      const pdfArrayBuffer = new ArrayBuffer(pdfBytes.length)
      new Uint8Array(pdfArrayBuffer).set(pdfBytes)
      const pdfFileName = (
        resolvedFileName?.replace(/\.[a-z0-9]+$/i, ".pdf") ?? "deliverable.pdf"
      ).replace(/"/g, "")

      return new NextResponse(new Blob([pdfArrayBuffer]), {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${pdfFileName}"`,
        },
      })
    }

    if (exportFormat === "xlsx") {
      const workbook = createWorkbookFromText({
        rawText: sanitizedText,
        resolvedExtension,
        title: documentTitle,
      })
      const xlsxBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      })
      const xlsxArrayBuffer = new ArrayBuffer(xlsxBuffer.length)
      new Uint8Array(xlsxArrayBuffer).set(xlsxBuffer)
      const xlsxFileName = (
        resolvedFileName?.replace(/\.[a-z0-9]+$/i, ".xlsx") ?? "deliverable.xlsx"
      ).replace(/"/g, "")

      return new NextResponse(new Blob([xlsxArrayBuffer]), {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${xlsxFileName}"`,
        },
      })
    }
  }

  const responseHeaders = new Headers(upstreamResponse.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")
  responseHeaders.delete("content-security-policy")
  responseHeaders.delete("x-frame-options")
  responseHeaders.set("cache-control", "no-store")

  if (mode === "download") {
    const finalFileName =
      resolvedFileName ??
      artifactMetadata?.fileName ??
      sanitizeFileName(rawUrl.split("/").pop()?.split("?")[0]) ??
      "deliverable.bin"
    responseHeaders.set(
      "content-disposition",
      `attachment; filename="${finalFileName.replace(/"/g, "")}"`,
    )
  } else if (!responseHeaders.has("content-disposition")) {
    const inlineFileName =
      resolvedFileName ??
      artifactMetadata?.fileName ??
      sanitizeFileName(rawUrl.split("/").pop()?.split("?")[0]) ??
      "deliverable.bin"
    responseHeaders.set(
      "content-disposition",
      `inline; filename="${inlineFileName.replace(/"/g, "")}"`,
    )
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}
