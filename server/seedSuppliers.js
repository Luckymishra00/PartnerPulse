
require("dotenv").config();

const mongoose = require("mongoose");
const Supplier = require("./models/Supplier");

const sampleSuppliers = [
  {
    supplierName: "Amit Verma",
    companyName: "Prime Raw Materials Pvt Ltd",
    email: "amit.verma@primeraw.example",
    phone: "9876501001",
    category: "Raw Materials",
    address: "Industrial Area, Ludhiana, Punjab",
    status: "Active",
    performanceScore: 92,
    notes: "Reliable raw material supplier."
  },
  {
    supplierName: "Neha Singh",
    companyName: "TechNova Solutions",
    email: "neha.singh@technova.example",
    phone: "9876501002",
    category: "Technology",
    address: "Sector 62, Noida, Uttar Pradesh",
    status: "Active",
    performanceScore: 88,
    notes: "Provides IT equipment and technical support."
  },
  {
    supplierName: "Karan Mehta",
    companyName: "SwiftMove Logistics",
    email: "karan.mehta@swiftmove.example",
    phone: "9876501003",
    category: "Logistics",
    address: "Gurugram, Haryana",
    status: "Active",
    performanceScore: 85,
    notes: "Transportation and logistics services."
  },
  {
    supplierName: "Priya Sharma",
    companyName: "EcoPack Industries",
    email: "priya.sharma@ecopack.example",
    phone: "9876501004",
    category: "Packaging",
    address: "Baddi, Himachal Pradesh",
    status: "Active",
    performanceScore: 94,
    notes: "Specializes in packaging materials."
  },
  {
    supplierName: "Rahul Kapoor",
    companyName: "Reliable Maintenance Co",
    email: "rahul.kapoor@reliablemaint.example",
    phone: "9876501005",
    category: "Maintenance",
    address: "Chandigarh, India",
    status: "Under Review",
    performanceScore: 68,
    notes: "Maintenance performance review pending."
  },
  {
    supplierName: "Sneha Gupta",
    companyName: "GreenField Materials",
    email: "sneha.gupta@greenfield.example",
    phone: "9876501006",
    category: "Raw Materials",
    address: "Jaipur, Rajasthan",
    status: "Active",
    performanceScore: 90,
    notes: "Supplies industrial raw materials."
  },
  {
    supplierName: "Vikram Malhotra",
    companyName: "CloudBridge Technologies",
    email: "vikram@cloudbridge.example",
    phone: "9876501007",
    category: "Technology",
    address: "Bengaluru, Karnataka",
    status: "Active",
    performanceScore: 96,
    notes: "Cloud infrastructure and technology services."
  },
  {
    supplierName: "Pooja Verma",
    companyName: "NorthStar Transport",
    email: "pooja.verma@northstar.example",
    phone: "9876501008",
    category: "Logistics",
    address: "Delhi, India",
    status: "Active",
    performanceScore: 81,
    notes: "Regional freight and transport provider."
  },
  {
    supplierName: "Arjun Patel",
    companyName: "PackRight Solutions",
    email: "arjun.patel@packright.example",
    phone: "9876501009",
    category: "Packaging",
    address: "Ahmedabad, Gujarat",
    status: "Active",
    performanceScore: 87,
    notes: "Packaging and dispatch materials."
  },
  {
    supplierName: "Kavita Joshi",
    companyName: "Precision Service Works",
    email: "kavita.joshi@precision.example",
    phone: "9876501010",
    category: "Maintenance",
    address: "Pune, Maharashtra",
    status: "Active",
    performanceScore: 79,
    notes: "Equipment servicing and repairs."
  },
  {
    supplierName: "Rohit Bansal",
    companyName: "Metro Industrial Supplies",
    email: "rohit.bansal@metroindustrial.example",
    phone: "9876501011",
    category: "Raw Materials",
    address: "Faridabad, Haryana",
    status: "Under Review",
    performanceScore: 65,
    notes: "Pending quality and delivery assessment."
  },
  {
    supplierName: "Ananya Rao",
    companyName: "NextWave Digital",
    email: "ananya.rao@nextwave.example",
    phone: "9876501012",
    category: "Technology",
    address: "Hyderabad, Telangana",
    status: "Active",
    performanceScore: 91,
    notes: "Software and digital infrastructure services."
  },
  {
    supplierName: "Deepak Yadav",
    companyName: "ExpressRoute Carriers",
    email: "deepak.yadav@expressroute.example",
    phone: "9876501013",
    category: "Logistics",
    address: "Lucknow, Uttar Pradesh",
    status: "Inactive",
    performanceScore: 55,
    notes: "Inactive sample supplier."
  },
  {
    supplierName: "Meera Nair",
    companyName: "SafeWrap Packaging",
    email: "meera.nair@safewrap.example",
    phone: "9876501014",
    category: "Packaging",
    address: "Kochi, Kerala",
    status: "Active",
    performanceScore: 89,
    notes: "Protective and industrial packaging."
  },
  {
    supplierName: "Sanjay Mishra",
    companyName: "Allied Facility Services",
    email: "sanjay.mishra@alliedfacility.example",
    phone: "9876501015",
    category: "Other",
    address: "Varanasi, Uttar Pradesh",
    status: "Active",
    performanceScore: 83,
    notes: "General business and facility support."
  }
];

async function seedSuppliers() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected:", mongoose.connection.name);

    let added = 0;
    let skipped = 0;

    for (const data of sampleSuppliers) {
      const existing = await Supplier.findOne({
        email: data.email.toLowerCase()
      });

      if (existing) {
        console.log(`Skipped existing supplier: ${data.email}`);
        skipped++;
        continue;
      }

      await Supplier.create(data);

      console.log(`Added supplier: ${data.companyName}`);
      added++;
    }

    console.log("\n======= SUPPLIER SEED SUMMARY =======");
    console.log(`New suppliers added: ${added}`);
    console.log(`Existing suppliers skipped: ${skipped}`);
    console.log(
      `Total suppliers in database: ${await Supplier.countDocuments()}`
    );
    console.log("=====================================");
  } catch (error) {
    console.error("Supplier seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedSuppliers();
