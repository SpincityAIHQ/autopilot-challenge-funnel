import { OPEN_ACCESS_NOTICE, SUPPORT_OPTIONS } from "@/lib/academy";

/**
 * Shown wherever tickets used to be sold. Nothing here charges anyone.
 */
export function OpenAccessBanner({ note }: { note?: string }) {
  return (
    <div className="academy-card academy-card-gold" style={{ marginTop: 24 }}>
      <p className="academy-eyebrow">Included with membership</p>
      <h2>It opens with your membership.</h2>
      <p>{note ?? OPEN_ACCESS_NOTICE}</p>
    </div>
  );
}

export function SupportPanel({ heading }: { heading?: string }) {
  return (
    <section className="academy-section" style={{ paddingTop: 8 }}>
      <div className="academy-section-heading">
        <p className="academy-eyebrow">Membership runs in Skool</p>
        <h2>{heading ?? "How to get in."}</h2>
      </div>
      <div className="academy-three">
        {SUPPORT_OPTIONS.map((o) => (
          <article className="academy-card" key={o.id}>
            <p className="academy-eyebrow">{o.eyebrow}</p>
            <h2>{o.title}</h2>
            <p>{o.body}</p>
            {o.bullets?.length ? (
              <ul>
                {o.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            <a
              className="academy-button"
              href={o.href}
              {...(o.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {o.actionLabel}
            </a>
          </article>
        ))}
      </div>

    </section>
  );
}
