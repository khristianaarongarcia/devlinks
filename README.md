# DevLinks 🔗

A beautiful, customizable personal link hub built with Next.js 14, Appwrite, and Tailwind CSS. Think Linktree, but for developers!

![DevLinks Preview](https://via.placeholder.com/800x400/0ea5e9/ffffff?text=DevLinks+Preview)

## ✨ Features

- 🔐 **User Authentication** - Secure login/register with JWT
- 🔗 **Unlimited Links** - Add, edit, and delete your links
- 🎨 **Custom Profile** - Personalize with name, bio, and avatar
- 📊 **Click Analytics** - Track link performance
- 🌙 **Dark Mode** - Beautiful light and dark themes
- 📱 **Responsive Design** - Works perfectly on all devices
- ⚡ **Fast & SEO Friendly** - Built with Next.js App Router
- ☁️ **Appwrite Backend** - Powered by Appwrite Database

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes + Appwrite
- **Database**: Appwrite Database
- **Authentication**: JWT (JSON Web Tokens)
- **Icons**: React Icons (Feather Icons)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- [Appwrite Cloud](https://cloud.appwrite.io) account (free tier available)

### Appwrite Setup

1. **Create an Appwrite Project**
   - Go to [Appwrite Console](https://cloud.appwrite.io)
   - Create a new project
   - Note your Project ID

2. **Create an API Key**
   - Go to Settings → API Keys
   - Create a new key with these scopes:
     - `databases.read`, `databases.write`
     - `collections.read`, `collections.write`
     - `documents.read`, `documents.write`

3. **Create Database & Collections**
   
   Create a database named `devlinks` and add these collections:

   **Collection: `users`**
   | Attribute | Type | Size | Required |
   |-----------|------|------|----------|
   | name | String | 50 | Yes |
   | email | String | 320 | Yes |
   | username | String | 30 | Yes |
   | password | String | 255 | Yes |
   | bio | String | 200 | No |
   | avatar | String | 500 | No |

   Indexes:
   - `email` (Unique)
   - `username` (Unique)

   **Collection: `links`**
   | Attribute | Type | Size | Required | Default |
   |-----------|------|------|----------|---------|
   | userId | String | 36 | Yes | - |
   | title | String | 100 | Yes | - |
   | url | String | 2000 | Yes | - |
   | icon | String | 50 | Yes | - |
   | clicks | Integer | - | Yes | 0 |
   | order | Integer | - | Yes | 0 |

   Indexes:
   - `userId` (Key)
   - `order` (Key)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/khristianaarongarcia/devlinks.git
   cd devlinks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your values:
   ```env
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key
   APPWRITE_DATABASE_ID=devlinks
   APPWRITE_USERS_COLLECTION_ID=users
   APPWRITE_LINKS_COLLECTION_ID=links
   JWT_SECRET=your-super-secret-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
devlinks/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   └── links/         # Links CRUD endpoints
│   │   ├── dashboard/         # User dashboard
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── demo/              # Demo preview page
│   │   ├── [username]/        # Public profile page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Navbar.tsx
│   │   ├── LinkCard.tsx
│   │   ├── LinkForm.tsx
│   │   └── ThemeProvider.tsx
│   ├── context/               # React context
│   │   └── AuthContext.tsx
│   └── lib/                   # Utility functions
│       ├── appwrite.ts        # Appwrite client & helpers
│       ├── auth.ts            # JWT helpers
│       └── schema.ts          # Database schema reference
├── public/                    # Static assets
├── .env.example              # Environment variables template
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/links` | Get all user's links |
| POST | `/api/links` | Create new link |
| PUT | `/api/links/[id]` | Update link |
| DELETE | `/api/links/[id]` | Delete link |
| POST | `/api/links/[id]/click` | Track link click |

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize the color palette:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9', // Change this to your brand color
      },
    },
  },
}
```

### Dark Mode
The app supports system preferences and manual toggle. Colors are defined in `globals.css`.

## 📦 Deployment

### Deploy to Appwrite Sites

1. Push your code to GitHub
2. In Appwrite Console, go to Sites
3. Create a new site with Next.js framework
4. Connect your GitHub repository
5. Add environment variables
6. Deploy!

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT` - Appwrite API endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Your Appwrite project ID
- `APPWRITE_API_KEY` - Your Appwrite API key
- `APPWRITE_DATABASE_ID` - Database ID (default: devlinks)
- `APPWRITE_USERS_COLLECTION_ID` - Users collection ID
- `APPWRITE_LINKS_COLLECTION_ID` - Links collection ID
- `JWT_SECRET` - A secure random string
- `NEXT_PUBLIC_APP_URL` - Your production URL

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Appwrite](https://appwrite.io/) - Your backend, minus the hassle
- [React Icons](https://react-icons.github.io/react-icons/) - Popular icons as React components

---

Built with ❤️ by [Khristian Aaron Garcia](https://github.com/khristianaarongarcia)
