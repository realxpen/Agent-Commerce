"use client"

import { useCallback, useState } from "react"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import type {
  OrderReference,
  OrderReferenceType,
  UploadedReferenceFileDto,
} from "@/lib/api/types"

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error(`Unable to read ${file.name}`))
        return
      }

      resolve(result)
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error(`Unable to read ${file.name}`))
    }

    reader.readAsDataURL(file)
  })
}

function toReferenceType(upload: UploadedReferenceFileDto): OrderReferenceType {
  if (
    upload.referenceType === "image" ||
    upload.referenceType === "video" ||
    upload.referenceType === "audio"
  ) {
    return upload.referenceType
  }

  return "document"
}

function toReference(upload: UploadedReferenceFileDto): OrderReference {
  return {
    type: toReferenceType(upload),
    label: upload.fileName,
    url: upload.url,
    note: null,
    source: "upload",
    uploadId: upload.uploadId,
    fileName: upload.fileName,
    contentType: upload.contentType,
    sizeBytes: upload.sizeBytes,
    previewText: upload.previewText,
  }
}

export function useOrderReferenceUploads() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return [] as OrderReference[]
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file)
          const dataBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] ?? "" : dataUrl

          const response = await agentCommerceApi.uploadReferenceFile({
            fileName: file.name,
            contentType: file.type || null,
            dataBase64,
          })

          return toReference(response.data)
        }),
      )

      return uploads
    } catch (error) {
      const message = getApiErrorMessage(error)
      setUploadError(message)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [])

  const clearUploadError = useCallback(() => {
    setUploadError(null)
  }, [])

  return {
    isUploading,
    uploadError,
    uploadFiles,
    clearUploadError,
  }
}
