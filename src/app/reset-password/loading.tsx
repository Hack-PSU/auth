import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ResetPasswordSkeletonProps {
  variant?: "verifying" | "form" | "success" | "error";
}

export default function ResetPasswordSkeleton({
  variant = "verifying",
}: ResetPasswordSkeletonProps) {
  if (variant === "verifying") {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Skeleton className="w-20 h-20 rounded-full" />
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === "success" || variant === "error") {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Skeleton className="w-20 h-20 rounded-full" />
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 mx-auto" />
              <Skeleton className="h-5 w-72 mx-auto" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form variant (default)
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Skeleton className="w-20 h-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* New Password Field Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            {/* Confirm Password Field Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            {/* Buttons Skeleton */}
            <div className="space-y-3 pt-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
