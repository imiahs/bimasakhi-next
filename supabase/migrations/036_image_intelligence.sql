-- Phase 3: Image Intelligence — Add image prompts and featured image to content_drafts
-- Migration: 036_image_intelligence.sql
-- Purpose: Store AI-generated image prompts (per type × platform) and uploaded featured image URL

ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS image_prompts JSONB DEFAULT '{}';
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
