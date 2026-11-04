import { useEffect, useState } from "react";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../api/client";

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleAddCompany(event) {
    event.preventDefault();

    setSaving(true);
    setFormError("");

    try {
      await createCompany({
        name: companyName.trim(),
        slug: companySlug.trim().toLowerCase(),
      });

      const updatedCompanies = await getCompanies();
      setCompanies(updatedCompanies);

      setCompanyName("");
      setCompanySlug("");
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || "Could not create company.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCompany(event) {
    event.preventDefault();

    if (editingCompanyId === null) return;

    setUpdating(true);
    setEditError("");

    try {
      await updateCompany(editingCompanyId, {
        name: editName.trim(),
        slug: editSlug.trim().toLowerCase(),
      });

      const updatedCompanies = await getCompanies();
      setCompanies(updatedCompanies);

      setEditingCompanyId(null);
      setEditName("");
      setEditSlug("");
    } catch (err) {
      setEditError(err.message || "Could not update company.");
    } finally {
      setUpdating(false);
    }
  }  


  async function handleDeleteCompany(company) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${company.name}"?`
    );

    if (!confirmed) return;

    setDeletingCompanyId(company.id);
    setDeleteError("");

    try {
      await deleteCompany(company.id);

      setCompanies((currentCompanies) =>
        currentCompanies.filter(
          (item) => item.id !== company.id
        )
      );

      if (editingCompanyId === company.id) {
        setEditingCompanyId(null);
      }
    } catch (err) {
      setDeleteError(
        err.message || "Could not delete company."
      );
    } finally {
      setDeletingCompanyId(null);
    }
  }

  useEffect(() => {
    async function loadCompanies() {
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (err) {
        setError(err.message || "Could not load companies.");
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  if (loading) {
    return (
      <main className="dashboard">
        <h1>Companies</h1>
        <p>Loading companies...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard">
        <h1>Companies</h1>
        <p role="alert">{error}</p>
      </main>
    );
  }


  return (
    <main className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZATION</p>
          <h1>Companies</h1>
          <p className="page-description">
            Manage the companies connected to TalentDesk.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setFormError("");
            setEditingCompanyId(null);
            setEditError("");
          }}
        >
          {showForm ? "Cancel" : "+ Add Company"}
        </button>
      </div>

      {/* Add Company Form */}
      {showForm && (
        <section className="panel card">
          <h2>Add a Company</h2>

          <form onSubmit={handleAddCompany}>
            <div>
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="e.g. NBMC"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="companySlug">Company Slug</label>
              <input
                id="companySlug"
                type="text"
                value={companySlug}
                onChange={(event) => setCompanySlug(event.target.value)}
                placeholder="e.g. nbmc"
                pattern="[a-z0-9-]+"
                title="Use lowercase letters, numbers, and hyphens only."
                required
                maxLength={50}
              />
            </div>

            {formError && <p role="alert">{formError}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Company"}
            </button>
          </form>
        </section>
      )}

      {/* Edit Company Form */}
      {editingCompanyId !== null && (
        <section className="panel card">
          <h2>Edit Company</h2>

          <form onSubmit={handleUpdateCompany}>
            <div>
              <label htmlFor="editName">Company Name</label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="editSlug">Company Slug</label>
              <input
                id="editSlug"
                type="text"
                value={editSlug}
                onChange={(event) => setEditSlug(event.target.value)}
                pattern="[a-z0-9-]+"
                title="Use lowercase letters, numbers, and hyphens only."
                required
                maxLength={50}
              />
            </div>

            {editError && <p role="alert">{editError}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={updating}
            >
              {updating ? "Updating..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingCompanyId(null);
                setEditError("");
              }}
            >
              Cancel
            </button>
          </form>
        </section>
      )}

      {/* Companies List */}
      {companies.length === 0 ? (
        <section className="panel card">
          No companies found. Add a company to get started.
        </section>
      ) : (
        <section className="panel card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>COMPANY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="company-cell">
                        <div className="company-logo">
                          {company.name.charAt(0).toUpperCase()}
                        </div>

                        <strong>{company.name}</strong>
                      </div>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setEditingCompanyId(company.id);
                            setEditName(company.name);
                            setEditSlug(company.slug);
                            setEditError("");
                            setShowForm(false);
                            setFormError("");
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDeleteCompany(company)}
                          disabled={deletingCompanyId === company.id}
                        >
                          {deletingCompanyId === company.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

export default Companies;
