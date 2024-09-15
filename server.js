const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const moment = require("moment");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const emailSender = require("./helpers/EmailSender");
const XLSX = require("xlsx");
// Initialize Express
const app = express();
const csvParser = require("csv-parser");
// Middleware
app.use(cors());
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Connect to MongoDB
const db = async () => {
  try {
    await mongoose
      .connect(
        "mongodb+srv://satyampandit021:20172522@rvbmhotelbooking.9hfzkrx.mongodb.net/loanLead?retryWrites=true&w=majority",
        // "mongodb+srv://Athena:20172522@cluster0.ghheiye.mongodb.net/investment?retryWrites=true&w=majority",
        {}
      )
      .then(() => console.log("Db Connected"))
      .catch((err) => console.log(err));
  } catch (e) {
    console.log(e)
  }
}
db();
const formSchema = new mongoose.Schema(
  {
    name: String,
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    nameTitle: String,
    marriageStatus: String,
    leadManagementStages: { type: String, default: "New Lead" },
    address: String,
    businessName: String,
    businessAddress: String,
    shadualedMesage: String,
    gst: String,
    loanType: String,
    loanAmount: String,
    loanTenure: String,
    exactLoanAmount: String,
    rateOFintrest: String,
    fssai: String,
    businessType: String,
    experienceInBusiness: String,
    currentYearTurnover: String,
    noOfEmploy: String,
    PriviousExperienceInFranchisee: String,
    researchedOtherFranchisee: String,
    estimatedInve4stmentCapacity: String,
    preferredLocationAvailable: String,
    haveAnyBusinessPlane: String,
    projectedTimelineForOpeningFranchisee: String,
    experienceInMarketing: String,
    experienceInManagingStore: String,
    gender: String,
    leadSource: String,
    shadualeTime: String,
    isSomethingChange: {
      type: Boolean,
      default: false,
    },
    qualification: String,
    "available_investment_(select_one)": String,
    "preferred_franchisee_segment_(select_one)": String,
    "preferred_business_type_(select_one)": String,
    approvalLetter: String,
    agreementLetterName: String,
    purchaseOrderLetterName: String,
    approvalDate: String,
    email: String,
    address: String,
    area: String,
    shaduleDateCount: Number,
    pincode: String,
    disctict: String,
    state: String,
    junkLeadTimer: {
      type: mongoose.Schema.Types.Mixed, // Holds the timeout reference
      default: null,
    },

    postOffice: String,
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);

const removeOldJunkLeads = async () => {
  try {
    const deletedLeads = await Form.deleteMany({
      leadManagementStages: "Junk Lead", // Remove if marked as Junk Lead more than 10 seconds ago
    });
    if (deletedLeads.deletedCount > 0) {
      console.log(
        `${deletedLeads.deletedCount} Junk Leads deleted after 6000 seconds`
      );
    }
  } catch (error) {
    console.error("Error deleting old junk leads:", error);
  }
};

// Run the cleanup every second
// setInterval(removeOldJunkLeads, 60000);

const BankDetailSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  holderName: { type: String, required: true },
});

const BankDetail = mongoose.model("BankDetail", BankDetailSchema);
const ManagingAdminUserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    leads: [{ type: mongoose.Schema.ObjectId, ref: "Form" }],
    password: {
      type: String,
      required: true,
    },

    leadAccessCount: {
      type: Number,
      required: true,
    },
    canLeadUpload: {
      type: Boolean,
      default: false,
    },
    permissions: {
      Welcome: { type: Boolean, default: false },
      blocked: { type: Boolean, default: false },
      Approval: { type: Boolean, default: false },
      Agreement: { type: Boolean, default: false },
      PurchaseOrder: { type: Boolean, default: false },
      Cancellation: { type: Boolean, default: false },
      ShareBankDetails: { type: Boolean, default: false },
      Edit: { type: Boolean, default: false },
      Delete: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);
const ManagingUser = mongoose.model(
  "ManagingAdminUser",
  ManagingAdminUserSchema
);
app.use("/static", express.static(path.join(__dirname, "public")));
app.post("/api/users/add", async (req, res) => {
  const {
    userId,
    canLeadUpload,
    name,
    password,
    leadAccessCount,
    permissions,
  } = req.body;

  try {
    const newUser = new ManagingUser({
      userId,
      name,
      password,
      canLeadUpload,
      leadAccessCount,
      permissions,
    });

    await newUser.save();
    res.status(200).json({ message: "User added successfully!" });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate userId error
      res.status(400).json({ message: "User ID already exists." });
    } else {
      res.status(500).json({ message: "Server error." });
    }
  }
});
app.get("/api/users/all-user", async (req, res) => {
  try {
    const user = await ManagingUser.find();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server erroraaa." });
  }
});
app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await ManagingUser.findById(id);

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server erroraaa." });
  }
});
app.post("/api/users/save/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await ManagingUser.findByIdAndUpdate(id, req.body);

    res.status(200).json({ message: "User Updated Success!" });
  } catch (error) {
    res.status(500).json({ message: "Server erroraaa." });
  }
});
app.post("/api/users/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(id);
    await ManagingUser.findByIdAndDelete(id);

    res.status(200).json({ message: "User Delete Success!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server erroraaa." });
  }
});
app.get("/api/agreement-letter", async (req, res) => {
  const { name } = req.query;

  try {
    // Assuming your PDF files are stored in a directory called "agreements"
    const pdfDirectory = path.join(__dirname, "uploads");
    const pdfFile = path.join(pdfDirectory, `${name}`);

    // Check if the file exists
    if (fs.existsSync(pdfFile)) {
      // Send the PDF file as a response
      res.sendFile(pdfFile);
    } else {
      // If the file is not found, send a 404 response
      res.status(404).json({ error: "Agreement PDF not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/api/po-letter", async (req, res) => {
  const { name } = req.query;

  try {
    // Assuming your PDF files are stored in a directory called "agreements"
    const pdfDirectory = path.join(__dirname, "uploads");
    const pdfFile = path.join(pdfDirectory, `${name}`);

    // Check if the file exists
    if (fs.existsSync(pdfFile)) {
      // Send the PDF file as a response
      res.sendFile(pdfFile);
    } else {
      // If the file is not found, send a 404 response
      res.status(404).json({ error: "Purchase Order PDF not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

let lastAssignedIndex = 0; // Initialize globally

app.post("/api/submit", async (req, res) => {
  const { willMailShare } = req.body;
  const formData = new Form(req.body);

  try {
    const isUserAlreadyGFilledForm = await Form.findOne({ mobile: req.body.mobile })
    if (isUserAlreadyGFilledForm) {

      return res.status(203).json({ message: "You are Already Filled This Form! Go To 'check Status' To check Details" });

    }

    // Save form data to the database
    await formData.save();

    // Find all executives who are not blocked
    const allExecutives = await ManagingUser.find({
      "permissions.blocked": false,
    });

    // Calculate the index of the next executive in sequence
    const executiveCount = allExecutives.length;

    // Ensure the last assigned index wraps around if it exceeds the number of executives
    lastAssignedIndex = lastAssignedIndex % executiveCount;

    // Assign the lead to the next executive in the sequence
    const executive = allExecutives[lastAssignedIndex];

    const totalAccessibleLead = executive?.leadAccessCount;
    const totalAssignedLeadTillNow = executive?.leads.length;

    // Check if the executive can take more leads
    if (totalAccessibleLead > totalAssignedLeadTillNow) {
      await ManagingUser.findByIdAndUpdate(
        executive._id,
        { $push: { leads: formData._id } },
        { new: true }
      );

      // Increment the last assigned index for the next round
      lastAssignedIndex++;
    } else {
      // If the current executive cannot take more leads, increment index and try next
      lastAssignedIndex++;

    }
    res.status(200).json({ message: "Form Filled successfully! We Will Contact You Shortly!" });
  } catch (error) {

    res.status(203).json({ messsage: error?.message });
  }
});
app.post("/api/editSave/:id", async (req, res) => {
  const { id } = req.params;
  console.log(req.body)
  try {
    await Form.findByIdAndUpdate(id, { ...req.body, isSomethingChange: true });
    res.status(200).json({ message: "Form data Updated successfully" });
  } catch (error) {
    res.status(500).send("Failed to save form data");
  }
});
app.post("/api/createNewLead", async (req, res) => {

  try {
    const isUserExist = await Form.findOne({ mobile: req.body.mobile });
    if (isUserExist) {
      return res.status(203).json({ message: "User Already Exist" });
    }
    const formData = new Form(req.body);
    await formData.save();

    res.status(200).json({ message: "Form data Updated successfully" });
  } catch (error) {
    res.status(500).send("Failed to save form data");
  }
});
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (role === "admin") {
      if (email === "loan@gmail.com" && password === "abc@1234") {
        return res.status(200).json({ role: "admin" });
      } else {
        const user = await ManagingUser.findOne({
          userId: email,
          password: password,
        });

        if (user) {
          return res.status(200).json({ role: "excutive", id: user._id });
        }
        return res.status(203).json({ message: "Invalid admin credentials" });
      }
    }
    if (role === "customer") {
      if (password === "abc@123") {
        // This is a basic example; use hashed passwords in production
        const user = await Form.findOne({ mobile: email }); // Use findOne to get a single document
        if (user) {
          return res.status(200).json({ role: "customer" });
        } else {
          return res.status(203).json({ message: "Customer not found" });
        }
      } else {
        return res.status(203).json({ message: "Invalid password for customer" });
      }
    }

    // Handle cases where the role is neither 'admin' nor 'customer'
    return res.status(203).json({ message: "Invalid role" });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(203).json({ message: "An error occurred during login" });
  }
});

app.post(`/api/leads`, async (req, res) => {
  const { id } = req.body;

  try {
    let leads;

    // if (id) {
    //   const data = await ManagingUser.findById(id).populate("leads");

    //   if (data.permissions.blocked) {
    //     return res.status(200).json({ leads: [], permissions: {} });
    //   }

    //   return res
    //     .status(200)
    //     .json({ leads: data.leads, permissions: data.permissions });
    // }

    // Fetch all leads and sort by `createdAt` descending (newest first)
    leads = await Form.find().sort({ createdAt: -1 });
    return res.status(200).json({ leads, permissions: {} });
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});


app.post(`/api/lead`, async (req, res) => {
  const { mobile } = req.body;
  try {

    const leads = await Form.findOne({ mobile });
    return res.status(200).json(leads);
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});
app.post(`/api/leadFromAdmin`, async (req, res) => {
  const { id, excutiveID, isAdminClicked } = req.body;
  try {
    let permissions;
    if (excutiveID || !isAdminClicked) {
      permissions = await ManagingUser.findById(excutiveID);
    }
    const leads = await Form.findById(id);
    return res
      .status(200)
      .json({ leads, permissions: permissions?.permissions });
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});

const uploadForXLS = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== ".xls" && ext !== ".xlsx") {
      return cb(new Error("Only .xls or .xlsx files are allowed"), false);
    }
    cb(null, true);
  },
});

// Route to handle file upload and data saving
app.post("/api/lead/insert", uploadForXLS.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(203).json({ message: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    for (const row of worksheet) {
      const mobileNo = row.phone_number;
      const isUserExist = await Form.findOne({ mobile: mobileNo });

      if (!isUserExist) {
        const form = new Form({
          name: row.full_name,
          mobile: row.phone_number,
          email: row.email,
          address: row.street_address,
          district: row.city,
          leadSource: row.platform,
          "available_investment_(select_one)":
            row["available_investment_(select_one)"],
          "preferred_franchisee_segment_(select_one)":
            row["preferred_franchisee_segment_(select_one)"],
          "preferred_business_type_(select_one)":
            row["preferred_business_type_(select_one)"],
        });

        await form.save();

        const allExecutives = await ManagingUser.find({
          "permissions.blocked": false,
        });


        const executiveCount = allExecutives.length;
        lastAssignedIndex = lastAssignedIndex % executiveCount;
        let executive = allExecutives[lastAssignedIndex];

        const totalAccessibleLead = executive?.leadAccessCount;
        const totalAssignedLeadTillNow = executive?.leads.length;

        if (totalAccessibleLead > totalAssignedLeadTillNow) {
          await ManagingUser.findByIdAndUpdate(
            executive._id,
            { $push: { leads: form._id } },
            { new: true }
          );
          lastAssignedIndex++;
        } else {
          lastAssignedIndex++;
          // return res.status(201).json({
          //   message:
          //     "Current executive has reached their lead limit. Try again.",
          // });
        }
      }
    }

    res.status(200).json({ message: "Leads saved and assigned successfully" });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(203).json({ message: error?.message });
  }
});

app.post(`/api/shaduale-lead/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const leads = await ManagingUser.findById(id).populate("leads");
    const lead = leads.filer((l) => l.shadualeTime != "");
    return res.status(200).json(lead);
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});
// app.post(`/api/lead/update-shadualeTime`, async (req, res) => {
//   const { id, excutiveId, selectedDate, selectedTime } = req.body;
//   if (!id || !excutiveId) {
//     return res.status(400).json({ message: "Your Are Not Excutive !" });
//   }
//   if (!selectedDate || !selectedTime) {
//     return res
//       .status(400)
//       .json({ message: "Please Slectect a Valid Time zone!" });
//   }
//   try {
//     // Find the executive and populate leads
//     const allLeadsForCurrentExcutive = await ManagingUser.findById(
//       excutiveId
//     ).populate("leads");
//     // Check if the selected date and time are already booked
//     const isTimeBooked = allLeadsForCurrentExcutive.leads.some(
//       (lead) => lead.shadualeTime === `${selectedDate} + ${selectedTime}`
//     );
//     if (isTimeBooked) {
//       return res.status(201).json({
//         message: "This time is already booked on Data ",
//         selectedDate,
//       });
//     }
//     // Update the form with the new schedule time
//     await Form.findByIdAndUpdate(id, {
//       shadualeTime: `${selectedDate} + ${selectedTime}`,
//     });
//     return res.status(200).json({ message: "Meeting Scheduled!" });
//   } catch (error) {
//     console.error("Error updating schedule:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

app.post(`/api/lead/update-shadualeTime`, async (req, res) => {
  const { id, excutiveId, shaduleDateCount, shadualedMesage, selectedDate } =
    req.body;

  // Validate input
  if (!id) {
    return res.status(203).json({ message: "You Are Not Authorized!" });
  }
  if (!selectedDate) {
    return res
      .status(400)
      .json({ message: "Please Select a Valid Time Zone!" });
  }

  try {
    // Build the new shadualeTime string
    const newShadualeTime = `${selectedDate}`;

    // Update the lead with the new schedule time
    await Form.findByIdAndUpdate(id, {
      shadualeTime: newShadualeTime,
      shadualedMesage,
      isSomethingChange: true,
      shaduleDateCount,
    });

    return res.status(200).json({ message: "Meeting Scheduled!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post(`/api/lead/leadManagementStages/:id`, async (req, res) => {
  const { leadManagementStage } = req.body;
  const { id } = req.params;

  try {
    // Update the lead's leadManagementStage field
    await Form.findByIdAndUpdate(id, {
      leadManagementStages: leadManagementStage,
      isSomethingChange: true,
    });
    return res.status(200).json({ message: "Updated" });
  } catch (error) {
    console.error("Error updating lead status:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
app.get(`/api/leadById/:id`, async (req, res) => {
  const { id } = req.params;

  try {
    const leads = await Form.findById(id);
    return res.status(200).json(leads);
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});
app.get(`/api/lead/get-shadualeTime/:id`, async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const lead = await Form.findById(id);
    return res.status(200).json({ message: lead.shadualedMesage });
  } catch (error) {
    return res.status(203).json({ message: "Something went wrong" });
  }
});
app.post(`/api/leads/:query`, async (req, res) => {
  const { query } = req.params;

  try {
    const leads = await Form.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { mobile: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { leadManagementStages: { $regex: query, $options: "i" } },
      ],
    });
    return res.status(200).json({ leads });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});
app.post(`/api/lead/excutive/:query`, async (req, res) => {
  const { query } = req.params;
  const { id } = req.body;

  try {
    // Find the managing user by their ID and retrieve the leads they are assigned to
    const managingUser = await ManagingUser.findById(id).populate("leads");

    if (!managingUser) {
      return res.status(404).json({ message: "Managing user not found" });
    }

    // Search only within the user's assigned leads
    const leads = await Form.find({
      _id: { $in: managingUser.leads }, // Filter by the assigned lead IDs
      $or: [
        { name: { $regex: query, $options: "i" } },
        { mobile: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { leadManagementStages: { $regex: query, $options: "i" } },
      ],
    });

    return res.status(200).json({
      leads,
      permissions: managingUser.permissions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

app.post(`/api/lead/delete/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    await Form.findByIdAndDelete(id);
    return res.status(200).json({ message: "Data Deleted Successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

app.post(`/api/lead/sendWelcome/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const details = await Form.findByIdAndUpdate(id, {
      isSomethingChange: true,
    });
    await emailSender.welcomeEmail(details.email, details.mobile, details.name);
    return res
      .status(200)
      .json({ message: `Welcome Mail Sent Successfully! to ${details.name}` });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});
app.post(`/api/lead/sendCancel/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const details = await Form.findByIdAndDelete(id);
    await emailSender.cancelEmail(details.email, details.mobile, details.name);
    return res.status(200).json({
      message: `Cancel Mail Sent Successfully! And ${details.name}'s Account Deleted`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});
app.post(`/api/lead/sendBankDetail/:id`, async (req, res) => {
  const { id } = req.params;

  try {
    const details = await Form.findByIdAndUpdate(id, {
      isSomethingChange: true,
    });
    const bankDetails = await BankDetail.findOne();
    await emailSender.bankDetailShareEmail(
      details.email,
      details.name,
      bankDetails?.accountNumber,
      bankDetails?.bankName,
      bankDetails?.holderName,
      bankDetails?.ifscCode
    );
    return res.status(200).json({
      message: `Bank Details Mail Sent Successfully! to ${details.name}`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// app.post(`/api/lead/sendAprooval/:id`, async (req, res) => {
//   const { id } = req.params;

//   try {
//     const details = await Form.findByIdAndUpdate(id, {
//       approval: true,
//       approvalDate: moment().format("MMMM Do, YYYY"),
//     });

//     await emailSender.aproovalEmail(
//       details.email,
//       details.name,
//       details.mobile,
//       "abc@123",
//       "https://itcportals.com/check-status"
//     );
//     // email: any, name: any, loginId: any, password: any, statusUrl: any
//     return res
//       .status(200)
//       .json({ message: `Aprooval Mail Sent Successfully! to ${details.name}` });
//   } catch (error) {
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// });

app.post(
  `/api/lead/sendAgreement/:id`,
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const details = await Form.findByIdAndUpdate(id, {
        approval: true,
        agreementLetterName: req.file.filename,
        isSomethingChange: true,
      });

      await emailSender.agreementEmail(
        details.email,
        details.name,
        details.mobile,
        "abc@123",
        "https://itcportals.com/check-status"
      );
      // email: any, name: any, loginId: any, password: any, statusUrl: any
      return res.status(200).json({
        message: `Agreemrnt File Sent Successfully! to ${details.name}`,
      });
    } catch (error) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
);
app.post(`/api/lead/sendPO/:id`, upload.single("filePO"), async (req, res) => {
  const { id } = req.params;
  try {
    const details = await Form.findByIdAndUpdate(id, {
      purchaseOrderLetterName: req.file.filename,
      isSomethingChange: true,
    });

    await emailSender.POEmail(
      details.email,
      details.name,
      details.mobile,
      "abc@123",
      "https://itcportals.com/check-status"
    );
    // email: any, name: any, loginId: any, password: any, statusUrl: any
    return res.status(200).json({
      message: `Purchase Order File Sent Successfully! to ${details.name}`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
});
app.post(
  `/api/lead/sendApprooval/:id`,
  upload.single("fileApprooval"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const details = await Form.findByIdAndUpdate(id, {
        approvalLetter: req.file.filename,
        isSomethingChange: true,
      });

      await emailSender.aproovalEmail(
        details.email,
        details.name,
        details.mobile,
        "abc@123",
        "https://itcportals.com/check-status"
      );
      // email: any, name: any, loginId: any, password: any, statusUrl: any
      return res.status(200).json({
        message: `Aprooval Letter Sent Successfully! to ${details.name}`,
      });
    } catch (error) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
);

app.get("/api", async (req, res) => {
  return res.send("Hello latest vps js");
});

app.post("/api/bank-details", async (req, res) => {
  const { bankName, accountNumber, ifscCode, holderName } = req.body;

  try {
    const bankDetail = new BankDetail({
      bankName,
      accountNumber,
      ifscCode,
      holderName,
    });
    await bankDetail.save();
    res.status(200).json({ message: "Bank details added successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add bank details" });
  }
});
app.get("/api/bank-details", async (req, res) => {
  try {
    const bankDetails = await BankDetail.find();
    res.status(200).json(bankDetails);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bank details" });
  }
});

app.delete("/api/bank-details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await BankDetail.findByIdAndDelete(id);
    res.status(200).json({ message: "Bank detail deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete bank detail" });
  }
});

app.get('/', (req, res) => {
  res.json({ message: "Hello" })
})


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
