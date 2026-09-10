import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — AI AutoPilot Summit & SPINXP" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "How the AI AutoPilot Summit uses account information, saved learning activity, AI assistance and communication choices. Policy review pending.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">
      <Link to="/" className="text-xs hover:text-foreground">
        ← Home
      </Link>
      <p className="eyebrow mt-4">Your learning · Your information</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Privacy Notice</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: 2026-09-09 · Policy review pending
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          SpincityHQ LLC dba NuAmenti operates the AI AutoPilot Summit learning experience,
          powered by SPINXP. This notice describes the information used to open your classroom,
          remember your progress, provide learning support and manage your access.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Information we use</h2>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong className="text-foreground">Account and preferences.</strong> Your email,
            sign-in information, account identifier, timezone, optional mobile number and the
            email, text and AI choices you make.
          </li>
          <li>
            <strong className="text-foreground">Learning activity.</strong> Lessons opened,
            recorded viewing intervals and playback position, activity times, quiz answers
            and scores, saved activity sheets, submissions and instructor feedback. When you
            use a tutor, we save your questions and its answers with the lesson.
          </li>
          <li>
            <strong className="text-foreground">Purchases and access.</strong> Registration
            and purchaser records, including previously imported Summit lists; order email,
            order and product identifiers, payment or refund status, ticket access and access
            codes. Payment details are entered at the Shopify checkout and handled by Shopify
            and its payment providers, rather than in the classroom.
          </li>
          <li>
            <strong className="text-foreground">Service records.</strong> Checkout-link
            clicks, registration and learning events, message preparation and delivery status,
            errors and abuse-prevention records. Campaign and referral details submitted with
            Academy registration are saved when you choose optional email updates.
          </li>
        </ul>

        <h2 className="mt-6 font-heading text-base text-foreground">How learning support works</h2>
        <p>
          Saved activity restores your place and helps SPINXP select a useful next step, such as
          revisiting a chapter, practicing a missed concept or revising an activity. Recorded
          playback is a signal from the player; it does not prove attention or mastery.
          Submitting an activity makes it available for instructor review. Course administrators
          can access learning and service records to support students and operate the platform.
          These features do not post your coursework or tutor conversations to a public feed.
        </p>
        <p>
          Thoth and AI Spin are AI guides. When you enable tutor assistance, your question,
          recent lesson conversation, relevant course material, ticket level, viewing progress,
          quiz results, saved lesson work and feedback are sent through Lovable AI to the
          configured model provider. The tutor displays its provider in the learning interface.
          You can use the lessons without enabling tutor assistance. Avoid putting passwords,
          payment details or other people’s confidential information in your questions or work.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Emails, texts and your choices</h2>
        <p>
          Account welcomes and purchase/access messages are separate from optional learning
          reminders, Summit updates and offers. Optional emails follow your email choice;
          texts require a separate text choice and mobile number. Neither optional choice is
          required to create an account or buy access.
        </p>
        <p>
          Learning reminders can use your last activity, resume point, quiz result and activity
          status to explain why a next step is suggested. When AI drafting is enabled, it helps
          write the opening; the application supplies the saved evidence and next action.
          GoHighLevel receives contact and consent details, relevant access or learning status,
          and message content to manage this communication. A feedback email may include your
          instructor’s feedback; the reminder workflow does not send your full activity sheet
          or tutor conversation to GoHighLevel.
        </p>
        <p>
          To turn off optional emails, sign in, open{" "}
          <Link to="/learn" className="underline hover:text-foreground">My account</Link>
          {" "}and choose “Turn off optional marketing emails.” This also stops optional learning
          emails. To stop texts, reply STOP; reply HELP for help. You can also contact us below
          to change your choices. Turning off reminders does not delete your saved course work
          or prevent essential account and purchase emails.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Services that support the experience</h2>
        <p>
          We use{" "}
          <a className="underline" href="https://supabase.com/privacy">Supabase</a>
          {" "}for accounts and application records,{" "}
          <a className="underline" href="https://lovable.dev/privacy">Lovable</a>
          {" "}for the hosted application and AI gateway,{" "}
          <a className="underline" href="https://vimeo.com/legal/privacy">Vimeo</a>
          {" "}for embedded recordings,{" "}
          <a className="underline" href="https://www.shopify.com/legal/privacy">Shopify</a>
          {" "}for checkout and order information, and{" "}
          <a className="underline" href="https://www.gohighlevel.com/privacy-policy">GoHighLevel</a>
          {" "}for contacts and messaging. These services process information needed for the
          features you use. Their notices provide additional information about their own
          practices; this notice describes our use of your learning records.
        </p>
        <p>
          If live AI Spin is available with your access and you choose to start it,{" "}
          <a className="underline" href="https://www.heygen.com/privacy">HeyGen LiveAvatar</a>
          {" "}processes the text spoken by the avatar and, if you enable the microphone, your
          audio and transcript. This has its own consent control. The app records session
          identifiers, status and timing to manage access and usage limits.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Browser storage and connected content</h2>
        <p>
          The app uses browser storage to keep you signed in and remember local preferences.
          Clearing site storage or signing out removes local sign-in state, not the learning
          records saved to your account. Vimeo playback, hosted fonts and other connected
          services receive browser requests when their content loads. The classroom requests
          Vimeo’s privacy-mode setting, while SPINXP separately saves viewing progress for
          your course experience.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Improving SPINXP and NuAmenti</h2>
        <p>
          Course activity and service totals help us find confusing lessons, interrupted
          learning journeys and delivery problems, and improve this SPINXP and NuAmenti
          experience. Aggregate counts in the instructor dashboard are separate from the
          identifiable records used to support an individual student. Your account records
          are not made anonymous simply because we also display totals.
        </p>
        <p>
          The current learning features do not automatically enroll private coursework or
          tutor conversations in a separate product’s model-training program, or publish
          them as a success story. A future proposal to reuse that content outside the
          described learning service needs its own clear explanation and choices.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Access, corrections and deletion requests</h2>
        <p>
          For a copy of your information, a correction, account or data deletion, questions
          about retention, or help with communication choices, email{" "}
          <a className="underline" href="mailto:Sebastian@spincityhq.com">Sebastian@spincityhq.com</a>
          {" "}from your account email when possible. Describe what you need without including
          your password. Signing out, leaving a lesson or turning off reminders does not
          automatically erase account, purchase, learning or messaging records.
        </p>

        <p className="mt-8 text-xs">
          SpincityHQ LLC · Atlanta, GA. This updated operational notice remains pending policy
          review; it does not represent a completed legal review or certification.
        </p>
      </div>
    </main>
  );
}
