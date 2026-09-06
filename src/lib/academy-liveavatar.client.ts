import { LiveAvatarSession } from "@heygen/liveavatar-web-sdk";
export {
  SessionEvent,
  SessionInteractivityMode,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
// SDK repeat() logs the answer. Use its protected exact-text control without logging learner text.
export class SpinAvatarSession extends LiveAvatarSession {
  speakExact(text: string) {
    if (!this.assertConnected()) throw new Error("The avatar is not connected.");
    const event_id = this.generateEventId();
    this.publishAgentControl({
      event_id,
      event_type: "avatar.speak_text",
      text: text.slice(0, 8000),
    });
    return event_id;
  }
}
