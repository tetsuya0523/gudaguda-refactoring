# Service Account for GitHub Actions
resource "google_service_account" "github_actions_runner" {
  account_id   = var.service_account_id
  display_name = "GitHub Actions Runner"
  description  = "Service account for GitHub Actions to deploy to Cloud Run"
}

# Workload Identity Pool
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"
  depends_on = [
    google_project_service.iam
  ]
}

# Workload Identity Pool Provider
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri      = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_actions_impersonate" {
  service_account_id = google_service_account.github_actions_runner.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repo}"
  depends_on = [
    google_project_service.iam
  ]
}
