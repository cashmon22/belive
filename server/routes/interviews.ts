import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { notifyUser } from "../lib/notifications";
import { getInterviewStatus } from "../lib/interview-access";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";

const questionSchema = z.object({ prompt: z.string().trim().min(5).max(1000) });
const answerSchema = z.object({ questionId: z.string().uuid(), prompt: z.string().min(5).max(1000), answer: z.string().trim().min(1).max(5000) });
const answersSchema = z.object({ answers: z.array(answerSchema).min(1).max(100) });
const questionColumns = "id, prompt, position, created_at";
const submissionColumns = "id, user_id, applicant_name, email, status, answers, submitted_at, reviewed_at";

type InterviewQuestion = { id: string; prompt: string; position: number; created_at: string };
type InterviewAnswer = { questionId: string; question: string; answer: string };

async function getUser(req: Request, res: Parameters<RequestHandler>[1]) {
  const authorization = req.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return data.user;
}

async function getAdminUser(req: Request, res: Parameters<RequestHandler>[1]) {
  const user = await getUser(req, res);
  if (!user) return null;
  if (user.app_metadata?.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return null;
  }
  return user;
}

function serviceClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Interview data is not configured." });
    return null;
  }
}

export const getInterviewAccess: RequestHandler = async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return;
  if (user.app_metadata?.role === "admin") {
    res.json({ status: "Approved", isAdmin: true });
    return;
  }
  try {
    res.json({ status: await getInterviewStatus(user) });
  } catch (error) {
    console.error("[api] Unable to verify interview approval.", error);
    res.status(500).json({ error: "Unable to verify interview approval." });
  }
};

export const getInterviewQuestions: RequestHandler = async (req, res) => {
  if (!(await getUser(req, res))) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_questions").select(questionColumns).order("position").order("created_at");
  if (error) {
    console.error("[api] Unable to load interview questions.", error);
    res.status(500).json({ error: "Unable to load interview questions." });
    return;
  }
  res.json({ questions: data ?? [] });
};

export const getMyInterview: RequestHandler = async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_submissions").select("id, status, answers, submitted_at, reviewed_at").eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("[api] Unable to load interview submission.", error);
    res.status(500).json({ error: "Unable to load your interview." });
    return;
  }
  res.json({ submission: data ?? null });
};

export const submitInterview: RequestHandler = async (req, res) => {
  const user = await getUser(req, res);
  if (!user) return;
  const parsed = answersSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please answer every interview question." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data: existing, error: existingError } = await service.from("interview_submissions").select("id").eq("user_id", user.id).maybeSingle();
  if (existingError) {
    res.status(500).json({ error: "Unable to check your interview status." });
    return;
  }
  if (existing) {
    res.status(409).json({ error: "Your interview has already been submitted." });
    return;
  }
  const { data: questions, error: questionError } = await service.from("interview_questions").select("id, prompt").order("position").order("created_at");
  if (questionError) {
    res.status(500).json({ error: "Unable to load interview questions." });
    return;
  }
  if (!questions?.length || parsed.data.answers.length !== questions.length || new Set(parsed.data.answers.map((answer) => answer.questionId)).size !== questions.length) {
    res.status(400).json({ error: "Please answer every current interview question." });
    return;
  }
  const questionById = new Map((questions as Pick<InterviewQuestion, "id" | "prompt">[]).map((question) => [question.id, question.prompt]));
  const answers: InterviewAnswer[] = parsed.data.answers.map(({ questionId, prompt, answer }) => {
    const question = questionById.get(questionId);
    return { questionId, question: prompt, answer };
  });
  if (answers.some((answer) => questionById.get(answer.questionId) !== answer.question)) {
    res.status(400).json({ error: "The interview questions have changed. Please reload and try again." });
    return;
  }
  const applicantName = typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim().slice(0, 200)
    : (user.email ?? "Applicant").slice(0, 200);
  const { data, error } = await service.from("interview_submissions").insert({
    user_id: user.id,
    applicant_name: applicantName,
    email: user.email ?? "",
    answers,
  }).select("id, status, submitted_at").single();
  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Your interview has already been submitted." });
      return;
    }
    console.error("[api] Unable to save interview submission.", error);
    res.status(500).json({ error: "Unable to submit your interview." });
    return;
  }
  res.status(201).json({ submission: data });
};

export const listAdminInterviews: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_submissions").select(submissionColumns).order("submitted_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: "Unable to load submitted interviews." });
    return;
  }
  res.json({ submissions: data ?? [] });
};

export const updateInterviewStatus: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const status = req.body?.status;
  if (status !== "Approved" && status !== "Rejected") {
    res.status(400).json({ error: "Choose Accept or Reject for this interview." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", req.params.id).select("id, user_id, applicant_name, status").maybeSingle();
  if (error) {
    res.status(500).json({ error: "Unable to update interview status." });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Interview submission not found." });
    return;
  }
  await notifyUser({
    userId: data.user_id,
    type: status === "Approved" ? "application_approved" : "application_rejected",
    title: `Interview ${status}`,
    message: `${data.applicant_name}'s interview has been ${status.toLowerCase()}.`,
    link: status === "Approved" ? "/dashboard" : "/interview",
    relatedId: data.id,
  });
  res.json({ id: data.id, status });
};

export const createInterviewQuestion: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Question text must be between 5 and 1000 characters." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data: last, error: orderError } = await service.from("interview_questions").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  if (orderError) {
    res.status(500).json({ error: "Unable to prepare a new interview question." });
    return;
  }
  const { data, error } = await service.from("interview_questions").insert({ prompt: parsed.data.prompt, position: (last?.position ?? -1) + 1 }).select(questionColumns).single();
  if (error) {
    res.status(500).json({ error: "Unable to create interview question." });
    return;
  }
  res.status(201).json({ question: data });
};

export const updateInterviewQuestion: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Question text must be between 5 and 1000 characters." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_questions").update({ prompt: parsed.data.prompt }).eq("id", req.params.id).select(questionColumns).maybeSingle();
  if (error) {
    res.status(500).json({ error: "Unable to update interview question." });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Interview question not found." });
    return;
  }
  res.json({ question: data });
};

export const deleteInterviewQuestion: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("interview_questions").delete().eq("id", req.params.id).select("id").maybeSingle();
  if (error) {
    res.status(500).json({ error: "Unable to delete interview question." });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Interview question not found." });
    return;
  }
  res.json({ id: data.id });
};

export const reorderInterviewQuestions: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const ids = z.array(z.string().uuid()).min(1).max(100).safeParse(req.body?.ids);
  if (!ids.success || new Set(ids.data).size !== ids.data.length) {
    res.status(400).json({ error: "Provide each interview question exactly once, in the desired order." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data: questions, error } = await service.from("interview_questions").select("id");
  if (error) {
    res.status(500).json({ error: "Unable to verify interview question order." });
    return;
  }
  if (questions?.length !== ids.data.length || ids.data.some((id) => !questions.some((question) => question.id === id))) {
    res.status(400).json({ error: "The question list changed. Reload and try again." });
    return;
  }
  const updates = await Promise.all(ids.data.map((id, position) => service.from("interview_questions").update({ position }).eq("id", id)));
  if (updates.some(({ error: updateError }) => updateError)) {
    res.status(500).json({ error: "Unable to save interview question order." });
    return;
  }
  res.json({ success: true });
};
