CloudyFile – Smart File Management System

CloudyFile is a full-stack file management system built to handle secure uploads, advanced metadata operations, and intelligent features like background processing, image optimization, and role-based sharing.

🚀 Features

📁 Upload & manage files (images, videos, docs)

🔐 User authentication (JWT-based)

🗂️ File categorization: archive, favorites, recycle bin

🔄 Background image processing with AWS Lambda + Sharp

⚡ Real-time syncing via Redis cache

📊 Storage usage and analytics (file type, size)

📤 Shared files with role-based access (viewer, editor)

🔎 Search & filter with pagination

🛠️ Built with scalable microservice-friendly architecture


🧰 Tech Stack

Frontend: React + Vite + Tailwind
Backend: Node.js + Express + TypeScript
Database: MySQL + Prisma ORM
Queue & Cache: Redis + BullMQ
Storage: AWS S3 (Pre-signed uploads)
Image Processing: AWS Lambda + Sharp


npm install
npm run dev