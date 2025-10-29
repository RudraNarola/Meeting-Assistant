import { useEffect } from "react";

export default function LoginRedirect() {
  useEffect(() => {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
    // Redirect to backend login page
    window.location.href = `${backend}/login.html`;
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
      <p>Redirecting to login…</p>
    </div>
  );
}
