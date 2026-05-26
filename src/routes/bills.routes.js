const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  PutCommand,
  QueryCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { s3Client, dynamoDB } = require("../config/aws");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
 fileFilter: (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/octet-stream",
  ];

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  const isValidMime = allowedMimeTypes.includes(file.mimetype);
  const isValidExt = allowedExtensions.includes(ext);

  if (!isValidMime && !isValidExt) {
    return cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
  }

  cb(null, true);
},
});

// Upload bill
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { date, invoiceId, amount, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "Bill file is required",
      });
    }

    if (!date || !invoiceId || !amount || !description) {
      return res.status(400).json({
        message: "date, invoiceId, amount, and description are required",
      });
    }

    const profileId = req.user.profileId;
    const billId = `BILL-${crypto.randomUUID()}`;

    const fileExtension = path.extname(req.file.originalname);
    const s3Key = `bills/${profileId}/${billId}${fileExtension}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const billItem = {
      profileId,
      billId,
      date,
      invoiceId,
      amount: Number(amount),
      description,
      s3Key,
      createdAt: new Date().toISOString(),
    };

    await dynamoDB.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        Item: billItem,
      })
    );

    res.status(201).json({
      message: "Bill uploaded successfully",
      bill: billItem,
    });
  } catch (error) {
    console.error("Bill upload error:", error);

    res.status(500).json({
      message: "Bill upload failed",
      error: error.message,
    });
  }
});

// Get temporary download URL for a bill
router.get("/:billId/download", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profileId;
    const { billId } = req.params;

    const result = await dynamoDB.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        Key: {
          profileId,
          billId,
        },
      })
    );

    if (!result.Item) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    const bill = result.Item;

    const fileExtension = path.extname(bill.s3Key) || ".pdf";
    const fileName = `${bill.invoiceId || bill.billId}${fileExtension}`;

    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: bill.s3Key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      }),
      {
        expiresIn: 60 * 5,
      }
    );

    res.json({
      message: "Download URL generated successfully",
      downloadUrl,
    });
  } catch (error) {
    console.error("Download bill error:", error);

    res.status(500).json({
      message: "Failed to generate download URL",
      error: error.message,
    });
  }
});

// Get all bills of logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profileId;

    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        KeyConditionExpression: "profileId = :profileId",
        ExpressionAttributeValues: {
          ":profileId": profileId,
        },
      })
    );

    res.json({
      message: "Bills fetched successfully",
      bills: result.Items || [],
    });
  } catch (error) {
    console.error("Fetch bills error:", error);

    res.status(500).json({
      message: "Failed to fetch bills",
      error: error.message,
    });
  }
});

// Get single bill with temporary S3 view/download URL
router.get("/:billId", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profileId;
    const { billId } = req.params;

    const result = await dynamoDB.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        Key: {
          profileId,
          billId,
        },
      })
    );

    if (!result.Item) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    const bill = result.Item;

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: bill.s3Key,
      }),
      {
        expiresIn: 60 * 5,
      }
    );

    res.json({
      message: "Bill fetched successfully",
      bill,
      fileUrl: signedUrl,
    });
  } catch (error) {
    console.error("Fetch bill error:", error);

    res.status(500).json({
      message: "Failed to fetch bill",
      error: error.message,
    });
  }
});

// Delete bill
router.delete("/:billId", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profileId;
    const { billId } = req.params;

    const result = await dynamoDB.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        Key: {
          profileId,
          billId,
        },
      })
    );

    if (!result.Item) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    const bill = result.Item;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: bill.s3Key,
      })
    );

    await dynamoDB.send(
      new DeleteCommand({
        TableName: process.env.DYNAMODB_BILLS_TABLE,
        Key: {
          profileId,
          billId,
        },
      })
    );

    res.json({
      message: "Bill deleted successfully",
      billId,
      deletedS3Key: bill.s3Key,
    });
  } catch (error) {
    console.error("Delete bill error:", error);

    res.status(500).json({
      message: "Failed to delete bill",
      error: error.message,
    });
  }
});

module.exports = router;