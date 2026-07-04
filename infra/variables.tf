variable "project_id" {
  description = "The GCP project ID."
  type        = string
  default     = "gudaguda-refactoring"
}

variable "region" {
  description = "The GCP region to deploy resources in."
  type        = string
  default     = "asia-northeast1"
}

variable "github_repo" {
  description = "The GitHub repository in the format 'owner/repo'."
  type        = string
  default     = "tetsuya0523/gudaguda-refactoring"
}

variable "service_account_id" {
  description = "The ID of the service account for GitHub Actions."
  type        = string
  default     = "github-actions-runner"
}
