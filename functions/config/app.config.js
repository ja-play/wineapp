/**
 * Backend Cloud Functions Configuration
 */

module.exports = {
  REGION: process.env.FIREBASE_REGION || 'europe-west9',
  MEMORY: '1GiB',
  TIMEOUT_SECONDS: 120,
  VAT_RATE: 0.21,
  COMPANY: {
    name: "Aurellion",
    fullName: "Aurellion SRL",
    subTitle: "Distribution Grossiste Vins Belgique - Direct Import",
    address: "Stationsstraat 52, 3070 Kortenberg",
    vatNumber: "BE 1042.846.604",
    carrier: "Aurellion Express Wholesale Logistics"
  }
};
