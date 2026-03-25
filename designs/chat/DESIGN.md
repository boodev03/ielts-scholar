# Design System Document: High-End Editorial Academic Learning

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Scholar"
This design system moves away from the "generic SaaS" aesthetic and toward a high-end, editorial learning experience. It is designed to feel like a bespoke digital encyclopedia—authoritative, calm, and intellectually stimulating. We achieve this by rejecting rigid, boxy layouts in favor of intentional whitespace, sophisticated tonal layering, and an aggressive focus on typographic hierarchy.

By prioritizing "breathing room" (the `16` and `20` spacing tokens), we reduce cognitive load, allowing the student to focus entirely on language acquisition. The interface does not compete for attention; it frames the educational content with premium restraint.

---

## 2. Colors & Surface Philosophy

The palette is anchored by a deep, intellectual Emerald (`primary: #004532`) and supported by a sophisticated range of architectural grays.

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Do not use lines to separate the sidebar from the chat, or the chat from the learning insights. Boundaries must be defined solely through:
*   **Background Shifts:** Use `surface_container_low` for the main canvas and `surface_container_lowest` (pure white) for high-focus content areas.
*   **Tonal Transitions:** A section sitting on `surface` can be distinguished by moving to `surface_container`.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers.
1.  **Base Layer:** `surface` (#f7f9fb) – The global background.
2.  **Section Layer:** `surface_container` (#eceef0) – Used for the sidebar or secondary panels.
3.  **Content Layer:** `surface_container_lowest` (#ffffff) – Used for the primary chat bubbles or active learning cards to make them "pop" against the gray base.

### The "Glass & Gradient" Rule
For "floating" elements like the Vocabulary Popover, use Glassmorphism. Implement a semi-transparent `surface_container_lowest` with a `backdrop-blur` of 12px. This ensures the popover feels integrated into the context rather than an intrusive overlay.
*   **Signature Texture:** Use a subtle linear gradient on the Primary Button from `primary` (#004532) to `primary_container` (#065f46) at a 135-degree angle to add depth and "soul."

---

## 3. Typography

The system utilizes a dual-font strategy to balance academic authority with modern readability.

*   **Display & Headlines (Plus Jakarta Sans):** Used for "Learning Insights," page titles, and major headers. The wider aperture of this font creates a welcoming, contemporary feel. Use `headline-lg` for impactful progress headers.
*   **Body & Titles (Inter):** Used for the core learning content, chat messages, and UI labels. Inter’s tall x-height ensures maximum legibility during long reading sessions.

**Hierarchy Tip:** Use weight as your primary tool. A `title-md` in Bold for a vocabulary term paired with `body-md` in Regular for its definition creates a clear, professional contrast without needing different colors.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" in favor of **Ambient Tonal Layering.**

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. The contrast in light values creates a "natural lift."
*   **Ambient Shadows:** For floating popovers (like the Vocabulary card), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(25, 28, 30, 0.06);`. The shadow color is derived from `on_surface` to mimic natural light.
*   **The "Ghost Border" Fallback:** If a container needs more definition (e.g., in high-density data views), use a "Ghost Border": `outline_variant` (#bec9c2) at **15% opacity**. Never use 100% opaque outlines.

---

## 5. Components

### Cards & Lists
*   **Rounding:** Use `lg` (1rem) for standard cards and `xl` (1.5rem) for the main chat container.
*   **Spacing:** Forbid dividers. Separate vocabulary list items using `spacing.4` (1.4rem) of vertical whitespace.
*   **Vocabulary Popover:** This must use the Glassmorphism rule. It should appear to "float" above the text with an `xl` corner radius.

### Buttons
*   **Primary:** Solid `primary` fill with white text. Use the "Signature Texture" gradient. On hover, shift to `primary_fixed_variant`.
*   **Secondary:** `surface_container_high` background with `on_surface` text. No border.
*   **Tactile Feedback:** On `:active`, scale the button slightly (0.98) to provide a premium, responsive feel.

### Chat Interface
*   **User Message:** `primary_container` background with `on_primary_container` text. Aligned right with `lg` rounding, but `sm` rounding on the bottom-right corner.
*   **AI Message:** `surface_container_lowest` background. No border. Use a slightly larger `spacing.3` for internal padding to emphasize the "Academic" style.

### Input Fields
*   **The Soft Input:** Instead of a box, use a `surface_container_highest` fill with no border. On focus, add a 2px `surface_tint` "Ghost Border."

---

## 6. Do's and Don'ts

### Do:
*   **Do** use `spacing.20` and `spacing.24` for top-level page margins to create an "Editorial" feel.
*   **Do** use `surface_container_low` to group related sidebar items instead of using lines.
*   **Do** vary font weights (Medium vs Regular) to create hierarchy in the Learning Insights panel.

### Don't:
*   **Don't** use 1px solid black or dark gray borders. It breaks the "premium" illusion.
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#191c1e) for a softer, more sophisticated look.
*   **Don't** crowd the vocabulary popover. If there is more information, use a scrollable area with a `surface_container_low` background shift.
*   **Don't** use "standard" blue for links. Use `primary` or `surface_tint` to keep the brand identity cohesive.