# Meeting Assistant

Meeting Assistant is a small example project demonstrating a Java Spring Boot REST API with JWT authentication, role-based access, and a Dockerized PostgreSQL database. It includes a tiny static UI (served from Spring Boot) with Register / Login / Profile pages so you can exercise the API in a browser.

Technologies
- Java 17, Spring Boot 3
- Spring Security (JWT), Spring Data JPA (Hibernate)
- PostgreSQL (official Docker image)
- Maven build, Docker multi-stage Dockerfile, docker-compose

Key features
- Register and login users (passwords hashed with BCrypt)
- JWT-based stateless authentication
- Role-based access (ROLE_USER, ROLE_ADMIN)
- Simple static UI at `/`, `/register.html`, `/login.html`, `/profile.html`
- Docker Compose brings up the app + Postgres (no local Postgres install required)

Quick start (Docker)

Prerequisites: Docker & Docker Compose installed on your machine.

1) Build and run the stack (from the repository root):

```powershell
docker-compose up --build -d
```

This will build the app image and pull the official Postgres image. By default the app listens on container port 8080 and the Compose file maps it to a host port (check `docker-compose.yml` for the exact mapping; common mapping used in this project is `8081:8080` to avoid local 8080 conflicts).

2) Open the UI in your browser:

	- http://localhost:8081/  (or the host port shown in your `docker-compose.yml`)

API endpoints

- POST /api/auth/register
	- Body JSON: { "username": "alice", "password": "secret", "role": "ROLE_USER" }
	- Returns 200 and a short text body on success.

- POST /api/auth/login
	- Body JSON: { "username": "alice", "password": "secret" }
	- Returns JSON: { "token": "<jwt>" }

- GET /api/users/me
	- Protected: requires header Authorization: Bearer <token>
	- Returns the current user's basic info (username, role).

- GET /api/users/{username}
	- Admin-only endpoint: requires ROLE_ADMIN.

Example requests (PowerShell)

Register a user:

```powershell
Invoke-RestMethod -Uri http://localhost:8081/api/auth/register -Method Post -ContentType 'application/json' -Body (@{username='bob'; password='pass123'} | ConvertTo-Json)
```

Login and capture token:

```powershell
$resp = Invoke-RestMethod -Uri http://localhost:8081/api/auth/login -Method Post -ContentType 'application/json' -Body (@{username='bob'; password='pass123'} | ConvertTo-Json)
$token = $resp.token

# Use token to call protected endpoint:
Invoke-RestMethod -Uri http://localhost:8081/api/users/me -Headers @{ Authorization = "Bearer $token" }
```

If you prefer curl (Linux / WSL / Git Bash):

```bash
# register
curl -X POST http://localhost:8081/api/auth/register -H "Content-Type: application/json" -d '{"username":"bob","password":"pass123"}'
# login
curl -s -X POST http://localhost:8081/api/auth/login -H "Content-Type: application/json" -d '{"username":"bob","password":"pass123"}'
# call profile (replace <token>)
curl -H "Authorization: Bearer <token>" http://localhost:8081/api/users/me
```

Database access

To inspect the Postgres database from the host you can use psql or exec into the container. Example (run on host):

```powershell
docker exec -it meeting-assistant-db-1 psql -U meetinguser -d meetingdb -c "SELECT id, username, role FROM users;"
```

Configuration / environment

The `docker-compose.yml` defines environment variables for Postgres and the application. Important variables:
- POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD — database credentials
- JWT_SECRET — secret used to sign JWTs (change this in production)

You can override those values by editing `docker-compose.yml` or by providing your own environment when running the containers.

Static UI

Simple static pages live under `src/main/resources/static/` and are served by Spring Boot:
- `index.html` — landing page
- `register.html`, `login.html`, `profile.html` — separate pages
- `nav.js` — dynamic navigation (shows username when logged in)

Development

- Build locally with Maven:

```powershell
mvn -DskipTests package
```

- Run the Spring Boot app locally (without Docker) by configuring a local Postgres instance and setting the same environment variables (SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD, JWT_SECRET), then run `mvn spring-boot:run`.

Troubleshooting / notes

- If `/nav.js` returns HTTP 403 in the browser, Spring Security is blocking the static resource — ensure the security config permits `/nav.js` (it is already permitted in this project). Restart the containers after changes.
- If login attempts produce an exception related to `javax/xml/bind/DatatypeConverter` on Java 11+ you may need the JAXB runtime; this project already includes the necessary JAXB deps for jjwt compatibility.
- Passwords are stored hashed (BCrypt). You cannot retrieve a plain password from the DB.

Project structure (important files)

```
Dockerfile
docker-compose.yml
pom.xml
src/main/java/com/meetingassistant/...   (controllers, security, service, model)
src/main/resources/static/               (index.html, login.html, register.html, profile.html, nav.js, scripts)
```

Security & production notes

- The project is a demo: do not use the default JWT secret in production. Rotate secrets, use HTTPS, and consider refresh tokens for long-lived sessions.
- Add input validation, rate limiting, and proper logging before exposing this API publicly.

License

This repository is provided as-is for learning/demo purposes. Add a license file if you plan to reuse it in other contexts.

If you'd like, I can add:
- a small PowerShell script to automate register → login → fetch profile
- integration tests for the auth flow
- instructions to change the JVM version or use a different JWT library

---

Happy to expand any section or add automation scripts — tell me which part you'd like next.

