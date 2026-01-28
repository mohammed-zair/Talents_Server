const { CompanyCVRequest } = require("../../models");

exports.createCVRequest = async (req, res) => {
  try {
    const companyId = req.company?.company_id ?? req.user?.company_id;
    const {
      requested_role,
      experience_years,
      skills,
      location,
      cv_count,
      query,
      count,
    } = req.body;

    const resolvedRole = requested_role ?? query;
    const resolvedCount = cv_count ?? count;

    if (!resolvedRole || !resolvedCount) {
      return res
        .status(400)
        .json({ message: "requested_role and cv_count are required" });
    }

    const normalizedSkills = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const request = await CompanyCVRequest.create({
      company_id: companyId,
      requested_role: resolvedRole,
      experience_years: experience_years ?? null,
      skills: normalizedSkills,
      location: location ?? null,
      cv_count: resolvedCount,
    });
    res.status(201).json({ message: "CV request created successfully", data: request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMyCVRequests = async (req, res) => {
  try {
    const companyId = req.company?.company_id ?? req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ message: "Company context is missing" });
    }

    const items = await CompanyCVRequest.findAll({
      where: { company_id: companyId },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      message: "CV requests fetched successfully",
      data: items.map((item) => {
        const values = item.toJSON();
        return {
          ...values,
          skills: Array.isArray(values.skills) ? values.skills : [],
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
