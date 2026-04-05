import { SkeletonBlock } from "@/components/states"

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <main className="container mx-auto flex gap-8 px-4 pt-24 sm:px-6">
        <aside className="hidden w-64 shrink-0 space-y-6 lg:block">
          <SkeletonBlock className="h-72 rounded-3xl" />
          <SkeletonBlock className="h-52 rounded-3xl" />
        </aside>

        <div className="w-full max-w-3xl flex-1 space-y-6">
          <SkeletonBlock className="h-60 rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonBlock className="h-72 rounded-3xl" />
            <SkeletonBlock className="h-72 rounded-3xl" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-[420px] rounded-3xl" />
            <SkeletonBlock className="h-[420px] rounded-3xl" />
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 space-y-6 xl:block">
          <SkeletonBlock className="h-80 rounded-3xl" />
          <SkeletonBlock className="h-72 rounded-3xl" />
          <SkeletonBlock className="h-72 rounded-3xl" />
        </aside>
      </main>
    </div>
  )
}
