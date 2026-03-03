import { getAllContacts } from "../services/contactService.ts";

export const allContacts = async (req: any, res: any) => {
    try {
        const contacts = await getAllContacts();
        return res.status(200).json(contacts);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
