import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginSkeleton() {
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo and Header Skeleton */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Skeleton className="w-20 h-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-5 w-56 mx-auto" />
        </div>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Email Field Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            {/* Password Field Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            {/* Sign In Button Skeleton */}
            <Skeleton className="h-12 w-full rounded-md" />

            {/* Forgot Password Link Skeleton */}
            <div className="text-center">
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>

            {/* Divider Skeleton */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="w-full h-px" />
              </div>
              <div className="relative flex justify-center">
                <Skeleton className="h-4 w-32 bg-white" />
              </div>
            </div>

            {/* OAuth Buttons Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
