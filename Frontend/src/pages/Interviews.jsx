
import { useEffect, useMemo, useState } from "react";
import {
  getInterviews,
  getApplicants,
  getCompanyUsers,
  createInterview,
  updateInterview,
} from "../api/client";


const ELIGIBLE_STATUSES = ["shortlisted", "interview"];

const EMPTY_FORM = {
  applicant_id: "",
  interviewer_id: "",
  interview_round: "",
  scheduled_at: "",
  duration_minutes: 30,
  interview_type: "online",
  meeting_link: "",
  remarks: "",
};

const EMPTY_EVALUATION = {
  status: "completed",
  rating: "",
  technical_rating: "",
  communication_rating: "",
  problem_solving_rating: "",
  strengths: "",
  weaknesses: "",
  feedback: "",
  recommendation: "",
};

function Interviews({ currentUser }) {
  const isSuperAdmin = currentUser?.global_role === "super_admin";

  const companyAssignment = useMemo(() => {
    return (currentUser?.company_assignments || []).find(
      (assignment) =>
        assignment.is_active !== false &&
        ["admin", "hr"].includes(assignment.role)
    );
  }, [currentUser]);

  const companyId = isSuperAdmin
    ? null
    : companyAssignment?.company_id ?? null;

  const [interviews, setInterviews] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [interviewers, setInterviewers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [evaluationError, setEvaluationError] = useState("");
  const [evaluationSuccess, setEvaluationSuccess] = useState("");

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [expandedEvaluationId, setExpandedEvaluationId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [evaluationData, setEvaluationData] = useState(EMPTY_EVALUATION);

  const eligibleApplicants = useMemo(
    () =>
      applicants.filter((applicant) =>
        ELIGIBLE_STATUSES.includes(applicant.status)
      ),
    [applicants]
  );

  async function fetchInterviews() {
    try {
      setLoading(true);
      setError("");

      const data = await getInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setError("");

      if (!isSuperAdmin && !companyId) {
        setApplicants([]);
        setInterviews([]);
        return;
      }

      const [interviewData, applicantData] = await Promise.all([
        getInterviews(),
        getApplicants({
          companyId,
          limit: 100,
        }),
      ]);

      setInterviews(Array.isArray(interviewData) ? interviewData : []);
      setApplicants(Array.isArray(applicantData) ? applicantData : []);
    } catch (err) {
      setError(err.message || "Unable to load interview data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, [companyId, isSuperAdmin]);

  // Load interviewers for the selected applicant's company.
  useEffect(() => {
    let cancelled = false;

    async function loadInterviewers() {
      const selectedApplicant = applicants.find(
        (applicant) =>
          String(applicant.id) === String(formData.applicant_id)
      );

      if (!selectedApplicant) {
        setInterviewers([]);
        return;
      }

      try {
        setUsersLoading(true);
        setFormError("");

        const users = await getCompanyUsers(
          selectedApplicant.company_id,
          true
        );

        const matchingUsers = (Array.isArray(users) ? users : []).filter(
          (user) =>
            user.is_active !== false &&
            (user.company_assignments || []).some(
              (assignment) =>
                Number(assignment.company_id) ===
                Number(selectedApplicant.company_id)
            )
        );

        if (!cancelled) {
          setInterviewers(matchingUsers);
        }
      } catch (err) {
        if (!cancelled) {
          setInterviewers([]);
          setFormError(
            err.message || "Unable to load company interviewers."
          );
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    loadInterviewers();

    return () => {
      cancelled = true;
    };
  }, [formData.applicant_id, applicants]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "applicant_id" ? { interviewer_id: "" } : {}),
    }));

    setFormError("");
    setSuccessMessage("");
  }

  function resetForm() {
    setFormData(EMPTY_FORM);
    setInterviewers([]);
    setFormError("");
  }

  async function handleScheduleInterview(event) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const selectedApplicant = applicants.find(
      (applicant) =>
        String(applicant.id) === String(formData.applicant_id)
    );

    if (
      !selectedApplicant ||
      !ELIGIBLE_STATUSES.includes(selectedApplicant.status)
    ) {
      setFormError(
        "Only shortlisted or interview-stage applicants can be scheduled."
      );
      return;
    }

    if (
      !formData.interviewer_id ||
      !formData.interview_round.trim() ||
      !formData.scheduled_at
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const scheduledDate = new Date(formData.scheduled_at);

    if (
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate <= new Date()
    ) {
      setFormError("Please select a valid future interview date and time.");
      return;
    }

    if (
      Number(formData.duration_minutes) <= 0 ||
      Number(formData.duration_minutes) > 480
    ) {
      setFormError("Duration must be between 1 and 480 minutes.");
      return;
    }

    try {
      setFormLoading(true);

      const interviewPayload = {
        applicant_id: Number(formData.applicant_id),
        interviewer_id: Number(formData.interviewer_id),
        interview_round: formData.interview_round.trim(),
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: Number(formData.duration_minutes),
        interview_type: formData.interview_type,
        meeting_link: formData.meeting_link.trim() || null,
        remarks: formData.remarks.trim() || null,
      };

      await createInterview(interviewPayload);

      resetForm();
      setShowScheduleForm(false);
      setSuccessMessage("Interview scheduled successfully.");

      await loadPageData();
    } catch (err) {
      setFormError(err.message || "Failed to schedule interview.");
    } finally {
      setFormLoading(false);
    }
  }

  function openEvaluation(interview) {
    if (expandedEvaluationId === interview.id) {
      setExpandedEvaluationId(null);
      setEvaluationError("");
      setEvaluationSuccess("");
      return;
    }

    setExpandedEvaluationId(interview.id);
    setEvaluationError("");
    setEvaluationSuccess("");

    setEvaluationData({
      status: interview.status || "completed",
      rating: interview.rating ?? "",
      technical_rating: interview.technical_rating ?? "",
      communication_rating: interview.communication_rating ?? "",
      problem_solving_rating: interview.problem_solving_rating ?? "",
      strengths: interview.strengths || "",
      weaknesses: interview.weaknesses || "",
      feedback: interview.feedback || "",
      recommendation: interview.recommendation || "",
    });
  }

  function handleEvaluationChange(event) {
    const { name, value } = event.target;

    setEvaluationData((current) => ({
      ...current,
      [name]: value,
    }));

    setEvaluationError("");
    setEvaluationSuccess("");
  }

  async function handleSaveEvaluation(event, interviewId) {
    event.preventDefault();

    setEvaluationError("");
    setEvaluationSuccess("");

    if (!evaluationData.recommendation) {
      setEvaluationError("Please select a recommendation.");
      return;
    }

    const ratingFields = [
      "rating",
      "technical_rating",
      "communication_rating",
      "problem_solving_rating",
    ];

    for (const field of ratingFields) {
      const value = evaluationData[field];

      if (value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)) {
        setEvaluationError("All ratings must be between 1 and 5.");
        return;
      }
    }

    try {
      setEvaluationLoading(true);

      const payload = {
        status: evaluationData.status,
        rating: evaluationData.rating === "" ? null : Number(evaluationData.rating),
        technical_rating:
          evaluationData.technical_rating === ""
            ? null
            : Number(evaluationData.technical_rating),
        communication_rating:
          evaluationData.communication_rating === ""
            ? null
            : Number(evaluationData.communication_rating),
        problem_solving_rating:
          evaluationData.problem_solving_rating === ""
            ? null
            : Number(evaluationData.problem_solving_rating),
        strengths: evaluationData.strengths.trim() || null,
        weaknesses: evaluationData.weaknesses.trim() || null,
        feedback: evaluationData.feedback.trim() || null,
        recommendation: evaluationData.recommendation,
      };

      await updateInterview(interviewId, payload);

      setEvaluationSuccess("Interview evaluation saved successfully.");
      await fetchInterviews();
    } catch (err) {
      setEvaluationError(
        err.message || "Unable to save interview evaluation."
      );
    } finally {
      setEvaluationLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const selectedApplicant = applicants.find(
    (applicant) =>
      String(applicant.id) === String(formData.applicant_id)
  );

  const statistics = {
    total: interviews.length,
    scheduled: interviews.filter(
      (item) => item.status === "scheduled"
    ).length,
    completed: interviews.filter(
      (item) => item.status === "completed"
    ).length,
    cancelled: interviews.filter(
      (item) => item.status === "cancelled"
    ).length,
  };

  return (
    <div className="interviews-page">
      <div className="interviews-header">
        <div>
          <h1>Interviews</h1>
          <p>Manage and evaluate candidate interviews.</p>
        </div>

        <button
          type="button"
          className="schedule-interview-btn"
          onClick={() => {
            setShowScheduleForm((current) => !current);
            setFormError("");
            setSuccessMessage("");
          }}
        >
          {showScheduleForm ? "Close Form" : "+ Schedule Interview"}
        </button>
      </div>

      {successMessage && (
        <div className="interviews-success">{successMessage}</div>
      )}

      {showScheduleForm && (
        <div className="schedule-form-container">
          <div className="schedule-form-heading">
            <h2>Schedule Interview</h2>
            <p>
              Only shortlisted and interview-stage applicants are eligible.
            </p>
          </div>

          {formError && (
            <div className="interviews-error">{formError}</div>
          )}

          <form
            className="schedule-interview-form"
            onSubmit={handleScheduleInterview}
          >
            <div className="form-field">
              <label htmlFor="applicant_id">
                Applicant <span>*</span>
              </label>

              <select
                id="applicant_id"
                name="applicant_id"
                value={formData.applicant_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select an eligible applicant</option>

                {eligibleApplicants.map((applicant) => (
                  <option key={applicant.id} value={applicant.id}>
                    {applicant.full_name} — {applicant.job_title}
                    {isSuperAdmin ? ` (${applicant.company_name})` : ""}
                  </option>
                ))}
              </select>

              {eligibleApplicants.length === 0 && (
                <small>
                  No eligible applicants. Applicants must be shortlisted
                  before an interview can be scheduled.
                </small>
              )}
            </div>

            {selectedApplicant && (
              <div className="selected-applicant-info">
                <strong>{selectedApplicant.full_name}</strong>
                <span>{selectedApplicant.email}</span>
                <span>
                  {selectedApplicant.company_name} · {selectedApplicant.job_title}
                </span>
                <span className="applicant-eligibility">
                  Current stage: {selectedApplicant.status}
                </span>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="interviewer_id">
                Interviewer <span>*</span>
              </label>

              <select
                id="interviewer_id"
                name="interviewer_id"
                value={formData.interviewer_id}
                onChange={handleInputChange}
                disabled={!formData.applicant_id || usersLoading}
                required
              >
                <option value="">
                  {!formData.applicant_id
                    ? "Select an applicant first"
                    : usersLoading
                    ? "Loading interviewers..."
                    : "Select an interviewer"}
                </option>

                {interviewers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>

              {formData.applicant_id &&
                !usersLoading &&
                interviewers.length === 0 && (
                  <small>No active company users are available.</small>
                )}
            </div>

            <div className="form-field">
              <label htmlFor="interview_round">
                Interview Round <span>*</span>
              </label>

              <input
                id="interview_round"
                name="interview_round"
                type="text"
                placeholder="e.g. Technical Round 1"
                value={formData.interview_round}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="scheduled_at">
                  Date & Time <span>*</span>
                </label>

                <input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={handleInputChange}
                  min={new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  ).toISOString().slice(0, 16)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="duration_minutes">
                  Duration (minutes) <span>*</span>
                </label>

                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  max="480"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="interview_type">
                Interview Type <span>*</span>
              </label>

              <select
                id="interview_type"
                name="interview_type"
                value={formData.interview_type}
                onChange={handleInputChange}
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {formData.interview_type === "online" && (
              <div className="form-field">
                <label htmlFor="meeting_link">Meeting Link</label>

                <input
                  id="meeting_link"
                  name="meeting_link"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formData.meeting_link}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="remarks">Scheduling Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                rows="4"
                placeholder="Add interview instructions, topics to cover, preparation notes, or other relevant details..."
                value={formData.remarks}
                onChange={handleInputChange}
              />
              <small>
                These remarks are saved with the interview for reference.
              </small>
            </div>

            <div className="schedule-form-actions">
              <button
                type="button"
                className="cancel-schedule-btn"
                onClick={() => {
                  resetForm();
                  setShowScheduleForm(false);
                }}
                disabled={formLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="schedule-interview-btn"
                disabled={
                  formLoading ||
                  usersLoading ||
                  eligibleApplicants.length === 0
                }
              >
                {formLoading ? "Scheduling..." : "Schedule Interview"}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="interviews-error">
          {error}
          <button type="button" onClick={fetchInterviews}>
            Retry
          </button>
        </div>
      )}

      <div className="interviews-stats">
        <div className="interview-stat-card">
          <span>Total Interviews</span>
          <h2>{statistics.total}</h2>
        </div>

        <div className="interview-stat-card">
          <span>Scheduled</span>
          <h2>{statistics.scheduled}</h2>
        </div>

        <div className="interview-stat-card">
          <span>Completed</span>
          <h2>{statistics.completed}</h2>
        </div>

        <div className="interview-stat-card">
          <span>Cancelled</span>
          <h2>{statistics.cancelled}</h2>
        </div>
      </div>

      <div className="interviews-table-container">
        <div className="interviews-table-heading">
          <div>
            <h2>All Interviews</h2>
            <p>View, manage, and evaluate candidate interviews.</p>
          </div>

          <button
            type="button"
            className="refresh-interviews-btn"
            onClick={fetchInterviews}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="interviews-table-scroll">
          <table className="interviews-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Interview Round</th>
                <th>Interviewer</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Status</th>
                <th>Recommendation</th>
                <th>Evaluation</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="interviews-empty">
                    Loading interviews...
                  </td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan="9" className="interviews-empty">
                    No interviews scheduled yet.
                  </td>
                </tr>
              ) : (
                interviews.map((interview) => {
                  const applicant = applicants.find(
                    (item) => item.id === interview.applicant_id
                  );

                  return (
                    <tr key={interview.id}>
                      <td>
                        {interview.applicant?.full_name ||
                          applicant?.full_name ||
                          `Applicant #${interview.applicant_id}`}
                      </td>

                      <td>{interview.interview_round}</td>

                      <td>
                        {interview.interviewer?.full_name ||
                          `User #${interview.interviewer_id}`}
                      </td>

                      <td>{formatDate(interview.scheduled_at)}</td>
                      <td>{interview.duration_minutes} min</td>
                      <td>{interview.interview_type}</td>

                      <td>
                        <span
                          className={`interview-status ${interview.status}`}
                        >
                          {interview.status}
                        </span>
                      </td>

                      <td>
                        {interview.recommendation
                          ? interview.recommendation.toUpperCase()
                          : "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="evaluation-toggle-btn"
                          onClick={() => openEvaluation(interview)}
                        >
                          {expandedEvaluationId === interview.id
                            ? "Close"
                            : interview.feedback ||
                              interview.recommendation
                            ? "Edit Evaluation"
                            : "Add Evaluation"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {expandedEvaluationId !== null && (
          <div className="evaluation-container">
            {(() => {
              const interview = interviews.find(
                (item) => item.id === expandedEvaluationId
              );

              if (!interview) return null;

              return (
                <>
                  <div className="evaluation-heading">
                    <div>
                      <h2>Interview Evaluation</h2>
                      <p>
                        {interview.applicant?.full_name ||
                          applicants.find(
                            (item) => item.id === interview.applicant_id
                          )?.full_name ||
                          `Applicant #${interview.applicant_id}`}
                        {" · "}
                        {interview.interview_round}
                      </p>
                    </div>
                  </div>

                  {interview.remarks && (
                    <div className="interview-remarks-display">
                      <strong>Scheduling Remarks</strong>
                      <p>{interview.remarks}</p>
                    </div>
                  )}

                  {evaluationError && (
                    <div className="interviews-error">
                      {evaluationError}
                    </div>
                  )}

                  {evaluationSuccess && (
                    <div className="interviews-success">
                      {evaluationSuccess}
                    </div>
                  )}

                  <form
                    className="evaluation-form"
                    onSubmit={(event) =>
                      handleSaveEvaluation(event, interview.id)
                    }
                  >
                    <div className="form-field">
                      <label htmlFor="evaluation_status">
                        Interview Status
                      </label>
                      <select
                        id="evaluation_status"
                        name="status"
                        value={evaluationData.status}
                        onChange={handleEvaluationChange}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="evaluation-ratings">
                      {[
                        ["rating", "Overall Rating"],
                        ["technical_rating", "Technical Skills"],
                        ["communication_rating", "Communication"],
                        ["problem_solving_rating", "Problem Solving"],
                      ].map(([field, label]) => (
                        <div className="form-field" key={field}>
                          <label htmlFor={field}>{label} (1–5)</label>
                          <select
                            id={field}
                            name={field}
                            value={evaluationData[field]}
                            onChange={handleEvaluationChange}
                          >
                            <option value="">Not rated</option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating} / 5
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="strengths">Strengths</label>
                        <textarea
                          id="strengths"
                          name="strengths"
                          rows="4"
                          placeholder="What did the candidate do well?"
                          value={evaluationData.strengths}
                          onChange={handleEvaluationChange}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="weaknesses">Areas to Improve</label>
                        <textarea
                          id="weaknesses"
                          name="weaknesses"
                          rows="4"
                          placeholder="What areas need improvement?"
                          value={evaluationData.weaknesses}
                          onChange={handleEvaluationChange}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label htmlFor="feedback">General Feedback</label>
                      <textarea
                        id="feedback"
                        name="feedback"
                        rows="5"
                        placeholder="Write detailed interview feedback..."
                        value={evaluationData.feedback}
                        onChange={handleEvaluationChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="recommendation">
                        Final Recommendation <span>*</span>
                      </label>
                      <select
                        id="recommendation"
                        name="recommendation"
                        value={evaluationData.recommendation}
                        onChange={handleEvaluationChange}
                        required
                      >
                        <option value="">Select recommendation</option>
                        <option value="proceed">Proceed to Next Round</option>
                        <option value="hold">Hold for Review</option>
                        <option value="reject">Recommend Rejection</option>
                      </select>
                      <small>
                        This is the interviewer's recommendation, not the
                        applicant's final HR status.
                      </small>
                    </div>

                    <div className="schedule-form-actions">
                      <button
                        type="button"
                        className="cancel-schedule-btn"
                        onClick={() => setExpandedEvaluationId(null)}
                        disabled={evaluationLoading}
                      >
                        Close
                      </button>

                      <button
                        type="submit"
                        className="schedule-interview-btn"
                        disabled={evaluationLoading}
                      >
                        {evaluationLoading
                          ? "Saving..."
                          : "Save Evaluation"}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default Interviews;
