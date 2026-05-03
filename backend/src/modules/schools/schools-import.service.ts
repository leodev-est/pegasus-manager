/*
 * Future Google Sheets import flow:
 * - Connect to the Google Sheets API with a service account or OAuth credentials.
 * - Read the operational spreadsheet containing school contacts.
 * - Map spreadsheet columns into the School model: name, contact, phone,
 *   email, region, status, responsible, nextAction and notes.
 * - Avoid duplicates by checking existing schools by name, email and phone.
 * - Update existing schools when the spreadsheet has newer contact/status data.
 */
export const schoolsImportService = {};
