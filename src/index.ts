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
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existingContacts.length === 0) {
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

    return res.json({ message: "Next step coming..." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});