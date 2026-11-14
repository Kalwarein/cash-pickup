# Cash pickup

Build a mobile-first investment market simulation app for users in Sierra Leone.
The app visually resembles a Forex / stock investment platform, but all data, charts, profits, and losses are fully simulated and generated internally.
The goal is a realistic, active, business-style app where users:
Log in
Deposit simulated funds
Invest in companies
Experience both gains and losses
See real-time market movement
Interact with a live simulated market feed
This is not real trading, not guaranteed profit, and not connected to external APIs.
🔷 App Name
Use: Cash Pickup
🔷 Tech Expectations
Use Supabase for:
Authentication
Database
Real-time subscriptions
Internal logic generates:
Market movement
Chat messages
Profit & loss
No external APIs
🔷 Authentication (MANDATORY)
Create fully working auth:
Login
Sign up
Logout
Session persistence
Fields:
Name
Email
Password
Redirect:
Logged out → Login
Logged in → Home
🔷 Bottom Navigation (5 Tabs – ALL ACTIVE)
Home
Invest
Market
Chat
Wallet
🔷 Global UI / Design Rules
Blue-based professional fintech design
Dark blue + light blue gradients
Clean cards
Rounded edges
Smooth animations
Mobile-first
Forex-style charts
No empty or placeholder pages
🏠 Home Tab
Dashboard-style layout with:
Live animated market chart (line + candlestick feel)
Market status:
“Market Rising”
“Market Falling”
“High Volatility”
Stats cards:
Total users
Active investments
Market sentiment
Trending companies (dummy):
Tesla
Market360
Facebook
Random business names
Charts must:
Move automatically
Affect investment outcomes
Use randomized but realistic patterns
💼 Invest Tab
Users can:
See list of companies (randomized, scalable to 600)
Choose an amount to invest
See:
Risk level (Low / Medium / High)
Possible return range
Possible loss range
Confirm investment
Rules:
Investments can:
Increase
Decrease
Break even
No guaranteed profits
Market chart influences results
📈 Market Tab
Full-screen trading-style view:
Continuous animated chart (24/7 simulation)
Market events:
“Sell pressure detected”
“High volatility”
“Bullish trend forming”
Changes impact investments globally
💬 Chat Tab (Simulated Real-Time Feed)
NOT user-to-user chat.
Create a market activity feed:
Messages generated every few seconds
Examples:
“Large buy order detected”
“Market dipping slightly”
“High investor activity”
Use Supabase real-time or interval-based generation
Looks like a live trading room.
💰 Wallet Tab
Show:
Simulated balance
Invested amount
Profit / Loss summary
Transaction history
Top-right button:
Switch between Wallet ↔ Profile
Use smooth rotate / slide animation
👤 Profile Section
Fully designed profile:
User details
Account status
Total investments
Win / loss ratio
Logout button
Switch account option
🔷 Database Structure (REQUIRED)
Create tables for:
users
wallets
investments
transactions
companies
market_events
chat_feed
All pages must read/write data.
🔷 Market Logic Rules
Market continuously changes
Some users gain
Some users lose
Losses are gradual, not instant
Volatility varies over time
Market sentiment affects outcomes
🔷 Constraints
No real money
No withdrawals
No external APIs
No guaranteed profits
Everything must be internally generated
Every tab must work and feel alive
🔷 Start With
Auth flow
Bottom navigation
Home dashboard
Database setup
Market simulation engine
🔷 Final Instruction
Build this as a complete, polished MVP with:
Zero empty screens
Clean blue fintech UI
Fully functional auth
Real-time feeling market
Loss + profit mechanics

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cash-pickup-sim.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc4dfa87-5244-4353-8481-5688ab579a41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
