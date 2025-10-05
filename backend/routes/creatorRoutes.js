const express = require("express");
const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  publishProject,
  deleteProject,
  markExported,
  generateProjectPrompt,
} = require("../controllers/creatorController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/projects", listProjects);
router.post("/projects", createProject);
router.get("/projects/:id", getProject);
router.put("/projects/:id", updateProject);
router.post("/projects/:id/publish", publishProject);
router.post("/projects/:id/export", markExported);
router.post("/projects/:id/prompt", generateProjectPrompt);
router.delete("/projects/:id", deleteProject);

module.exports = router;
