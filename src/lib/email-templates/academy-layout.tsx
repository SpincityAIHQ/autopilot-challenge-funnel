import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BRAND, SITE_NAME, button, container, footer, h1, main, rule, text } from "./brand";

export interface AcademyEmailProps {
  /** Authored paragraphs, already composed server-side. */
  paragraphs?: string[];
  heading?: string;
  preview?: string;
  actionLabel?: string;
  actionUrl?: string;
  /** Shown under the action; used for account/access notices. */
  note?: string;
}

/** Shared green / gold / black shell for every academy follow-up email. */
export function AcademyEmail({
  heading,
  preview,
  paragraphs = [],
  actionLabel,
  actionUrl,
  note,
}: AcademyEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview || heading || SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={{ fontSize: "12px", color: BRAND.green, margin: "0 0 6px", fontWeight: "bold" }}>
            {SITE_NAME}
          </Text>
          <Heading style={h1}>{heading || SITE_NAME}</Heading>
          <Hr style={rule} />
          {paragraphs.map((paragraph, index) => (
            <Text key={index} style={text}>
              {paragraph}
            </Text>
          ))}
          {actionUrl && actionLabel ? (
            <Section style={{ margin: "0 0 22px" }}>
              <Button href={actionUrl} style={button} className="dm-btn">
                {actionLabel}
              </Button>
            </Section>
          ) : null}
          {note ? <Text style={footer}>{note}</Text> : null}
        </Container>
      </Body>
    </Html>
  );
}

export default AcademyEmail;
