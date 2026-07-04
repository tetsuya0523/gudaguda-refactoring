resource "google_artifact_registry_repository" "docker_repo" {
  repository_id = "gudaguda-refactoring-repo"
  format        = "DOCKER"
  description   = "Docker repository for gudaguda-refactoring application"
  location      = var.region
  depends_on = [
    google_project_service.artifactregistry
  ]
}
