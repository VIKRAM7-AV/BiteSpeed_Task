# Bitespeed Identity Reconciliation Backend Task

## Overview
This is the backend service for identity reconciliation as per Bitespeed task.  
It exposes a single POST endpoint `/identify` to consolidate customer contacts based on email/phone.

## Tech Stack
- Node.js + TypeScript
- Express.js
- Prisma ORM (with PostgreSQL)
- Hosted on Render.com

## Endpoint
**POST /identify**

**Request Body** (JSON):
```json
{
  "email"?: string,
  "phoneNumber"?: number
}
