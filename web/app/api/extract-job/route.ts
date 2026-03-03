import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { resumeData } from "@/lib/resume-data"; // <-- Import your stored resume data!

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function fileToGenerativePart(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  return {
    inlineData: { data: base64Data, mimeType: "application/pdf" },
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jobFile = formData.get("job") as File;

    if (!jobFile) {
      return NextResponse.json({ error: "Missing job PDF." }, { status: 400 });
    }

    const jobPart = await fileToGenerativePart(jobFile);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // Convert your imported resume data into a string for the AI to read
    const userProfileString = JSON.stringify(resumeData, null, 2);

    const prompt = `
      You are an expert technical recruiter and career coach. 
      Read the attached Job Advertisement PDF. 
      
      The user applying for this job has the following profile, experience, and skills:
      ${userProfileString}

      Extract the job details AND perform a gap analysis against the user's profile.
      Return ONLY a JSON object with this exact structure (no markdown, no extra text):
      {
        "detail": {
          "id": "new-job",
          "title": "Extracted Job Title",
          "company": "Extracted Company",
          "location": "Extracted Location",
          "salary": "Extracted Salary or 'Not specified'",
          "adLink": "/target-job/new-job/ad",
          "theme": "blue",
          "stats": {
            "matchingScore": <number 0-100 based on how well the user's skills match the job>,
            "criticalGaps": <number of critical missing skills>,
            "timeToReady": "e.g., 4 Weeks"
          },
          "skillsHave": ["List of skills the job needs that the user already has (e.g., React, SQL)"],
          "skillsAcquire": [
            { "name": "Missing Skill 1", "priority": "high" },
            { "name": "Missing Skill 2", "priority": "medium" }
          ]
        },
        "ad": {
          "title": "Extracted Job Title",
          "company": "Extracted Company",
          "location": "Extracted Location",
          "salary": "Extracted Salary",
          "type": "Full-time or Part-time",
          "posted": "Just now",
          "about": "2-3 paragraphs about the role and company.",
          "responsibilities": ["Responsibility 1", "Responsibility 2"],
          "requirements": ["Requirement 1", "Requirement 2"],
          "benefits": [
            { "label": "Extracted Benefit", "icon": "DollarSign", "color": "text-green-600", "bg": "bg-green-100" }
          ]
        }
      }
    `;

    const result = await model.generateContent([prompt, jobPart]);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("Extraction API Error:", error);
    return NextResponse.json({ error: "Failed to extract job data." }, { status: 500 });
  }
}