# ADR-0003: Media processed on the device and stored in Cloudflare R2 with presigned URLs

**Status:** Accepted (2026-09-30)

## Context
Video is the largest cost and complexity driver. Content is private by default (groups, private profiles). Budget is 0 NOK/month.

## Decision
- Photos and videos are resized, compressed and stripped of metadata on the device (SPEC 9.4).
- Files go directly from the app to a private R2 bucket with presigned PUT URLs that sign Content-Type and Content-Length. The API verifies each object with HEAD before publishing.
- Viewers get short-lived presigned GET URLs, issued only after visibility checks.
- MP4 is played directly; no transcoding or HLS in beta.

## Alternatives considered
- **Managed video (Mux, Cloudflare Stream):** transcoding and streaming included, but costs per minute stored and delivered.
- **Own transcoding worker (ffmpeg):** most control, most operations work on a small VM.
- **Proxying media through the API:** simpler access control, but wastes VM bandwidth and CPU.

## Consequences
- R2 free tier: 10 GB storage, zero egress. A per-user quota and a global budget guard are required (SPEC 9.5).
- The server trusts the client-reported duration and codec in beta; the signed size cap limits abuse. A verification worker can come later.
- Presigned URLs rotate, so the app caches media by id, not by URL.
