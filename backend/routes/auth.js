const express = require("express");
const router = express.Router();

router.post("/signup", async (req, res) => {
    res.json({ message: "Signup works!" });
});

router.post("/signin", async (req, res) => {
    res.json({ message: "Signin works!" });
});

module.exports = router;
