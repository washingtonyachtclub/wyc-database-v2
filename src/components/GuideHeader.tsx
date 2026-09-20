import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function GuideHeader({
  title,
  children,
  className,
}: {
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('relative mb-12 border-b border-wyc-purple/30 pb-8', className)}>
      <div className="mb-7 flex items-center gap-3 sm:gap-4 xl:absolute xl:top-0 xl:right-full xl:mr-14 xl:mb-0 xl:w-56">
        <img
          src="/favicon.png"
          alt=""
          width={64}
          height={64}
          className="size-14 shrink-0 object-contain sm:size-16"
        />
        <p className="m-0 font-wyc-heading text-lg leading-tight font-black tracking-[0.09em] text-wyc-purple uppercase sm:text-xl">
          Washington
          <br />
          Yacht Club
        </p>
      </div>
      <h1 className="m-0 font-wyc-heading text-4xl leading-tight font-black tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}
