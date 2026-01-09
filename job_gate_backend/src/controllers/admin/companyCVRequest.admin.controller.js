const { CompanyCVRequest, Company } = require("../../models");

exports.getAllCVRequests = async (req, res) => {
  try {
    const requests = await CompanyCVRequest.findAll({ include: [{ model: Company }], order: [["created_at", "DESC"]] });
    res.json({ data: requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["approved", "rejected", "processed"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const request = await CompanyCVRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    await request.save();
    res.json({ message: "Request status updated", data: request });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
