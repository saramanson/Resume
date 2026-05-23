import { tailorResume } from "../../server.js";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  try {
    const body = await req.json();
    const jobDescription = String(body?.jobDescription || "").trim();
    const profile = String(body?.profile || "").trim();

    if (jobDescription.length < 40 || profile.length < 40) {
      return new Response(JSON.stringify({ error: "Please paste both a job description and your current profile/resume." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const result = await tailorResume(jobDescription, profile);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Something went wrong tailoring the resume." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};

export const config = {
  path: "/api/tailor"
};
