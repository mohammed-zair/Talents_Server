const { CompanyCVRequest, CompanyCVDelivery } = require("../../models");
const { calculateMatchScore, getEligibleCVs } = require("../../services/cvMatching.service");

exports.matchAndDeliverCVs = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await CompanyCVRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (request.status !== "approved") return res.status(400).json({ message: "الطلب غير معتمد بعد" });

    const cvs = await getEligibleCVs();
    const deliveries = [];

    for (const cv of cvs) {
      if (!cv.CV_Features_Analytics) continue;
      const { score, details } = calculateMatchScore(request, cv.CV_Features_Analytics);
      if (score >= 60) {
        deliveries.push({ request_id: request.request_id, cv_id: cv.cv_id, match_score: score, match_details: details });
      }
    }

    await CompanyCVDelivery.bulkCreate(deliveries);
    res.json({ message: "تمت مطابقة وتسليم CVs بنجاح", delivered_count: deliveries.length });
  } catch (error) {
    console.error("CV Matching Error:", error);
    res.status(500).json({ message: "فشل في مطابقة CVs", error: error.message });
  }
};
