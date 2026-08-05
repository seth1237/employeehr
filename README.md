# Elevate - Employee Performance & Development Platform

## Prerequisites
- Node.js (v18+ recommended)
- pnpm (Package Manager)
- MongoDB (running locally or a cloud URI)

## Installation

### 1. Install Frontend Dependencies
Navigate to the root directory and run:
```bash
pnpm install
```

### 2. Install Backend Dependencies
Navigate to the server directory and run:
```bash
cd server
pnpm install
cd ..
```

## Configuration

### Backend Environment Variables
Create a `.env` file in the `server` directory with the following content:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/elevate
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key_here
```

## Running the Application

You need to run both the frontend and backend servers. It is recommended to use two separate terminal windows.

### Terminal 1: Backend Server
```bash
cd server
pnpm dev
```
The backend will start on `http://localhost:5000`.

### Terminal 2: Frontend Application
```bash
pnpm dev
```
The frontend will start on `http://localhost:3000`.

## Building for Production

### Frontend
```bash
pnpm build
pnpm start
```

### Backend
```bash
cd server
pnpm build
pnpm start
```
# employeehr
# employeehr
# employeehr
# employeehr
# employeehr
# employeehr
