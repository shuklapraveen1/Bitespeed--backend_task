🚀 Bitespeed Backend Task – Identity Reconciliation
📌 Overview

This project implements the Identity Reconciliation Service for Bitespeed.

The goal is to identify and consolidate multiple contact records that belong to the same customer, even if different email addresses or phone numbers are used across purchases.

The service exposes a single endpoint:

POST /identify

Production Endpoint:

[https://bitespeed-identity-service.onrender.com/identify](https://bitespeed-backend-task-stj4.onrender.com/identify)

🧠 Problem Summary

Customers may place orders using:

Different email addresses

Different phone numbers

Overlapping combinations of both

We must:

Identify existing contacts using email OR phoneNumber

Link related contacts together

Maintain a single primary contact (oldest record)

Convert other matching primaries into secondary

Create secondary contact if new information appears

Always return a consolidated response

🏗 Tech Stack

Backend: Node.js (LTS v20)

Language: TypeScript

Framework: Express.js

Database: PostgreSQL

ORM: Prisma

Hosting: Render

📂 Project Structure
src/
  index.ts
prisma/
  schema.prisma
package.json
tsconfig.json
README.md
🗄 Database Schema

Contact table structure:

{
  id                   Int
  phoneNumber          String?
  email                String?
  linkedId             Int?
  linkPrecedence       "primary" | "secondary"
  createdAt            DateTime
  updatedAt            DateTime
  deletedAt            DateTime?
}
Explanation

primary → Oldest contact in the linked group

secondary → Linked to a primary via linkedId

Contacts are linked if either email OR phone matches

🔗 API Documentation
POST /identify
Request Body (JSON only)
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}

At least one field must be provided.

✅ Response Format
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}

Rules:

First email belongs to primary contact

First phone belongs to primary contact

No duplicates

All linked secondaries included

🧪 Example Scenarios
1️⃣ New Contact
Request
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
Response
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
2️⃣ Same Phone, New Email (Secondary Created)
Request
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
Response
{
  "contact": {
    "primaryContatctId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
3️⃣ Merge Two Primaries
Existing Data
id	email	phone	linkPrecedence
11	george@hillvalley.edu
	919191	primary
27	biffsucks@hillvalley.edu
	717171	primary
Request
{
  "email": "george@hillvalley.edu",
  "phoneNumber": "717171"
}
Response
{
  "contact": {
    "primaryContatctId": 11,
    "emails": [
      "george@hillvalley.edu",
      "biffsucks@hillvalley.edu"
    ],
    "phoneNumbers": [
      "919191",
      "717171"
    ],
    "secondaryContactIds": [27]
  }
}

Oldest record becomes primary.

🔄 Reconciliation Algorithm

The logic performs:

Fetch contacts matching email OR phoneNumber

Collect all related linked contacts

Determine oldest contact as primary

Convert other primaries into secondary

Create secondary if new email or phone is introduced

Return aggregated response

The algorithm handles transitive linking automatically.

🧩 Edge Cases Handled

✔ New user creation
✔ Secondary creation for new info
✔ Primary-to-secondary conversion
✔ Transitive merges
✔ No duplicate secondary records
✔ Idempotent requests
✔ Null email handling
✔ Null phone handling

🖥 Running Locally
1️⃣ Install dependencies
npm install
2️⃣ Setup Environment

Create .env:

DATABASE_URL="your_postgres_connection_string"
3️⃣ Push Schema
npx prisma db push
4️⃣ Build
npm run build
5️⃣ Start
npm start

Server runs at:

http://localhost:3000
🌍 Production Deployment

Hosted on Render.

Production endpoint:

https://bitespeed-identity-service.onrender.com/identify

Build Command:

npm install && npm run build

Start Command:

npm start

Node version locked to LTS v20 for Prisma compatibility.

📌 Submission Checklist

✔ Code pushed to GitHub
✔ Small, meaningful commits
✔ /identify endpoint exposed
✔ Hosted on Render
✔ Uses JSON body (no form-data)
✔ All requirement cases implemented
✔ Production endpoint live

👤 Author

Praveen Shukla
