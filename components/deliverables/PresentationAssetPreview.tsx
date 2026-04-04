"use client"

import { useEffect, useMemo, useState } from "react"
import JSZip from "jszip"
import { AlertCircle, ChevronLeft, ChevronRight, FileStack, Loader2, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"

type PresentationAssetPreviewProps = {
  url: string
  fileName?: string | null
  formatLabel?: string | null
  title: string
  compact?: boolean
}

type PresentationSlide = {
  title: string
  lines: string[]
}

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

function extractSlideNumber(path: string) {
  const match = /slide(\d+)\.xml$/i.exec(path)
  return match ? Number.parseInt(match[1], 10) : 0
}

function parsePptxSlide(xmlText: string) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, "application/xml")
  const paragraphNodes = Array.from(xml.getElementsByTagNameNS("*", "p"))

  const lines = paragraphNodes
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)

  return {
    title: lines[0] ?? "Untitled slide",
    lines: lines.slice(1),
  }
}

export function PresentationAssetPreview({
  url,
  fileName,
  formatLabel,
  title,
  compact = false,
}: PresentationAssetPreviewProps) {
  const [slides, setSlides] = useState<PresentationSlide[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extension = useMemo(
    () => getFileExtension(fileName ?? url) ?? normalizeFormatLabel(formatLabel),
    [fileName, formatLabel, url],
  )
  const isPptx = extension === "pptx"

  if (!url) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-6">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-7 text-white/55">
          This presentation does not have a preview file attached yet, so there is no live deck content to extract inline.
        </p>
      </div>
    )
  }

  useEffect(() => {
    if (!isPptx) {
      setSlides([])
      setActiveIndex(0)
      setIsLoading(false)
      setError(null)
      return
    }

    let mounted = true
    setIsLoading(true)
    setError(null)
    setSlides([])
    setActiveIndex(0)

    async function loadSlides() {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Deck returned ${response.status}`)
        }

        const buffer = await response.arrayBuffer()
        const archive = await JSZip.loadAsync(buffer)
        const slideEntries = Object.keys(archive.files)
          .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
          .sort((left, right) => extractSlideNumber(left) - extractSlideNumber(right))

        if (slideEntries.length === 0) {
          throw new Error("No slides were found inside this deck.")
        }

        const parsedSlides = await Promise.all(
          slideEntries.map(async (path) => {
            const xmlText = await archive.file(path)?.async("string")
            if (!xmlText) {
              return {
                title: "Untitled slide",
                lines: [],
              }
            }

            return parsePptxSlide(xmlText)
          }),
        )

        if (!mounted) {
          return
        }

        setSlides(parsedSlides)
        setIsLoading(false)
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "This deck could not be rendered inline."
        setError(message)
        setIsLoading(false)
      }
    }

    void loadSlides()

    return () => {
      mounted = false
    }
  }, [isPptx, url])

  const slide = slides[activeIndex] ?? null

  if (!isPptx) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300">
            <Presentation className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-sm leading-7 text-white/55">
              Inline deck rendering is currently available for `PPTX` files. This is a real `{formatLabel ?? extension?.toUpperCase() ?? "presentation"}` deliverable, but it needs to be downloaded for full viewing in the original app.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.14),rgba(255,255,255,0.02))] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300">
              <Presentation className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                Real slide extraction
              </p>
              <p className="mt-1 text-sm text-white/55">
                {slides.length > 0 ? `${slides.length} slide${slides.length === 1 ? "" : "s"} found in this deck.` : "Reading deck structure..."}
              </p>
            </div>
          </div>

          {slides.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-white/10 bg-white/5"
                onClick={() => setActiveIndex((current) => (current + slides.length - 1) % slides.length)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-white/10 bg-white/5"
                onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-white">
          <div
            className="flex flex-col justify-between px-6 py-7 text-slate-900"
            style={{ minHeight: compact ? 260 : 420 }}
          >
            {isLoading ? (
              <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                Parsing real slide content...
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="max-w-md rounded-3xl border border-rose-200 bg-rose-50 p-5 text-center">
                  <AlertCircle className="mx-auto h-5 w-5 text-rose-500" />
                  <p className="mt-3 text-sm font-semibold text-rose-900">Inline deck preview failed</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{error}</p>
                </div>
              </div>
            ) : slide ? (
              <>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Slide {activeIndex + 1} of {slides.length}
                  </p>
                  <h3 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                    {slide.title}
                  </h3>
                  <div className="mt-6 space-y-3">
                    {(slide.lines.length > 0 ? slide.lines : ["This slide does not contain extractable text."]).slice(
                      0,
                      compact ? 4 : 8,
                    ).map((line, index) => (
                      <div key={`${line}-${index}`} className="flex items-start gap-3 text-slate-700">
                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                        <p className="text-sm leading-7">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <span>Extracted from the delivered deck file.</span>
                  <span className="inline-flex items-center gap-2">
                    <FileStack className="h-3.5 w-3.5" />
                    PPTX
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-500">
                No slides were extracted from this deck.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
