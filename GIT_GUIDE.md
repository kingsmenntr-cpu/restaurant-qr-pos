# Git Push & Run Guide

## Step 1: GitHub Repo Banao
1. github.com par jao
2. New Repository -> Name: restaurant-qr-pos -> Public/Private -> Create (README mat add karo)

## Step 2: Yahan Se Push Karo
```bash
cd /home/user/restaurant-qr-pos
git init
git add .
git commit -m "feat: complete QR POS V1 - Owner/Cashier/Kitchen/Customer + Billing + UPI QR + KDS"

# Apna GitHub repo URL yahan dalo
git remote add origin https://github.com/YOUR_USERNAME/restaurant-qr-pos.git
git branch -M main
git push -u origin main
```

Agar token mangta hai to GitHub -> Settings -> Developer Settings -> Personal Access Tokens -> Generate (classic) -> repo tick -> token copy karke password ki jagah use karo.

## Step 3: Nayi Tab Me Clone & Run
```bash
# Nayi tab / terminal me
git clone https://github.com/YOUR_USERNAME/restaurant-qr-pos.git
cd restaurant-qr-pos

# Env setup
cp .env.example .env.local
# .env.local edit karo agar Supabase use karna hai, warna default kaam karega

# Install & Run
npm install
npm run dev
# Open http://localhost:3000
```

## Step 4: Login Test
Owner: owner@restaurant.com / owner123
Cashier: cashier@restaurant.com / cashier123
Kitchen: kitchen@restaurant.com / kitchen123

## Agar Arena.ai Me Dusri Tab Me Kaam Kar Rahe Ho
Arena me har tab ka workspace alag hota hai, isliye Git se clone karna best hai.
