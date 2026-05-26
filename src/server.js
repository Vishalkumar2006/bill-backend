const authMiddleware = require("./middleware/auth.middleware");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { s3Client, dynamoDB } = require("./config/aws");
const authRoutes = require("./routes/auth.routes");
const billsRoutes = require("./routes/bills.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/bills", billsRoutes);

app.use("/auth", authRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "BillLocker backend is running",
  });
});

app.get("/health/aws", async (req, res) => {
  try {
    const s3Result = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        MaxKeys: 1,
      })
    );

    const dynamoResult = await dynamoDB.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Key: {
          profileId: "__healthcheck__",
        },
      })
    );

    res.json({
      message: "AWS connection successful",
      s3: {
        bucket: process.env.S3_BUCKET_NAME,
        objectCountChecked: s3Result.KeyCount,
      },
      dynamodb: {
        usersTable: process.env.DYNAMODB_USERS_TABLE,
        testItemFound: !!dynamoResult.Item,
      },
    });
  } catch (error) {
    console.error("AWS health check failed:", error);

    res.status(500).json({
      message: "AWS connection failed",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.get("/protected-test", authMiddleware, (req, res) => {
  res.json({
    message: "Token is valid",
    profileId: req.user.profileId,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});