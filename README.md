# DevLinks 🔗

A beautiful, customizable personal link hub built with Next.js 14, MongoDB, and Tailwind CSS. Think Linktree, but for developers!

![DevLinks Preview](https://via.placeholder.com/800x400/0ea5e9/ffffff?text=DevLinks+Preview)

## ✨ Features

- 🔐 **User Authentication** - Secure login/register with JWT
- 🔗 **Unlimited Links** - Add, edit, and delete your links
- 🎨 **Custom Profile** - Personalize with name, bio, and avatar
- 📊 **Click Analytics** - Track link performance
- 🌙 **Dark Mode** - Beautiful light and dark themes
- 📱 **Responsive Design** - Works perfectly on all devices
- ⚡ **Fast & SEO Friendly** - Built with Next.js App Router

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Icons**: React Icons (Feather Icons)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devlinks.git
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
   MONGODB_URI=mongodb+srv://your-connection-string
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
│   ├── lib/                   # Utility functions
│   │   ├── mongodb.ts
│   │   └── auth.ts
│   └── models/                # Mongoose models
│       ├── User.ts
│       └── Link.ts
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

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `MONGODB_URI` - Your MongoDB connection string
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
- [MongoDB](https://www.mongodb.com/) - The database for modern applications
- [React Icons](https://react-icons.github.io/react-icons/) - Popular icons as React components

---

Built with ❤️ by [Khristian Aaron Garcia](https://github.com/khristianaarongarcia)
