import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { academyJoinHref } from "@/lib/academy-navigation";
import {
  ACCELERATOR_OFFER,
  SUMMIT_OFFERS,
  SUPPORT_TEXT_NUMBER,
  guideFor,
  type Offer,
  type Ticket,
} from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { VAULT_CATEGORIES, vaultCatalogue, type VaultCategory, type VaultItem } from "@/lib/vault";
import { decodeZip, mergeVaultSkills, type VaultCard, type VaultSkill } from "@/lib/vault-skills";
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
  skills?: VaultSkill[];
};
type Reader = {
  slug: string;
  name: string;
  tier: string;
  sections: { heading: string; bullets: string[] }[];
  skill?: VaultSkill;
};
const INSTALL_STEPS = [
  "Download the .zip file. Don't unzip it.",
  'In Claude, open Settings → Capabilities and turn on "Code execution and file creation."',
  "Go to Customize → Skills.",
  "Click +, then Create skill, then Upload a skill.",
  "Choose the .zip file and make sure the skill is turned on.",
  "Start a new chat and say one of the start phrases.",
];
function InstallBlock() {
  return (
    <article>
      <h2>How to add this skill to Claude</h2>
      <ol>
        {INSTALL_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="academy-muted">
        On a Team or Enterprise plan, your workspace owner may need to allow skills first.
      </p>
    </article>
  );
}
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
  const [notice, setNotice] = useState("");
  const [publicSkills, setPublicSkills] = useState<VaultSkill[]>([]);
  useEffect(() => {
    if (session.loading || session.email) return;
    let active = true;
    academyApi<{ skills: VaultSkill[] }>("vault-catalogue")
      .then((r) => {
        if (active) setPublicSkills(r.skills.map((k) => ({ ...k, unlocked: false })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session.loading, session.email]);
  useEffect(() => {
    if (session.email)
      academyApi<Listing>("vault")
        .then(setListing)
        .catch((e) => setError(e.message));
  }, [session.email]);
  const unlocked = listing?.unlocked ?? false;
  const baseItems = listing?.items ?? vaultCatalogue().map((i) => ({ ...i, unlocked: false }));
  const merged = mergeVaultSkills(baseItems, listing ? (listing.skills ?? []) : publicSkills);
  const items = merged.cards.filter((i) => category === "all" || i.category === category);
  const countFor = (c: VaultCategory) =>
    vaultCatalogue().filter((i) => i.category === c).length +
    (c === "skills" ? merged.standaloneCount : 0);
  async function download(skill: VaultSkill) {
    setBusy(`dl:${skill.slug}`);
    setError("");
    setNotice("Downloading…");
    try {
      const r = await academyApi<{ fileName: string; contentType: string; base64: string }>(
        `vault-skill-download?slug=${encodeURIComponent(skill.slug)}`,
      );
      const bytes = decodeZip(r.base64, skill.byteSize);
      const blob = new Blob([bytes as BlobPart], { type: r.contentType });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = r.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setNotice(`Downloaded ${r.fileName}.`);
    } catch (e) {
      setNotice("");
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function read(card: VaultCard) {
    const slug = card.slug;
    setBusy(slug);
    setError("");
    try {
      if (card.skill) {
        const r = await academyApi<{
          slug: string;
          name: string;
          overview: { heading: string; bullets: string[] }[];
        }>(`vault-skill?slug=${encodeURIComponent(card.skill.slug)}`);
        setOpen({ slug, name: card.name, tier: "", sections: r.overview, skill: card.skill });
      } else setOpen(await academyApi<Reader>(`vault-item?slug=${encodeURIComponent(slug)}`));
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
              <a className="academy-button" href={academyJoinHref("/vault", true)}>
                Sign in to open the Vault
              </a>
            ) : null}
            {listing && !unlocked ? (
              <>
                <a className="academy-button" href="/summit">
                  The Vault is included with membership
                </a>
                <a className="academy-text-button" href="/redeem">
                  Already have a ticket? Activate it →
                </a>
              </>
            ) : null}
          </div>
          <p role="status" className="academy-status">
            {error || notice || session.error || (session.loading ? "Checking your key…" : "")}
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
            <span>{vaultCatalogue().length + merged.standaloneCount} items</span>
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
              <span>{countFor(c.id)} items</span>
            </button>
          ))}
        </div>
        <p className="academy-muted">
          {VAULT_CATEGORIES.find((c) => c.id === category)?.blurb ??
            "Skills, prompts, plug-ins, playbooks and scorecards. Open any item to read it in full."}
        </p>
        {merged.bundle && (category === "all" || category === "skills") ? (
          <div className="academy-actions" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="academy-button"
              disabled={busy === `dl:${merged.bundle.slug}`}
              aria-label="Download all skills as one .zip file"
              onClick={() => download(merged.bundle!)}
            >
              {busy === `dl:${merged.bundle.slug}` ? "Downloading…" : "Download all skills (.zip)"}
            </button>
          </div>
        ) : null}
        <div className="academy-vault-grid" style={{ marginTop: 22 }}>
          {items.map((i) => {
            const cardUnlocked = i.unlocked;
            const cat = VAULT_CATEGORIES.find((c) => c.id === i.category)!;
            return (
              <article
                className={`academy-card academy-vault-item ${cardUnlocked ? "academy-holo" : ""}`}
                key={i.slug}
                data-locked={!cardUnlocked}
              >
                <p className="academy-eyebrow">
                  <span>
                    {cat.glyph} {cat.title}
                  </span>
                  <span>{cardUnlocked ? "Unlocked" : "Sealed"}</span>
                </p>
                <h3>{i.name}</h3>
                <p>{i.preview}</p>
                {cardUnlocked ? (
                  <button
                    type="button"
                    className="academy-text-button"
                    disabled={busy === i.slug}
                    onClick={() => read(i)}
                      aria-label={`Open ${i.name}`}
                  >
                    {busy === i.slug ? "Opening…" : "Open →"}
                  </button>
                ) : null}
                {cardUnlocked && i.skill ? (
                  <button
                    type="button"
                    className="academy-button academy-button-small"
                    disabled={busy === `dl:${i.skill.slug}`}
                    aria-label={`Download ${i.name} skill (.zip)`}
                    onClick={() => download(i.skill!)}
                  >
                    {busy === `dl:${i.skill.slug}` ? "Downloading…" : "Download skill (.zip)"}
                  </button>
                ) : null}
                {cardUnlocked ? null : (
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
                    (merged.cards.find((i) => i.slug === open.slug)?.category ?? "playbooks"),
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
            {open.skill ? (
              <>
                <InstallBlock />
                <div className="academy-actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="academy-button academy-button-small"
                    disabled={busy === `dl:${open.skill.slug}`}
                    aria-label={`Download ${open.name} skill (.zip)`}
                    onClick={() => download(open.skill!)}
                  >
                    {busy === `dl:${open.skill.slug}` ? "Downloading…" : "Download skill (.zip)"}
                  </button>
                </div>
              </>
            ) : null}
            <div className="academy-actions" style={{ marginTop: 20 }}>
              <a
                className="academy-button academy-button-secondary academy-button-small"
                href={guideFor(listing?.ticket).room}
              >
                Ask {guideFor(listing?.ticket).name} how to use this
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
              <p className="academy-eyebrow">Included with the Summit membership</p>
              <h2>The Vault opens with your membership.</h2>
              <p>
                Join the Summit membership in our Skool community, then sign in here with the same
                email and the {vaultKey.name} contents open along with the complete Summit. The{" "}
                {ACCELERATOR_OFFER.name} is the Accelerator membership and adds the build rooms, the
                live AI Spin avatar and 1-on-1 time — text {SUPPORT_TEXT_NUMBER} with questions.
              </p>
            </div>
            <div className="academy-actions">
              <a className="academy-button" href="/summit">
                Open the Summit sessions
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

