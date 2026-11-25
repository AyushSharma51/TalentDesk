
import { useEffect, useMemo, useState } from "react";
import { getApplicants } from "../api/client";

function Applicants({ currentUser, onViewApplicant }) {
  const isSuperAdmin = currentUser?.global_role === "super_admin";

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (currentUser?.global_role === "super_admin") return "all";

    const firstCompany = (currentUser?.company_assignments || []).find(
      (assignment) =>
        assignment.is_active !== false &&
        ["admin", "hr"].includes(assignment.role)
    );

    return firstCompany ? String(firstCompany.company_id) : "";
  });

  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Sorting
  const [sortBy, setSortBy] = useState("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchApplicants() {
    if (!isSuperAdmin && !selectedCompany) {
      setApplicants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getApplicants({
        companyId: isSuperAdmin ? null : Number(selectedCompany),
      });

      setApplicants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch applicants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplicants();
  }, [selectedCompany, isSuperAdmin]);

  // Get unique companies from loaded applicants.
  const companies = useMemo(() => {
    const uniqueCompanies = new Map();

    applicants.forEach((applicant) => {
      uniqueCompanies.set(
        applicant.company_id,
        applicant.company_name
      );
    });

    return Array.from(uniqueCompanies, ([id, name]) => ({
      id,
      name,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [applicants]);

  // Get positions belonging to the selected company.
  const jobs = useMemo(() => {
    const uniqueJobs = new Map();

    applicants
      .filter(
        (applicant) =>
          selectedCompany === "all" ||
          String(applicant.company_id) === selectedCompany
      )
      .forEach((applicant) => {
        uniqueJobs.set(applicant.job_id, applicant.job_title);
      });

    return Array.from(uniqueJobs, ([id, title]) => ({
      id,
      title,
    })).sort((a, b) => a.title.localeCompare(b.title));
  }, [applicants, selectedCompany]);

  // Apply search and filters.
  const filteredApplicants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applicants.filter((applicant) => {
      const matchesCompany =
        selectedCompany === "all" ||
        String(applicant.company_id) === selectedCompany;

      const matchesJob =
        selectedJob === "all" ||
        String(applicant.job_id) === selectedJob;

      const matchesStatus =
        selectedStatus === "all" ||
        applicant.status === selectedStatus;

      const matchesSearch =
        !normalizedSearch ||
        [
          applicant.full_name,
          applicant.email,
          applicant.phone,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch)
        );

      return (
        matchesCompany &&
        matchesJob &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    applicants,
    selectedCompany,
    selectedJob,
    selectedStatus,
    searchTerm,
  ]);

  // Sort filtered applicants.
  const sortedApplicants = useMemo(() => {
    const sorted = [...filteredApplicants];

    switch (sortBy) {
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.applied_at) - new Date(b.applied_at)
        );

      case "name_asc":
        return sorted.sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "")
        );

      case "name_desc":
        return sorted.sort((a, b) =>
          (b.full_name || "").localeCompare(a.full_name || "")
        );

      case "status":
        return sorted.sort((a, b) =>
          (a.status || "").localeCompare(b.status || "")
        );

      case "newest":
      default:
        return sorted.sort(
          (a, b) =>
            new Date(b.applied_at) - new Date(a.applied_at)
        );
    }
  }, [filteredApplicants, sortBy]);

  // Statistics are based on the filtered results.
  const statistics = {
    total: filteredApplicants.length,
    applied: filteredApplicants.filter(
      (a) => a.status === "applied"
    ).length,
    shortlisted: filteredApplicants.filter(
      (a) => a.status === "shortlisted"
    ).length,
    interviews: filteredApplicants.filter(
      (a) => a.status === "interview"
    ).length,
  };

  // Pagination calculations.
  const totalPages = Math.ceil(sortedApplicants.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedApplicants = sortedApplicants.slice(
    startIndex,
    endIndex
  );

  // Reset to first page when search, filters or sorting change.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCompany,
    selectedJob,
    selectedStatus,
    sortBy,
    pageSize,
  ]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedJob("all");
    setSelectedStatus("all");

    if (isSuperAdmin) {
      setSelectedCompany("all");
    }
  }

  function handleCompanyChange(event) {
    setSelectedCompany(event.target.value);
    setSelectedJob("all");
  }

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1)
    );
  }

  return (
    <div className="applicants-page">
      {/* Page Header */}
      <div className="applicants-header">
        <div>
          <h1>Applicants</h1>
          <p>Review and manage candidate applications.</p>
        </div>

        <button
          type="button"
          className="refresh-applicants-btn"
          onClick={fetchApplicants}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="applicants-error">{error}</p>
      )}

      {/* Statistics */}
      <div className="applicants-stats">
        <div className="applicant-stat-card">
          <span>Total Applicants</span>
          <h2>{statistics.total}</h2>
        </div>

        <div className="applicant-stat-card">
          <span>Applied</span>
          <h2>{statistics.applied}</h2>
        </div>

        <div className="applicant-stat-card">
          <span>Shortlisted</span>
          <h2>{statistics.shortlisted}</h2>
        </div>

        <div className="applicant-stat-card">
          <span>Interviews</span>
          <h2>{statistics.interviews}</h2>
        </div>
      </div>

      {/* Applicants Table */}
      <div className="applicants-table-container">
        <div className="applicants-table-header">
          <div>
            <h2>All Applicants</h2>
            <p>
              Review candidate applications and their progress.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="applicants-filters">
          <input
            type="search"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="applicant-search-input"
          />

          {isSuperAdmin && (
            <select
              value={selectedCompany}
              onChange={handleCompanyChange}
            >
              <option value="all">All Companies</option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={String(company.id)}
                >
                  {company.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedJob}
            onChange={(event) =>
              setSelectedJob(event.target.value)
            }
          >
            <option value="all">All Positions</option>

            {jobs.map((job) => (
              <option key={job.id} value={String(job.id)}>
                {job.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value)
            }
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="offered">Offered</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name: A–Z</option>
            <option value="name_desc">Name: Z–A</option>
            <option value="status">Status</option>
          </select>

          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <p className="applicants-message">
            Loading applicants...
          </p>
        ) : error ? (
          <p className="applicants-message">
            Unable to load applicants.
          </p>
        ) : filteredApplicants.length === 0 ? (
          <div className="applicants-empty">
            <h3>No applicants found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="applicants-results-count">
              Showing {startIndex + 1}–
              {Math.min(endIndex, sortedApplicants.length)} of{" "}
              {sortedApplicants.length} applicants
            </div>

            <div className="applicants-table-scroll">
              <table className="applicants-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Position</th>
                    <th>Applied On</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedApplicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() =>
                        onViewApplicant?.(applicant.id)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <strong>{applicant.full_name}</strong>
                      </td>

                      <td>{applicant.email}</td>
                      <td>{applicant.phone}</td>
                      <td>{applicant.company_name}</td>
                      <td>{applicant.job_title}</td>

                      <td>
                        {new Date(
                          applicant.applied_at
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td>
                        <span
                          className={`applicant-status ${applicant.status}`}
                        >
                          {applicant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="applicants-pagination">
              <div className="pagination-page-size">
                <label htmlFor="applicantPageSize">
                  Rows per page:
                </label>

                <select
                  id="applicantPageSize"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="pagination-navigation">
                <span className="pagination-page-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Applicants;
