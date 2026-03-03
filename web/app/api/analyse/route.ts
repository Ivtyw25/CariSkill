import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to convert a File to Gemini's inlineData format
// Update this helper function at the top of your API route
async function fileToGenerativePart(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  return {
    inlineData: {
      data: base64Data,
      mimeType: "application/pdf", // FORCE this to be application/pdf
    },
  };
}

export async function POST(req: Request) {
  try {
    // 1. Receive the raw files from the frontend
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File;
    const jobFile = formData.get("job") as File;

    if (!resumeFile || !jobFile) {
      return NextResponse.json({ error: "Missing PDF files." }, { status: 400 });
    }

    // 2. Convert both PDFs into the format Gemini understands
    const resumePart = await fileToGenerativePart(resumeFile);
    const jobPart = await fileToGenerativePart(jobFile);

    // 3. Set up the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. Create the prompt
    const prompt = `
      You are an expert technical recruiter and career coach.
      I have provided two PDF documents:
      1. A candidate's Resume.
      2. A Job Advertisement.

      Analyze the Resume against the Job Description. 
      Identify missing skills and calculate a realistic match percentage.
      Return ONLY a JSON object with this exact structure:
      {
        "matchPercentage": number,
        "mustHave": [{ "id": "m1", "name": "Skill Name" }],
        "useful": [{ "id": "u1", "name": "Skill Name" }],
        "mightNeed": [{ "id": "n1", "name": "Skill Name" }]
      }
    `;

    // 5. Send the prompt AND the PDF files directly to Gemini!
    const result = await model.generateContent([prompt, resumePart, jobPart]);

    // 6. Clean the response text before parsing!
    let responseText = result.response.text();

    // Strip out markdown code blocks if Gemini included them
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed." }, { status: 500 });
  }
}