// Delivery Routes
const router = require("express").Router();
const Delivery = require("../models/Delivery");
const mongoose = require("mongoose");

router.post("/assign", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const delivery = new Delivery(req.body);
    await delivery.save();
    res.send(delivery);
  } catch (error) {
    console.error("Assign delivery error:", error);
    res.status(500).json({
      error: "Failed to assign delivery",
      message: error.message || "Failed to save delivery"
    });
  }
});

router.put("/location/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    await Delivery.findByIdAndUpdate(req.params.id, {
      currentLocation: req.body.location
    });
    res.send({ success: true });
  } catch (error) {
    console.error("Update delivery location error:", error);
    res.status(500).json({
      error: "Failed to update location",
      message: error.message || "Failed to update delivery location"
    });
  }
});

router.get("/location/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery || !delivery.currentLocation) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "Delivery location not found"
      });
    }

    const [lat, lng] = delivery.currentLocation.split(",");
    res.send({ lat: Number(lat), lng: Number(lng) });
  } catch (error) {
    console.error("Get delivery location error:", error);
    res.status(500).json({
      error: "Failed to fetch location",
      message: error.message || "Failed to retrieve delivery location"
    });
  }
});

module.exports = router;
