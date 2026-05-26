# Server

Express backend workspace.

## Auth APIs

- `POST /api/auth/register`
- `POST /api/auth/login`

The authentication system reuses the Lab4 tables:

- `People`: stores the real person profile (`name`, `gender`, `phone`, `email`).
- `SysUser`: stores the login account (`username`, `password_hash`, `role_type`, `verification_status`).

```text
src/
  config/        Environment and app configuration
  db/            PostgreSQL connection and query helpers
  routes/        HTTP route definitions
  controllers/   Request handlers
  services/      Business logic
  repositories/  Database access layer
  middleware/    Express middleware
  utils/         Backend utilities
```
