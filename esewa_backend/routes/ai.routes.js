const express = require('express');
const router = express.Router();

/**
 * Mock Gemini API endpoint.
 * Mimics the shape of @google/generative-ai responses so the frontend
 * can be wired against a single contract today and swap to a real
 * Gemini call later without changing the client code.
 *
 * POST /api/ai/insights
 * body: { score?: number, context?: object }
 * resp: {
 *   success: true,
 *   model: "gemini-mock-1.5",
 *   insights: string[],
 *   raw: { candidates: [...] }   // gemini-shaped envelope
 * }
 */
router.post('/insights', (req, res) => {
  const { score = 100, context = {} } = req.body || {};

  // Mock "AI" — deterministic but score-aware so it feels alive.
  const pool = [
    'High digital settlement volume improves loan eligibility.',
    `${(97 + Math.random() * 2).toFixed(1)}% successful transaction rate maintained.`,
    `Business revenue increased by ${10 + Math.floor(Math.random() * 15)}% this quarter.`,
    'Customer retention remains above average.',
    'Settlement consistency trending upward across the last 30 days.',
    'Refund ratio is within healthy industry bounds.',
    'Peak-hour transaction reliability is strong.',
  ];

  // pick 4 stable insights based on score bucket
  const start = score >= 85 ? 0 : score >= 75 ? 1 : 2;
  const insights = [];
  for (let i = 0; i < 4; i++) insights.push(pool[(start + i) % pool.length]);

  res.json({
    success: true,
    model: 'gemini-mock-1.5',
    insights,
    raw: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: insights.map((s) => `• ${s}`).join('\n') }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 32, candidatesTokenCount: 64, totalTokenCount: 96 },
    },
  });
});

router.get('/health', (req, res) => res.json({ ok: true, model: 'gemini-mock-1.5' }));

module.exports = router;
