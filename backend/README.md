# NGO Backend

A Node.js backend for an NGO application with user authentication, donation processing, and admin features.

## Features

- User registration with email verification
- User authentication with JWT
- Role-based access control (User and Admin roles)
- Donation processing with Razorpay integration
- Email notifications for verification and donation receipts
- Admin dashboard for user management and donation tracking

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for email services
- Razorpay for payment processing
- bcryptjs for password hashing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Razorpay account for payment processing
- Gmail account for sending emails

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ngo-backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory (use `.env.example` as a template)
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration values:
   - MongoDB connection string
   - JWT secret
   - Email credentials
   - Razorpay API keys
   - Frontend URL

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/v1/registration` - Register a new user
- `GET /api/v1/registration/confirm?token=<token>` - Verify email
- `POST /api/v1/registration/auth` - Login user
- `GET /api/v1/registration?email=<email>` - Check if email exists
- `GET /api/v1/registration/getLogs?email=<email>` - Get user logs

### Donations

- `GET /api/v1/donate` - Get Razorpay key
- `POST /api/v1/donate/pay` - Create payment order
- `POST /api/v1/donate/pay/verify` - Verify payment
- `GET /api/v1/donate/user` - Get user donations
- `GET /api/v1/donate/all` - Get all donations (admin only)

### User Management

- `GET /api/v1/user/profile` - Get user profile
- `GET /api/v1/user/search?email=<email>` - Get user by email (admin only)
- `GET /api/v1/user/search/pattern?query=<query>` - Search users by email pattern (admin only)
- `PATCH /api/v1/user/toggle-lock` - Toggle user lock status (admin only)
- `GET /api/v1/user/all` - Get all users (admin only)

## Environment Variables

```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/ngo_database

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000
```

## Connecting with Frontend

Update the frontend API calls to point to this new backend. The API endpoints are designed to be compatible with the existing frontend.

## License

[MIT](LICENSE)