export default async function handler(req, res) {
  // Simulate notifications (email, slack, push). In production wire to SMTP/Slack APIs/WebPush
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { channel, to, subject, message } = req.body || {};
  // Basic validation
  if (!channel || !to || !message) {
    return res.status(400).json({ error: "Missing channel, to or message" });
  }

  // For demo, we just echo back and pretend we delivered
  console.log(
    `[mock notify] channel=${channel} to=${to} subject=${subject} message=${message}`
  );

  // Mock latency
  await new Promise((r) => setTimeout(r, 300));

  res.status(200).json({ ok: true, delivered: true, channel, to });
}
