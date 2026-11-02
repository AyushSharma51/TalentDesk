
const API_BASE_URL = "http://127.0.0.1:8000";

export async function getCompanies() {
  const response = await fetch(`${API_BASE_URL}/companies`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch companies: ${response.status}`);
  }

  return response.json();
}

export async function createCompany(companyData) {
  const response = await fetch(`${API_BASE_URL}/companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(companyData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Failed to create company.");
  }

  return data;
}

export async function updateCompany(companyId, companyData) {
  const response = await fetch(
    `${API_BASE_URL}/companies/${companyId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(companyData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Failed to update company.");
  }

  return data;
}

export async function deleteCompany(companyId) {
  const response = await fetch(
    `${API_BASE_URL}/companies/${companyId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    let message = "Failed to delete company.";

    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {
      // The response may not contain JSON.
    }

    throw new Error(message);
  }
}
