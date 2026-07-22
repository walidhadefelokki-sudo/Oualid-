interface PromptInput {
  jobTitle: string;
  jobDescription: string;
  cvText: string;
}

export function buildPrompt(data: PromptInput): string {
  return `
You are an expert HR recruiter.

Analyze this candidate.

JOB TITLE:
${data.jobTitle}

JOB DESCRIPTION:
${data.jobDescription}

CANDIDATE CV:
${data.cvText}

Return ONLY valid JSON.

{
  "score":0,
  "summary":"",
  "strengths":[],
  "weaknesses":[],
  "matchedSkills":[],
  "missingSkills":[],
  "extractedSkills":[],
  "extractedEducation":[],
  "extractedExperience":[],
  "recommendations":[]
}
`;
}