import { fail } from './workspace.js';

export const defaultGeminiModel = 'gemini-3.8-flash';

function rejectResponse(status, error) {
  const keyRejected = Array.isArray(error?.details) && error.details.some(detail =>
    typeof detail?.reason === 'string' && detail.reason.startsWith('API_KEY_')
  );
  if (status === 401 || status === 403 || keyRejected) {
    fail('Accès refusé par Gemini. Vérifiez la clé API, ses restrictions et le projet Google associé.', 502);
  }
  if (status === 404) {
    fail('Le modèle Gemini configuré est introuvable pour ce projet. Vérifiez GEMINI_MODEL sur le serveur.', 502);
  }
  if (status === 429) {
    fail('Quota Gemini atteint. Vérifiez les limites du projet dans Google AI Studio ou réessayez plus tard.', 429);
  }
  if (error?.status === 'FAILED_PRECONDITION') {
    fail('Le projet Google ne permet pas cet appel à Gemini. Vérifiez la disponibilité de l’API et la facturation dans Google AI Studio.', 502);
  }
  if (status === 400) {
    fail('Gemini a refusé la demande. Vérifiez que le modèle configuré accepte le format envoyé.', 502);
  }
  fail('Gemini est temporairement indisponible. Réessayez dans un moment.', 503);
}

export async function generateGemini({ key, model, prompt, parts, generationConfig, timeout = 120000 }) {
  if (!key) fail('Gemini est désactivé. Renseignez GEMINI_API_KEY sur le serveur, puis redémarrez Rivqo.', 503);

  let response, payload;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: prompt ? { parts: [{ text: prompt }] } : undefined,
        contents: [{ role: 'user', parts }],
        generationConfig
      }),
      signal: AbortSignal.timeout(timeout)
    });
    payload = await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      fail('Gemini a mis trop de temps à répondre. Réessayez avec une demande plus courte.', 504);
    }
    if (!response) fail('Le serveur ne parvient pas à joindre Gemini. Réessayez dans un moment.', 503);
  }
  if (!response.ok) rejectResponse(response.status, payload?.error);

  const candidate = payload?.candidates?.[0];
  if (payload?.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
    fail('Gemini a bloqué la demande. Essayez de la reformuler.', 422);
  }
  const reply = candidate?.content?.parts;
  const text = Array.isArray(reply) ? reply.filter(part =>
    !part?.thought && typeof part?.text === 'string'
  ).map(part => part.text).join('').trim() : '';
  if (!text || (candidate.finishReason && candidate.finishReason !== 'STOP')) {
    fail('Gemini a renvoyé une réponse incomplète. Reformulez la demande et réessayez.', 502);
  }
  return text;
}
