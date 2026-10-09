import Image from "next/image"
import { cn } from "@/lib/utils"

export function TeamCrest({ name, logo, size = 32, className }: { name: string; logo: string | null; size?: number; className?: string }) {
  if (!logo) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn("inline-flex items-center justify-center rounded-full bg-muted font-heading text-xs font-bold", className)}
      >
        {name.slice(0, 3).toUpperCase()}
      </span>
    )
  }
  return <Image src={logo} alt="" width={size} height={size} className={cn("object-contain", className)} unoptimized />
}
