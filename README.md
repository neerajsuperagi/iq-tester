# IQ Tester - Organizational Intelligence Assessment Platform

A comprehensive web-based IQ testing platform designed for organizational recruitment and assessment purposes. This application provides picture-based intelligence tests with real-time scoring, session management, and administrative oversight.

## 🚀 Features

### For Candidates
- **Secure Registration & Login**: Email-based user authentication
- **Visual Pattern Recognition Tests**: 30 picture-based IQ questions
- **Timed Assessment**: 15-minute time limit with real-time countdown
- **Session Persistence**: Resume tests after page refresh or logout
- **One-Time Attempt**: Each candidate can only take the test once
- **Automatic Submission**: Test auto-submits when time expires

### For Administrators
- **Admin Dashboard**: View all test results and candidate performance
- **Real-time Analytics**: Statistical overview of test completions
- **Detailed Reports**: Individual candidate scores, time taken, and accuracy
- **Search & Filter**: Find specific candidates quickly
- **Export Ready**: Data structured for easy analysis

### Technical Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Timer**: Persistent countdown that continues across sessions
- **Session Management**: PostgreSQL-backed session storage
- **Security**: Rate limiting, input validation, and secure password hashing
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with session storage
- **Frontend**: EJS templates, Bootstrap 5, FontAwesome
- **Authentication**: bcryptjs for password hashing
- **Session Management**: express-session with PostgreSQL store
- **Security**: Helmet, rate limiting, CORS protection
- **Deployment**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 16+ or Docker
- PostgreSQL 12+ (or use Docker Compose)
- Git

## 🚀 Quick Start with Docker

### 1. Clone the Repository
```bash
git clone <repository-url>
cd iq-tester
```

### 2. Start with Docker Compose
```bash
# Start the application and database
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 3. Access the Application
- **Main Application**: http://localhost:3000
- **Admin Login**: username: `admin`, password: `admin123`
- **Database Management** (optional): http://localhost:8080 (email: admin@iqtester.com, password: admin)

## 🔧 Manual Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Start PostgreSQL (make sure it's running on port 5432)
# Create database
createdb iq_tester

# The application will automatically run the schema on startup
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iq_tester
DB_USER=postgres
DB_PASSWORD=password
SESSION_SECRET=your-super-secret-session-key
PORT=3000
NODE_ENV=development
```

### 4. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📚 Usage Guide

### For Candidates

1. **Registration**:
   - Visit the application homepage
   - Click "Register here" under the candidate login
   - Fill in full name, email, password, and confirm password
   - Submit to create your account

2. **Taking the Test**:
   - Login with your credentials
   - Read the instructions carefully
   - Click "Start IQ Test" when ready
   - Answer 30 visual pattern questions
   - Submit when complete or let it auto-submit at time expiry

3. **Test Rules**:
   - Only one attempt allowed per candidate
   - 15-minute time limit
   - Cannot pause the timer
   - Progress is automatically saved
   - Can resume if browser is accidentally closed

### For Administrators

1. **Login**:
   - Use the admin tab on the login page
   - Default credentials: username `admin`, password `admin123`

2. **Dashboard Features**:
   - View all completed tests
   - See real-time statistics
   - Search candidates by name or email
   - Export data for further analysis
   - Monitor test completion rates

## 🏗️ Database Schema

### Tables
- **users**: Candidate information and attempt status
- **admins**: Administrator accounts
- **test_sessions**: Active test sessions with progress
- **test_results**: Completed test results and scores
- **questions**: Question bank (auto-populated)

### Key Features
- Automatic session cleanup
- Foreign key constraints for data integrity
- Indexed queries for performance
- JSON storage for flexible answer tracking

## 🚀 Deployment

### Deploy to Render

1. **Prepare for Deployment**:
```bash
# Ensure all files are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Render Configuration**:
   - Connect your GitHub repository to Render
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables in Render dashboard

3. **Environment Variables for Render**:
```env
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-production-secret-key
NODE_ENV=production
```

### Deploy with Docker

```bash
# Build production image
docker build -t iq-tester .

# Run with external PostgreSQL
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_NAME=your-db-name \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e SESSION_SECRET=your-secret \
  iq-tester
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Session Security**: Secure session configuration
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Helmet.js security headers

## 🧪 Testing

### Manual Testing Checklist

#### Candidate Flow
- [ ] User registration works correctly
- [ ] Duplicate email prevention
- [ ] Login authentication
- [ ] Test start and timer functionality
- [ ] Question navigation and answering
- [ ] Session persistence across refresh
- [ ] One-attempt limitation
- [ ] Automatic submission on time expiry

#### Admin Flow
- [ ] Admin login with default credentials
- [ ] Dashboard displays test results
- [ ] Search functionality works
- [ ] Real-time statistics update
- [ ] Data export capabilities

#### Technical Tests
- [ ] Database connections
- [ ] Session management
- [ ] Error handling
- [ ] Responsive design
- [ ] Cross-browser compatibility

## 🎨 Customization

### Adding New Question Types
1. Modify the `getQuestion()` function in `server.js`
2. Update the pattern generation logic
3. Add new visual components in the test interface

### Styling Changes
- Edit the embedded CSS in EJS templates
- Modify Bootstrap classes for different themes
- Update color schemes in the gradient definitions

### Scoring Algorithm
- Adjust the IQ calculation formula in the `submitTest()` function
- Modify scoring weights for different question types
- Add complexity-based scoring

## 📊 Analytics & Reporting

The admin dashboard provides:
- Total test completions
- Average IQ scores
- Highest scoring candidates
- Completion time statistics
- Success rate analytics

## 🔧 Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify database exists
psql -l | grep iq_tester
```

**Session Issues**:
- Clear browser cookies and localStorage
- Restart the application
- Check session table in database

**Docker Issues**:
```bash
# Rebuild containers
docker-compose down -v
docker-compose up --build

# Check logs
docker-compose logs app
docker-compose logs postgres
```

## 📈 Performance Optimization

- **Database Indexing**: Key fields are indexed for fast queries
- **Session Management**: PostgreSQL session store for scalability
- **Static Assets**: Bootstrap and FontAwesome served from CDN
- **Compression**: gzip compression enabled
- **Caching**: Browser caching for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, questions, or contributions:
- Create an issue in the repository
- Review the troubleshooting section
- Check the Docker logs for error details

## 📋 Changelog

### Version 1.0.0
- Initial release with full IQ testing functionality
- 30 visual pattern questions
- Complete admin dashboard
- Docker deployment support
- Session persistence and security features

---

Built with ❤️ for organizational talent assessment 