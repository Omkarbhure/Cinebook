LT5R 0T5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5R5RṬĪ%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%# CineBook — Frontend UI/UX Documentation

> Complete reference for the visual design system, page layouts, components, interactions, and user flows of the CineBook frontend (`client/src`).

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Design System — Tokens & Variables](#2-design-system--tokens--variables)
3. [Typography](#3-typography)
4. [Color Palette](#4-color-palette)
5. [Spacing & Layout](#5-spacing--layout)
6. [Global Component Library](#6-global-component-library)
7. [Animations & Transitions](#7-animations--transitions)
8. [Page-by-Page Breakdown](#8-page-by-page-breakdown)
   - [Home Page](#81-home-page)
   - [Movies Listing](#82-movies-listing-page)
   - [Movie Detail](#83-movie-detail-page)
   - [Booking / Seat Map](#84-booking--seat-map-page)
   - [Auth — Login](#85-auth--login-page)
   - [Auth — Register](#86-auth--register-page)
   - [Profile Dashboard](#87-profile-dashboard)
   - [Admin Panel](#88-admin-panel)
9. [Reusable Components](#9-reusable-components)
   - [Navbar](#91-navbar)
   - [LocationModal](#92-locationmodal)
   - [MovieCard](#93-moviecard)
10. [Loading & Feedback States](#10-loading--feedback-states)
11. [Responsive Breakpoints](#11-responsive-breakpoints)
12. [Accessibility Notes](#12-accessibility-notes)
13. [User Flows](#13-user-flows)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router |
| Library | React 19, TypeScript 5 |
| Styling | Vanilla CSS Modules — no Tailwind, no UI library |
| Icons | Inline SVG + Unicode emoji |
| Notifications | `react-hot-toast` (top-right, dark themed) |
| Images | Next.js `<Image>` with lazy loading |
| State | React Context API + `useReducer` |
| HTTP | Axios with request/response interceptors |

All pages are `'use client'` components — no SSR for dynamic data.

---

## 2. Design System — Tokens & Variables

All design tokens are defined as CSS custom properties in `globals.css` and consumed across all CSS modules.

### Background Layers

| Variable | Value | Usage |
|---|---|---|
| `--bg-primary` | `#0a0a0f` | Page background, darkest |
| `--bg-secondary` | `#12121a` | Section backgrounds, sidebars |
| `--bg-card` | `#1a1a26` | Card surfaces |
| `--bg-elevated` | `#22223a` | Hover states, elevated elements |

### Border

| Variable | Value |
|---|---|
| `--border` | `rgba(255,255,255,0.08)` |
| `--border-hover` | `rgba(255,255,255,0.18)` |

### Brand Colors

| Variable | Value | Usage |
|---|---|---|
| `--primary` | `#e50914` | CTA buttons, active states, accents |
| `--primary-hover` | `#c40811` | Button hover |
| `--primary-glow` | `rgba(229,9,20,0.3)` | Glow effects, badge backgrounds |
| `--accent` | `#f59e0b` | Star ratings, warnings |
| `--accent-glow` | `rgba(245,158,11,0.3)` | Accent glow |

### Status Colors

| Variable | Hex | Usage |
|---|---|---|
| `--success` | `#10b981` | Confirmed badges, success toasts |
| `--warning` | `#f59e0b` | Warning badges |
| `--danger` | `#ef4444` | Error states, logout buttons |
| `--info` | `#3b82f6` | Info badges |

### Text

| Variable | Value | Usage |
|---|---|---|
| `--text-primary` | `#ffffff` | Headings, important text |
| `--text-secondary` | `#a0a0b8` | Body text, descriptions |
| `--text-muted` | `#6b6b8a` | Placeholders, metadata |

### Gradients

| Variable | Value |
|---|---|
| `--gradient-hero` | `linear-gradient(135deg, #0a0a0f 0%, #1a0a1a 50%, #0a0a1a 100%)` |
| `--gradient-card` | `linear-gradient(135deg, #1a1a26 0%, #22223a 100%)` |
| `--gradient-primary` | `linear-gradient(135deg, #e50914 0%, #ff4757 100%)` |
| `--gradient-accent` | `linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)` |

### Shadows

| Variable | Value |
|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.4)` |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.6)` |
| `--shadow-glow` | `0 0 32px var(--primary-glow)` |

### Border Radius

| Variable | Value | Usage |
|---|---|---|
| `--radius-xs` | `6px` | Small tags |
| `--radius-sm` | `8px` | Buttons, inputs |
| `--radius-md` | `12px` | Cards |
| `--radius-lg` | `16px` | Large cards |
| `--radius-xl` | `24px` | Section cards |
| `--radius-full` | `9999px` | Pills, badges, avatars |

### Transitions

| Variable | Value |
|---|---|
| `--transition` | `all 0.2s ease` |
| `--transition-slow` | `all 0.4s cubic-bezier(0.4,0,0.2,1)` |

---

## 3. Typography

### Fonts

| Font | Source | Usage |
|---|---|---|
| **Inter** | Google Fonts — weights 300/400/500/600/700/800 | Body text, UI elements |
| **Bebas Neue** | Google Fonts | Display headings, logo, hero titles |

### Font Variables

```css
--font-body: 'Inter', sans-serif;
--font-display: 'Bebas Neue', sans-serif;
```

### Type Scale

| Class / Usage | Size | Weight |
|---|---|---|
| Hero title | `64px` (desktop), `48px` (tablet), `36px` (mobile) | 900 |
| Section title `.section-title` | `28px` | 800 |
| Card title | `20–24px` | 700–800 |
| Movie title (card) | `15px` | 700 |
| Body text | `15–16px` | 400 |
| Labels / meta | `13–14px` | 500–600 |
| Badges / tags | `10–11px` | 600–700, uppercase |
| `.text-sm` | `13px` | — |
| `.text-xs` | `11px` | — |

---

## 4. Color Palette

Visual summary of the complete dark-mode palette:

```
Backgrounds (darkest → lightest):
  #050508 → #0a0a0f → #12121a → #1a1a26 → #22223a

Brand:
  #e50914 (CineBook Red) → hover #c40811
  #f59e0b (Amber/Gold accent)

Status:
  #10b981 Green  |  #f59e0b Amber  |  #ef4444 Red  |  #3b82f6 Blue

Text:
  #ffffff → #a0a0b8 → #6b6b8a
```

---

## 5. Spacing & Layout

### Container

```css
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
/* Mobile: padding: 0 16px */
```

### Section Padding

```css
.section     { padding: 80px 0; }
.section-sm  { padding: 48px 0; }
```

### Grid Utilities

| Class | Columns | Gap |
|---|---|---|
| `.grid-2` | 2 equal | 24px |
| `.grid-3` | 3 equal | 24px |
| `.grid-4` | 4 equal | 24px |
| `.movieGrid` (home/movies) | 4 → 3 → 2 → 1 (responsive) | 24px |

### Flex Utilities

- `.flex-center` — center both axes
- `.flex-between` — space-between, centered vertically
- `.flex-col` — column direction
- Gap helpers: `.gap-8`, `.gap-12`, `.gap-16`, `.gap-24`

---

## 6. Global Component Library

Defined in `globals.css` — available everywhere via class names.

### Buttons

| Class | Visual Style |
|---|---|
| `.btn-primary` | Red gradient, glow shadow, lifts on hover |
| `.btn-secondary` | Dark elevated bg, subtle border |
| `.btn-outline` | Transparent + red border, fills on hover |
| `.btn-ghost` | Fully transparent, border on hover |
| `.btn-sm` | `8px 16px`, `13px` font |
| `.btn-lg` | `16px 32px`, `16px` font, `--radius-md` |
| `.btn-full` | 100% width |
| `.btn:disabled` | 50% opacity, no hover effects |

### Cards

| Class | Style |
|---|---|
| `.card` | `var(--bg-card)`, border, lifts on hover |
| `.glass` | `rgba(255,255,255,0.05)`, `backdrop-filter: blur(20px)` |

### Forms

- `.form-group` — flex column, 8px gap
- `.form-label` — 14px, 500 weight, secondary color
- `.form-input` — dark bg, border, red focus ring (`box-shadow: 0 0 0 3px var(--primary-glow)`)
- `.form-input.error` — red border
- `.form-error` — 12px, danger color
- `.form-hint` — 12px, muted color

### Badges

| Class | Color |
|---|---|
| `.badge-primary` | Red tint |
| `.badge-success` | Green tint |
| `.badge-warning` | Amber tint |
| `.badge-danger` | Red tint |
| `.badge-info` | Blue tint |
| `.badge-muted` | Elevated bg |

### Typography Helpers

- `.display` — Bebas Neue font
- `.text-gradient` — red gradient text via `background-clip`
- `.text-accent` — amber color
- `.section-divider` — 48px × 3px red gradient bar
- `.star-rating` — flex row, amber color, 14px

### Dividers

- `.divider` — 1px border line
- `.divider-text` — line-text-line with muted text center

---

## 7. Animations & Transitions

All defined in `globals.css`:

| Keyframe | Effect | Used On |
|---|---|---|
| `shimmer` | 200% bg-position sweep | Skeleton screens |
| `spin` | 360° rotation | Loading spinners |
| `fadeIn` | opacity 0 → 1 | Modal overlays |
| `slideUp` | opacity + translateY(-24px) | Hero content, auth cards |
| `slideDown` | opacity + translateY(-8px) | Dropdowns |
| `scaleIn` | opacity + scale(0.95) | Modals |
| `pulse` | opacity 1 → 0.5 | Subtle pulsing elements |
| `float` | translateY(0 → -8px) | Navbar logo emoji |
| `orbFloat` | translate + scale | Auth page background orbs |

### Animation Utility Classes

- `.animate-fadeIn` — 0.4s ease
- `.animate-slideUp` — 0.5s cubic-bezier
- `.animate-scaleIn` — 0.3s ease
- `.animate-float` — 3s infinite loop

### Skeleton Screen

```css
.skeleton {
  background: linear-gradient(90deg, --bg-card 25%, --bg-elevated 50%, --bg-card 75%);
  background-size: 200%;
  animation: shimmer 1.5s infinite;
}
```

### Spinner

```css
.spinner {
  width: 40px; height: 40px;
  border: 3px solid --bg-elevated;
  border-top-color: --primary;
  animation: spin 0.8s linear infinite;
}
```

---

## 8. Page-by-Page Breakdown

### 8.1 Home Page

**File:** `app/page.tsx` + `page.module.css`

#### Layout

```
[Navbar — fixed, transparent → blur on scroll]
[Hero Section — 85vh, full-bleed image]
[Now Playing Section — 4-column movie grid]
[Coming Soon Section — darker bg, 4-column grid]
[CTA Section — centered card with red gradient accent]
[Footer — 2-column: brand + link groups]
```

#### Hero Section

- Height: `85vh`, min `600px`
- Background: Unsplash cinema photo (full bleed, `background-size: cover`)
- Overlay: `linear-gradient(to top, #0a0a0f 0%, rgba(10,10,15,0.4) 50%, rgba(10,10,15,0.6) 100%)` — fades to bg at bottom
- Content animates in with `slideUp 0.8s cubic-bezier(0.16,1,0.3,1)`
- Badge: red pill with `Exclusive Early Access`
- Title: 64px, Bebas Neue weight 900
- Subtitle: 18px, secondary color, line-height 1.6
- Buttons: `Browse All Movies` (primary) + `Join CineBook` (secondary), gap 16px

#### Movie Grids

- 4 columns desktop → 3 at 1024px → 2 at 768px → 1 at 480px
- Skeleton placeholders: 4 shimmer boxes at `aspect-ratio: 2/3` while loading
- After 6s slow load: shows "⏳ Server is waking up..." message
- Empty state: dashed border box centered text

#### CTA Card

- `background: linear-gradient(135deg, #1e0a0a 0%, #0a0a0f 100%)`
- Radial red glow in top-right corner (decorative pseudo-element)
- 40px title, 18px subtitle, primary button

#### Footer

- Background: `#050508` (darkest)
- Top border separator
- Left: logo + description
- Right: two link groups (Company, Help)
- Bottom bar: copyright + social links row

---

### 8.2 Movies Listing Page

**File:** `app/movies/page.tsx` + `movies.module.css`

#### Layout

```
[Navbar]
[Header — title + sort dropdown]
[2-column: Sidebar Filters | Movie Grid]
```

#### Sidebar Filters

- **Status:** "Now Playing" / "Upcoming" toggle buttons
- **Genres:** Action, Adventure, Comedy, Drama, Horror, Sci-Fi, Thriller, Animation, Romance
- **Languages:** English, Hindi, Tamil, Telugu, Spanish, French
- Active filter: red glow background
- Reset All Filters button at bottom

#### Sort Dropdown

- Native `<select>` styled with dark bg
- Options: Newest Releases, Highest Rated, A–Z (Title), Classic (Oldest)

#### Movie Grid

- Responsive columns (same as home)
- Total count shown above grid: `"X movies found · Genre: X · Language: X"`
- Empty state: icon + "No movies found" with hint text
- City fallback: if city filter returns 0, automatically retries without city

---

### 8.3 Movie Detail Page

**File:** `app/movies/[id]/page.tsx` + `detail.module.css`

#### Layout

```
[Navbar]
[Hero Banner — 60vh blurred background]
  └── Poster (left) + Movie Info (right)
[Content Section]
  ├── Left: About + Cast
  └── Right: Sticky Booking Card
```

#### Hero Banner

- Background: movie `banner` image (falls back to `poster`), blurred 20px + brightness 40%, scaled 110%
- Overlay: `linear-gradient(to top, --bg-primary 0%, transparent 100%)`
- Poster: 280px wide, `aspect-ratio: 2/3`, `border-radius: --radius-md`
- Movie metadata: ⭐ rating, ⏱ duration, 📅 release date in a flex row
- Language tags: frosted pill badges
- Book Tickets CTA button (disabled + greyed for upcoming movies)

#### Cast Section

- Horizontal scroll row
- Each cast card: 100×100px circular photo, name, role
- `overflow-x: auto` with hidden scrollbar

#### Sticky Booking Card (right column)

- `position: sticky; top: 100px`
- **Date Picker:** horizontal scroll strip of 7 date buttons
  - Each button: abbreviated weekday + day number
  - Active: solid red background
- **Shows List:** grouped by theater
  - Theater name + address header
  - Time slot buttons in a flex-wrap grid
  - Each time button: time + format (2D/3D/IMAX) label
  - Hover: red border + red text
- **No shows state:** muted text with city hint
- **Upcoming movies:** "Coming Soon" card with release date in amber

---

### 8.4 Booking / Seat Map Page

**File:** `app/booking/[showId]/page.tsx` + `booking.module.css`

#### Layout

```
[Navbar]
[2-column: Seat Map | Booking Summary]
```

#### Seat Map (left)

- **Screen indicator** at top:
  - Curved div with red glow: "All eyes this way"
- **10 rows × 12 columns** grid (120 seats per show)
- Row labels: A–J on left side
- Seat categories by row:
  - Rows A–E: **Silver** (muted grey)
  - Rows F–H: **Gold** (amber tint)
  - Rows I–J: **Platinum** (purple/blue tint)
- Seat states:
  - **Available** — default grey
  - **Selected** — solid red
  - **Booked** — dark grey, strikethrough, not clickable
  - **Locked by other** — amber/orange, not clickable, tooltip "Held by another user"
- Legend bar below map: Silver / Gold / Platinum / Selected / Held / Booked dots

#### Booking Summary (right)

- **Movie header:** mini poster (thumbnail) + title + theater + date/time
- **Selected Seats:** pill tags showing seat IDs (e.g. A3, B7)
  - Empty state: "Pick some seats to continue"
- **Price Breakdown:**
  - Tickets Total: ₹X
  - Convenience Fee (2%): ₹X
  - **Total Amount** (bold): ₹X
- **Lock Countdown Timer:** "⏱ Seats held for **MM:SS** — complete payment before time runs out"
  - Shown only when seats are locked
  - Auto-deselects seats + shows error toast when timer hits 0
- **Confirm & Pay** CTA button — disabled until at least 1 seat selected

#### Payment Modal

Triggered by "Confirm & Pay" button. Full-screen overlay, center card.

**Step 1 — Select Payment Method:**
- Amount display (large, prominent)
- 5 payment options as selectable radio-style cards:
  | Option | Icon | Description |
  |---|---|---|
  | Credit/Debit Card | 💳 | Visa, Mastercard, RuPay |
  | UPI | 📱 | GPay, PhonePe, Paytm |
  | Net Banking | 🏦 | All major banks |
  | Wallet | 👛 | Paytm, Amazon Pay |
  | CineBook Wallet | 🎬 | Balance: ₹X (disabled if insufficient) |
- Active method: red left border + elevated background
- Demo note: "🔒 This is a demo payment — no real money will be charged"
- Pay ₹X primary button

**Step 2 — Processing:**
- Large red spinner
- "Processing Payment..." heading
- "Please wait, do not close this window"
- 2-second simulated delay

**Step 3 — Success:**
- ✅ emoji
- "Payment Successful!" + "Generating your ticket..."
- Auto-redirects to ticket page after 1s

---

### 8.5 Auth — Login Page

**File:** `app/auth/login/page.tsx` + `auth.module.css`

#### Layout (Split Panel)

```
[Left Panel — 50% width, decorative]
[Right Panel — 480px fixed, form]
```

#### Left Panel

- Background: `linear-gradient(135deg, #0d0d14, #1a0a0d, #0a0a1a)`
- Subtle crosshatch SVG pattern overlay (2% opacity white)
- 3 floating radial gradient orbs (red, blue, amber) with `orbFloat` animation
- Logo: "🎬 CineBook" in Bebas Neue
- Title: "Your Cinema, Your Way." (52px, weight 800)
- Red underline accent (60×4px red gradient bar)
- Feature list: 4 pills ("🎭 1000+ Movies", "🪑 Smart Seat Selection", etc.)
- Hidden on screens ≤ 900px

#### Right Panel

- 480px wide, `--bg-secondary`, left border
- Slide-up animation on mount

#### Email Login Flow (2-step)

**Step 1:** Email/Username + Password
  - Password field with 👁️ toggle
  - Forgot password link (right-aligned)
  - 🚀 Sign In button

**Step 2:** Email OTP
  - 📧 icon + "We sent a 6-digit OTP to **ma***@gmail.com**"
  - Large centered OTP input (letter-spacing 6px, 20px font)
  - "OTP expires in 5 minutes" hint
  - ← Back link

#### Phone OTP Flow

- +91 prefix hardcoded in input
- "Send OTP" → then "Enter OTP" form
- Demo note: "OTP sent! demo use 123456 📱"

#### Tab Switcher

- "📧 Email" | "📱 Phone OTP" tabs
- Active tab: white bg card, elevated shadow

---

### 8.6 Auth — Register Page

**File:** `app/auth/register/page.tsx`

Same split-panel layout as Login. Form flow:

1. **Step 1:** Name + Email + Phone (+91 prefix) + Password → sends OTP
2. **Step 2:** 6-digit OTP verification → creates account + logs in

---

### 8.7 Profile Dashboard

**File:** `app/profile/page.tsx` + `profile.module.css`

#### Layout

```
[Navbar]
[2-column: Sidebar | Content Cards]
```

#### Sidebar

- Clickable avatar with 📷 upload overlay (hover reveals camera icon)
- Avatar: circular, 2px red border. Fallback: first letter on red gradient bg
- Name + email/phone
- Role badge
- Navigation links: 👤 Profile Overview, 🎟️ My Bookings, 🚪 Logout

#### Content Area

**Recent Activity Card:**
- 2 stat boxes: Total Bookings count, Active Tickets count

**Recent Bookings Grid:**
- Up to 3 most recent bookings
- Each card: mini poster + movie title + theater + date/time + booking ID + "View Ticket" button
- Skeleton placeholders while loading
- Empty state: "You haven't booked any movies yet" + Book Now button
- Error state: "Failed to load bookings" + Retry button

**CineBook Wallet Card:**
- Balance: `₹X.XX` in 32px red text
- "+ Add Money" toggle button → expands top-up form
- **Top-up form:** preset amounts (₹100/200/500/1000) + custom input + payment method select
- **Transaction history:** chronological list of credit/debit entries
  - Credit: `+₹X` in green (`#10b981`)
  - Debit: `-₹X` in red (`#ef4444`)
  - Date + description per row

**Password Manager Card:**
- New password input with 👁️/🙈 toggle
- Confirm password input
- Live mismatch error: "Passwords don't match"
- Update Password button (disabled until valid)

---

### 8.8 Admin Panel

**File:** `app/admin/page.tsx` + `admin.module.css`

#### Layout

```
Fixed Sidebar (260px) | Scrollable Main Content
```

Access: Redirects non-admin users immediately.

#### Sidebar

- Logo: "🎬 CineBook" with red accent
- Navigation tabs: Dashboard, Bookings, Users, Theaters, Movies
- Active tab: red glow background
- Logout button at bottom (red color)
- Hidden on mobile (≤768px)

#### Dashboard Tab

- **Stats Grid** (4 columns, 2 on tablet):
  - Total Revenue ₹X | Total Bookings | Total Users | Movies
  - Each card: emoji icon + large number + label + colored right accent bar
- **Recent Bookings Table:** user avatar, movie poster, amount, status badge, date
- **Top Movies:** title, bookings count, revenue
- **Theater Revenue Breakdown:** per-theater stats

#### Booking Status Badges

| Status | Color |
|---|---|
| confirmed | Green |
| cancelled | Red |
| pending | Amber |
| used | Blue |
| refunded | Grey |

#### Movies Tab

- Table: poster thumbnail, title, status badge, rating, bookings count
- Edit (blue) / Delete (red) action buttons per row
- Inline edit form with 2-column grid layout

#### Users Tab

- Table: avatar circle (first letter), name, email/phone, join date
- Click row → expands user's booking history

#### Theaters Tab

- Paginated table with city filter
- Click theater → shows list of shows
- Click show → seat map viewer with per-seat booking info and lock status

---

## 9. Reusable Components

### 9.1 Navbar

**File:** `components/layout/Navbar.tsx` + `Navbar.module.css`

#### Visual Behavior

- **Initial:** fully transparent background
- **Scrolled (>20px):** `rgba(10,10,15,0.95)` + `backdrop-filter: blur(20px)` + bottom border + shadow
- Transition: `all 0.3s ease`

#### Elements (left to right)

| Element | Detail |
|---|---|
| Logo | 🎬 (floats infinitely) + "Cine**Book**" in Bebas Neue, accent on "Book" |
| City Selector | Pill button with pin icon + selected city + chevron |
| Nav Links | Home / Movies / Cinemas — active = red glow pill |
| Search Bar | Pill input, focus = red border, Enter → `/movies?search=X` |
| Auth Section | Login (ghost) + Sign Up (red) if logged out |
| User Menu | Avatar button → dropdown if logged in |

#### City Dropdown

- Appears below city button, `animation: slideDown 0.15s`
- "🎯 Use My Location" — red glow button at top
- Detection spinner while GPS/IP lookup runs
- Scrollable list of 39 cities, active city highlighted red
- Max height: 360px, overflow-y auto

#### User Dropdown

- User info header: avatar + name + email (truncated)
- Links: 👤 My Profile, 🎟️ My Bookings, 🛡️ Admin Panel (admin only)
- Logout in red with red hover bg

#### Mobile Menu

- Hamburger → animated X on open
- Slides down: nav links + auth buttons
- Hidden on desktop (≤768px hides nav links and search)

---

### 9.2 LocationModal

**File:** `components/layout/LocationModal.tsx` + `LocationModal.module.css`

- **Trigger:** shown automatically when no city is stored in `localStorage`
- **Overlay:** `rgba(0,0,0,0.85)` + `backdrop-filter: blur(8px)`, z-index 2000
- **Modal:** max-width 600px, `scaleUp` animation
- **"Use My Current Location" button:** full-width, red glow bg, 🎯 icon + "accurate via GPS" pill hint
- **Error state:** amber warning box with message text
- **City grid:** `repeat(auto-fill, minmax(130px, 1fr))`, max-height 300px scrollable
- Each city card: name + `→` arrow (reveals on hover), red glow hover
- Footer note: "Don't see your city? We're expanding soon! 🍿"
- Auto-closes when city is set

---

### 9.3 MovieCard

**File:** `components/movies/MovieCard.tsx` + `MovieCard.module.css`

#### Visual Structure

```
[Card Link]
  [Poster Wrapper — aspect-ratio 2/3]
    [Next/Image — lazy loaded, scale on hover]
    [Hover Overlay — gradient + "Book Tickets" button]
    [Rating Badge — top-right: ⭐ X.X]
    [Status Badge — top-left: ● Now Playing / ◎ Upcoming]
  [Info Block]
    [Title — truncated 1 line]
    [Genre (left) · Duration (right)]
    [Language Tags — up to 3 pills]
```

#### Interactions

- Card lifts `translateY(-8px)` + stronger shadow on hover
- Poster scales `1.06` on hover
- "Book Tickets" button slides up from bottom on hover (`translateY(8px → 0)`)
- Overlay fades in on hover (opacity 0 → 1)

#### Status Badge Colors

| Status | Style |
|---|---|
| `now_playing` | Green tint (`rgba(16,185,129,0.2)`) + green text |
| `upcoming` | Blue tint (`rgba(59,130,246,0.2)`) + blue text |

#### Language Tags

- Pill shape, `--bg-elevated` bg, muted color
- Shows max 3 languages

---

## 10. Loading & Feedback States

### Skeleton Screens

Used on: Home (movie grids), Movies listing, Profile bookings, Admin tables.

```jsx
Array(4).fill(0).map((_, i) => (
  <div key={i} className="skeleton" style={{aspectRatio: '2/3', borderRadius: '12px'}} />
))
```

### Render Cold Start Warning

On the homepage, if data hasn't arrived after 6 seconds:
```
⏳ Server is waking up, please wait a moment…
```
Displayed above the skeleton tiles. Auto-hides when data loads.

### Loading Spinner

- 40×40px red-border spinner
- Used on full-page transitions (auth, booking redirect)

### Toast Notifications

Configured in `layout.tsx`:
- Position: top-right
- Background: `#1a1a26` (card bg)
- White text, rounded 10px, thin white border
- Success icon: `#10b981` green
- Error icon: `#e50914` red

### Empty States

| Page | Message |
|---|---|
| Home — no movies | Dashed border box: "No movies found currently playing." |
| Movies listing | Icon + "No movies found" + tip to adjust filters |
| Booking — no seat selected | "Pick some seats to continue" |
| Profile — no bookings | "You haven't booked any movies yet." + Book Now CTA |
| Movie detail — no shows | "No shows available in [city] for this date." |

### Error States

- API errors: `react-hot-toast` error toast
- Auth errors: inline red banner (especially for wrong login method)
- Show fetch failure: inline message + Retry button
- Booking conflict (409): toast + seat map refresh

---

## 11. Responsive Breakpoints

| Breakpoint | Target | Key Changes |
|---|---|---|
| `≤ 1024px` | Tablet | 4-col grid → 3 col; movie detail sidebar stacks |
| `≤ 900px` | Small tablet | Auth left panel hidden; right panel full width |
| `≤ 768px` | Mobile | Navbar hides links + search, shows hamburger; 2-col grids; footer stacks |
| `≤ 480px` | Small mobile | Hero title shrinks to 36px; all grids → 1 col; auth smaller padding |

Container padding: 24px desktop → 16px mobile.

---

## 12. Accessibility Notes

- All interactive buttons have `cursor: pointer`
- Disabled states use `opacity: 0.5` + `cursor: not-allowed`
- Seat buttons have `title` tooltips with category, row, and column info
- Navbar hamburger has `aria-label="Menu"`
- Images use `alt` text throughout
- Form inputs have associated `<label>` elements
- `lang="en"` set on root `<html>`
- OTP input has `autoFocus` for keyboard users
- Keyboard-accessible dropdowns (triggered by button click)
- Color is not the sole indicator of status (text labels accompany all badges)

**Note:** Full WCAG compliance requires manual testing with screen readers and assistive technologies.

---

## 13. User Flows

### New User — First Visit

```
1. Land on Home (/)
   → LocationModal appears (no city in localStorage)
2. Select city or grant GPS location
   → Modal closes, movies load
3. Click "Sign Up" → /auth/register
4. Fill name + email + phone + password → OTP sent
5. Enter OTP → account created + auto-logged-in
6. Redirected to / or original destination
```

### Returning User — Book a Movie

```
1. Home (/) → city auto-restored from localStorage
2. Click movie card → /movies/[id]
3. Select date on booking card
4. Click show time → /booking/[showId]
   (redirected to login if not authenticated)
5. Click seats on map (seats lock for 10 min)
6. "Confirm & Pay" → payment modal
7. Select payment method → Pay → 2s processing → success
8. Redirected to /profile/bookings/[bookingId]
9. Download PDF ticket with QR code
```

### Admin Flow

```
1. /auth/login with admin credentials
   → no OTP required, direct JWT
2. Redirected to /admin
3. Left sidebar: Dashboard / Bookings / Users / Theaters / Movies tabs
4. Manage movies (CRUD), view bookings, cancel bookings
5. Drill into theater → view show → inspect seat map
```

### Seat Lock Race Condition (UX handling)

```
User A selects seat B5 → locked (amber on all other screens)
User B tries seat B5 → toast error "Held by another user"
If User A doesn't pay within 10 min → seat auto-released
User B can now select B5
If both reach checkout simultaneously → atomic DB check → loser gets 409 conflict toast + seat map refreshes
```

---

*Generated from source analysis of `client/src` — CineBook v1.0*
