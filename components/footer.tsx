import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      Built by {' '}
      <ExternalLink href="https://scholarshipheadquarters.com">Scholarship Headquaters</ExternalLink> with {' '}
      <ExternalLink href="https://scholarshipheadquarters.com/edith-ai">
        Edith v.1.0
      </ExternalLink>
      .
    </p>
  )
}
