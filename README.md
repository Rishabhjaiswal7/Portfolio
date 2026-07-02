# Rishabh Jaiswal Portfolio Website Backend

This project extends a static single-page portfolio website for Rishabh Jaiswal into a fully-functional web application with a secure Node.js + Express.js backend, a MongoDB database layer (Mongoose), and an interactive Admin Panel dashboard.

The application is structured as a monorepo containing:
- `/client`: The frontend portfolio (`index.html`) and the admin interface (`admin.html`).
- `/server`: The Node.js + Express backend, including API routes, database schemas, controllers, and file uploads.

---

## Features Built

1. **Contact Form**: Connects the form directly to `/api/contact`. Submissions are stored in MongoDB, trigger automatic email notifications to `rishabhjaiswal9029@ce.du.ac.in`, and send confirmations to the sender.
2. **Resume Download**: Secure uploads via admin panel. Public downloads hit `/api/resume`, which serving the latest PDF on disk.
3. **Creative Gallery**: Admin can upload assets (images/videos) and categories. The landing page pulls these dynamically and renders them with high-end micro-animations and tab filters.
4. **Certifications CRUD**: Complete management of certifications via admin dashboard. If fewer than 3 certifications exist, empty placeholder cards are automatically rendered to pad the layout.
5. **Testimonials**: Public submissions are saved as pending approval. Admins can approve testimonials to publish them to the landing page.
6. **Visitor Analytics**: Tracks daily visits and referrers using a session-based ping. Admins can view aggregate visitor numbers and a 30-day timeline graph.
7. **Robust Admin Dashboard**: Protected with JWT token authentication. Includes interactive tables, Chart.js analytics graphs, and media upload controllers.
8. **Offline Fallback Resiliency**: If the server goes offline, the website remains functional. The contact form falls back to opening the native mailto client, and placeholders are kept for certificates, testimonials, and creative tiles instead of breaking.

---

## Directory Structure

```
PortfolioWebsite/
├── client/
│   ├── index.html                   # Portfolio landing page
│   └── admin.html                   # Admin Panel dashboard
├── server/
│   ├── .env                         # Server environment configuration
│   ├── .env.example                 # Example configuration
│   ├── server.js                    # Express application entrypoint
│   ├── config/
│   │   └── db.js                    # Mongoose MongoDB connection
│   ├── controllers/
│   │   ├── adminController.js       # Admin JWT and CRUD operations
│   │   └── publicController.js      # Public contact, downloads, and listings
│   ├── middleware/
│   │   ├── auth.js                  # JWT token verification
│   │   ├── rateLimiter.js           # Rate limiting middleware
│   │   └── upload.js                # Multer configuration for file uploads
│   ├── models/
│   │   ├── Message.js               # Messages collection schema
│   │   ├── CreativeWork.js          # Creative corner item schema
│   │   ├── Certification.js          # Certifications collection schema
│   │   ├── Testimonial.js           # Testimonials collection schema
│   │   └── Analytics.js             # Visit logs collection schema
│   ├── routes/
│   │   ├── api.js                   # Public endpoints router
│   │   └── admin.js                 # JWT-secured admin endpoints router
│   └── uploads/                     # Statically served local upload files
│       ├── resume/                  # Uploaded resume PDFs
│       └── creative/                # Uploaded creative gallery files
└── README.md                        # Project documentation
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended, developed and tested on Node v24.11)
- [MongoDB](https://www.mongodb.com/) (running locally or an Atlas URI connection string)

---

### Step 1: Install Dependencies
Navigate into the `server` directory and install the required node modules:
```bash
cd server
npm install
```

---

### Step 2: Configure Environment Variables
Create a `.env` file inside the `server/` directory based on the `.env.example` template:
```bash
cp .env.example .env
```
Fill in the configuration parameters:
- `PORT`: Port to run the server on (default: `5000`).
- `MONGO_URI`: Local MongoDB connection string (`mongodb://127.0.0.1:27017/portfolio`) or a MongoDB Atlas URI.
- `JWT_SECRET`: A secure key to sign JWT login tokens.
- `ADMIN_EMAIL`: The email address used to log into the admin dashboard (`rishabhjaiswal9029@ce.du.ac.in`).
- `ADMIN_PASSWORD_HASH`: The bcrypt password hash for authentication.
- `EMAIL_USER` & `EMAIL_PASS`: Gmail address and Gmail App Password (if using Gmail SMTP alerts).
- `FRONTEND_ORIGIN`: Allowed origin for CORS (e.g. `http://127.0.0.1:5500` if using Live Server).

#### Generating the Admin Password Hash
To set a custom admin password, you can generate a secure bcrypt hash of your password using this command inside the `server` directory:
```bash
node -e "console.log(require('bcrypt').hashSync('yourpassword', 10))"
```
Copy the resulting output string (e.g. `$2b$10$...`) and paste it as the `ADMIN_PASSWORD_HASH` value inside your `.env`.

---

### Step 3: Run the Application

#### Option A: Unified Server (Recommended)
You can run both the frontend and backend on the single server port. Start the Express server:
```bash
npm start
```
Once running:
- **Main Portfolio landing page**: Access it at [http://localhost:5000](http://localhost:5000)
- **Admin control panel**: Access it at [http://localhost:5000/admin](http://localhost:5000/admin)

#### Option B: Standalone Frontend & Backend (Separate Ports)
If you prefer editing the frontend using VS Code Live Server (port 5500) and running the backend separately (port 5000):
1. Start the backend server:
   ```bash
   cd server
   npm start
   ```
2. Start Live Server on `client/index.html`.
3. Configure the `FRONTEND_ORIGIN` in `.env` to `http://127.0.0.1:5500` or `http://localhost:5500` to allow the CORS communication.

---

## API Documentation

### Public Endpoints
- `POST /api/contact` — Submits contact form. Saves to DB, triggers email notification, and sends confirmation. (Rate limited to 5 submissions per 15 mins per IP).
- `GET /api/resume` — Serves the latest resume PDF.
- `GET /api/creative-categories` — Returns active categories list sorted by display order.
- `GET /api/creative` — Returns public gallery items. Filterable by category ID/slug, tag, featured toggle, text search, and sorts (newest, oldest, alphabetical).
- `GET /api/certifications` — Returns all certifications.
- `POST /api/testimonials` — Submits a testimonial (saved with `approved: false`). (Rate limited).
- `GET /api/testimonials` — Returns approved testimonials.
- `POST /api/analytics/visit` — Registers page views.

### Secured Admin Endpoints (Require `Authorization: Bearer <token>` Header)
- `POST /api/admin/login` — Public admin login. Returns JWT.
- `POST /api/admin/resume` — Uploads a new resume PDF.
- `GET /api/admin/creative-categories` — Lists all creative folders (enabled & disabled).
- `POST /api/admin/creative-categories` — Creates a new gallery category.
- `PUT /api/admin/creative-categories/reorder` — Persists drag-and-drop category display sequences.
- `PUT /api/admin/creative-categories/:id` — Updates category configuration metadata.
- `DELETE /api/admin/creative-categories/:id` — Deletes empty categories.
- `GET /api/admin/creative` — Lists all items inside the gallery registry.
- `POST /api/admin/creative` — Uploads media attachments (compresses images to WebP locally via Sharp, or uploads to Cloudinary).
- `PUT /api/admin/creative/:id` — Modifies metadata fields for a specific item.
- `POST /api/admin/creative/:id/duplicate` — Duplicates a gallery item record.
- `DELETE /api/admin/creative/:id` — Deletes creative item and unlinks its file from static storage.
- `PUT /api/admin/creative/bulk` — Performs bulk moves, deletes, hidden changes, and features.
- `POST /api/admin/certifications` — Adds a certification.
- `PUT /api/admin/certifications/:id` — Updates a certification.
- `DELETE /api/admin/certifications/:id` — Deletes a certification.
- `GET /api/admin/testimonials` — Lists all testimonials (approved + pending).
- `PUT /api/admin/testimonials/:id/approve` — Sets approved to true.
- `DELETE /api/admin/testimonials/:id` — Rejects or deletes a testimonial.
- `GET /api/admin/messages` — Lists contact messages.
- `DELETE /api/admin/messages/:id` — Deletes contact message.
- `GET /api/admin/analytics/summary` — Retrieves aggregate counts and last 30 days metrics.
