// ==============================================
// whatsapp.js
// Central WhatsApp Message Engine (Intent-Based Branching)
// ==============================================

/**
 * IMPORTANT: Phone number is now managed via .env
 * 
 * In your .env.local file:
 * NEXT_PUBLIC_WHATSAPP_NUMBER=919311073365
 * 
 * For production (Vercel):
 * → Add this variable in Vercel → Project Settings → Environment Variables
 *   Key: NEXT_PUBLIC_WHATSAPP_NUMBER
 *   Value: 919311073365
 */

// Helper function to generate simple ticket/application number (if no leadId)
const generateTempId = (prefix = 'APP') => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}${random}`;
};

export const formatWhatsAppMessage = (data = {}) => {
    const {
        name = '',
        city = '',
        education = '',
        occupation = '',
        email = '',
        source = '',
        leadId = '',
        waitlist = false,
        category = '',
        intent = 'Application Submitted'
    } = data;

    let message = `Hello Team Bima Sakhi,\n\n`;

    if (intent === "General Interest" || intent === "Floating Inquiry") {
        const ticketNo = leadId || generateTempId('TKT');
        message += `Mera naam ${name || 'User'} hai.\n`;
        message += `Main Bima Sakhi opportunity ke baare mein interested hoon! 😊\n\n`;
        message += `Ticket Number: ${ticketNo} (Isse future mein baat  kar sakte hain)\n\n`;
        message += `Mujhe details bataiye, kaise join kar sakti hoon?\n\n`;
        message += `Thank you!\n`;
    } else if (intent === "Paused Interest") {
        const appNo = leadId || generateTempId('APP');
        message += `Main ${name || 'User'} bol rahi hoon.\n`;
        message += `Applications paused hain, lekin mujhe waitlist mein add kar do na! 🌟\n\n`;
        message += `Application Number: ${appNo} (Yeh sambhal ke rakh lo, updates ke liye!)\n\n`;
        message += `Jab reopen ho to please bata dena.\n\n`;
        message += `Excited hoon! Thank you.\n`;
    } else if (intent === "Follow-up Request") {
        const appNo = leadId || 'Unknown';
        message += `Mera naam ${name || 'User'} hai.\n`;
        message += `Maine pehle apply kiya tha, Application No: ${appNo}\n\n`;
        message += `Please update de do, next steps kya hain? 📞\n\n`;
        message += `Thank you!\n`;
    } else {
        message += `My name is ${name}. I have just completed my application on bimasakhi.com after going through the opportunity details.\n\n`;
        message += `Here are my details:\n`;
        message += `• City: ${city || 'Not Provided'}\n`;
        message += `• Education: ${education || 'Not Provided'}\n`;
        message += `• Current Status: ${occupation || 'Not Provided'}\n`;

        if (leadId) {
            message += `• Application No: ${leadId}\n`;
            message += `\n(Please keep this Application No for future communication! 😊)\n`;
        }

        if (waitlist) {
            message += `\nI understand that onboarding is currently active in selected cities and I would like to stay updated regarding expansion in my area.\n`;
        }

        message += `\nI understand that this is a commission-based LIC agency opportunity (not a salaried job), and I am genuinely interested in knowing the next steps.\n\n`;
        message += `Kindly guide me regarding the training and onboarding process.\n\n`;
        message += `For a complete overview of the program, you may also refer to:\n`;
        message += `https://bimasakhi.com?source=whatsapp\n\n`;
        message += `Thank you.\n`;
    }

    message += `\n\n--- Internal System Info ---\n`;
    message += `Source: ${source || 'Website'}\n`;
    message += `Email: ${email || 'Not Provided'}\n`;
    message += `ReferenceID: ${leadId || 'Not Available'}\n`;
    message += `Category: ${category || (waitlist ? 'Expansion Waitlist' : 'Direct Application')}\n`;
    message += `Intent: ${intent}\n`;
    message += `Waitlist: ${waitlist ? 'Yes' : 'No'}`;

    return encodeURIComponent(message);
};

export const getWhatsAppUrl = (data = {}) => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919311073365';
    const text = formatWhatsAppMessage(data);
    return `https://wa.me/${phone}?text=${text}`;
};