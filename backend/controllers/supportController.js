const SupportTicket = require("../models/SupportTicket");

const ALLOWED_CATEGORIES = [
  "general",
  "technical",
  "billing",
  "feedback",
  "other",
];

const ALLOWED_PRIORITIES = ["low", "normal", "high"];

const normalizeValue = (value = "", allowed = [], fallback) => {
  if (!value) return fallback;
  const normalized = String(value).toLowerCase().trim();
  return allowed.includes(normalized) ? normalized : fallback;
};

const buildTicketResponse = (ticket) => ({
  id: ticket._id,
  subject: ticket.subject,
  message: ticket.message,
  category: ticket.category,
  priority: ticket.priority,
  status: ticket.status,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

const createSupportTicket = async (req, res) => {
  const subject = (req.body?.subject || "").trim();
  const message = (req.body?.message || "").trim();
  const category = normalizeValue(
    req.body?.category,
    ALLOWED_CATEGORIES,
    "general"
  );
  const priority = normalizeValue(
    req.body?.priority,
    ALLOWED_PRIORITIES,
    "normal"
  );

  if (!subject) {
    return res.status(400).json({ message: "Subject is required" });
  }

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      message,
      category,
      priority,
    });

    return res.status(201).json({ ticket: buildTicketResponse(ticket) });
  } catch (error) {
    console.error("Failed to create support ticket:", error);
    return res.status(500).json({ message: "Unable to submit request" });
  }
};

const getUserSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ tickets: tickets.map(buildTicketResponse) });
  } catch (error) {
    console.error("Failed to fetch support tickets:", error);
    return res.status(500).json({ message: "Unable to load support history" });
  }
};

module.exports = {
  createSupportTicket,
  getUserSupportTickets,
};
