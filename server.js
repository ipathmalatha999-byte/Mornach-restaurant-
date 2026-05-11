const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { messages, restaurantConfig } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (messages.length > 40) {
    return res.status(400).json({ error: 'Conversation too long' });
  }

  const systemPrompt = buildSystemPrompt(restaurantConfig);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: 'AI service error' });
    }

    return res.status(200).json({ reply: data.content[0].text });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

function buildSystemPrompt(config) {
  const name = config?.name || 'Monarch';
  const location = config?.location || 'Thalawatugoda, Sri Lanka';
  const menu = config?.menu || [];

  const menuText = menu.map((item, i) =>
    `${i + 1}. ${item.name} — ${item.price} | ${item.desc}`
  ).join('\n');

  return `You are the AI dining concierge for ${name}, a restaurant in ${location}. Your tone is warm, friendly, and helpful.

MENU:
${menuText}

RULES:
- Keep replies short (2–4 sentences) unless listing menu items.
- For reservations, ask: date, time, party size, name.
- If unsure about hours or availability, suggest calling the restaurant.
- Never make up prices or dishes not on the menu.`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monarch server running on port ${PORT}`));
