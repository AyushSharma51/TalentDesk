import { useEffect, useState } from "react";
import {
  getCompanies,
  getCompanyUsers,
  getRemovedCompanyUsers,
  createUser,
  updateCompanyUserRole,
  removeUserFromCompany,
  restoreUserToCompany,
} from "../api/client";

function UsersPage({ currentUser }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [users, setUsers] = useState([]);
  const [removedUsers, setRemovedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removedLoading, setRemovedLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showRemovedUsers, setShowRemovedUsers] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "interviewer",
  });

  const isSuperAdmin = currentUser?.global_role === "super_admin";

  const selectedAssignment = (
    currentUser?.company_assignments || []
  ).find(
    (assignment) =>
      String(assignment.company_id) === String(selectedCompanyId)
  );

  const canManageSelectedCompany =
    isSuperAdmin || selectedAssignment?.role === "admin";

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setCompaniesLoading(true);
      setError("");

      try {
        let availableCompanies = [];

        if (isSuperAdmin) {
          const data = await getCompanies();
          availableCompanies = data.map((company) => ({
            ...company,
            id: String(company.id),
          }));
        } else {
          const assignments = currentUser?.company_assignments || [];

          availableCompanies = assignments.map((assignment) => ({
            id: String(assignment.company_id),
            name: assignment.company_name,
            role: assignment.role,
          }));
        }

        if (cancelled) return;

        setCompanies(availableCompanies);

        const preferredCompany = isSuperAdmin
          ? availableCompanies[0]
          : availableCompanies.find(
              (company) => company.role === "admin"
            ) || availableCompanies[0];

        setSelectedCompanyId(
          preferredCompany ? String(preferredCompany.id) : ""
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load companies.");
        }
      } finally {
        if (!cancelled) {
          setCompaniesLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isSuperAdmin]);

  async function refreshUsers() {
    if (!selectedCompanyId) return;

    const data = await getCompanyUsers(selectedCompanyId);
    setUsers(data);
  }

  async function refreshRemovedUsers() {
    if (!selectedCompanyId || !canManageSelectedCompany) {
      setRemovedUsers([]);
      return;
    }

    setRemovedLoading(true);

    try {
      const data = await getRemovedCompanyUsers(selectedCompanyId);
      setRemovedUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load removed users.");
    } finally {
      setRemovedLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      if (!selectedCompanyId) {
        setUsers([]);
        setRemovedUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const data = await getCompanyUsers(selectedCompanyId);

        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setUsers([]);
          setError(err.message || "Failed to load users.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && canManageSelectedCompany) {
      refreshRemovedUsers();
    } else {
      setRemovedUsers([]);
    }
  }, [selectedCompanyId, canManageSelectedCompany]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      full_name: "",
      email: "",
      password: "",
      role: "interviewer",
    });

    setShowForm(false);
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canManageSelectedCompany) {
      setError("You do not have permission to create users.");
      return;
    }

    if (!selectedCompanyId) {
      setError("Please select a company first.");
      return;
    }

    try {
      await createUser({
        ...form,
        company_id: Number(selectedCompanyId),
      });

      resetForm();
      setMessage("User created successfully.");
      await refreshUsers();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    }
  }


    async function handleRoleChange(userId, newRole) {
    if (!canManageSelectedCompany) {
        setError("You do not have permission to change user roles.");
        await refreshUsers();
        return;
    }

    const user = users.find((item) => item.id === userId);
    if (!user) return;

    const assignment = (user.company_assignments || []).find(
        (item) =>
        String(item.company_id) === String(selectedCompanyId)
    );

    const oldRole = assignment?.role;

    if (!oldRole || oldRole === newRole) return;

    const confirmed = window.confirm(
        `Change ${user.full_name}'s role?\n\n` +
        `Current role: ${formatRole(oldRole)}\n` +
        `New role: ${formatRole(newRole)}\n\n` +
        "Are you sure you want to continue?"
    );

    if (!confirmed) {
        await refreshUsers();
        return;
    }

    setError("");
    setMessage("");

    try {
        await updateCompanyUserRole(
        userId,
        Number(selectedCompanyId),
        newRole
        );

        setMessage(
        `${user.full_name}'s role changed to ${formatRole(newRole)}.`
        );

        await refreshUsers();
    } catch (err) {
        setError(err.message || "Failed to update user role.");
        await refreshUsers();
    }
    }



    async function handleRemoveUser(userId) {
    if (!canManageSelectedCompany) {
        setError("You do not have permission to remove users.");
        return;
    }

    const user = users.find((item) => item.id === userId);
    if (!user) return;

    const confirmed = window.confirm(
        `Remove ${user.full_name} from this company?\n\n` +
        "Their company access will be deactivated, but their previous " +
        "role will be preserved so you can restore them later.\n\n" +
        "Do you want to continue?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
        await removeUserFromCompany(
        userId,
        Number(selectedCompanyId)
        );

        setMessage(`${user.full_name} was removed from the company.`);

        await Promise.all([
        refreshUsers(),
        refreshRemovedUsers(),
        ]);
    } catch (err) {
        setError(err.message || "Failed to remove user.");
    }
    }


    async function handleRestoreUser(userId) {
    if (!canManageSelectedCompany) {
        setError("You do not have permission to restore users.");
        return;
    }

    const user = removedUsers.find(
        (item) => item.id === userId
    );

    if (!user) {
        setError("User not found in the removed users list.");
        return;
    }

    const assignment = (user.company_assignments || []).find(
        (item) => String(item.company_id) === String(selectedCompanyId)
    );

    const previousRole = assignment?.role;

    const confirmed = window.confirm(
        `Restore ${user.full_name} to this company?\n\n` +
        `Previous role: ${previousRole ? formatRole(previousRole) : "Unknown"}\n\n` +
        "This will reactivate their access to the selected company " +
        "using their previous role.\n\n" +
        "Do you want to continue?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
        await restoreUserToCompany(
        userId,
        Number(selectedCompanyId)
        );

        setMessage(
        `${user.full_name} was restored successfully.`
        );

        await Promise.all([
        refreshUsers(),
        refreshRemovedUsers(),
        ]);
    } catch (err) {
        setError(err.message || "Failed to restore user.");
    }
    }

  function formatRole(role) {
    if (!role) return "Unassigned";

    return role
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return (
    <section className="users-page">
      <div className="users-page-header">
        <div>
          <h1>Users</h1>
          <p>Manage company users and their access roles.</p>
        </div>

        {canManageSelectedCompany && (
          <button
            type="button"
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
              setMessage("");
            }}
            disabled={!selectedCompanyId || companiesLoading}
          >
            {showForm ? "Cancel" : "+ Add User"}
          </button>
        )}
      </div>

      <div className="users-toolbar">
        <label htmlFor="company-select">Company</label>

        <select
          id="company-select"
          value={selectedCompanyId}
          onChange={(event) => {
            setSelectedCompanyId(event.target.value);
            setShowForm(false);
            setError("");
            setMessage("");
          }}
          disabled={companiesLoading || companies.length === 0}
        >
          <option value="">Select a company</option>

          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {companiesLoading && <p>Loading companies...</p>}

      {!companiesLoading && companies.length === 0 && !error && (
        <p>No companies are assigned to your account.</p>
      )}

      {!companiesLoading &&
        companies.length > 0 &&
        !canManageSelectedCompany && (
          <p>You have read-only access to this company's users.</p>
        )}

      {error && (
        <p role="alert" className="users-error">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="users-success">
          {message}
        </p>
      )}

      {showForm && canManageSelectedCompany && (
        <form className="user-form" onSubmit={handleCreateUser}>
          <h2>Create User</h2>

          <label>
            Full name
            <input
              name="full_name"
              value={form.full_name}
              onChange={updateForm}
              minLength={2}
              maxLength={150}
              autoComplete="name"
              required
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateForm}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Temporary password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Company role
            <select
              name="role"
              value={form.role}
              onChange={updateForm}
            >
              <option value="interviewer">Interviewer</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button type="submit" disabled={loading}>
            Create User
          </button>
        </form>
      )}

      {selectedCompanyId && (
        loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role in selected company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const assignment = (
                    user.company_assignments || []
                  ).find(
                    (item) =>
                      String(item.company_id) ===
                      String(selectedCompanyId)
                  );

                  return (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>

                      <td>
                        {assignment ? (
                          canManageSelectedCompany ? (
                            <select
                              value={assignment.role}
                              onChange={(event) =>
                                handleRoleChange(
                                  user.id,
                                  event.target.value
                                )
                              }
                              aria-label={`Role for ${user.full_name}`}
                            >
                              <option value="admin">Admin</option>
                              <option value="hr">HR</option>
                              <option value="interviewer">
                                Interviewer
                              </option>
                            </select>
                          ) : (
                            formatRole(assignment.role)
                          )
                        ) : (
                          "Not assigned"
                        )}
                      </td>

                      <td>
                        {user.is_active ? "Active" : "Inactive"}
                      </td>

                      <td>
                        {assignment && canManageSelectedCompany && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(user.id)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      No users found for this company.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {canManageSelectedCompany && selectedCompanyId && (
        <section className="removed-users-section">
          <div className="users-page-header">
            <div>
              <h2>Removed Users</h2>
              <p>
                Restore users previously removed from this company.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowRemovedUsers((previous) => !previous)
              }
            >
              {showRemovedUsers ? "Hide" : "Show"} Removed Users
              {removedUsers.length > 0
                ? ` (${removedUsers.length})`
                : ""}
            </button>
          </div>

          {showRemovedUsers && (
            removedLoading ? (
              <p>Loading removed users...</p>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Previous role</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {removedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>{formatRole(user.role)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              handleRestoreUser(user.id)
                            }
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}

                    {removedUsers.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          No removed users found for this company.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>
      )}
    </section>
  );
}

export default UsersPage;
