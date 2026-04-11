import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Allow up to 5 minutes on Vercel
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are extracting structured training data from a Trainerize PDF
export for a combat sports performance tracking system.

Return ONLY valid JSON with no preamble. Structure:

{
  "athlete_name": string,
  "program": {
    "name": string,
    "phase_number": number | null,
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD" | null,
    "total_weeks": number | null,
    "trainerize_plan_id": number | null
  },
  "workout_templates": [
    {
      "name": string,
      "workout_type": "interval"|"strength"|"mobility"|"conditioning",
      "estimated_duration_mins": number | null,
      "equipment": string[],
      "instructions": string,
      "power_benchmarks": [
        {
          "rep_number": number,
          "threshold_watts": number,
          "action_if_below": string
        }
      ]
    }
  ],
  "training_sessions": [
    {
      "workout_template_name": string,
      "session_date": "YYYY-MM-DD",
      "exercise_sets": [
        {
          "exercise_name": string,
          "exercise_category": "strength"|"power"|"mobility"|"interval",
          "set_number": number,
          "cluster_number": number | null,
          "reps": number | null,
          "weight_kg": number | null,
          "power_watts": number | null,
          "target_power_watts": number | null,
          "duration_secs": number | null,
          "each_side": boolean
        }
      ]
    }
  ]
}

CRITICAL UNIT RULE: Trainerize stores AssaultBike power output in the
weight field labelled kg. Any value from an AssaultBike or interval
exercise must be written to power_watts, never weight_kg. A value of
1199 from an AssaultBike set means 1199 watts, not 1199 kilograms.

Sessions appear in the Previous Stats tables -- extract ALL dated rows,
one TrainingSession object per date column.`;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Stream the response back so the UI shows progress as tokens arrive
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send a zero-width space every 5s to keep the connection alive in local dev
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode("\u200B")); } catch { /* stream may already be closed */ }
      }, 5000);

      try {
        let inputTokens = 0;
        let outputTokens = 0;

        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: EXTRACTION_PROMPT,
                },
              ],
            },
          ],
        });

        anthropicStream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        const finalMessage = await anthropicStream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;

        // Append usage as a sentinel JSON line after the main content
        const usageLine =
          "\n\n__USAGE__" +
          JSON.stringify({
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost_usd:
              (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15,
          });

        controller.enqueue(encoder.encode(usageLine));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n__ERROR__${msg}`));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
