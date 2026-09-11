import type { ComponentType } from 'react'
import { template as accountWelcome } from './academy-account-welcome'
import { template as accessActivated } from './academy-access-activated'
import { template as purchaseAccessCode } from './academy-purchase-access-code'
import { template as neverStarted } from './academy-never-started'
import { template as learningInactivity } from './academy-learning-inactivity'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 *
 * Event -> template mapping lives in `src/lib/academy-email-transport.ts`.
 * Events without an entry there are held: no template is guessed for them.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'academy-account-welcome': accountWelcome,
  'academy-access-activated': accessActivated,
  'academy-purchase-access-code': purchaseAccessCode,
  'academy-never-started': neverStarted,
  'academy-learning-inactivity': learningInactivity,
}
