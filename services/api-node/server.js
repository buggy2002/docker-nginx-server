const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    service: "api-node",
    status: "ok"
  });
});

app.get("/health",(req, res) => {
    res.json({
        success: true,
        service: "api-node",
        message: "API is healthy"
    })
})

app.listen(3000, "0.0.0.0", () => {
  console.log("API running on port 3000");
});