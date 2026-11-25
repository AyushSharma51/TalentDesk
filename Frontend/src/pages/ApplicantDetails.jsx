
import { useEffect, useState } from "react";
import {
  getApplicantById,
  updateApplicantStatus,
} from "../api/client";

const APPLICANT_STATUSES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
];

function ApplicantDetails({ applicantId, onBack }) {
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    async function fetchApplicant() {
      try {
        setLoading(true);
        setError("");

        const data = await getApplicantById(applicantId);

        setApplicant(data);
        setSelectedStatus(data.status);
      } catch (err) {
        setError(err.message || "Failed to load applicant details.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplicant();
  }, [applicantId]);

  async function handleStatusUpdate() {
    if (!selectedStatus || selectedStatus === applicant.status) {
      return;
    }

    try {
      setSavingStatus(true);
      setStatusMessage("");
      setStatusError("");

      await updateApplicantStatus(applicantId, selectedStatus);

      setApplicant((previous) => ({
        ...previous,
        status: selectedStatus,
      }));

      setStatusMessage("Applicant status updated successfully.");
    } catch (err) {
      setStatusError(err.message || "Failed to update applicant status.");
      setSelectedStatus(applicant.status);
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="applicant-details-page">
        <p>Loading applicant details...</p>
      </div>
    );
  }

  if (error || !applicant) {
    return (
      <div className="applicant-details-page">
        <button onClick={onBack}>← Back to Applicants</button>
        <p className="applicants-error">
          {error || "Applicant not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="applicant-details-page">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Back to Applicants
      </button>

      <div className="applicant-details-header">
        <div>
          <h1>{applicant.full_name}</h1>
          <p>Applicant Profile</p>
        </div>

        <span className={`applicant-status ${applicant.status}`}>
          {applicant.status}
        </span>
      </div>

      <section className="applicant-details-card">
        <h2>Personal Information</h2>

        <div className="applicant-details-grid">
          <div>
            <label>Full Name</label>
            <p>{applicant.full_name}</p>
          </div>

          <div>
            <label>Email Address</label>
            <p>{applicant.email}</p>
          </div>

          <div>
            <label>Phone Number</label>
            <p>{applicant.phone}</p>
          </div>

          <div>
            <label>Portfolio</label>
            <p>
              {applicant.portfolio_url ? (
                <a
                  href={applicant.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Portfolio
                </a>
              ) : (
                "Not provided"
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="applicant-details-card">
        <h2>Application Information</h2>

        <div className="applicant-details-grid">
          <div>
            <label>Company</label>
            <p>{applicant.company_name || "N/A"}</p>
          </div>

          <div>
            <label>Position</label>
            <p>{applicant.job_title || "N/A"}</p>
          </div>

          <div>
            <label>Applied On</label>
            <p>
              {applicant.applied_at
                ? new Date(applicant.applied_at).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )
                : "N/A"}
            </p>
          </div>
        </div>
      </section>

      <section className="applicant-details-card">
        <h2>Application Status</h2>

        <div className="status-update-controls">
          <div>
            <label htmlFor="applicantStatus">
              Current Status
            </label>

            <select
              id="applicantStatus"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setStatusMessage("");
                setStatusError("");
              }}
              disabled={savingStatus}
            >
              {APPLICANT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="save-status-button"
            onClick={handleStatusUpdate}
            disabled={
              savingStatus ||
              selectedStatus === applicant.status
            }
          >
            {savingStatus ? "Saving..." : "Update Status"}
          </button>
        </div>

        {statusMessage && (
          <p className="status-success">{statusMessage}</p>
        )}

        {statusError && (
          <p className="status-error">{statusError}</p>
        )}
      </section>

      <section className="applicant-details-card">
        <h2>Introduction</h2>
        <p>
          {applicant.introduction || "No introduction provided."}
        </p>
      </section>

      <section className="applicant-details-card">
        <h2>Resume</h2>

        {applicant.resume_path ? (
          <div className="resume-actions">
            <span className="resume-filename">
              {applicant.resume_path.split("/").pop()}
            </span>

            <div className="resume-buttons">
              <a
                href={`http://localhost:8000/${applicant.resume_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="resume-button"
              >
                View Resume
              </a>

              <a
                href={`http://localhost:8000/${applicant.resume_path}`}
                download
                className="resume-button"
              >
                Download Resume
              </a>
            </div>
          </div>
        ) : (
          <p>No resume uploaded.</p>
        )}
      </section>
    </div>
  );
}

export default ApplicantDetails;
