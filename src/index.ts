console.log("=== NEW SERVER VERSION RUNNING ===");

import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("SERVER RUNNING CLEAN");
});

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Email or phoneNumber required",
      });
    }

    // STEP 1: Find contacts matching email OR phone
    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "asc" },
    });

    // ======================
    // CASE 1: No match found
    // ======================
    if (matchingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // ======================
    // CASE 2: Matches exist
    // ======================

    // Find oldest primary
    let primaryContact =
      matchingContacts.find((c) => c.linkPrecedence === "primary") ||
      matchingContacts[0];

    // If oldest is secondary, fetch its actual primary
    if (
      primaryContact.linkPrecedence === "secondary" &&
      primaryContact.linkedId
    ) {
      primaryContact = (await prisma.contact.findUnique({
        where: { id: primaryContact.linkedId },
      })) as any;
    }

    // Fetch all contacts linked to this primary
    const linkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // DEBUG LOGS
    console.log("linkedContacts:", linkedContacts);
    console.log("incoming email:", email);
    console.log("incoming phone:", phoneNumber);

    const emailExists =
      !!email && linkedContacts.some((c) => c.email === email);

    const phoneExists =
      !!phoneNumber && linkedContacts.some((c) => c.phoneNumber === phoneNumber);

    console.log("emailExists:", emailExists);
    console.log("phoneExists:", phoneExists);

    // Create secondary if new info found
    if (!emailExists || !phoneExists) {
      console.log("Creating secondary contact...");

      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
    }

    // Fetch updated final contacts
    const finalContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const emails = [
      ...new Set(finalContacts.map((c) => c.email).filter(Boolean)),
    ];

    const phoneNumbers = [
      ...new Set(finalContacts.map((c) => c.phoneNumber).filter(Boolean)),
    ];

    const secondaryContactIds = finalContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id);

    return res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});