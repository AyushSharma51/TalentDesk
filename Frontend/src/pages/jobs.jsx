import { useEffect, useState } from "react";

import {
  getJobs,
  getCompanies,
  createJob,
  updateJob,
  publishJob,
  closeJob,
  deleteJob,
} from "../api/client";

function Jobs({ currentUser }) {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [formData, setFormData] = useState({
    company_id: "",
    title: "",
    department: "",
    employment_type: "internship",
    location: "",
    work_mode: "on_site",
    description: "",
    requirements: "",
  });

  // =====================================
  // PERMISSIONS
  // =====================================

  const isSuperAdmin =
    currentUser?.global_role === "super_admin";

  const companyAssignments = Array.isArray(
    currentUser?.company_assignments
  )
    ? currentUser.company_assignments
    : [];

  const manageableCompanies = companyAssignments.filter(
    (assignment) =>
      assignment.is_active !== false &&
      ["admin", "hr"].includes(
        String(assignment.role || "").toLowerCase()
      )
  );

  const canManageJobs =
    isSuperAdmin || manageableCompanies.length > 0;

  // =====================================
  // FETCH JOBS
  // =====================================

  async function fetchJobs() {
    try {
      setLoading(true);
      setError("");

      const data = await getJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch jobs.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // FETCH COMPANIES
  // =====================================

  useEffect(() => {
    async function loadCompanies() {
      try {
        if (isSuperAdmin) {
          const data = await getCompanies();
          setCompanies(Array.isArray(data) ? data : []);
        } else {
          const companiesForUser = manageableCompanies.map(
            (assignment) => ({
              id: assignment.company_id,
              name: assignment.company_name,
            })
          );

          setCompanies(companiesForUser);
        }
      } catch (err) {
        setFormError(
          err.message || "Failed to load companies."
        );
      }
    }

    if (currentUser) {
      loadCompanies();
    }
  }, [currentUser, isSuperAdmin]);

  useEffect(() => {
    fetchJobs();
  }, []);

  // =====================================
  // FORM HANDLING
  // =====================================

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      company_id: "",
      title: "",
      department: "",
      employment_type: "internship",
      location: "",
      work_mode: "on_site",
      description: "",
      requirements: "",
    });

    setEditingJob(null);
    setFormError("");
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(job) {
    setFormError("");
    setEditingJob(job);

    setFormData({
      company_id: String(job.company_id),
      title: job.title || "",
      department: job.department || "",
      employment_type: job.employment_type || "internship",
      location: job.location || "",
      work_mode: job.work_mode || "on_site",
      description: job.description || "",
      requirements: job.requirements || "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  // =====================================
  // CREATE / UPDATE JOB
  // =====================================

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");

      if (!formData.title.trim()) {
        throw new Error("Job title is required.");
      }

      const jobData = {
        title: formData.title.trim(),
        department: formData.department.trim() || null,
        employment_type: formData.employment_type,
        location: formData.location.trim() || null,
        work_mode: formData.work_mode,
        description: formData.description.trim() || null,
        requirements: formData.requirements.trim() || null,
      };

      if (editingJob) {
        // Update existing job.
        await updateJob(editingJob.id, jobData);
      } else {
        // Create new job.
        if (!formData.company_id) {
          throw new Error("Please select a company.");
        }

        await createJob({
          ...jobData,
          company_id: Number(formData.company_id),
        });
      }

      setShowModal(false);
      resetForm();

      await fetchJobs();
    } catch (err) {
      setFormError(
        err.message || "Failed to save job."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================
  // PUBLISH JOB
  // =====================================

  async function handlePublish(job) {
    const confirmed = window.confirm(
      `Are you sure you want to publish "${job.title}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await publishJob(job.id);
      await fetchJobs();
    } catch (err) {
      setError(err.message || "Failed to publish job.");
    }
  }

  // =====================================
  // CLOSE JOB
  // =====================================

  async function handleClose(job) {
    const confirmed = window.confirm(
      `Are you sure you want to close "${job.title}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await closeJob(job.id);
      await fetchJobs();
    } catch (err) {
      setError(err.message || "Failed to close job.");
    }
  }

  // =====================================
  // DELETE JOB
  // =====================================

  async function handleDelete(job) {
    const confirmed = window.confirm(
      `Delete "${job.title}" permanently? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteJob(job.id);
      await fetchJobs();
    } catch (err) {
      setError(err.message || "Failed to delete job.");
    }
  }

  // =====================================
  // STATUS BADGE
  // =====================================

  function getStatusClass(status) {
    switch (status) {
      case "published":
        return "job-status published";

      case "closed":
        return "job-status closed";

      default:
        return "job-status draft";
    }
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="jobs-page">

      {/* PAGE HEADER */}

      <div className="jobs-header">
        <div>
          <h1>Jobs</h1>
          <p>Manage and track your company's job openings.</p>
        </div>

        {canManageJobs && (
          <button
            type="button"
            className="create-job-btn"
            onClick={openCreateModal}
          >
            + Create Job
          </button>
        )}
      </div>

      {/* JOB STATISTICS */}

      <div className="jobs-stats">
        <div className="job-stat-card">
          <span>Total Jobs</span>
          <h2>{jobs.length}</h2>
        </div>

        <div className="job-stat-card">
          <span>Published</span>
          <h2>
            {jobs.filter((job) => job.status === "published").length}
          </h2>
        </div>

        <div className="job-stat-card">
          <span>Drafts</span>
          <h2>
            {jobs.filter((job) => job.status === "draft").length}
          </h2>
        </div>

        <div className="job-stat-card">
          <span>Closed</span>
          <h2>
            {jobs.filter((job) => job.status === "closed").length}
          </h2>
        </div>
      </div>

      {/* JOBS TABLE */}

      <div className="jobs-table-container">
        <div className="jobs-table-header">
          <h2>All Job Openings</h2>

          <button
            type="button"
            className="refresh-jobs-btn"
            onClick={fetchJobs}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <p className="jobs-error">{error}</p>
        )}

        {loading ? (
          <p className="jobs-message">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="jobs-empty">
            <h3>No jobs found</h3>
            <p>Create your first job opening to get started.</p>
          </div>
        ) : (
          <div className="jobs-table-scroll">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Employment Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                  {canManageJobs && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.title}</strong>
                    </td>

                    <td>{job.department || "—"}</td>

                    <td>
                      {job.employment_type.replaceAll("_", " ")}
                    </td>

                    <td>{job.location || "—"}</td>

                    <td>
                      <span className={getStatusClass(job.status)}>
                        {job.status}
                      </span>
                    </td>

                    <td>
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>

                    {canManageJobs && (
                      <td>
                        <div className="job-actions">

                          <button
                            type="button"
                            className="job-action-btn edit"
                            onClick={() => openEditModal(job)}
                            disabled={job.status === "closed"}
                          >
                            Edit
                          </button>

                          {job.status === "draft" && (
                            <>
                              <button
                                type="button"
                                className="job-action-btn publish"
                                onClick={() => handlePublish(job)}
                              >
                                Publish
                              </button>

                              <button
                                type="button"
                                className="job-action-btn delete"
                                onClick={() => handleDelete(job)}
                              >
                                Delete
                              </button>
                            </>
                          )}

                          {job.status === "published" && (
                            <button
                              type="button"
                              className="job-action-btn close"
                              onClick={() => handleClose(job)}
                            >
                              Close
                            </button>
                          )}

                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div
          className="job-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="job-modal">

            <div className="job-modal-header">
              <div>
                <h2>
                  {editingJob ? "Edit Job" : "Create New Job"}
                </h2>

                <p>
                  {editingJob
                    ? "Update the job opening details."
                    : "Enter the details of the new job opening."}
                </p>
              </div>

              <button
                type="button"
                className="job-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="job-form-grid">

                {/* COMPANY */}

                <div className="job-form-group">
                  <label>Company *</label>

                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleFormChange}
                    required={!editingJob}
                    disabled={Boolean(editingJob)}
                  >
                    <option value="">Select company</option>

                    {companies.map((company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* JOB TITLE */}

                <div className="job-form-group">
                  <label>Job Title *</label>

                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Python Backend Developer"
                    minLength={2}
                    maxLength={150}
                    required
                  />
                </div>

                {/* DEPARTMENT */}

                <div className="job-form-group">
                  <label>Department</label>

                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    placeholder="e.g. Engineering"
                    maxLength={100}
                  />
                </div>

                {/* EMPLOYMENT TYPE */}

                <div className="job-form-group">
                  <label>Employment Type *</label>

                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="internship">Internship</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="fellowship">Fellowship</option>
                  </select>
                </div>

                {/* LOCATION */}

                <div className="job-form-group">
                  <label>Location</label>

                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Chandigarh"
                    maxLength={150}
                  />
                </div>

                {/* WORK MODE */}

                <div className="job-form-group">
                  <label>Work Mode</label>

                  <select
                    name="work_mode"
                    value={formData.work_mode}
                    onChange={handleFormChange}
                  >
                    <option value="on_site">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>

                {/* DESCRIPTION */}

                <div className="job-form-group full-width">
                  <label>Job Description</label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Describe the job..."
                    rows={4}
                  />
                </div>

                {/* REQUIREMENTS */}

                <div className="job-form-group full-width">
                  <label>Requirements</label>

                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleFormChange}
                    placeholder="List the required skills and qualifications..."
                    rows={4}
                  />
                </div>

              </div>

              {formError && (
                <p className="jobs-error">{formError}</p>
              )}

              <div className="job-modal-actions">
                <button
                  type="button"
                  className="refresh-jobs-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-job-btn"
                  disabled={saving || (!editingJob && companies.length === 0)}
                >
                  {saving
                    ? "Saving..."
                    : editingJob
                      ? "Save Changes"
                      : "Create Job"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Jobs;
