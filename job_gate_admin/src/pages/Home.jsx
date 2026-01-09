import React, { useEffect, useState } from "react";
import { GoPrimitiveDot } from "react-icons/go";
import { FiActivity, FiLock } from "react-icons/fi";
import { Link } from "react-router-dom";
import { Stacked } from "../components";
import { useStateContext } from "../contexts/ContextProvider";
import { earningData } from "../data/earningData";
import axiosInstance from "../utils/axiosConfig";
import { extractData } from "../utils/api";

const Home = () => {
  const { currentMode } = useStateContext();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalApplications: 0,
    pendingApplications: 0,
    totalCompanies: 0,
    pendingCompanyRequests: 0,
    totalJobPostings: 0,
    totalCVRequests: 0,
    totalCVs: 0,
    totalRevenue: 0,
  });
  const [health, setHealth] = useState({
    status: 'unknown',
    service: 'Backend',
    version: '-',
    timestamp: null,
    aiEnabled: false,
    aiUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting to fetch dashboard stats...');

      const requests = [
        axiosInstance.get('/admin/users').catch(() => ({ data: [] })),
        axiosInstance.get('/admin/applications').catch(() => ({ data: [] })),
        axiosInstance.get('/admin/job-postings').catch(() => ({ data: [] })),
        axiosInstance.get('/admin/company-requests').catch(() => ({ data: [] })),
        axiosInstance.get('/companies/admin/all').catch(() => ({ data: [] })),
        axiosInstance.get('/admin/cv-requests').catch(() => ({ data: [] })),
        axiosInstance.get('/admin/cvs').catch(() => ({ data: [] })),
      ];

      const responses = await Promise.all(requests);
      console.log('All API responses received:', responses.map(r => r.status));

      const [usersRes, applicationsRes, jobPostingsRes, companyReqsRes, companiesRes, cvRequestsRes, cvsRes] = responses;

      const users = extractData(usersRes) || [];
      const applications = extractData(applicationsRes) || [];
      const jobPostings = extractData(jobPostingsRes) || [];
      const companyRequests = extractData(companyReqsRes) || [];
      const companies = extractData(companiesRes) || [];
      const cvRequests = extractData(cvRequestsRes) || [];
      const cvs = extractData(cvsRes) || [];

      const pendingApplications = Array.isArray(applications)
        ? applications.filter(a => (a.status || '').toLowerCase() === 'pending').length
        : 0;

      const pendingCompanyRequests = Array.isArray(companyRequests)
        ? companyRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length
        : 0;

      const totalRevenue = 0; // Not available in backend

      console.log('Processed stats:', {
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalApplications: Array.isArray(applications) ? applications.length : 0,
        pendingApplications,
        totalCompanies: Array.isArray(companies) ? companies.length : 0,
        pendingCompanyRequests,
        totalJobPostings: Array.isArray(jobPostings) ? jobPostings.length : 0,
        totalCVRequests: Array.isArray(cvRequests) ? cvRequests.length : 0,
        totalCVs: Array.isArray(cvs) ? cvs.length : 0,
        totalRevenue
      });

      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalApplications: Array.isArray(applications) ? applications.length : 0,
        pendingApplications,
        totalCompanies: Array.isArray(companies) ? companies.length : 0,
        pendingCompanyRequests,
        totalJobPostings: Array.isArray(jobPostings) ? jobPostings.length : 0,
        totalCVRequests: Array.isArray(cvRequests) ? cvRequests.length : 0,
        totalCVs: Array.isArray(cvs) ? cvs.length : 0,
        totalRevenue,
      });

      const healthRes = await axiosInstance.get('/health').catch(() => null);
      const healthPayload = extractData(healthRes) || healthRes?.data || {};
      setHealth({
        status: healthPayload.status || 'unknown',
        service: healthPayload.service || 'Backend',
        version: healthPayload.version || '-',
        timestamp: healthPayload.timestamp || null,
        aiEnabled: healthPayload.ai_service_enabled || false,
        aiUrl: healthPayload.ai_service_url || '',
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError(
        "Failed to load dashboard data. Please check your connection and try again."
      );
      setStats({
        totalUsers: 0,
        totalApplications: 0,
        pendingApplications: 0,
        totalCompanies: 0,
        pendingCompanyRequests: 0,
        totalJobPostings: 0,
        totalCVRequests: 0,
        totalCVs: 0,
        totalRevenue: 0,
      });
      setHealth((prev) => ({ ...prev, status: 'unreachable' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  // ... rest of the component remains the same ...
  const updatedEarningData = earningData.map((item) => {
    const titleKey = item.title.toLowerCase();
    if (titleKey.includes('users')) {
      return { ...item, amount: loading ? '...' : stats.totalUsers.toString() };
    }
    if (titleKey.includes('company requests')) {
      return { ...item, amount: loading ? '...' : stats.pendingCompanyRequests.toString() };
    }
    if (titleKey.includes('companies')) {
      return { ...item, amount: loading ? '...' : stats.totalCompanies.toString() };
    }
    if (titleKey.includes('applications')) {
      return { ...item, amount: loading ? '...' : stats.totalApplications.toString() };
    }
    if (titleKey.includes('job postings')) {
      return { ...item, amount: loading ? '...' : stats.totalJobPostings.toString() };
    }
    if (titleKey.includes('cv requests')) {
      return { ...item, amount: loading ? '...' : stats.totalCVRequests.toString() };
    }
    if (titleKey.includes('cv library')) {
      return { ...item, amount: loading ? '...' : stats.totalCVs.toString() };
    }
    if (titleKey.includes('revenue')) {
      return {
        ...item,
        amount: loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`,
      };
    }
    return item;
  });

  const refreshData = () => {
    fetchAllStats();
  };

  const getStatusColor = (count) => {
    if (count === 0) return "bg-green-500";
    if (count < 5) return "bg-yellow-500";
    return "bg-red-500 animate-pulse";
  };

  const getPriorityLevel = (count) => {
    if (count === 0) return "Low";
    if (count < 5) return "Medium";
    return "High";
  };

  const getPriorityClass = (level) => {
    if (level === "High") return "bg-red-100 text-red-800";
    if (level === "Medium") return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getCountForTitle = (titleKey) => {
    if (titleKey.includes('users')) return stats.totalUsers;
    if (titleKey.includes('company-requests')) return stats.pendingCompanyRequests;
    if (titleKey.includes('companies')) return stats.totalCompanies;
    if (titleKey.includes('applications')) return stats.totalApplications;
    if (titleKey.includes('job-postings')) return stats.totalJobPostings;
    if (titleKey.includes('cv-requests')) return stats.totalCVRequests;
    if (titleKey.includes('cv-library') || titleKey.includes('cvs')) return stats.totalCVs;
    return 0;
  };

  const handleErrorClose = () => {
    setError(null);
  };

  const routeMap = {
    Users: 'users',
    Companies: 'companies',
    'Company Requests': 'company-requests',
    Applications: 'applications',
    'Job Postings': 'job-postings',
    'CV Requests': 'cv-requests',
    'CV Library': 'cvs',
  };

  return (
    <div className="mt-24">
      <div className="px-4 mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white p-8 shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-indigo-400/20" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-200">
                Talents Admin
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mt-2">
                Control Center Overview
              </h1>
              <p className="text-indigo-100 mt-2 max-w-xl">
                Monitor approvals, hiring activity, and CV supply with secure admin-only access.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs">
                  <FiLock /> Admin access enforced
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs">
                  <FiActivity /> Live operational metrics
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={refreshData}
                className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-indigo-50 transition text-sm flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-800" />
                    Loading...
                  </>
                ) : (
                  "Refresh Data"
                )}
              </button>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-xs text-indigo-200">Pending Requests</p>
                  <p className="text-xl font-semibold">{stats.pendingCompanyRequests}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-xs text-indigo-200">CV Requests</p>
                  <p className="text-xl font-semibold">{stats.totalCVRequests}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex justify-center mb-4">
          <div
            className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative max-w-2xl mx-3"
            role="alert"
          >
            <strong className="font-bold">Notice: </strong>
            <span className="block sm:inline">{error}</span>
            <button
              type="button"
              onClick={handleErrorClose}
              className="absolute top-0 right-0 px-2 py-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap lg:flex-nowrap justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 m-3 justify-center items-center w-full max-w-6xl">
          {updatedEarningData.map((item) => {
            const route = routeMap[item.title] || item.title.toLowerCase().replace(/\s+/g, "-");
            const count = getCountForTitle(route);
            const priorityLevel = getPriorityLevel(count);
            const priorityClass = getPriorityClass(priorityLevel);

            return (
              <Link
                key={item.title}
                to={`/${route}`}
                className="block bg-white dark:text-gray-200 dark:bg-secondary-dark-bg p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700 hover:scale-105 transform transition-transform duration-200 relative"
              >
                {!item.title.toLowerCase().includes("revenue") && (
                  <div className="absolute -top-2 -right-2 flex flex-col items-end">
                    {count > 0 && item.title.toLowerCase().includes("company requests") && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-1">
                        {count} Pending
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${priorityClass}`}
                    >
                      {priorityLevel} Priority
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {item.amount}
                      {loading && (
                        <span className="text-xs text-blue-500 ml-2">⟳</span>
                      )}
                    </p>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 font-semibold">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-full ml-4"
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <span style={{ color: item.iconColor, fontSize: "24px" }}>
                      {item.icon}
                    </span>
                  </div>
                </div>

                {!item.title.toLowerCase().includes("revenue") && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(
                          count
                        )}`}
                      />
                      <span className="text-xs text-gray-500">
                        {count > 0
                          ? `${count} needs attention`
                          : "All caught up"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {loading ? "Updating..." : "Live"}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6 flex-wrap justify-center mt-8">
        <div className="bg-white dark:text-gray-200 dark:bg-secondary-dark-bg m-3 p-6 rounded-2xl md:w-96 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-xl">System Health</p>
              <p className="text-gray-500 text-sm">API availability</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                health.status === 'healthy'
                  ? 'bg-green-100 text-green-700'
                  : health.status === 'unreachable'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {health.status}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">{health.service}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">{health.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Check</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">AI Service</span>
              <span className={`font-medium ${health.aiEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {health.aiEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {health.aiEnabled && health.aiUrl && (
              <div className="text-xs text-gray-400 break-all">AI URL: {health.aiUrl}</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:text-gray-200 dark:bg-secondary-dark-bg m-3 p-6 rounded-2xl md:w-780">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="font-semibold text-xl">Activity Analytics</p>
              <p className="text-gray-500 text-sm">
                Hiring and engagement trend snapshot
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="flex items-center gap-2 text-gray-600 hover:drop-shadow-xl">
                <span>
                  <GoPrimitiveDot className="text-blue-500" />
                </span>
                <span>Applications</span>
              </p>
              <p className="flex items-center gap-2 text-green-400 hover:drop-shadow-xl">
                <span>
                  <GoPrimitiveDot />
                </span>
                <span>Company Requests</span>
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-8 flex-wrap justify-center">
            <div className="border-r-1 border-color m-4 pr-8">
              <div className="mb-6">
                <p>
                  <span className="text-3xl font-semibold">
                    {stats.totalApplications}
                  </span>
                  <span className="p-1.5 hover:drop-shadow-xl cursor-pointer rounded-full text-white bg-indigo-500 ml-3 text-xs">
                    Total
                  </span>
                </p>
                <p className="text-gray-500 mt-1">Applications</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.pendingCompanyRequests}</p>
                <p className="text-gray-500 mt-1">Pending Company Requests</p>
              </div>
            </div>
            <div className="flex-1 min-w-[300px]">
              <Stacked currentMode={currentMode} width="100%" height="300px" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:text-gray-200 dark:bg-secondary-dark-bg m-3 p-6 rounded-2xl md:w-96">
          <div className="mb-6">
            <p className="font-semibold text-xl">Quick Summary</p>
            <p className="text-gray-500 text-sm">Request overview</p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-blue-600 dark:text-blue-300 font-medium">
                Total Applications
              </span>
              <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-bold">
                {stats.totalApplications}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-yellow-600 dark:text-yellow-300 font-medium">
                Pending Applications
              </span>
              <span className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-sm font-bold">
                {stats.pendingApplications}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-600 dark:text-green-300 font-medium">
                Companies
              </span>
              <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-bold">
                {stats.totalCompanies}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span className="text-orange-600 dark:text-orange-300 font-medium">
                Pending Company Requests
              </span>
              <span className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-sm font-bold">
                {stats.pendingCompanyRequests}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-purple-600 dark:text-purple-300 font-medium">
                CV Requests
              </span>
              <span className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm font-bold">
                {stats.totalCVRequests}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                CV Library
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded text-sm font-bold">
                {stats.totalCVs}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
