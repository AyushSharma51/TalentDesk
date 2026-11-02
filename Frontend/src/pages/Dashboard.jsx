
import StatCard from "../components/ui/StatCard";

function Dashboard() {
  return (
    <main className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            Here's what's happening across your recruitment workspace.
          </p>
        </div>

        <button className="primary-button">+ Add job</button>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Total applicants"
          value="1,284"
          note="Across all companies"
          color="blue"
        />
        <StatCard
          label="Active jobs"
          value="24"
          note="Currently accepting applications"
          color="green"
        />
        <StatCard
          label="Interviews scheduled"
          value="38"
          note="Upcoming interviews"
          color="purple"
        />
        <StatCard
          label="Pending review"
          value="126"
          note="Applicants awaiting review"
          color="orange"
        />
      </section>

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h3>Recruitment activity</h3>
              <p>Applicant pipeline overview</p>
            </div>
            <button className="secondary-button">This month ▾</button>
          </div>

          <div className="chart-placeholder">
            <div className="chart-y-labels">
              <span>150</span>
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>

            <div className="chart-area">
              {[42, 62, 48, 78, 56, 88, 66, 96, 72, 84, 60, 76].map(
                (height, index) => (
                  <div className="chart-column" key={index}>
                    <div style={{ height: `${height}%` }} />
                  </div>
                )
              )}
            </div>
          </div>

          <div className="chart-labels">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </article>

        <article className="panel pipeline-panel">
          <div className="panel-heading">
            <div>
              <h3>Applicant pipeline</h3>
              <p>Current recruitment stages</p>
            </div>
            <button className="more-button">···</button>
          </div>

          {[
            ["New", 126, "blue"],
            ["Shortlisted", 64, "purple"],
            ["Interview scheduled", 38, "orange"],
            ["Offers", 12, "green"],
          ].map(([label, count, color]) => (
            <div className="pipeline-row" key={label}>
              <div className="pipeline-label">
                <span className={`pipeline-dot ${color}`} />
                <span>{label}</span>
                <strong>{count}</strong>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${color}`}
                  style={{ width: `${(count / 126) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </article>
      </section>

      <section className="panel applicants-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent applicants</h3>
            <p>Latest applications across your companies</p>
          </div>
          <button className="secondary-button">View all →</button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>APPLICANT</th>
                <th>COMPANY</th>
                <th>POSITION</th>
                <th>STATUS</th>
                <th>APPLIED</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <div className="applicant-cell">
                    <div className="person-avatar avatar-blue">RK</div>
                    <div>
                      <strong>Rahul Kumar</strong>
                      <small>rahul@example.com</small>
                    </div>
                  </div>
                </td>
                <td>NBMC</td>
                <td>Backend Engineer</td>
                <td>
                  <span className="status-badge status-new">New</span>
                </td>
                <td>Today</td>
              </tr>

              <tr>
                <td>
                  <div className="applicant-cell">
                    <div className="person-avatar avatar-purple">PS</div>
                    <div>
                      <strong>Priya Sharma</strong>
                      <small>priya@example.com</small>
                    </div>
                  </div>
                </td>
                <td>Sofsure</td>
                <td>Data Analyst</td>
                <td>
                  <span className="status-badge status-shortlisted">
                    Shortlisted
                  </span>
                </td>
                <td>Yesterday</td>
              </tr>

              <tr>
                <td>
                  <div className="applicant-cell">
                    <div className="person-avatar avatar-orange">AM</div>
                    <div>
                      <strong>Arjun Mehta</strong>
                      <small>arjun@example.com</small>
                    </div>
                  </div>
                </td>
                <td>NBMC</td>
                <td>Python Developer</td>
                <td>
                  <span className="status-badge status-interview">
                    Interview
                  </span>
                </td>
                <td>28 Oct 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="dashboard-footer">
        TalentDesk · Multi-company HR workspace
      </p>
    </main>
  );
}

export default Dashboard;
