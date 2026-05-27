# BAURUM Agent System

This directory contains versioned agent workflows for BAURUM growth operations.

The first workflow is `astro_weekly_content`: a chain for producing sourced
astrological and Vedic content for Telegram, blog, Instagram/YouTube adaptation,
visual briefs, and a Google Sheets publication queue. Gemstones are included
only when they are naturally relevant, not as a forced advertising layer.

## Operating Principle

Agents do not pass vague chat messages to each other. Each agent produces a
structured artifact with:

- source assumptions;
- key findings or creative output;
- confidence level;
- unresolved questions;
- exact handoff payload for the next agent.

The orchestration layer can later be implemented with OpenAI Agents SDK,
LangGraph, or a custom runner. The prompts and contracts here are designed to
survive that migration.

## Recommended Stack

- GitHub: version control for agents, schemas, workflow definitions.
- Vercel: dashboard and manual review UI.
- Supabase/Postgres: persistent runs, artifacts, approvals, publishing queue.
- Notion: visual editorial calendar and human-facing operating system.
- Google Sheets: simple publication queue for Telegram scripts.
- Canva/Image generation: visual briefs and generated post assets.
- Telegram bot: approval notifications and optional publishing.

## First Workflow

`workflows/astro_weekly_content.yml`

Purpose:

Create a high-quality content package from either:

1. a user-assigned theme, e.g. "Jupiter and yellow sapphire";
2. weekly astrological events, e.g. lunar phases, transits, nakshatra themes;
3. BAURUM commercial priorities, e.g. a page, collection, gemstone, or ring design.

Output:

- source cards with links, 300-character summaries, and extended summaries;
- topic candidates for Pavel to choose from;
- approved topic list;
- Telegram post;
- blog outline or article brief;
- short-video script;
- visual generation brief;
- Google Sheets publishing row;
- approval summary for Pavel.
