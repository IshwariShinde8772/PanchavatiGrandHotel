const express = require("express");
const { getMyTasks, updateTaskStatus, getMySchedule, reportIssue } = require("../controllers/worker/workerController");

const router = express.Router();

router.get("/tasks", getMyTasks);
router.patch("/tasks/:id", updateTaskStatus);
router.get("/schedule", getMySchedule);
router.post("/issues", reportIssue);

module.exports = router;

