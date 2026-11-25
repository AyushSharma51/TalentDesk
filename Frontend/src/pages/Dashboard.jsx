
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Briefcase,
  Users,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

import {
  getDashboard,
  getApplicants,
  getInterviews,
} from "../api/client";

const STATUS_COLORS = {
  applied: "#64748b",
  screening: "#8b5cf6",
  shortlisted: "#0d9488",
  interview: "#2563eb",
  offered: "#d97706",
  hired: "#16a34a",
  rejected: "#dc2626",
};

const FUNNEL_STAGES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offered",
  "hired",
];

const EVALUATION_FIELDS = [
  { key: "rating", label: "Overall rating" },
  { key: "technical_rating", label: "Technical rating" },
  { key: "communication_rating", label: "Communication rating" },
  { key: "problem_solving_rating", label: "Problem-solving rating" },
  { key: "strengths", label: "Strengths" },
  { key: "weaknesses", label: "Weaknesses" },
  { key: "feedback", label: "Feedback" },
  { key: "recommendation", label: "Recommendation" },
];

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

function isMissingEvaluationValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function getMissingEvaluationFields(interview) {
  return EVALUATION_FIELDS.filter((field) =>
    isMissingEvaluationValue(interview[field.key])
  );
}

function getDateRange(filter) {
  const now = new Date();
  const start = new Date(now);

  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    const day = start.getDay();
    const daysSinceMonday = (day + 6) % 7;

    start.setDate(start.getDate() - daysSinceMonday);
    start.setHours(0, 0, 0, 0);
  } else if (filter === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

function isWithinDateRange(dateString, range) {
  if (!dateString) return false;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return false;

  return date >= range.start && date <= range.end;
}

function DateFilter({ value, onChange }) {
  return (
    <select
      className="dashboard-date-filter"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter dashboard analytics by date"
    >
      <option value="today">Today</option>
      <option value="week">This week</option>
      <option value="month">This month</option>
    </select>
  );
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
  const [applicants, setApplicants] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [dateFilter, setDateFilter] = useState("month");

  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");

  const companyId = isSuperAdmin
    ? selectedCompany
      ? Number(selectedCompany)
      : null
    : Number(selectedCompany);

  useEffect(() => {
    if (!isSuperAdmin && !companyId) {
      setLoading(false);
      setAnalyticsLoading(false);
      setError("No company management access found for your account.");
      return;
    }

    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setAnalyticsLoading(true);
        setError("");
        setAnalyticsError("");

        const [dashboardData, applicantsData, interviewsData] =
          await Promise.all([
            getDashboard(companyId),

            // Fetch all applicants using the existing pagination API.
            (async () => {
              const allApplicants = [];
              let skip = 0;
              const limit = 100;

              while (true) {
                const page = await getApplicants({
                  companyId,
                  skip,
                  limit,
                });

                const records = Array.isArray(page) ? page : [];

                allApplicants.push(...records);

                if (records.length < limit) break;

                skip += limit;
              }

              return allApplicants;
            })(),

            getInterviews({ companyId }),
          ]);

        if (isMounted) {
          setDashboard(dashboardData);
          setApplicants(applicantsData);
          setInterviews(
            Array.isArray(interviewsData) ? interviewsData : []
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load dashboard.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAnalyticsLoading(false);
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
      color: "blue",
    },
    {
      label: "Active Jobs",
      value: overview?.active_jobs ?? 0,
      icon: Briefcase,
      color: "green",
    },
    {
      label: "Total Applicants",
      value: overview?.total_applicants ?? 0,
      icon: Users,
      color: "purple",
    },
    {
      label: "Total Interviews",
      value: overview?.total_interviews ?? 0,
      icon: CalendarDays,
      color: "orange",
    },
  ];

  const applicantStatuses = dashboard?.applicants_by_status || [];

  const totalApplicants = applicantStatuses.reduce(
    (total, item) => total + item.count,
    0
  );

  // Apply the selected date range to the new analytics.
  const dateRange = useMemo(
    () => getDateRange(dateFilter),
    [dateFilter]
  );

  const filteredApplicants = useMemo(() => {
    return applicants.filter((applicant) =>
      isWithinDateRange(applicant.applied_at, dateRange)
    );
  }, [applicants, dateRange]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) =>
      isWithinDateRange(interview.scheduled_at, dateRange)
    );
  }, [interviews, dateRange]);

  // Recruitment funnel: current applicant status distribution
  // among applicants who applied during the selected date range.
  const funnelData = useMemo(() => {
    const counts = {};

    FUNNEL_STAGES.forEach((stage) => {
      counts[stage] = 0;
    });

    let rejected = 0;

    filteredApplicants.forEach((applicant) => {
      if (counts[applicant.status] !== undefined) {
        counts[applicant.status] += 1;
      } else if (applicant.status === "rejected") {
        rejected += 1;
      }
    });

    const maxCount = Math.max(
      ...FUNNEL_STAGES.map((stage) => counts[stage]),
      1
    );

    return {
      counts,
      rejected,
      maxCount,
    };
  }, [filteredApplicants]);

  // Pending evaluation:
  // Interview must be completed and at least one evaluation
  // field must be missing.
  const pendingEvaluations = useMemo(() => {
    return filteredInterviews
      .filter((interview) => interview.status === "completed")
      .map((interview) => ({
        ...interview,
        missingFields: getMissingEvaluationFields(interview),
      }))
      .filter((interview) => interview.missingFields.length > 0)
      .sort(
        (a, b) =>
          new Date(b.scheduled_at) - new Date(a.scheduled_at)
      );
  }, [filteredInterviews]);

  const applicantMap = useMemo(() => {
    return new Map(
      applicants.map((applicant) => [
        Number(applicant.id),
        applicant,
      ])
    );
  }, [applicants]);

  const recentNewApplications = useMemo(() => {
    return [...filteredApplicants]
      .sort(
        (a, b) =>
          new Date(b.applied_at) - new Date(a.applied_at)
      )
      .slice(0, 10);
  }, [filteredApplicants]);

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
              onChange={(event) =>
                setSelectedCompany(event.target.value)
              }
            >
              <option value="">All Companies</option>

              {(currentUser?.company_assignments || []).map(
                (company) => (
                  <option
                    key={company.company_id}
                    value={company.company_id}
                  >
                    {company.company_name}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        {!isSuperAdmin && companyAssignments.length > 1 && (
          <div className="dashboard-company-filter">
            <label htmlFor="dashboardCompany">Company</label>

            <select
              id="dashboardCompany"
              value={selectedCompany}
              onChange={(event) =>
                setSelectedCompany(event.target.value)
              }
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
        <div className="dashboard-message">
          Loading dashboard...
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-error">{error}</div>
      )}

      {!loading && !error && dashboard && (
        <>
          {/* Existing overview cards */}
          <section className="dashboard-stats">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="dashboard-stat-card"
                  key={stat.label}
                >
                  <div
                    className={`dashboard-stat-icon ${stat.color}`}
                  >
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

          {/* New analytics heading and date filter */}
          <section className="dashboard-analytics-heading">
            <div>
              <h2>Recruitment Analytics</h2>
              <p>
                Track your recruitment pipeline and evaluation
                progress.
              </p>
            </div>

            <DateFilter
              value={dateFilter}
              onChange={setDateFilter}
            />
          </section>

          {analyticsError && (
            <div className="dashboard-error">
              {analyticsError}
            </div>
          )}

          {analyticsLoading ? (
            <div className="dashboard-message">
              Loading recruitment analytics...
            </div>
          ) : (
            <>
              {/* Recruitment Funnel */}
              <section className="dashboard-card dashboard-funnel-card">
                <div className="dashboard-card-header">
                  <div>
                    <h3>
                      <TrendingUp
                        size={18}
                        className="dashboard-heading-icon"
                      />
                      Recruitment Funnel
                    </h3>
                    <p>
                      Applicant distribution across recruitment
                      stages
                    </p>
                  </div>

                  <span className="dashboard-total">
                    {filteredApplicants.length} Applicants
                  </span>
                </div>

                {filteredApplicants.length === 0 ? (
                  <div className="dashboard-empty">
                    No applications found for this period.
                  </div>
                ) : (
                  <div className="dashboard-funnel">
                    {FUNNEL_STAGES.map((stage) => {
                      const count = funnelData.counts[stage];

                      const percentage =
                        (count / funnelData.maxCount) * 100;

                      return (
                        <div
                          className="dashboard-funnel-stage"
                          key={stage}
                        >
                          <div className="dashboard-funnel-info">
                            <span>
                              <span
                                className="status-dot"
                                style={{
                                  backgroundColor:
                                    STATUS_COLORS[stage],
                                }}
                              />
                              {stage}
                            </span>

                            <strong>{count}</strong>
                          </div>

                          <div className="dashboard-funnel-track">
                            <div
                              className="dashboard-funnel-fill"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  STATUS_COLORS[stage],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="dashboard-funnel-rejected">
                      <span>
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor:
                              STATUS_COLORS.rejected,
                          }}
                        />
                        Rejected
                      </span>

                      <strong>{funnelData.rejected}</strong>
                    </div>
                  </div>
                )}
              </section>

              {/* Pending Evaluations */}
              <section className="dashboard-card dashboard-table-card">
                <div className="dashboard-card-header">
                  <div>
                    <h3>
                      <ClipboardCheck
                        size={18}
                        className="dashboard-heading-icon"
                      />
                      Pending Evaluations
                    </h3>
                    <p>
                      Completed interviews with incomplete
                      evaluation forms
                    </p>
                  </div>

                  <span className="dashboard-total">
                    {pendingEvaluations.length} Pending
                  </span>
                </div>

                {pendingEvaluations.length === 0 ? (
                  <div className="dashboard-empty">
                    No pending evaluations for this period.
                  </div>
                ) : (
                  <div className="dashboard-table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Interview Round</th>
                          <th>Interview Date</th>
                          <th>Missing Fields</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pendingEvaluations.map((interview) => {
                          const applicant = applicantMap.get(
                            Number(interview.applicant_id)
                          );

                          return (
                            <tr key={interview.id}>
                              <td>
                                <div className="dashboard-applicant-name">
                                  {applicant?.full_name ||
                                    `Applicant #${interview.applicant_id}`}
                                </div>

                                <div className="dashboard-applicant-email">
                                  {applicant?.job_title || "—"}
                                </div>
                              </td>

                              <td>{interview.interview_round}</td>

                              <td>
                                {formatDate(interview.scheduled_at)}
                              </td>

                              <td>
                                <div className="dashboard-missing-fields">
                                  {interview.missingFields.map(
                                    (field) => (
                                      <span
                                        key={field.key}
                                        className="dashboard-missing-tag"
                                      >
                                        {field.label}
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* New Applications */}
              <section className="dashboard-card dashboard-table-card">
                <div className="dashboard-card-header">
                  <div>
                    <h3>New Applications</h3>
                    <p>
                      Applications received during the selected
                      period
                    </p>
                  </div>

                  <span className="dashboard-total">
                    {filteredApplicants.length} Applications
                  </span>
                </div>

                {recentNewApplications.length === 0 ? (
                  <div className="dashboard-empty">
                    No new applications for this period.
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
                        {recentNewApplications.map((applicant) => (
                          <tr key={applicant.id}>
                            <td>
                              <div className="dashboard-applicant-name">
                                {applicant.full_name}
                              </div>

                              <div className="dashboard-applicant-email">
                                {applicant.email}
                              </div>
                            </td>

                            <td>{applicant.job_title || "—"}</td>

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
            </>
          )}

          {/* Existing applicant status and interview overview */}
          <section className="dashboard-main-grid">
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <h3>Applicants by Status</h3>
                  <p>
                    Distribution of applicants across stages
                  </p>
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
                                  STATUS_COLORS[item.status] ||
                                  "#64748b",
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
                                STATUS_COLORS[item.status] ||
                                "#64748b",
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
                    <strong>
                      {overview.scheduled_interviews ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="interview-overview-item">
                  <span className="interview-indicator completed" />
                  <div>
                    <p>Completed</p>
                    <strong>
                      {overview.completed_interviews ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="interview-overview-item">
                  <span className="interview-indicator cancelled" />
                  <div>
                    <p>Cancelled</p>
                    <strong>
                      {overview.cancelled_interviews ?? 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Existing Recent Applicants */}
          <section className="dashboard-card dashboard-table-card">
            <div className="dashboard-card-header">
              <div>
                <h3>Recent Applicants</h3>
                <p>Latest candidates who applied</p>
              </div>
            </div>

            {!dashboard.recent_applicants?.length ? (
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

          {/* Existing Upcoming Interviews */}
          <section className="dashboard-card dashboard-table-card">
            <div className="dashboard-card-header">
              <div>
                <h3>Upcoming Interviews</h3>
                <p>Your next scheduled interviews</p>
              </div>
            </div>

            {!dashboard.upcoming_interviews?.length ? (
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
