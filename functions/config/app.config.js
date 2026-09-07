/**
 * Backend Cloud Functions Configuration
 */

module.exports = {
  REGION: process.env.FIREBASE_REGION || 'europe-west9',
  MEMORY: '1GiB',
  TIMEOUT_SECONDS: 120,
  VAT_RATE: 0.21,
  COMPANY: {
    name: "Aurellion Wine Selection",
    fullName: "Aurellion Wine SRL",
    subTitle: "Distribution Grossiste Vins Belgique - Direct Import",
    address: "Rue de la Station 48, 1000 Bruxelles",
    vatNumber: "BE 0123.456.789",
    carrier: "Aurellion Express Wholesale Logistics"
  }
};
