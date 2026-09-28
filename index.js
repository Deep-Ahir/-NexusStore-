import express from "express";
import mongoose from "mongoose";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://deeppapaniya_db_user:bLnbvJOHbGGYZzca@cluster0.xekh60e.mongodb.net/abcd";

const app = express();
const PORT = process.env.PORT || 3001;


// Middleware
app.use(express.json());

// Enable CORS for external access
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

if (!MONGO_URI) {
    console.error("MongoDB URI is not defined. Please set the MONGO_URI environment variable.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected successfully to MongoDB Atlas!"))
    .catch((err) => console.error("MongoDB connection error:", err));

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    brand: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        default: "Electronics",
        trim: true,
    },
    stock: {
        type: Number,
        default: 10,
        min: 0,
    },
    description: {
        type: String,
        default: "",
        trim: true,
    },
    rating: {
        type: Number,
        default: 4.8,
        min: 0,
        max: 5,
    },
    imageUrl: {
        type: String,
        default: "",
    }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

// Check API & DB status
app.get("/api/status", (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({
        status: "ok",
        database: isConnected ? "connected" : "disconnected",
        dbName: mongoose.connection.name || "abcd",
        timestamp: new Date().toISOString()
    });
});

// Seed sample products
const sampleProducts = [
    {
        name: "MacBook Pro 16\" M3 Max",
        price: 2499,
        brand: "Apple",
        category: "Laptops",
        stock: 12,
        rating: 4.9,
        description: "Apple M3 Max chip, 36GB Unified Memory, 1TB SSD, Liquid Retina XDR display."
    },
    {
        name: "Sony WH-1000XM5 Headphones",
        price: 399,
        brand: "Sony",
        category: "Audio",
        stock: 24,
        rating: 4.8,
        description: "Industry leading noise cancellation, dual processors, 30-hour battery life."
    },
    {
        name: "Samsung Galaxy S24 Ultra",
        price: 1199,
        brand: "Samsung",
        category: "Smartphones",
        stock: 18,
        rating: 4.7,
        description: "200MP camera system, Galaxy AI, Titanium frame, built-in S Pen."
    },
    {
        name: "Dell UltraSharp 32\" 4K Hub",
        price: 749,
        brand: "Dell",
        category: "Displays",
        stock: 8,
        rating: 4.6,
        description: "IPS Black technology, 2000:1 contrast, 90W USB-C charging power delivery."
    },
    {
        name: "Logitech MX Master 3S Mouse",
        price: 99,
        brand: "Logitech",
        category: "Accessories",
        stock: 35,
        rating: 4.9,
        description: "Quiet click switches, 8K DPI sensor for any surface, ergonomic sculpted design."
    },
    {
        name: "Keychron Q1 Pro Wireless",
        price: 199,
        brand: "Keychron",
        category: "Accessories",
        stock: 15,
        rating: 4.8,
        description: "Custom mechanical keyboard with CNC aluminum frame, hot-swappable switches."
    }
];

app.post("/products/seed", async (req, res) => {
    try {
        const count = await Product.countDocuments();
        if (count > 0 && !req.query.force) {
            return res.json({ message: "Database already has products", count });
        }
        if (req.query.force) {
            await Product.deleteMany({});
        }
        const created = await Product.insertMany(sampleProducts);
        res.status(201).json({ message: "Sample products seeded successfully", data: created });
    } catch (error) {
        res.status(500).json({ message: "Error seeding products", error: error.message });
    }
});

// GET all products
app.get("/products", async (req, res) => {
    try {
        const product = await Product.find().sort({ createdAt: -1 });
        res.json({ message: "Get all Product ", data: product });
    } catch (error) {
        res.status(400).json({ message: "Error fetching product", error });
    }
});

// GET single product by ID
app.get("/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product found", data: product });
    } catch (error) {
        res.status(400).json({ message: "Error fetching product", error });
    }
});

// POST create product
app.post("/products", async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ message: "Product created", data: product });
    } catch (error) {
        res.status(400).json({ message: "Error creating product", error });
    }
});

// PUT update product
app.put("/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product updated", id: req.params.id, data: product });
    } catch (error) {
        res.status(400).json({ message: "Error updating product", error });
    }
});

// DELETE product
app.delete("/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product deleted", id: req.params.id });
    } catch (error) {
        res.status(400).json({ message: "Error deleting product", error });
    }
});

// Fallback for SPA routing if needed
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



