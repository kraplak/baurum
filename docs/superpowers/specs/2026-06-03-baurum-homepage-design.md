# BAURUM Homepage Design Spec

Date: 2026-06-03
Version: 1.0
Scope: Homepage concept prototype for the BAURUM digital flagship store.

## Decision

Use the name BAURUM across the new website concept. Any previous BAUROOM references are treated as legacy naming and should be rewritten to BAURUM in the new interface.

Approved visual direction: Artifact Laboratory + Ivory Gallery.

The homepage should not behave like an ecommerce landing page. It should feel like a quiet digital flagship for rare contemporary artifacts built around untreated gemstones.

## Brand Goal

The primary goal is not to sell a ring immediately. The page must create desire to own a BAURUM artifact.

The visitor should feel they entered a space of rare objects: part contemporary art museum, part design gallery, part architectural studio, part private members club, part high-end luxury brand.

Core feeling:

- Silence
- Air
- Rarity
- Intelligence
- Precision

No discounts, popups, banners, urgency mechanics, loud promotions, or aggressive sales language.

## Visual Direction

### Artifact Laboratory

Use for the first screen and the most object-focused moments.

- Dark graphite or near-black environment.
- One object as the emotional and visual center.
- Technical precision in layout, labels, spacing, and motion.
- Gemstone as the only saturated or emotionally intense element.
- Quiet, high-end, controlled, slightly future-facing.

References in spirit: Apple product reveals, Dieter Rams restraint, Bauhaus order, Aesop silence, sci-fi product laboratory.

### Ivory Gallery

Use for manifesto, catalog, journal, founder, and footer sections.

- Ivory and warm white surfaces.
- Large fields of negative space.
- Editorial typography and calm section rhythm.
- Objects treated as exhibits, not products.
- Information appears as provenance, not marketing.

## Color System

Use the brandbook palette:

- Black: `#090A09`
- Graphite: `#1D2422`
- Ivory: `#F2EFE6`
- Warm Stone: `#DDD2BE`
- Dark Gold: `#A98B5A`
- Emerald Black: `#0A3B31`

Color behavior:

- Black/graphite should carry the opening atmosphere.
- Ivory should create breath and gallery quiet.
- Dark Gold should be used only as a detail accent, never as a dominant luxury signal.
- Emerald Black may be used as a gemstone accent or hover/state detail.

## Typography

Practical prototype stack:

- Display: Cormorant Garamond or Libre Baskerville for large manifesto/editorial moments.
- Interface/body: Inter for navigation, body copy, artifact metadata, and controls.
- Technical labels: IBM Plex Mono or Space Mono for artifact numbers, section indices, material notes, and provenance-style details.

Typography rules:

- Minimal text.
- Large margins.
- No compressed marketing paragraphs.
- No negative letter spacing.
- Large type only where the page truly needs scale: hero, manifesto, and major section openings.
- Artifact cards should use tight, calm metadata rather than dramatic product names.

## Homepage Structure

### 01 Hero

Purpose: Create immediate desire and establish the artifact world.

Composition:

- Full-viewport or near-full-viewport dark section.
- One large ring render centered or slightly off-center.
- BAURUM wordmark/name present with generous clear space.
- Navigation is minimal and quiet.
- Primary text:
  - `Rare untreated gemstones.`
  - `Timeless minimal forms.`
- CTA:
  - `Explore Artifacts`

Rules:

- No secondary CTA.
- No price.
- No "shop now".
- No large explanatory paragraph.
- The object must be the first-viewport signal.

### 02 Manifest

Purpose: State the brand idea in one precise line.

Copy:

`We create contemporary artifacts around rare natural gemstones.`

Composition:

- Ivory or warm white background.
- Oversized editorial typography.
- Large negative space.
- Optional small technical label such as `01 / Essence`.

### 03 Featured Artifacts

Purpose: Show the product system as collectible objects.

Content:

- 4-6 artifact cards.
- No prices.
- No buy buttons.
- Metadata format:
  - `Artifact 017`
  - `Emerald Core`
  - `18K Gold`

Composition:

- Gallery grid with strict alignment.
- Images should feel like object studies, not catalog thumbnails.
- Cards should be simple and low-border or borderless.
- Hover may reveal a quiet detail, but no loud animation.

### 04 The Stone Comes First

Purpose: Explain the design principle.

Copy:

`Every BAURUM piece begins with a gemstone.`

`The stone defines everything.`

Composition:

- Large macro gemstone render or image.
- Text placed with museum-like restraint.
- The gemstone can carry the strongest color moment on the page.

### 05 Materials

Purpose: Make quality feel factual, not boastful.

Items:

- Untreated Gemstones
- 18K Gold
- 925 Silver
- Hand Finished
- Lifetime Service

Composition:

- Specification-like list.
- No decorative icons unless they are extremely restrained.
- Could use mono labels and thin dividers.

### 06 Process

Purpose: Show trust through sequence.

Steps:

- Gemstone
- Design
- Craft
- Ownership

Composition:

- Architectural timeline or four calm columns.
- No process overexplaining on the homepage.
- Each step receives one short sentence at most.

### 07 Journal

Purpose: Introduce the quiet SEO and philosophy layer.

Topics:

- The Nature of Emerald
- Why Untreated Stones Matter
- Objects of Personal Significance

Composition:

- Editorial archive presentation, not blog cards.
- Large image/text balance.
- No category clutter.

### 08 Founder

Purpose: Add human credibility without turning the site into biography.

Composition:

- Founder portrait.
- Short restrained text.
- Tone: author-led, precise, credible.
- No long timeline on the homepage.

### 09 Footer

Purpose: Close with private access and practical routes.

Content:

- Contact
- Social links
- Private request
- Subscription

Composition:

- Quiet, spacious, low contrast.
- No newsletter pressure language.

## Interaction

The prototype should include subtle, controlled interaction:

- Smooth section transitions where appropriate.
- Slow object reveal on hero load.
- Gentle hover states on artifact cards.
- No popups.
- No sticky promotional bars.
- No aggressive conversion mechanics.

Motion should feel like product inspection, not entertainment.

## Content Rules

Use:

- rare
- untreated
- artifact
- precision
- stone first
- personal significance
- crafted individually
- private request

Avoid:

- discount
- best price
- magic
- energy guarantee
- instant success
- fashion trend
- mass collection
- limited offer
- "shop now"

The deeper Vedic and symbolic layer should remain available through Gemstones and Journal, not forced into the first screen.

## Prototype Requirements

First implementation should focus only on the homepage style system:

- Build the homepage concept.
- Establish typography, color, scale, and spacing.
- Include placeholder object/gemstone imagery if final renders are not available.
- Keep the code ready to replace placeholders with final 3D renders and macro photography.
- Do not build full Artifacts, Gemstones, Journal, About, or Contact pages yet.

## Success Criteria

The homepage prototype succeeds if:

- It feels like a rare-object flagship, not a jewelry shop.
- The first screen creates desire through silence and object presence.
- The typography feels premium, restrained, and legible.
- The page has enough air on desktop and mobile.
- The artifact system feels numbered, collectible, and exact.
- The CTA feels like private access, not pressure.
- The design can become the visual foundation for the rest of the site.

## Open Implementation Notes

- The current repository contains an `agent_console` Next app that is not the public BAURUM site. Implementation should either create a dedicated public-site surface inside the repo or clearly separate the homepage prototype from the agent console.
- If final jewelry renders are unavailable, use temporary generated or placeholder visual assets that match the approved direction: dark object render, macro gemstone, strict architectural composition.
- The prototype should be verified visually in browser at desktop and mobile widths before presenting it as complete.
