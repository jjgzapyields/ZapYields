// This runs securely on Vercel's backend, invisible to GitHub users
export default function handler(req, res) {
  res.status(200).json({ 
    vaultAddress: process.env.CONTRACT_ADDRESS 
  });
}