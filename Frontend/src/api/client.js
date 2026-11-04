
const API_BASE_URL = "http://127.0.0.1:8000";

// Add the JWT token to protected API requests.
function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("access_token");

  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Fetch companies
export async function getCompanies() {
  const response = await fetch(`${API_BASE_URL}/companies`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Failed to fetch companies: ${response.status}`
    );
  }

  return data;
}

// Create a company
export async function createCompany(companyData) {
  const response = await fetch(`${API_BASE_URL}/companies`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(companyData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to create company.");
  }

  return data;
}

// Update a company
export async function updateCompany(companyId, companyData) {
  const response = await fetch(
    `${API_BASE_URL}/companies/${companyId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(companyData),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to update company.");
  }

  return data;
}

// Delete a company
export async function deleteCompany(companyId) {
  const response = await fetch(
    `${API_BASE_URL}/companies/${companyId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to delete company.");
  }

  return data;
}



/* ==============================
   USER MANAGEMENT API
============================== */

// Get users belonging to a company
export async function getCompanyUsers(companyId, isActive = null) {
  const params = new URLSearchParams();

  if (isActive !== null) {
    params.set("is_active", String(isActive));
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/users/company/${companyId}${
    query ? `?${query}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch company users.");
  }

  return data;
}

// Create a user and assign them to a company
export async function createUser(userData) {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(userData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to create user.");
  }

  return data;
}

// Change a user's role within a company
export async function updateCompanyUserRole(
  userId,
  companyId,
  role
) {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/companies/${companyId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ role }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to update user role.");
  }

  return data;
}

// Remove a user's assignment from a company
export async function removeUserFromCompany(userId, companyId) {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/companies/${companyId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to remove user from company.");
  }

  return true;
}


/* ==============================
   RESTORE REMOVED USERS
============================== */

// Get users removed from a company
export async function getRemovedCompanyUsers(companyId) {
  const response = await fetch(
    `${API_BASE_URL}/users/company/${companyId}/removed`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to fetch removed company users."
    );
  }

  return data;
}

// Restore a user's previous company assignment
export async function restoreUserToCompany(userId, companyId) {
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/companies/${companyId}/restore`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to restore user to company."
    );
  }

  return data;
}



/* ==============================
   JOB MANAGEMENT API
============================== */

// Get jobs
// Super Admin: all companies
// Admin / HR / Interviewer: their assigned companies
export async function getJobs(companyId = null) {
  const params = new URLSearchParams();

  if (companyId !== null) {
    params.set("company_id", String(companyId));
  }

  const query = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/jobs/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch jobs.");
  }

  return data;
}


// Get a single job
export async function getJobById(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${jobId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch job details.");
  }

  return data;
}


// Create a job
export async function createJob(jobData) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/`,
    {
      method: "POST",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(jobData),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to create job.");
  }

  return data;
}


// Update a job
export async function updateJob(jobId, jobData) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${jobId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(jobData),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to update job.");
  }

  return data;
}


// Publish a job
export async function publishJob(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${jobId}/publish`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to publish job.");
  }

  return data;
}


// Close a job
export async function closeJob(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${jobId}/close`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to close job.");
  }

  return data;
}


// Delete a draft job
export async function deleteJob(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${jobId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to delete job.");
  }

  return true;

}
