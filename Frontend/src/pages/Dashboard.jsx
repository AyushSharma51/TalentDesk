
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Briefcase,
  Users,
  CalendarDays,
} from "lucide-react";

import { getDashboard } from "../api/client";


const STATUS_COLORS = {
  applied: "#64748b",
  screening: "#8b5cf6",
  shortlisted: "#0d9488",
  interview: "#2563eb",
  offered: "#d97706",
  hired: "#16a34a",
  rejected: "#dc2626",
};

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard({ currentUser }) {
  const isSuperAdmin = currentUser?.global_role === "super_admin";

  const companyAssignments = useMemo(() => {
    return (currentUser?.company_assignments || []).filter(
      (assignment) =>
        assignment.is_active !== false &&
        ["admin", "hr"].includes(assignment.role)
    );
  }, [currentUser]);

  const [selectedCompany, setSelectedCompany] = useState(
    isSuperAdmin ? "" : String(companyAssignments[0]?.company_id || "")
  );

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const companyId = isSuperAdmin
    ? selectedCompany
      ? Number(selectedCompany)
      : null
    : Number(selectedCompany);

  useEffect(() => {
    if (!isSuperAdmin && !companyId) {
      setLoading(false);
      setError("No company management access found for your account.");
      return;
    }

    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboard(companyId);

        if (isMounted) {
          setDashboard(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load dashboard.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [companyId, isSuperAdmin]);

  const overview = dashboard?.overview;

  const stats = [
    {
      label: "Total Jobs",
      value: overview?.total_jobs ?? 0,
      icon: BriefcaseBusiness,
    },
    {
      label: "Active Jobs",
      value: overview?.active_jobs ?? 0,
      icon: Briefcase,
    },
    {
      label: "Total Applicants",
      value: overview?.total_applicants ?? 0,
      icon: Users,
    },
    {
      label: "Total Interviews",
      value: overview?.total_interviews ?? 0,
      icon: CalendarDays,
    },
  ];

  const applicantStatuses = dashboard?.applicants_by_status || [];

  const totalApplicants = applicantStatuses.reduce(
    (total, item) => total + item.count,
    0
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your recruitment activities.</p>
        </div>

        {isSuperAdmin && (
          <div className="dashboard-company-filter">
            <label htmlFor="dashboardCompany">Company</label>

            <select
              id="dashboardCompany"
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
            >
              <option value="">All Companies</option>

              {(currentUser?.company_assignments || []).map((company) => (
                <option
                  key={company.company_id}
                  value={company.company_id}
                >
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isSuperAdmin && companyAssignments.length > 1 && (
          <div className="dashboard-company-filter">
            <label htmlFor="dashboardCompany">Company</label>

            <select
              id="dashboardCompany"
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
            >
              {companyAssignments.map((company) => (
                <option
                  key={company.company_id}
                  value={company.company_id}
                >
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="dashboard-message">Loading dashboard...</div>
      )}

      {!loading && error && (
        <div className="dashboard-error">{error}</div>
      )}

      {!loading && !error && dashboard && (
        <>
          <section className="dashboard-stats">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div className="dashboard-stat-card" key={stat.label}>
                  <div className="dashboard-stat-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>

                  <div>
                    <p>{stat.label}</p>
                    <h2>{stat.value}</h2>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="dashboard-main-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <h3>Applicants by Status</h3>
                  <p>Distribution of applicants across stages</p>
                </div>

                <span className="dashboard-total">
                  {totalApplicants} Total
                </span>
              </div>

              {applicantStatuses.length === 0 ? (
                <div className="dashboard-empty">
                  No applicant data available.
                </div>
              ) : (
                <div className="applicant-status-list">
                  {applicantStatuses.map((item) => {
                    const percentage = totalApplicants
                      ? (item.count / totalApplicants) * 100
                      : 0;

                    return (
                      <div
                        className="applicant-status-item"
                        key={item.status}
                      >
                        <div className="applicant-status-info">
                          <span className="status-label">
                            <span
                              className="status-dot"
                              style={{
                                backgroundColor:
                                  STATUS_COLORS[item.status] || "#64748b",
                              }}
                            />
                            {item.status}
                          </span>

                          <strong>{item.count}</strong>
                        </div>

                        <div className="status-progress">
                          <div
                            className="status-progress-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                STATUS_COLORS[item.status] || "#64748b",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <h3>Interview Overview</h3>
                  <p>Current interview status</p>
                </div>
              </div>

              <div className="interview-overview">
                <div className="interview-overview-item">
                  <span className="interview-indicator scheduled" />
                  <div>
                    <p>Scheduled</p>
                    <strong>{overview.scheduled_interviews}</strong>
                  </div>
                </div>

                <div className="interview-overview-item">
                  <span className="interview-indicator completed" />
                  <div>
                    <p>Completed</p>
                    <strong>{overview.completed_interviews}</strong>
                  </div>
                </div>

                <div className="interview-overview-item">
                  <span className="interview-indicator cancelled" />
                  <div>
                    <p>Cancelled</p>
                    <strong>{overview.cancelled_interviews}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-card dashboard-table-card">
            <div className="dashboard-card-header">
              <div>
                <h3>Recent Applicants</h3>
                <p>Latest candidates who applied</p>
              </div>
            </div>

            {dashboard.recent_applicants.length === 0 ? (
              <div className="dashboard-empty">
                No applicants found.
              </div>
            ) : (
              <div className="dashboard-table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Applied At</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.recent_applicants.map((applicant) => (
                      <tr key={applicant.id}>
                        <td>
                          <div className="dashboard-applicant-name">
                            {applicant.full_name}
                          </div>
                          <div className="dashboard-applicant-email">
                            {applicant.email}
                          </div>
                        </td>

                        <td>{applicant.job_title}</td>

                        <td>
                          <span
                            className={`dashboard-status-badge ${applicant.status}`}
                          >
                            {applicant.status}
                          </span>
                        </td>

                        <td>{formatDate(applicant.applied_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dashboard-card dashboard-table-card">
            <div className="dashboard-card-header">
              <div>
                <h3>Upcoming Interviews</h3>
                <p>Your next scheduled interviews</p>
              </div>
            </div>

            {dashboard.upcoming_interviews.length === 0 ? (
              <div className="dashboard-empty">
                No upcoming interviews.
              </div>
            ) : (
              <div className="dashboard-table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Job</th>
                      <th>Interviewer</th>
                      <th>Round</th>
                      <th>Scheduled At</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.upcoming_interviews.map((interview) => (
                      <tr key={interview.id}>
                        <td>{interview.applicant_name}</td>
                        <td>{interview.job_title}</td>
                        <td>{interview.interviewer_name}</td>
                        <td>{interview.interview_round}</td>
                        <td>{formatDate(interview.scheduled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;
