# 🎬 ShowBookie - Movie Ticket Booking System

A modern, web-based movie ticket booking platform with unique cancellation and rebooking features. Built with Node.js, Express.js, and MySQL.

## ✨ Features

- **User Authentication** - Secure registration/login with password encryption
- **Movie Listings** - Browse movies with details (genre, duration, language, ratings)
- **Theater & Show Management** - Multiple theaters, screens, and showtimes
- **Interactive Seat Selection** - Real-time seat availability with temporary locking
- **Secure Payments** - Safe transaction processing
- **Smart Cancellation & Rebooking** - Cancel and rebook for another show on the same day without additional charges
- **Booking History** - Track all past and upcoming bookings
- **Responsive Design** - Seamless experience across devices

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Responsive UI design

### Backend
- Node.js with Express.js
- RESTful API architecture

### Database
- MySQL with proper normalization (1NF, 2NF, 3NF, BCNF)
- ACID compliance for transactions

## 📋 Database Schema

The system consists of 8 core tables:
- **User** - User information and authentication
- **Movie** - Movie details (title, genre, duration, etc.)
- **Theatre** - Theater information and location
- **Screen** - Screen details within theaters
- **Shows** - Showtimes linking movies to screens
- **Booking** - User booking records
- **Seats** - Seat management and allocation
- **Payment** - Transaction records

## 🚀 Key Functionalities

### 1. User Registration & Authentication
- Secure account creation and login
- Password hashing for data security

### 2. Movie & Show Selection
- Browse available movies
- View showtimes across different theaters

### 3. Seat Selection
- Visual seat layout
- Real-time availability checking
- Temporary seat locking during booking

### 4. Booking Management
- Complete booking workflow
- Payment processing
- Instant confirmation

### 5. Smart Cancellation & Rebooking
- Cancel existing bookings
- Rebook same movie, different show on same day
- No convenience fees for rebooking

### 6. Booking History
- View past transactions
- Track upcoming bookings

## 🏗️ Project Structure

```
movie-ticket-booking/
├── css/                  # Stylesheets
├── db/                   # Database scripts
├── html/                 # HTML pages
├── images/               # Image assets
├── .gitignore
├── app.js                # Main application file
├── booking-history.js    # Booking history logic
├── database.js           # Database connection
├── index.html           # Landing page
├── package-lock.json
├── package.json
├── script.js            # Frontend scripts
└── shell.js             # Utility functions
```

## 💡 Unique Selling Points

- **Zero-cost Rebooking** - Unlike traditional systems, users can switch shows on the same day without extra charges
- **Concurrency Control** - Prevents double booking with proper locking mechanisms
- **Optimized for Theaters** - Helps reduce revenue loss from cancellations
- **User-Centric Design** - Focus on seamless user experience

## 🔒 Security Features

- Password encryption
- Secure authentication
- Data validation
- Protection against double booking
- Transaction integrity

## 📊 ACID Compliance

- **Atomicity** - Complete booking/payment or none
- **Consistency** - Valid database states maintained
- **Isolation** - Concurrent transactions handled safely
- **Durability** - Permanent storage after commit
