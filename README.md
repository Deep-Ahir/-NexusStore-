# ⚡ NexusStore - Product & Inventory Web Application

NexusStore is a sleek, modern inventory management web application built on **Node.js**, **Express 5**, and **MongoDB Atlas** (Mongoose). It features a dark glassmorphic UI, real-time metrics, live search & filtering, multiple view modes (Grid and Table), and full CRUD support.

---

## ✨ Features

- **Full CRUD Operations**:
  - **Create**: Add new products with validation (Name, Brand, Price, Category, Stock, Description).
  - **Read**: View all items from MongoDB Atlas in real-time.
  - **Update**: Edit existing products with pre-filled modal form.
  - **Delete**: Remove products with a safety confirmation modal.
- **Dynamic Dashboard Metrics**:
  - Total Products count
  - Total Catalog Valuation ($)
  - Average Price ($)
  - Unique Active Brands count
- **Live Search & Filter**:
  - Real-time instant search by name, brand, category, or description.
  - Category pill filter (Laptops, Smartphones, Audio, Displays, Accessories).
  - Brand filter dropdown automatically populated with active brands.
  - Sorting: Price (Low to High, High to Low), Name (A-Z), and Latest Added.
- **Dual Display Modes**:
  - **Grid View**: Modern cards with hover glow, status badges, and quick actions.
  - **Table View**: Detailed tabular view for high-density inventory review.
- **Atlas Connection Indicator**: Live status badge confirming connection to MongoDB Atlas.
- **1-Click Demo Seeding**: Built-in sample product seeder to quickly populate test data.

---

## 🚀 How to Run

### From the root folder:
```bash
npm start
```

### Or from inside `mongocrud/`:
```bash
cd mongocrud
npm start
```

Open your browser and navigate to:
```
http://localhost:3001
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/products` | Retrieve all products |
| `GET` | `/products/:id` | Retrieve a specific product by ID |
| `POST` | `/products` | Create a new product |
| `PUT` | `/products/:id` | Update an existing product |
| `DELETE`| `/products/:id` | Delete a product by ID |
| `POST` | `/products/seed` | Seed initial demo catalog |
| `GET` | `/api/status` | Check MongoDB connection health |
