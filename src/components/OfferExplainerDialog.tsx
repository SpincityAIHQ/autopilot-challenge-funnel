import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { VideoSlot } from "./VideoSlot";
import { getOfferExplainer, offerContinueLabel } from "@/lib/funnel-content";
import { FOUNDER_DISCLAIMER, GA_BUMP_COPY, type TierId } from "@/lib/tiers";

interface OfferExplainerDialogProps {
  tier: TierId | null;
  videoUrl: string | null | undefined;
  onOpenChange: (open: boolean) => void;
}

/**
 * The short decision step between an offer click and checkout.
 * Missing video URLs never create an empty player; the plain-language tier
 * explanation and continue button still work.
 */
export function OfferExplainerDialog({
  tier,
  videoUrl,
  onOpenChange,
}: OfferExplainerDialogProps) {
  if (!tier) return null;
  const copy = getOfferExplainer(tier);

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[color:var(--gold-soft)] bg-[color:var(--surface-1)] p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">AI Spin tier guide</p>
              <Dialog.Title className="mt-2 font-heading text-2xl text-foreground">
                {copy.title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close tier guide"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Close
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {copy.summary}
          </Dialog.Description>

          <VideoSlot url={videoUrl} label={copy.videoLabel} className="mt-6" />

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {copy.fit}
          </p>
          {tier === "ga" ? (
            <p className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              {GA_BUMP_COPY}
            </p>
          ) : null}
          {tier === "founder" ? (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {FOUNDER_DISCLAIMER}
            </p>
          ) : null}

          <p className="mt-5 text-sm text-foreground">
            Review what is included. When you are ready, continue to the final
            truth check before FanBasis.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/checkout"
              search={{ tier }}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-5 py-3 font-heading font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {offerContinueLabel(tier)}
            </Link>
            <Dialog.Close className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-heading text-foreground transition hover:bg-secondary">
              Compare again
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
