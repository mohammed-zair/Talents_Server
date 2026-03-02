const buildCompanyLogoUrl = (companyId) => `/api/companies/${companyId}/logo`;

const getAnonymousCompanyBrand = () => ({
  company_id: null,
  name: process.env.TALENTS_BRAND_NAME || "Talents",
  logo_url: process.env.TALENTS_BRAND_LOGO_URL || "/logo.png",
});

const toPublicCompany = (company) => {
  if (!company) return company;
  const data = company.toJSON ? company.toJSON() : { ...company };
  const logoUrl = data.logo_mimetype ? buildCompanyLogoUrl(data.company_id) : null;
  return {
    ...data,
    logo_url: logoUrl,
    logo_data: undefined,
    logo_mimetype: undefined,
    license_doc_data: undefined,
    license_mimetype: undefined,
    password: undefined,
    email: data.email,
    phone: data.phone,
  };
};

const maskCompanyIfAnonymous = (job, company) => {
  if (!company) return company;
  const isAnonymous = Boolean(job?.is_anonymous);
  if (!isAnonymous) return toPublicCompany(company);
  return getAnonymousCompanyBrand();
};

module.exports = {
  buildCompanyLogoUrl,
  getAnonymousCompanyBrand,
  toPublicCompany,
  maskCompanyIfAnonymous,
};

