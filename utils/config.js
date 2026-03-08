// ==============================================
// Centralized Public Config
// All public-facing configuration values
// ==============================================

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919311073365';
export const PHONE_NUMBER = process.env.NEXT_PUBLIC_PHONE_NUMBER || '+919311073365';
export const EMAIL_ADDRESS = process.env.NEXT_PUBLIC_EMAIL || 'info@bimasakhi.com';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
export const PHONE_LINK = `tel:${PHONE_NUMBER}`;
export const EMAIL_LINK = `mailto:${EMAIL_ADDRESS}`;
