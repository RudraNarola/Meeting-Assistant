import { useEffect } from "react";

export default function RegisterRedirect() {
  useEffect(() => {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
    // Redirect to backend register page
    window.location.href = `${backend}/register.html`;
  }, []);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p>Redirecting to register…</p>
    </div>
  );
}
