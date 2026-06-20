const GEMINI_API_KEY = 'AQ.Ab8RN6I_6MhJaq0hdGpbE_c8AIDNiBzBZDqYULy6lv2tSn4H1w';

export async function analyzeFoodImage(base64Image) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analyze this food image and return ONLY a JSON object (no markdown) with these fields:
{
  "name": "meal name",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (mg)
}
Be as accurate as possible based on visible portion sizes.`,
            },
            {
              inline_data: { mime_type: 'image/jpeg', data: base64Image },
            },
          ],
        }],
        generationConfig: { temperature: 0, topP: 1, topK: 1 },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API error');

  const text = data.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}
