# Environment Configuration

Use a separate environment file or hosting-variable set for each application.
Never copy the root operator configuration into a browser application.

## GDG Hub

Template: `apps/gdg-hub/.env.example`

| Variable                        | Exposure      | Required        | Purpose                                                                |
| ------------------------------- | ------------- | --------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-safe  | Yes             | Shared Supabase project URL                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe  | Yes             | Publishable or legacy anon key; RLS remains the authority              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server secret | Yes             | Trusted server operations; never use in client components              |
| `NEXT_PUBLIC_SITE_URL`          | Browser-safe  | Yes             | Exact Hub origin without a trailing slash                              |
| `BEVY_WEBHOOK_SECRET`           | Server secret | When enabled    | Authenticates inbound Bevy event updates; minimum 32 random characters |
| `BEVY_WEBHOOK_SECRET_HEADER`    | Server config | No              | Defaults to `x-axis-bevy-secret`                                       |
| `BEVY_CHAPTER_ID`               | Server config | No              | Preferred exact chapter filter when available                          |
| `BEVY_CHAPTER_SLUG`             | Server config | Yes for webhook | Fallback chapter filter                                                |

Keep the Bevy endpoint unregistered until the Hub has an approved public HTTPS
origin. Luma requires no API key because Axis stores only the validated redirect
URL and attendance is imported through the approved CSV workflow.

## GDG ID

Template: `apps/gdg-id/.env.example`

| Variable                        | Exposure      | Required   | Purpose                                     |
| ------------------------------- | ------------- | ---------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-safe  | Yes        | Shared Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe  | Yes        | Publishable or legacy anon key              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server secret | Yes        | Server-only member lookup and verification  |
| `QR_SIGNING_SECRET`             | Server secret | Yes        | Signs QR data; minimum 32 random characters |
| `UPSTASH_REDIS_REST_URL`        | Server secret | Production | Distributed rate limiting                   |
| `UPSTASH_REDIS_REST_TOKEN`      | Server secret | Production | Distributed rate limiting credential        |

Rotating `QR_SIGNING_SECRET` invalidates previously issued signed QR codes.

## Supabase Edge Functions

Template: `supabase/functions/.env.example`

| Variable                      | Required        | Purpose                                                  |
| ----------------------------- | --------------- | -------------------------------------------------------- |
| `AXIS_EMAIL_DELIVERY_ENABLED` | Yes             | Worker feature gate; keep `false` until email acceptance |
| `AXIS_EMAIL_WORKER_SECRET`    | Before enabling | Authenticates the service-only email worker              |
| `RESEND_API_KEY`              | Before enabling | Provider credential                                      |
| `AXIS_EMAIL_FROM`             | Before enabling | Verified sender identity                                 |

Supabase supplies its runtime URL and secret key to hosted functions. Email has a
second database gate in Portal/Communications settings. Both gates must be enabled
before delivery occurs; both ship disabled. Configure custom SMTP separately for
Supabase Auth invitations and password recovery.

## Operator-only tooling

Template: `env.example`

| Variable               | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `DATABASE_URL`         | Direct or pooled Postgres tooling connection |
| `SUPABASE_PROJECT_REF` | Explicit target for operator scripts         |

Do not add these values to Vercel application environments unless a reviewed
runtime path explicitly needs them. The Supabase CLI stores its linked-project
state locally; always verify the target before a command that changes remote state.

## Environment separation

- Use separate Development, Preview, and Production variable scopes.
- Never use production service secrets in untrusted previews or pull requests.
- Use exact origins in Supabase Auth redirect allow lists; avoid broad production
  wildcards.
- Treat all dashboard screenshots, logs, and `.env.local` files as sensitive.
- Rotate secrets after accidental exposure and document the rotation date and
  affected deployments.
