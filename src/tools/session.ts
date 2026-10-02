/** Offline provider translation. This tool cannot submit, authorize or export. */
import { z } from "zod";
import { prepareSession } from "../engine/session-compiler.cjs";

const Section = z.object({
  name: z.string().min(1).max(60), lyrics: z.string().max(3500),
  duration_s: z.number().int().min(3).max(120),
  styles: z.array(z.string().min(1).max(300)).max(50),
  exclude: z.array(z.string().min(1).max(300)).max(50),
}).strict();

export const SessionShape = {
  work_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  owner: z.enum(["FrankX", "Arcanea", "Starlight", "GenCreator"]),
  artist_profile_ref: z.string().min(1).max(250),
  engine: z.enum(["lyria-clip", "lyria-full", "eleven-music", "minimax-fal3", "suno-supervised"]),
  style: z.string().min(1).max(2000), lyrics: z.string().max(3500),
  instrumental: z.boolean(), duration_s: z.number().int().min(3).max(600),
  candidates: z.number().int().min(1).max(8), budget_usd: z.number().finite().min(0),
  sections: z.array(Section).min(1).max(30).optional(),
};
export const SessionSchema = z.object(SessionShape).strict();

export function handlePrepareMusicSession(args: unknown) {
  const session = SessionSchema.parse(args);
  return {
    ...prepareSession(session),
    owner_status: "planning_label_not_authenticated_authority",
    execution_status: "not_submitted",
    audio_verdict: "not_listened",
  };
}
