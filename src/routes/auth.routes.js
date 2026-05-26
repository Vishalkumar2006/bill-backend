const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/aws");

const router = express.Router();

function generateProfileId() {
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PRF-${randomPart}`;
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const profileId = generateProfileId();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      profileId,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await dynamoDB.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Item: user,
        ConditionExpression: "attribute_not_exists(profileId)",
      })
    );

    res.status(201).json({
      message: "User registered successfully",
      profileId,
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { profileId, password } = req.body;

    if (!profileId || !password) {
      return res.status(400).json({
        message: "Profile ID and password are required",
      });
    }

    const result = await dynamoDB.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE,
        Key: {
          profileId,
        },
      })
    );

    if (!result.Item) {
      return res.status(401).json({
        message: "Invalid profile ID or password",
      });
    }

    const user = result.Item;

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid profile ID or password",
      });
    }

    const token = jwt.sign(
      {
        profileId: user.profileId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      profileId: user.profileId,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

module.exports = router;