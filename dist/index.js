"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
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
                ].filter(Boolean),
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
