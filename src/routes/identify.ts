import { identifyContact } from '../services/contactService.js';

export const identify = async (req: any, res: any) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: 'At least email or phoneNumber is required' });
    }

    try {
        const result = await identifyContact(email, phoneNumber?.toString());
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};