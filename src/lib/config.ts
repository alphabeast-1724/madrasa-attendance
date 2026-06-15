/**
 * SaaS Configuration for Branding & Localization
 * Use this file to easily rebrand the application for different schools or madrasas.
 */
export const APP_CONFIG = {
  // Institution Branding
  institutionName: "Madrasa-e-Usmaniya", // Change this to the school name
  
  // UI Customization
  primaryColor: "#0f172a", // Tailwind-compatible colors
  
  // Feature Settings
  attendanceType: "absence-only", // Current logic supports sparse (absence-only) logging
  
  // Message Templates (WhatsApp)
  // Placeholders: {institution}, {date}, {class}, {batch}, {names}
  whatsappTemplate: "{institution}, {date} Absentees\n\nClass: {class} {batch}\nList: {names}\n\nThis is an automated message.",
  
  // Pagination Defaults
  pageSize: 20,
};
