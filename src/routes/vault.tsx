import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame, TicketBadge } from "@/components/AcademyFrame";
import { ACCELERATOR_OFFER, SUMMIT_OFFERS, type Offer, type Ticket } from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { VAULT_CATEGORIES, vaultCatalogue, type VaultCategory, type VaultItem } from "@/lib/vault";
export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "The Vault | AI AutoPilot" },
      {
        name: "description",
        content:
          "Skills, prompts, plug-ins, playbooks and scorecards for Emerald Vault Key holders and Accelerator students.",
      },
    ],
  }),
  component: Vault,
});
type Listing = {
  unlocked: boolean;
  items: (VaultItem & { unlocked: boolean })[];
  ticket: Ticket;
  nextOffer: Offer | null;
};
type Reader = {
  slug: string;
  name: string;
  tier: string;
  sections: { heading: string; bullets: string[] }[];
};
function Vault() {
  const session = useAcademySession();
  return <VaultSession key={session.email ?? "anonymous"} session={session} />;
}
function VaultSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<VaultCategory | "all">("all");
  const [open, setOpen] = useState<Reader | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (session.email)
      academyApi<Listing>("vault")
        .then(setListing)
        .catch((e) => setError(e.message));
  }, [session.email]);
  const unlocked = listing?.unlocked ?? false;
  const items = (listing?.items ?? vaultCatalogue().map((i) => ({ ...i, unlocked: false }))).filter(
    (i) => category === "all" || i.category === category,
  );
  async function read(slug: string) {
    setBusy(slug);
    setError("");
    try {
      setOpen(await academyApi<Reader>(`vault-item?slug=${encodeURIComponent(slug)}`));
      document.getElementById("vault-reader")?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const vaultKey = SUMMIT_OFFERS.find((o) => o.tier === "vault")!;
  return (
    <AcademyFrame ticket={listing?.ticket}>
      <section className="academy-vault-hero">
        <div>
          <span className="academy-key">◆ Key holders · Accelerator students</span>
          <h1>
            The <em>Vault</em>
          </h1>
          <p className="academy-lead">
            The good stuff. The skills, prompts, plug-ins, playbooks and scorecards Spin actually
            runs. Everything here is built to be dropped into your operating system today.
          </p>
          <div className="academy-hero-actions">
            {!session.loading && !session.email ? (
              <a className="academy-button" href="/join">
                Sign in to open the Vault
              </a>
            ) : null}
            {listing && !unlocked ? (
              <>
                <a className="academy-button" href={vaultKey.url}>
                  Get the Emerald Vault Key · ${vaultKey.price}
                </a>
                <a className="academy-text-button" href="/redeem">
                  Already bought? Redeem your key →
                </a>
              </>
            ) : null}
            {listing ? <TicketBadge ticket={listing.ticket} /> : null}
          </div>
          <p role="status" className="academy-status">
            {error || session.error || (session.loading ? "Checking your key…" : "")}
          </p>
        </div>
        <div className="academy-vault-door" data-locked={!unlocked} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <strong>{unlocked ? "OPEN" : "SEALED"}</strong>
          <small>{unlocked ? "Key accepted" : "Emerald key required"}</small>
        </div>
      </section>
      <section className="academy-section" style={{ paddingTop: 8 }}>
        <div className="academy-vault-cats" role="tablist" aria-label="Vault categories">
          <button
            type="button"
            className="academy-vault-cat"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            <i>◆</i>
            <strong>Everything</strong>
            <span>{vaultCatalogue().length} items</span>
          </button>
          {VAULT_CATEGORIES.map((c) => (
            <button
              type="button"
              className="academy-vault-cat"
              key={c.id}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              title={c.blurb}
            >
              <i>{c.glyph}</i>
              <strong>{c.title}</strong>
              <span>{vaultCatalogue().filter((i) => i.category === c.id).length} items</span>
            </button>
          ))}
        </div>
        <p className="academy-muted">
          {VAULT_CATEGORIES.find((c) => c.id === category)?.blurb ??
            "Skills, prompts, plug-ins, playbooks and scorecards. Open any item to read it in full."}
        </p>
        <div className="academy-vault-grid" style={{ marginTop: 22 }}>
          {items.map((i) => {
            const cat = VAULT_CATEGORIES.find((c) => c.id === i.category)!;
            return (
              <article
                className={`academy-card academy-vault-item ${unlocked ? "academy-holo" : ""}`}
                key={i.slug}
                data-locked={!unlocked}
              >
                <p className="academy-eyebrow">
                  <span>
                    {cat.glyph} {cat.title}
                  </span>
                  <span>{unlocked ? "Unlocked" : "Sealed"}</span>
                </p>
                <h3>{i.name}</h3>
                <p>{i.preview}</p>
                {unlocked ? (
                  <button
                    type="button"
                    className="academy-text-button"
                    disabled={busy === i.slug}
                    onClick={() => read(i.slug)}
                  >
                    {busy === i.slug ? "Opening…" : "Open →"}
                  </button>
                ) : (
                  <a className="academy-text-button" href="/redeem">
                    Redeem a key →
                  </a>
                )}
              </article>
            );
          })}
        </div>
        {open ? (
          <div
            className="academy-card academy-card-featured academy-vault-reader"
            id="vault-reader"
            style={{ marginTop: 32 }}
          >
            <p className="academy-eyebrow">
              {
                VAULT_CATEGORIES.find(
                  (c) =>
                    c.id ===
                    (vaultCatalogue().find((i) => i.slug === open.slug)?.category ?? "playbooks"),
                )?.title
              }{" "}
              · The Vault
            </p>
            <h2 style={{ marginTop: 10 }}>{open.name}</h2>
            {open.sections.map((s) => (
              <article key={s.heading}>
                <h2>{s.heading}</h2>
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </article>
            ))}
            <div className="academy-actions" style={{ marginTop: 20 }}>
              <a
                className="academy-button academy-button-secondary academy-button-small"
                href="/ai-spin"
              >
                Ask AI Spin how to use this
              </a>
              <button type="button" className="academy-text-button" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
        {listing && !unlocked ? (
          <div className="academy-callout academy-card academy-card-gold" style={{ marginTop: 40 }}>
            <div>
              <p className="academy-eyebrow">Two ways in</p>
              <h2>The Emerald Vault Key or the Accelerator.</h2>
              <p>
                {vaultKey.name} unlocks every item here plus the complete Summit. The{" "}
                {ACCELERATOR_OFFER.name} includes the Vault, every build-room replay, the live AI
                Spin avatar and 1-on-1 time with SpinCity.
              </p>
            </div>
            <div className="academy-actions">
              <a className="academy-button" href="/summit">
                See Summit tickets
              </a>
              <a className="academy-button academy-button-secondary" href="/accelerator">
                Explore the Accelerator
              </a>
            </div>
          </div>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
