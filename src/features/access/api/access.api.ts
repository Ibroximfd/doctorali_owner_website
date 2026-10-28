import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  activitySchema,
  candidatesSchema,
  memberSchema,
  membersSchema,
  templatesSchema,
  type AccessEvent,
  type AccessTemplate,
  type Candidate,
  type GrantInput,
  type Member,
} from "../model/access.schema";

export const loadMembers = async (): Promise<Member[]> =>
  parseJson(membersSchema, await apiGet("access/members/", { status: "all" })).results;

export const loadCandidates = async (search: string): Promise<Candidate[]> =>
  parseJson(candidatesSchema, await apiGet("access/candidates/", { search })).results;

export const loadTemplates = async (): Promise<AccessTemplate[]> =>
  parseJson(templatesSchema, await apiGet("access/templates/")).results;

export const loadActivity = async (): Promise<AccessEvent[]> =>
  parseJson(activitySchema, await apiGet("access/activity/", { limit: 50 })).results;

const toBody = (input: GrantInput) => ({
  user_id: input.userId,
  title: input.title.trim(),
  sections: input.sections,
  filials: input.filials,
  regions: input.regions,
  mask_pii: input.maskPii,
  can_export: input.canExport,
  expires_at: input.expiresAt,
  note: input.note?.trim() || null,
  notify: input.notify,
});

export const grantAccess = async (input: GrantInput): Promise<Member> =>
  parseJson(memberSchema, await apiSend("post", "access/members/", toBody(input)));

export const updateAccess = async (id: number, input: GrantInput): Promise<Member> => {
  const { user_id: _userId, notify: _notify, ...patch } = toBody(input);
  return parseJson(memberSchema, await apiSend("patch", `access/members/${id}/`, patch));
};

export const revokeAccess = async (id: number): Promise<Member> =>
  parseJson(memberSchema, await apiSend("post", `access/members/${id}/revoke/`));
