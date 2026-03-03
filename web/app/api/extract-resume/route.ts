import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
    const resumeFile = formData.get("resume") as File;

    if (!resumeFile) {
      return NextResponse.json({ error: "Missing resume PDF." }, { status: 400 });
    }

    const resumePart = await fileToGenerativePart(resumeFile);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert HR data extractor. Read the attached resume PDF and extract the details into a strict JSON format.
      
      Return ONLY a JSON object with exactly this structure. If information is missing, use empty strings or empty arrays:
      {
        "name": "Full Name",
        "title": "Professional Title (e.g. Software Engineer)",
        "location": "City, Country",
        "email": "email address",
        "phone": "phone number",
        "summary": "A brief 2-3 sentence professional summary based on their experience.",
        "experience": [
          {
            "role": "Job Title",
            "company": "Company Name",
            "period": "Start Date - End Date",
            "isPrimary": true,
            "achievements": ["Bullet point 1", "Bullet point 2"]
          }
        ],
        "projects": [
          { "name": "Project Name", "description": "Brief description" }
        ],
        "education": [
          { "degree": "Degree Name", "school": "University Name", "period": "Year" }
        ],
        "skills": ["Skill 1", "Skill 2", "Skill 3"]
      }

      Rule: For the first experience item, set "isPrimary" to true. For all others, set it to false.
    `;

    const result = await model.generateContent([prompt, resumePart]);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("Extraction API Error:", error);
    return NextResponse.json({ error: "Failed to extract data." }, { status: 500 });
  }
}