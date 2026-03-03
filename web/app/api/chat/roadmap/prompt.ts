import { z } from "zod";

export const roadmapResponseSchema = z.object({
    reply: z.string().describe("Your helpful, markdown-formatted response. Use **bold** for key terms, bullet lists for steps/resources."),
    edit_roadmap: z.boolean().describe("true if the user is asking to edit their roadmap, false otherwise."),
    updated_roadmap: z.any().nullable().describe("The full updated roadmap JSON matching the original structure if edit_roadmap is true, otherwise null.")
});

export function getRoadmapPrompt(
    roadmapContext: string,
    currentRoadmap: any,
    conversationHistory: string,
    message: string
) {
    const isEditRequest = /add|remove|delete|change|update|modify|include|insert|put|replace|rename|move|create|make it|reorder/i.test(message);
    const roadmapJsonString = currentRoadmap ? JSON.stringify(currentRoadmap).substring(0, 2000) : 'Not available';

    if (isEditRequest && currentRoadmap) {
        return `You are an expert AI assistant editing a CariSkill learning roadmap. The student wants to modify their **${roadmapContext}** roadmap.

## CURRENT ROADMAP (JSON):
${roadmapJsonString}

## CONVERSATION HISTORY:
${conversationHistory || 'No previous messages.'}

## STUDENT REQUESTS:
"${message}"

## YOUR TASK:
Apply the student's requested changes to the roadmap JSON. Keep the same overall structure. Only change what was requested.
Set "edit_roadmap" to true, "reply" to "Done! I've updated your roadmap...", and provide the full JSON in "updated_roadmap".`;
    } else {
        return `You are a helpful AI tutor assistant for CariSkill. The student is viewing their **${roadmapContext}** learning roadmap.

Your role is to:
- Answer questions about concepts, topics, or resources in the **${roadmapContext}** roadmap
- Explain confusing concepts clearly and encouragingly
- Suggest tips, resources, or strategies for completing phases
- Help the student stay motivated

## CONVERSATION HISTORY:
${conversationHistory || 'No previous messages.'}

## STUDENT ASKS:
"${message}"

## YOUR TASK:
Set "edit_roadmap" to false, "updated_roadmap" to null, and write your markdown answer in "reply".`;
    }
}
