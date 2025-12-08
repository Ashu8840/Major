# Dairy - Personal Journal & Community Platform

A modern full-stack web application built with the MERN stack that combines personal journaling with community features.

## 🚀 Features

### Personal Diary
- **Private Entries**: Write and store personal diary entries
- **Rich Media Support**: Add images and media to your entries
- **Entry Management**: Create, edit, and delete personal entries
- **Beautiful UI**: Clean and intuitive interface for writing

### Community Platform
- **Social Posts**: Share thoughts and experiences with the community
- **Like & Comment System**: Engage with posts through likes and nested comments
- **User Following**: Follow other users and build connections
- **Trending Posts**: Discover popular content from the last 24 hours
- **Search Functionality**: Search posts by content, tags, or username
- **User Discovery**: Find and connect with other users

### Advanced Features
- **AI Writing Assistant**: Grammar correction and writing improvement (placeholder)
- **Real-time Updates**: Live notifications and updates
- **Responsive Design**: Works seamlessly on desktop and mobile
- **User Profiles**: Customizable user profiles with avatars
- **Media Upload**: Cloudinary integration for image storage

## 🛠️ Tech Stack

### Frontend
- **React 18+** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Icons** - Beautiful icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Cloudinary** - Media storage and management
- **Multer** - File upload handling

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Clone the Repository
```bash
git clone https://github.com/yourusername/dairy.git
cd dairy
```

### Backend Setup
```bash
cd backend
npm install

# Create .env file with the following variables:
# PORT=5000
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret
# CLOUDINARY_CLOUD_NAME=your_cloudinary_name
# CLOUDINARY_API_KEY=your_cloudinary_key
# CLOUDINARY_API_SECRET=your_cloudinary_secret

npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🚀 Usage

1. **Sign Up**: Create a new account or log in with existing credentials
2. **Personal Diary**: Navigate to the diary section to write private entries
3. **Community**: Explore the community feed, like posts, and engage with others
4. **Profile**: Customize your profile and manage your settings
5. **Trending**: Discover popular posts and trending content

## 📱 API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/search` - Search posts
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment

### Users
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/discover` - Get suggested users
- `GET /api/users/search` - Search users

## 🎨 Screenshots

[Add screenshots of your application here]

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- React team for the amazing framework
- MongoDB for the flexible database
- Cloudinary for media management
- All contributors who helped make this project better

## 📞 Contact

Your Name - [your.email@example.com](mailto:your.email@example.com)

Project Link: [https://github.com/yourusername/dairy](https://github.com/yourusername/dairy)

---

⭐ If you found this project helpful, please give it a star on GitHub!
