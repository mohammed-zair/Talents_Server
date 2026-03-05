const {
  CompanyCVRequest,
  CompanyCVRequestCandidate,
  CompanyCVDelivery,
  Company,
  User,
  CV,
  CVFeaturesAnalytics,
  EmailNotification,
  PushNotification,
} = require("../../models");

const { Op } = require("sequelize");

const resolveCompanyId = (req) => req.company?.company_id ?? req.user?.company_id;

const parseSkills = (skills) => {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeStatusForCompany = (status) => {
  if (status === "processing") return "processed";
  return status;
};

exports.createCVRequest = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
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

    const normalizedSkills = parseSkills(skills);

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
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ message: "Company context is missing" });
    }

    const items = await CompanyCVRequest.findAll({
      where: { company_id: companyId },
      order: [["created_at", "DESC"]],
    });
    const requestIds = items.map((item) => item.request_id);

    const shortlistRows = requestIds.length
      ? await CompanyCVRequestCandidate.findAll({
          where: { request_id: { [Op.in]: requestIds } },
          attributes: ["request_id", "status"],
        })
      : [];

    const deliveredRows = requestIds.length
      ? await CompanyCVDelivery.findAll({
          where: { request_id: { [Op.in]: requestIds } },
          attributes: ["request_id", "delivery_id"],
        })
      : [];

    const statsByRequest = {};
    for (const row of shortlistRows) {
      const key = Number(row.request_id);
      if (!statsByRequest[key]) {
        statsByRequest[key] = {
          selected: 0,
          contacting: 0,
          submitted_to_company: 0,
          accepted_by_company: 0,
          rejected_by_company: 0,
          total_candidates: 0,
          delivered_count: 0,
        };
      }
      statsByRequest[key].total_candidates += 1;
      if (statsByRequest[key][row.status] !== undefined) {
        statsByRequest[key][row.status] += 1;
      }
    }

    for (const row of deliveredRows) {
      const key = Number(row.request_id);
      if (!statsByRequest[key]) {
        statsByRequest[key] = {
          selected: 0,
          contacting: 0,
          submitted_to_company: 0,
          accepted_by_company: 0,
          rejected_by_company: 0,
          total_candidates: 0,
          delivered_count: 0,
        };
      }
      statsByRequest[key].delivered_count += 1;
    }

    return res.status(200).json({
      message: "CV requests fetched successfully",
      data: items.map((item) => {
        const values = item.toJSON();
        return {
          ...values,
          skills: parseSkills(values.skills),
          status: normalizeStatusForCompany(values.status),
          stats: statsByRequest[values.request_id] || {
            selected: 0,
            contacting: 0,
            submitted_to_company: 0,
            accepted_by_company: 0,
            rejected_by_company: 0,
            total_candidates: 0,
            delivered_count: 0,
          },
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMyCVRequestPipeline = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ message: "Company context is missing" });
    }

    const requestId = Number(req.params.id);
    if (!Number.isFinite(requestId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const request = await CompanyCVRequest.findOne({
      where: { request_id: requestId, company_id: companyId },
      include: [{ model: Company, attributes: ["company_id", "name", "email"] }],
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const shortlist = await CompanyCVRequestCandidate.findAll({
      where: { request_id: requestId },
      include: [
        { model: User, attributes: ["user_id", "full_name", "email", "phone"] },
        {
          model: CV,
          attributes: ["cv_id", "title", "file_url", "created_at"],
          include: [{ model: CVFeaturesAnalytics, required: false }],
          required: false,
        },
      ],
      order: [["priority_rank", "ASC"], ["created_at", "DESC"]],
    });

    const deliveries = await CompanyCVDelivery.findAll({
      where: { request_id: requestId },
      attributes: ["delivery_id", "cv_id", "match_score", "match_details", "delivered_at"],
      order: [["delivered_at", "DESC"]],
    });

    const emailUpdates = await EmailNotification.findAll({
      where: { company_id: companyId },
      attributes: ["email_id", "subject", "body", "status", "sent_at", "created_at"],
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    const pushTargetUsers = await User.findAll({
      where: { company_id: companyId, user_type: { [Op.in]: ["company", "admin"] }, is_deleted: false },
      attributes: ["user_id"],
    });
    const pushUserIds = pushTargetUsers.map((item) => item.user_id);

    const pushUpdates = pushUserIds.length
      ? await PushNotification.findAll({
          where: { user_id: { [Op.in]: pushUserIds } },
          attributes: ["push_id", "title", "message", "is_sent", "sent_at", "created_at"],
          order: [["created_at", "DESC"]],
          limit: 20,
        })
      : [];

    const shortlistData = shortlist.map((item) => {
      const row = item.toJSON();
      const atsScore = row.CV?.CVFeaturesAnalytics?.ats_score ?? null;
      return {
        id: row.id,
        user_id: row.user_id,
        cv_id: row.cv_id,
        status: row.status,
        priority_rank: row.priority_rank,
        why_candidate: row.why_candidate || null,
        notes: row.notes || null,
        source_ai_snapshot: row.source_ai_snapshot || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        candidate: {
          id: row.User?.user_id ?? null,
          full_name: row.User?.full_name ?? "Candidate",
          email: row.User?.email ?? null,
          phone: row.User?.phone ?? null,
        },
        cv: row.CV
          ? {
              id: row.CV.cv_id,
              title: row.CV.title || "CV",
              file_url: row.CV.file_url || null,
              created_at: row.CV.created_at || null,
              ats_score: atsScore,
            }
          : null,
      };
    });

    const stats = shortlistData.reduce(
      (acc, item) => {
        acc.total_candidates += 1;
        if (acc[item.status] !== undefined) {
          acc[item.status] += 1;
        }
        return acc;
      },
      {
        total_candidates: 0,
        selected: 0,
        contacting: 0,
        submitted_to_company: 0,
        accepted_by_company: 0,
        rejected_by_company: 0,
      }
    );

    const timeline = [
      {
        key: "pending",
        label: "Request submitted",
        active: ["pending", "approved", "processing", "processed", "delivered", "closed"].includes(
          request.status
        ),
      },
      {
        key: "approved",
        label: "Approved by HR",
        active: ["approved", "processing", "processed", "delivered", "closed"].includes(request.status),
      },
      {
        key: "processing",
        label: "Sourcing and shortlist",
        active: ["processing", "processed", "delivered", "closed"].includes(request.status),
      },
      {
        key: "delivered",
        label: "Candidates delivered",
        active: ["delivered", "closed"].includes(request.status),
      },
      {
        key: "closed",
        label: "Pipeline closed",
        active: request.status === "closed",
      },
    ];

    return res.status(200).json({
      message: "CV request pipeline fetched successfully",
      data: {
        request: {
          ...request.toJSON(),
          status: normalizeStatusForCompany(request.status),
          skills: parseSkills(request.skills),
        },
        stats,
        timeline,
        candidates: shortlistData,
        deliveries: deliveries.map((item) => item.toJSON()),
        updates: {
          email: emailUpdates.map((item) => item.toJSON()),
          push: pushUpdates.map((item) => item.toJSON()),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
