# Gemini Pro Shop Bot 🤖

Automated Telegram bot for selling **Gemini Pro 18 Months** activation links.

## ✨ ባህሪያት (Features)

- 🛒 ምርት ማሳያ እና ግዥ
- 📸 የደረሰኝ ፎቶ ማስተላለፍ
- ✅ Admin Approve / ❌ Reject workflow
- 📦 ስቶክ አስተዳደር (link ሲሸጥ ሌላ አይደገም)
- 📊 Dashboard stats
- 🇪🇹 ሙሉ አማርኛ ምላሽ

---

## 🚀 Setup (\u12e8\u121b\u12db\u1320\u122b\u12eb \u1218\u1218\u122a\u12eb)

### 1. Bot Token ማዘጋጀት

1. Telegram ውስጥ [@BotFather](https://t.me/BotFather) ይክፈቱ
2. `/newbot` ብለው አዲስ ቦት ይፍጠሩ
3. Token ይቅዱ

### 2. Admin ID ማወቅ

1. [@userinfobot](https://t.me/userinfobot) ላኩ
2. ቁጥሩን ያዙ (ለምሳሌ: `123456789`)

### 3. MongoDB Atlas (ነፃ)

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) ይመዝገቡ
2. Free cluster ይፍጠሩ
3. Connection string ይቅዱ: `mongodb+srv://...`

### 4. .env ፋይል

```bash
cp .env.example .env
```

`.env` ፋይሉን ይከፍቱ እና ዋጋዎቹን ይሙሉ:

```env
BOT_TOKEN=1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ
ADMIN_ID=123456789
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/geminishop
CBE_ACCOUNT=10001234567
CBE_NAME=ሙሉ ስምዎ
TELEBIRR_ACCOUNT=0912345678
TELEBIRR_NAME=ሙሉ ስምዎ
```

### 5. Dependencies ለማጫን

```bash
npm install
```

### 6. ቦቱን ማሄድ (Local Test)

```bash
node src/bot.js
```

---

## 🌐 Render Deployment (Cloud - ነፃ)

1. [render.com](https://render.com) ይመዝገቡ
2. **New Web Service** → Connect GitHub repo ወይም **Deploy from local** (Render CLI)
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node src/bot.js`
   - **Environment:** Add all `.env` variables

### ወይም Render CLI ለመጠቀም:

```bash
# Install Render CLI
npm install -g @render-oss/cli

# Login and deploy
render login
render deploy
```

---

## 📋 Admin Commands

| Command | ተግባር |
|---------|--------|
| `/admin` | Admin panel |
| `/addstock <link>` | አንድ ሊንክ ይጨምር |
| `/addstock` (multiline) | ብዙ ሊንኮች (line by line) |
| `/addstockbulk` | .txt ፋይል ይጨምር |
| `/stock` | ስቶክ ሁኔታ |
| `/orders` | ሁሉ ትዕዛዞች |
| `/orders pending` | የጥበቃ ትዕዛዞች |
| `/stats` | ስታቲስቲክስ |

## 👤 User Commands

| Command | ተግባር |
|---------|--------|
| `/start` | ቦቱን ጀምር |
| `/buy` | ምርት ግዛ |
| `/myorders` | ትዕዛዞቼ |
| `/help` | እርዳታ |

---

## 📁 Project Structure

```
gemini-pro-shop/
├── src/
│   ├── bot.js              # Main entry point
│   ├── config.js           # Environment config
│   ├── database.js         # MongoDB connection
│   ├── models/
│   │   ├── User.js
│   │   ├── Stock.js
│   │   └── Order.js
│   ├── handlers/
│   │   ├── userHandlers.js
│   │   └── adminHandlers.js
│   └── utils/
│       ├── keyboard.js
│       └── messages.js
├── uploads/                # Receipt screenshots
├── .env.example
├── .env                    # (ለ git አታስገቡ!)
└── README.md
```

---

## ⚠️ ጥንቃቄ

- `.env` ፋይሉን ለሌሎች **አያሳዩ**
- Activation links ለሌሎች **አይካፈሉ**
- ስቶክ ዝቅ ሲል አዲስ ሊንኮች ይጨምሩ
