import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  issueDetailSchema,
  issuesResponseSchema,
  notifyResultSchema,
  recipientsSchema,
  type IssueDetail,
  type IssuesResponse,
  type NotifyRequest,
  type NotifyResult,
  type Recipient,
} from "../model/issues.schema";

export type IssuesFilter = { status: "open" | "all"; domain: string | null };

export const loadIssues = async (filter: IssuesFilter): Promise<IssuesResponse> =>
  parseJson(
    issuesResponseSchema,
    await apiGet("issues/", { status: filter.status, domain: filter.domain ?? undefined }),
  );

export const loadIssue = async (id: number): Promise<IssueDetail> =>
  parseJson(issueDetailSchema, await apiGet(`issues/${id}/`));

export const loadRecipients = async (domain: string): Promise<Recipient[]> =>
  parseJson(recipientsSchema, await apiGet("issues/recipients/", { domain })).results;

export const notifyIssue = async (id: number, request: NotifyRequest): Promise<NotifyResult> =>
  parseJson(
    notifyResultSchema,
    await apiSend("post", `issues/${id}/notify/`, {
      recipient_id: request.recipientId,
      channels: request.channels,
      urgency: request.urgency,
      message: request.message,
    }),
  );
