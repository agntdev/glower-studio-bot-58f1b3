# GlowEr Studio Booking & Management Bot — Bot specification

**Archetype:** booking

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot for beauty studio GlowEr enabling clients to browse services/portfolio, read reviews, request appointments, and submit post-appointment reviews. Admins manage services, portfolio, reviews, and confirm bookings through a configurable admin chat.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- beauty studio clients
- studio administrators

## Success criteria

- Clients can successfully request and track bookings
- Admins receive and process booking notifications
- Clients submit post-appointment reviews with photos

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with studio branding
- **View Services** (button, actor: user, callback: services:list) — Browse available beauty services with photos and details
- **Portfolio Gallery** (button, actor: user, callback: portfolio:gallery) — View curated portfolio images with captions
- **Read Reviews** (button, actor: user, callback: reviews:list) — Browse client reviews with photos and admin replies
- **Make Booking** (button, actor: user, callback: booking:start) — Initiate appointment request flow
- **My Bookings** (button, actor: user, callback: booking:history) — View pending/confirmed appointment status
- **/admin** (command, actor: admin, command: /admin) — Access admin management panel

## Flows

### Onboarding Flow
_Trigger:_ /start

1. Display branded welcome screen
2. Show main navigation options

_Data touched:_ User

### Booking Request Flow
_Trigger:_ booking:start

1. Select service
2. Enter date/time preference
3. Add optional notes/phone
4. Submit request confirmation

_Data touched:_ BookingRequest, Service

### Admin Confirmation Flow
_Trigger:_ booking:new

1. Admin receives notification
2. Select accept/decline action
3. Update booking status

_Data touched:_ BookingRequest

### Post-Appointment Review Flow
_Trigger:_ booking:confirmed

1. Wait 1 hour post-appointment
2. Send review prompt
3. Collect rating/text/photos
4. Notify admin of new review

_Data touched:_ Review

### Admin Management Flow
_Trigger:_ /admin

1. Authenticate admin user
2. Manage services/portfolio
3. View/Reply to reviews
4. Process bookings

_Data touched:_ Service, PortfolioItem, Review, BookingRequest

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Service** _(retention: persistent)_ — Beauty service offering with pricing and media
  - fields: name, duration, price, description, photos
- **PortfolioItem** _(retention: persistent)_ — Studio work sample with caption and tags
  - fields: photos, caption, tags
- **BookingRequest** _(retention: persistent)_ — Client appointment request with status tracking
  - fields: client, requested_datetime, service, notes, status, confirmed_slot
- **Review** _(retention: persistent)_ — Client feedback with photos and admin replies
  - fields: rating, text, photos, admin_reply
- **User** _(retention: persistent)_ — Telegram user profile with optional contact info
  - fields: telegram_id, name, phone

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure admin notification chat
- Manage service catalog
- Curate portfolio content
- Moderate reviews
- Approve/decline bookings

## Notifications

- New booking request alerts to admin chat
- Booking confirmation updates to clients
- Post-appointment review prompts
- Admin reply notifications to reviews

## Permissions & privacy

- Admin authentication via configured Telegram IDs
- Client data stored with optional phone number
- Review photos stored temporarily

## Edge cases

- Client requests conflicting time slots
- Admin chat configuration errors
- Expired booking requests
- Review submission without photos

## Required tests

- End-to-end booking request and confirmation flow
- Post-appointment review timing accuracy
- Admin notification delivery reliability
- Portfolio media display consistency

## Assumptions

- Admin chat is pre-configured by studio owner
- Booking dates use local time zone
- Review photos limited to 5 per submission
