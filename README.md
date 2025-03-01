# Settle - Expense Sharing App

Settle is a mobile-friendly expense sharing application that allows users to split expenses with friends using cryptocurrency. Built on top of Coinbase Developer Platform and Smart Wallets, Settle makes it easy to create expense groups, share payment links, and collect funds.

## Features

- Connect your crypto wallet
- Create expense groups
- Split expenses among multiple people
- Generate shareable payment links
- Collect payments in USDC
- Claim funds back to your wallet

## Technology Stack

- Next.js with TypeScript
- Tailwind CSS for styling
- Coinbase Smart Wallets for wallet management
- Web3Modal for wallet connections
- Ethers.js for blockchain interactions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A WalletConnect Project ID (for Web3Modal)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/settle.git
   cd settle
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your WalletConnect Project ID:
   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Usage

1. Connect your wallet using the "Connect Wallet" button.
2. Create a new expense group by entering a group name, total expense amount, and number of people.
3. Share the generated payment links with your friends.
4. Friends can open the links and pay their share using their crypto wallets.
5. Once all payments are received, claim the funds back to your wallet.

## Deployment

The app can be easily deployed to Vercel:

```
npm run build
npm run start
```

## Future Improvements

- Add user authentication
- Implement real-time payment notifications
- Add support for multiple currencies
- Enhance the UI/UX
- Add group history and expense tracking

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Coinbase Developer Platform
- Base blockchain
- Next.js team
- Tailwind CSS team
