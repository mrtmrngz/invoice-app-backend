# Invoice App Backend - Secure RESTful API for Invoice Management

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

A robust and secure RESTful API built with **Node.js**, **Express**, and **MySQL** for managing invoices. This backend powers an invoice management system, allowing users to create, update, and delete invoices, with the ability to generate and download them as PDFs. Designed with a modern **MVC architecture**, it incorporates **rate limiting**, **JWT cookie-based authentication**, and **Prisma ORM** for efficient database operations, making it ideal for small businesses and freelancers.

## ✨ Features

- **Secure Authentication**: JWT cookie-based authentication for secure user access, eliminating localStorage vulnerabilities.
- **Invoice Management**: Create, read, update, and delete (CRUD) invoices with a streamlined interface.
- **PDF Generation**: Convert invoices to downloadable PDF files for easy sharing and archiving.
- **Rate Limiting**: Protects the API from abuse and ensures performance under high traffic.
- **MVC Architecture**: Organized codebase with clear separation of concerns for maintainability.
- **Prisma ORM**: Modern database operations with type-safe queries and MySQL integration.
- **Responsive Endpoints**: RESTful API designed for scalability and ease of integration with frontend applications.

## 🛠️ Technologies Used

- **Node.js & Express**: Fast and scalable server-side framework for RESTful APIs.
- **MySQL**: Reliable relational database for structured data storage.
- **Prisma**: Modern ORM for type-safe and efficient database interactions.
- **JWT (Cookie-Based)**: Secure authentication with JSON Web Tokens stored in HTTP-only cookies.
- **Rate Limiting**: Built-in protection against API abuse using express-rate-limit.
- **pnpm**: Fast and efficient package manager for dependency management.
- **Puppeteer**: Headless browser for generating PDF invoices.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16.x or higher)
- MySQL (v8.x or higher, local or cloud-based)
- pnpm (preferred) or npm
- Git

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mrtmrngz/invoice-app-backend.git
   cd invoice-app-backend
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set Up Environment Variables**:
    - Create a `.env` file in the root directory with the following:
      ```env
      DATABASE_URL=your_mysql_connection_string
      JWT_SECRET=your_jwt_secret_key
      PORT=5000
      ```

4. **Set Up MySQL Database**:
    - Ensure MySQL is running and create a database.
    - Run Prisma migrations to set up the schema:
      ```bash
      pnpm prisma migrate dev --name migation_name
      # or
      npx prisma migrate dev --name migation_name
      ```

5. **Run the Application**:
   ```bash
   pnpm start
   # or
   npm start
   ```
    - The API will be available at `http://localhost:5000`.

## 🖥️ Usage
- **Authentication**: Register or log in to obtain a JWT stored in an HTTP-only cookie.
- **Create Invoices**: Use POST `/api/invoices` to create new invoices with details like client, items, and amounts.
- **Generate PDFs**: Download invoices as PDFs using a dedicated endpoint (e.g., GET `/api/invoices/download/:id`).
- **Rate Limiting**: API enforces rate limits to ensure fair usage; configure limits in the middleware as needed.

## 📂 Project Structure
```
invoice-app-backend/
├── controllers/            # Request handlers for API endpoints
├── models/                 # Prisma schemas and database models
├── routes/                 # Express routes for API endpoints
├── middleware/             # Authentication, rate limiting, and other middleware
├── services/               # Business logic and PDF generation
├── prisma/                 # Prisma schema and migration files
├── logger.js               # Centralized logging utility
├── server.js               # Main entry point for the Express server
├── .env                    # Environment variables
├── .gitignore              # Files ignored by Git
└── README.md               # Project documentation
```

## 🤝 Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature`.
3. Make changes and commit: `git commit -m "Your message"`.
4. Push to your branch: `git push origin feature/your-feature`.
5. Open a pull request with a clear description.

Please follow the project's coding standards, use pnpm for dependency management, and include relevant tests.

## 📜 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📬 Contact
For questions or feedback, reach out to [mrtmrngz](https://github.com/mrtmrngz) or email [mert00marangoz@gmail.com](mailto:mert00marangoz@gmail.com).

## 🌟 Acknowledgements
- Inspired by modern invoicing solutions for small businesses and freelancers.
- Thanks to the open-source community for tools like Prisma, Express, and pnpm.