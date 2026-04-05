import { SkeletonBlock } from "@/components/states"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-28 rounded-3xl" />
        <SkeletonBlock className="h-28 rounded-3xl" />
        <SkeletonBlock className="h-28 rounded-3xl" />
      </div>
      <SkeletonBlock className="h-64 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-72 rounded-3xl" />
        <SkeletonBlock className="h-72 rounded-3xl" />
      </div>
    </div>
  )
}
