"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { BufferGeometry, Material, Mesh, Object3D, WebGLRenderer } from "three"
import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js"
import { AlertCircle, Box, Loader2, Move3D } from "lucide-react"
import { cn } from "@/lib/utils"

type ModelAssetPreviewProps = {
  url: string
  fileName?: string | null
  formatLabel?: string | null
  title: string
  compact?: boolean
}

type ModelStats = {
  meshCount: number
  vertexCount: number
  triangleCount: number
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

function supportsInlineModelPreview(extension: string | null) {
  return Boolean(extension && ["glb", "gltf", "obj", "fbx", "stl"].includes(extension))
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(Math.max(0, Math.round(value)))
}

function collectModelStats(root: Object3D) {
  const stats: ModelStats = {
    meshCount: 0,
    vertexCount: 0,
    triangleCount: 0,
  }

  root.traverse((child: Object3D) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) {
      return
    }

    const geometry = mesh.geometry as BufferGeometry
    const position = geometry.getAttribute("position")
    if (!position) {
      return
    }

    stats.meshCount += 1
    stats.vertexCount += position.count
    stats.triangleCount += geometry.index ? geometry.index.count / 3 : position.count / 3
  })

  return stats
}

export function ModelAssetPreview({
  url,
  fileName,
  formatLabel,
  title,
  compact = false,
}: ModelAssetPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ModelStats | null>(null)

  const extension = useMemo(
    () => getFileExtension(fileName ?? url) ?? normalizeFormatLabel(formatLabel),
    [fileName, formatLabel, url],
  )
  const canRenderInline = supportsInlineModelPreview(extension)

  if (!url) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-6">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-7 text-white/55">
          This 3D deliverable does not have a preview URL attached yet. Download access needs to be attached before it can be rendered inline.
        </p>
      </div>
    )
  }

  useEffect(() => {
    if (!canRenderInline || !containerRef.current) {
      setIsLoading(false)
      setStats(null)
      return
    }

    let mounted = true
    let animationFrame = 0
    let renderer: WebGLRenderer | null = null
    let controls: OrbitControlsType | null = null
    let cleanupObject: (() => void) | null = null
    let resizeObserver: ResizeObserver | null = null

    const mountNode = containerRef.current
    setIsLoading(true)
    setError(null)
    setStats(null)

    async function bootViewer() {
      try {
        const THREE = await import("three")
        const [{ OrbitControls }, assetRoot] = await Promise.all([
          import("three/examples/jsm/controls/OrbitControls.js"),
          loadModelRoot(THREE, extension, url),
        ])

        if (!mounted || !mountNode) {
          return
        }

        const scene = new THREE.Scene()
        scene.background = new THREE.Color("#050505")
        scene.fog = new THREE.Fog("#050505", 14, 48)

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
        camera.position.set(3.6, 2.4, 4.8)

        const nextRenderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        })
        nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        nextRenderer.domElement.className = "h-full w-full"
        mountNode.innerHTML = ""
        mountNode.appendChild(nextRenderer.domElement)

        const nextControls = new OrbitControls(camera, nextRenderer.domElement)
        nextControls.enableDamping = true
        nextControls.enablePan = false
        nextControls.minDistance = 1.5
        nextControls.maxDistance = 18

        renderer = nextRenderer
        controls = nextControls

        scene.add(new THREE.AmbientLight("#ffffff", 1.2))

        const keyLight = new THREE.DirectionalLight("#a78bfa", 1.6)
        keyLight.position.set(6, 7, 5)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight("#60a5fa", 1.1)
        fillLight.position.set(-5, 4, -4)
        scene.add(fillLight)

        const rimLight = new THREE.PointLight("#f8fafc", 1.4, 60)
        rimLight.position.set(0, 6, 8)
        scene.add(rimLight)

        const grid = new THREE.GridHelper(12, 12, "#2e1065", "#1f1f1f")
        grid.position.y = -1.8
        scene.add(grid)

        scene.add(assetRoot)

        const modelStats = collectModelStats(assetRoot)
        setStats(modelStats)

        const box = new THREE.Box3().setFromObject(assetRoot)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDimension = Math.max(size.x, size.y, size.z, 1)

        assetRoot.position.sub(center)
        camera.near = Math.max(maxDimension / 100, 0.1)
        camera.far = Math.max(maxDimension * 50, 100)
        camera.position.set(maxDimension * 1.5, maxDimension * 0.95, maxDimension * 1.65)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()

        const updateSize = () => {
          if (!renderer || !mountNode) {
            return
          }

          const bounds = mountNode.getBoundingClientRect()
          const width = Math.max(bounds.width, 320)
          const height = Math.max(bounds.height, compact ? 280 : 420)
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }

        resizeObserver = new ResizeObserver(updateSize)
        resizeObserver.observe(mountNode)
        updateSize()

        const animate = () => {
          if (!mounted || !renderer) {
            return
          }

          assetRoot.rotation.y += 0.0035
          controls?.update()
          renderer.render(scene, camera)
          animationFrame = window.requestAnimationFrame(animate)
        }

        animate()

        cleanupObject = () => {
          assetRoot.traverse((child: Object3D) => {
            const mesh = child as Mesh
            if (mesh.isMesh) {
              const geometry = mesh.geometry as BufferGeometry | undefined
              geometry?.dispose()

              const material = mesh.material as Material | Material[] | undefined
              if (Array.isArray(material)) {
                material.forEach((item) => item.dispose())
              } else {
                material?.dispose()
              }
            }
          })
        }

        if (mounted) {
          setIsLoading(false)
        }
      } catch (loadError) {
        if (!mounted) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "This 3D asset could not be rendered inline."
        setError(message)
        setIsLoading(false)
      }
    }

    void bootViewer()

    return () => {
      mounted = false
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
      resizeObserver?.disconnect()
      controls?.dispose()
      cleanupObject?.()
      renderer?.dispose()
      if (mountNode) {
        mountNode.innerHTML = ""
      }
    }
  }, [canRenderInline, compact, extension, url])

  if (!canRenderInline) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
            <Box className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-sm leading-7 text-white/55">
              Inline 3D preview is currently supported for `GLB`, `GLTF`, `OBJ`, `FBX`, and `STL`. This file is a real `{formatLabel ?? extension?.toUpperCase() ?? "3D"}` deliverable, but it needs to be opened in a dedicated 3D tool after download.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]",
          compact ? "h-[320px]" : "h-[min(58vh,520px)]",
        )}
      >
        <div
          ref={containerRef}
          className="absolute inset-0"
          aria-label={`${title} 3D preview`}
        />

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <div className="flex items-center gap-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading model geometry...
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-6">
            <div className="max-w-lg rounded-3xl border border-rose-500/20 bg-rose-500/8 p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-rose-200">Inline model preview failed</p>
              <p className="mt-2 text-sm leading-7 text-white/55">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 backdrop-blur">
          Drag to orbit
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Meshes</p>
          <p className="mt-2 text-base font-semibold text-white">
            {stats ? formatCount(stats.meshCount) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Vertices</p>
          <p className="mt-2 text-base font-semibold text-white">
            {stats ? formatCount(stats.vertexCount) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Triangles</p>
          <p className="mt-2 text-base font-semibold text-white">
            {stats ? formatCount(stats.triangleCount) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/40">
        <Move3D className="h-3.5 w-3.5 text-violet-300" />
        <span>Real geometry preview from the delivered file.</span>
      </div>
    </div>
  )
}

async function loadModelRoot(
  THREE: typeof import("three"),
  extension: string | null,
  url: string,
) {
  switch (extension) {
    case "glb":
    case "gltf": {
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
      const loader = new GLTFLoader()
      const gltf = await new Promise<{ scene: Object3D }>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      return gltf.scene
    }

    case "obj": {
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js")
      const loader = new OBJLoader()
      const object = await new Promise<Object3D>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      object.traverse((child: Object3D) => {
        const mesh = child as Mesh
        if (!mesh.isMesh) {
          return
        }

        mesh.material = new THREE.MeshStandardMaterial({
          color: "#c4b5fd",
          roughness: 0.58,
          metalness: 0.08,
        })
      })
      return object
    }

    case "fbx": {
      const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js")
      const loader = new FBXLoader()
      const object = await new Promise<Object3D>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      return object
    }

    case "stl": {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js")
      const loader = new STLLoader()
      const geometry = await new Promise<BufferGeometry>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      geometry.computeVertexNormals()
      return new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: "#ddd6fe",
          roughness: 0.42,
          metalness: 0.12,
        }),
      )
    }

    default:
      throw new Error("This 3D format is not yet supported for inline rendering.")
  }
}
