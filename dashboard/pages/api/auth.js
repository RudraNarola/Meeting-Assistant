// Mock authentication API
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, email, password, name } = req.body;

  // Mock users database (in production, use real database)
  const mockUsers = [
    {
      id: 1,
      email: "demo@example.com",
      password: "demo123",
      name: "Demo User",
    },
    {
      id: 2,
      email: "alice@company.com",
      password: "alice123",
      name: "Alice Johnson",
    },
  ];

  if (action === "login") {
    const user = mockUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      // In production, generate JWT token
      const token = `mock-token-${user.id}-${Date.now()}`;
      return res.status(200).json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });
    } else {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }
  }

  if (action === "register") {
    // Check if user already exists
    const existingUser = mockUsers.find((u) => u.email === email);

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });
    }

    // Create new user
    const newUser = {
      id: mockUsers.length + 1,
      email,
      name: name || email.split("@")[0],
      password, // In production, hash the password
    };

    mockUsers.push(newUser);
    const token = `mock-token-${newUser.id}-${Date.now()}`;

    return res.status(201).json({
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      token,
    });
  }

  if (action === "logout") {
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Invalid action" });
}
