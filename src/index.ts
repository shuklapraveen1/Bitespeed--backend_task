import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Reconciliation Service Running 🚀");
});

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Email or phoneNumber required",
      });
    }

    // Find all contacts matching email OR phoneNumber
    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "asc" },
    });

    // ==========================
    // CASE 1: No existing contact
    // ==========================
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

    // ==========================
    // CASE 2: Contacts exist → Reconciliation
    // ==========================

    // Collect all related IDs (transitive closure)
    const relatedIds = new Set<number>();

    for (const contact of matchingContacts) {
      relatedIds.add(contact.id);

      if (contact.linkedId) {
        relatedIds.add(contact.linkedId);
      }
    }

    const relatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: Array.from(relatedIds) } },
          { linkedId: { in: Array.from(relatedIds) } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Oldest contact becomes the true primary
    const truePrimary = relatedContacts[0];

    // Convert other primaries to secondary
    for (const contact of relatedContacts) {
      if (
        contact.id !== truePrimary.id &&
        contact.linkPrecedence === "primary"
      ) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: truePrimary.id,
          },
        });
      }
    }

    // Fetch updated contacts under true primary
    const updatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Check if new information needs secondary creation
    const emailExists = email
      ? updatedContacts.some((c) => c.email === email)
      : true;

    const phoneExists = phoneNumber
      ? updatedContacts.some((c) => c.phoneNumber === phoneNumber)
      : true;

    const shouldCreateSecondary =
    (email && !emailExists) ||
    (phoneNumber && !phoneExists);

    if (shouldCreateSecondary) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: truePrimary.id,
        },
      });
    }

    // Final consolidated fetch
    const finalContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id },
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
        primaryContatctId: truePrimary.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});