# Design Brief: Aufgabenverwaltung

## 1. App Analysis

### What This App Does
This is a task management system (Aufgabenverwaltung) that helps users organize their tasks into categories with priorities and due dates. Users can create categories with color coding and assign tasks to these categories, tracking completion status.

### Who Uses This
Professionals and individuals who need a clean, focused way to manage their daily tasks and projects. They want quick visibility into what's due, what's high priority, and what they've accomplished.

### The ONE Thing Users Care About Most
**How many tasks are open and what needs attention right now?** Users open this dashboard to see at a glance what's pending, what's overdue, and what high-priority items need immediate action.

### Primary Actions (IMPORTANT!)
1. **Neue Aufgabe** → Primary Action Button (most frequent action)
2. Edit existing task (mark complete, change priority)
3. Create/manage categories

---

## 2. What Makes This Design Distinctive

### Visual Identity
A warm, approachable task management interface with a cream-tinted background and deep teal accents. Unlike cold, corporate task managers, this feels personal and motivating. The teal accent represents focus and calm productivity, while warm undertones make the interface feel welcoming rather than intimidating.

### Layout Strategy
- **Asymmetric layout on desktop**: Hero section (open tasks count + overdue warning) takes 40% left, task list takes 60% right
- **Mobile hero dominates the first viewport**: Large task count with progress ring, immediately showing completion percentage
- **Size variation creates hierarchy**: The hero "Offene Aufgaben" counter is significantly larger (64px) than secondary stats (24px)
- **Cards vs inline**: Hero uses a card with extra breathing room; secondary KPIs are compact inline badges

### Unique Element
The **priority-colored task cards** with subtle left border accents. Each priority level (Sehr hoch = deep red, Hoch = orange, Mittel = amber, Niedrig = teal) has a 4px left border that creates instant visual scanning. Combined with a circular completion checkbox that animates on toggle, this creates a satisfying, game-like interaction.

---

## 3. Theme & Colors

### Font
- **Family:** Plus Jakarta Sans
- **URL:** `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap`
- **Why this font:** Modern, geometric but warm. Has excellent number rendering for KPIs and feels more refined than generic sans-serifs. The slightly rounded terminals add friendliness without sacrificing professionalism.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(45 30% 97%)` | `--background` |
| Main text | `hsl(200 25% 15%)` | `--foreground` |
| Card background | `hsl(0 0% 100%)` | `--card` |
| Card text | `hsl(200 25% 15%)` | `--card-foreground` |
| Borders | `hsl(45 15% 88%)` | `--border` |
| Primary action | `hsl(175 50% 35%)` | `--primary` |
| Text on primary | `hsl(0 0% 100%)` | `--primary-foreground` |
| Accent highlight | `hsl(175 50% 35%)` | `--accent` |
| Muted background | `hsl(45 20% 94%)` | `--muted` |
| Muted text | `hsl(200 10% 45%)` | `--muted-foreground` |
| Success/positive | `hsl(160 60% 40%)` | (component use) |
| Error/negative | `hsl(0 70% 50%)` | `--destructive` |
| Priority sehr_hoch | `hsl(0 70% 50%)` | (component use) |
| Priority hoch | `hsl(25 90% 50%)` | (component use) |
| Priority mittel | `hsl(45 90% 50%)` | (component use) |
| Priority niedrig | `hsl(175 50% 35%)` | (component use) |

### Why These Colors
The warm cream background (`hsl(45 30% 97%)`) creates a paper-like feeling that reduces eye strain during extended use. Teal (`hsl(175 50% 35%)`) as the primary accent represents calm focus - neither urgent nor passive. The priority colors follow a natural "temperature" gradient from hot (red/sehr hoch) to cool (teal/niedrig).

### Background Treatment
Subtle warm cream tint, not pure white. This creates visual warmth and reduces the clinical feeling of typical task apps. No gradients or patterns - the color itself provides enough character.

---

## 4. Mobile Layout (Phone)

### Layout Approach
The hero (open tasks count + completion progress) dominates the first 35% of viewport height. Below it, a compact horizontal strip shows overdue and today's tasks. The remaining space is a scrollable task list with the most urgent items first. Visual hierarchy is created through the oversized hero number and subtle size differences in secondary stats.

### What Users See (Top to Bottom)

**Header:**
- App title "Aufgaben" left-aligned, text-foreground, font-weight 600, 20px
- "+" button (primary action) right-aligned, 44x44px touch target, primary background, white icon

**Hero Section (The FIRST thing users see):**
- Full-width card with 24px padding
- "Offene Aufgaben" label in muted-foreground, 14px, font-weight 500
- Large number counter: 64px, font-weight 700, foreground color
- Circular progress ring below number: 80px diameter, 8px stroke, shows completion percentage
- "X von Y erledigt" below ring, muted-foreground, 14px
- **Why hero:** Users need instant clarity on workload size

**Section 2: Urgency Badges (Compact horizontal row)**
- Two badges side by side, full width
- Left: "Überfällig" count with destructive color accent
- Right: "Heute fällig" count with warning (amber) accent
- Each badge: 48px height, 14px text, icon + number format
- Tapping either badge filters the task list

**Section 3: Kategorien Filter**
- Horizontal scroll row of category pills
- Each pill shows category name + color dot + count
- "Alle" pill selected by default
- Height: 36px pills with 8px gaps

**Section 4: Task List**
- Scrollable list of task cards
- Each card: 4px left border (priority color), checkbox, title, due date badge
- Sorted: Overdue first, then by due date, then by priority
- Completed tasks at bottom, slightly muted

**Bottom Navigation / Action:**
- Floating Action Button: 56px, bottom-right, 16px from edges
- Primary color, white "+" icon
- Shadow for elevation

### Mobile-Specific Adaptations
- Categories become horizontal scroll instead of grid
- Task cards are full-width with compact padding (12px)
- Priority is shown via left border color only (no text label)
- Due date shows as compact badge ("Heute", "Morgen", "Überfällig", or "DD.MM")

### Touch Targets
- All buttons minimum 44x44px
- Checkbox is 24x24px with 44x44px touch area
- Task card entire row is tappable to open detail/edit

### Interactive Elements
- Tap task card → Opens task detail dialog with edit/delete options
- Tap checkbox → Toggles completion with animation
- Tap category pill → Filters task list
- Tap urgency badge → Filters to overdue/today tasks

---

## 5. Desktop Layout

### Overall Structure
Two-column asymmetric layout:
- **Left column (40%)**: Hero stats area - stacked vertically with open tasks, progress ring, and urgency indicators
- **Right column (60%)**: Task list with category tabs above it

The eye goes: Hero number (largest) → Progress ring → Urgency badges → Category tabs → Task list

### Section Layout

**Top Header Bar (full width):**
- Left: "Aufgabenverwaltung" title, 24px, font-weight 600
- Right: "Neue Aufgabe" primary button + "Neue Kategorie" secondary button

**Left Column (40%, sticky):**
- Hero card with open tasks count (48px number), progress ring, completion stats
- Below: Two stat cards side-by-side for Überfällig and Heute
- Below: "Letzte Aktivität" - 3 most recent completed tasks

**Right Column (60%):**
- Category filter tabs (all categories as toggleable pills)
- Task list table with columns: Checkbox, Title, Kategorie, Fälligkeit, Priorität, Actions
- Sortable by clicking column headers
- Pagination at bottom if >15 tasks

### What Appears on Hover
- Task row: Subtle background highlight + Edit/Delete icons appear on right
- Category pill: Subtle scale transform (1.02)
- Buttons: Slight brightness increase

### Clickable/Interactive Areas
- Task row → Opens inline edit or detail dialog
- Category badge in task → Opens category management
- Column headers → Toggle sort direction

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** Offene Aufgaben
- **Data source:** Aufgaben app
- **Calculation:** Count where aufgabe_erledigt !== true
- **Display:** Large number (64px mobile, 48px desktop) with circular progress ring showing completion percentage
- **Context shown:** "X von Y erledigt" text below, progress ring visualizes the ratio
- **Why this is the hero:** Users need immediate clarity on their current workload to prioritize their day

### Secondary KPIs

**Überfällig (Overdue)**
- Source: Aufgaben
- Calculation: Count where aufgabe_faelligkeit < today AND aufgabe_erledigt !== true
- Format: number
- Display: Compact badge card with destructive color accent, icon (AlertCircle)

**Heute fällig (Due Today)**
- Source: Aufgaben
- Calculation: Count where aufgabe_faelligkeit === today AND aufgabe_erledigt !== true
- Format: number
- Display: Compact badge card with amber warning accent, icon (Clock)

**Erledigte Aufgaben (This Week)**
- Source: Aufgaben
- Calculation: Count where aufgabe_erledigt === true AND updatedat within last 7 days
- Format: number
- Display: Small stat on desktop only, with success color accent

### Chart (if applicable)
Not needed for initial version. Task management is action-oriented, not analytics-oriented. The progress ring in the hero serves as the primary visualization.

### Lists/Tables

**Task List (Mobile)**
- Purpose: Show all tasks in scannable format for quick action
- Source: Aufgaben
- Fields shown: Checkbox, Title (aufgabe_titel), Due date badge, Priority (via left border color)
- Mobile style: Cards with 4px priority-colored left border
- Sort: Overdue first, then by aufgabe_faelligkeit ASC, then by priority (sehr_hoch first)
- Limit: Show all (scrollable)

**Task List (Desktop)**
- Purpose: Detailed task management with sorting and bulk actions
- Source: Aufgaben
- Fields shown: Checkbox, Title, Category name (via lookup), Due date, Priority badge, Action icons
- Desktop style: Table rows with hover states
- Sort: User-configurable via column headers, default same as mobile
- Limit: 15 per page with pagination

**Category List (in Management Dialog)**
- Purpose: CRUD for categories
- Source: Kategorien
- Fields shown: Color dot, Name, Description (truncated), Task count, Actions
- Desktop style: Table
- Sort: By name alphabetically

### Primary Action Button (REQUIRED!)

- **Label:** Neue Aufgabe
- **Action:** add_record
- **Target app:** Aufgaben
- **What data:** aufgabe_titel (required), aufgabe_beschreibung (optional textarea), aufgabe_faelligkeit (date picker), aufgabe_prioritaet (select from lookup_data), aufgabe_kategorie (select from Kategorien), aufgabe_erledigt (default false, hidden)
- **Mobile position:** fab (floating action button, bottom-right)
- **Desktop position:** header (top-right, alongside "Neue Kategorie" secondary button)
- **Why this action:** Creating tasks is the most frequent action - users are always adding new things to do

### CRUD Operations Per App (REQUIRED!)

**Aufgaben CRUD Operations**

- **Create (Erstellen):**
  - **Trigger:** FAB on mobile, "Neue Aufgabe" button in header on desktop
  - **Form fields:**
    - aufgabe_titel (text input, required)
    - aufgabe_beschreibung (textarea, optional)
    - aufgabe_faelligkeit (date picker, optional)
    - aufgabe_prioritaet (select: Niedrig, Mittel, Hoch, Sehr hoch)
    - aufgabe_kategorie (select from Kategorien app records)
  - **Form style:** Dialog/Modal
  - **Required fields:** aufgabe_titel
  - **Default values:** aufgabe_erledigt = false, aufgabe_prioritaet = "mittel"

- **Read (Anzeigen):**
  - **List view:** Card list (mobile), Table rows (desktop)
  - **Detail view:** Click on task → Dialog showing all fields including description
  - **Fields shown in list:** Title, due date, priority (color), category (if assigned)
  - **Fields shown in detail:** All fields including full description
  - **Sort:** Overdue first, then by due date, then by priority
  - **Filter/Search:** Filter by category (pills), filter by completion status (toggle)

- **Update (Bearbeiten):**
  - **Trigger:** Click task row/card to open detail dialog, then "Bearbeiten" button; OR pencil icon on hover (desktop)
  - **Edit style:** Same dialog as Create but pre-filled with current values
  - **Editable fields:** All fields
  - **Toggle completion:** Checkbox in list view directly toggles aufgabe_erledigt

- **Delete (Löschen):**
  - **Trigger:** Trash icon in detail dialog OR swipe left on mobile OR trash icon on hover (desktop)
  - **Confirmation:** Always require confirmation
  - **Confirmation text:** "Möchtest du die Aufgabe '{aufgabe_titel}' wirklich löschen?"

**Kategorien CRUD Operations**

- **Create (Erstellen):**
  - **Trigger:** "Neue Kategorie" button (secondary, desktop header) OR gear icon → opens category management dialog
  - **Form fields:**
    - kategorie_name (text input, required)
    - kategorie_beschreibung (textarea, optional)
    - kategorie_farbe (color select: Rot, Blau, Grün, Orange, Lila, Grau, Gelb)
  - **Form style:** Dialog/Modal
  - **Required fields:** kategorie_name
  - **Default values:** kategorie_farbe = "blau"

- **Read (Anzeigen):**
  - **List view:** Table in category management dialog, pills in filter bar
  - **Detail view:** Same dialog, editable form
  - **Fields shown in list:** Color dot, Name, Task count (calculated)
  - **Fields shown in detail:** All fields
  - **Sort:** Alphabetically by name
  - **Filter/Search:** None needed (typically <10 categories)

- **Update (Bearbeiten):**
  - **Trigger:** Click category row in management dialog → shows edit form
  - **Edit style:** Inline in dialog, same fields as create
  - **Editable fields:** All fields

- **Delete (Löschen):**
  - **Trigger:** Trash icon in category management row
  - **Confirmation:** Always require confirmation
  - **Confirmation text:** "Möchtest du die Kategorie '{kategorie_name}' wirklich löschen? Aufgaben mit dieser Kategorie verlieren ihre Zuordnung."

---

## 7. Visual Details

### Border Radius
rounded (8px) - Modern but not overly playful. Cards use 12px for slightly softer appearance.

### Shadows
subtle - Cards have `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)). On hover, cards lift slightly with `shadow-md`. FAB has `shadow-lg` for elevation.

### Spacing
normal - 16px base padding on cards, 24px on hero. 8px gaps between list items. 16px margins between sections.

### Animations
- **Page load:** Subtle fade-in (200ms) for content areas
- **Hover effects:** Background color transition (150ms), shadow lift on cards
- **Tap feedback:** Checkbox has satisfying scale + checkmark animation on toggle
- **Task completion:** Card slides slightly left then fades to muted state
- **Delete:** Card fades out (150ms) then list collapses smoothly

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
:root {
  --background: hsl(45 30% 97%);
  --foreground: hsl(200 25% 15%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(200 25% 15%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(200 25% 15%);
  --primary: hsl(175 50% 35%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(45 20% 94%);
  --secondary-foreground: hsl(200 25% 30%);
  --muted: hsl(45 20% 94%);
  --muted-foreground: hsl(200 10% 45%);
  --accent: hsl(175 50% 35%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 70% 50%);
  --border: hsl(45 15% 88%);
  --input: hsl(45 15% 88%);
  --ring: hsl(175 50% 35%);
  --radius: 0.5rem;
  --chart-1: hsl(175 50% 35%);
  --chart-2: hsl(160 60% 40%);
  --chart-3: hsl(45 90% 50%);
  --chart-4: hsl(25 90% 50%);
  --chart-5: hsl(0 70% 50%);
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Font loaded from URL above (Plus Jakarta Sans)
- [ ] All CSS variables copied exactly
- [ ] Mobile layout matches Section 4
- [ ] Desktop layout matches Section 5
- [ ] Hero element is prominent as described (large number, progress ring)
- [ ] Colors create the mood described in Section 2 (warm, calm productivity)
- [ ] CRUD patterns are consistent across all apps
- [ ] Delete confirmations are in place
- [ ] Priority colors correctly applied to task left borders
- [ ] Category color dots display correctly
- [ ] Task completion toggles with animation
- [ ] FAB positioned correctly on mobile
- [ ] Desktop header has both action buttons
