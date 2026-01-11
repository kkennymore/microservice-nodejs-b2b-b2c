#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
#######################################
# Configuration
#######################################

NAMESPACE="marketplace"

SERVICES=(
  gateway auth products transactions messaging notifications advertising
  ticketing reviews promotions shipping recommender system analytics
  wishlist search seo loyalty social enhanced-analytics admin-dashboard
)

MINIKUBE_DRIVER="${MINIKUBE_DRIVER:-docker}"
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-4096}"
MINIKUBE_CPUS="${MINIKUBE_CPUS:-2}"

#######################################
# Utilities
#######################################

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_service() {
  if [ -z "${1:-}" ]; then
    echo "❌ Service required (e.g. --auth)"
    exit 1
  fi
}

require_value() {
  if [ -z "${1:-}" ]; then
    echo "❌ Missing required value"
    exit 1
  fi
}

is_elf() {
  # file(1) should output "ELF" for linux binaries
  file "$1" 2>/dev/null | grep -q "ELF"
}

download_binary() {
  # download_binary <url> <output_path>
  local url="$1"
  local out="$2"

  curl -fL "$url" -o "$out"

  if ! is_elf "$out"; then
    echo "❌ Downloaded file is not a valid Linux binary: $url"
    echo "   (This usually means your network/proxy returned HTML/XML.)"
    exit 1
  fi

  chmod +x "$out"
}

#######################################
# Safe Installers
#######################################

ensure_kubectl() {
  if command_exists kubectl; then
    return
  fi

  echo "⚠️ kubectl not found — installing safely..."

  local tmpdir
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' RETURN

  local version
  version="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  if [ -z "${version:-}" ]; then
    echo "❌ Failed to determine Kubernetes stable version"
    exit 1
  fi

  download_binary \
    "https://dl.k8s.io/release/${version}/bin/linux/amd64/kubectl" \
    "$tmpdir/kubectl"

  sudo mv "$tmpdir/kubectl" /usr/local/bin/kubectl
  echo "✅ kubectl installed"
}

ensure_minikube() {
  if command_exists minikube; then
    return
  fi

  echo "⚠️ minikube not found — installing safely..."

  local tmpdir
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' RETURN

  download_binary \
    "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64" \
    "$tmpdir/minikube"

  sudo mv "$tmpdir/minikube" /usr/local/bin/minikube
  echo "✅ minikube installed"
}

#######################################
# Cluster Preflight (THE FIX)
#######################################

ensure_cluster() {
  ensure_minikube

  if ! minikube status >/dev/null 2>&1; then
    echo "⚙️  Starting minikube..."
    minikube start \
      --driver="$MINIKUBE_DRIVER" \
      --memory="$MINIKUBE_MEMORY" \
      --cpus="$MINIKUBE_CPUS" \
      --force
  fi

  # Ensure kubeconfig/context exists + is selected
  if ! kubectl config get-contexts minikube >/dev/null 2>&1; then
    # minikube should create this automatically; if not, something is wrong.
    echo "❌ kubeconfig context 'minikube' not found. Try: minikube delete && minikube start"
    exit 1
  fi

  local ctx
  ctx="$(kubectl config current-context 2>/dev/null || true)"
  if [ "$ctx" != "minikube" ]; then
    echo "🔄 Switching kubectl context to minikube"
    kubectl config use-context minikube >/dev/null
  fi
}

preflight() {
  ensure_kubectl
  ensure_cluster
}

#######################################
# Kubernetes Helpers
#######################################

get_pod_by_service() {
  kubectl get pods -n "$NAMESPACE" \
    -l app="$1" \
    -o jsonpath='{.items[0].metadata.name}'
}

#######################################
# Minikube Setup
#######################################

enable_ingress() {
  minikube addons enable ingress >/dev/null
}

create_namespace() {
  kubectl create namespace "$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
}

ensure_metrics_server() {
  # Needed for kubectl top to work
  if ! kubectl get apiservice v1beta1.metrics.k8s.io >/dev/null 2>&1; then
    echo "⚙️  Enabling metrics-server addon (needed for k8:top)..."
    minikube addons enable metrics-server >/dev/null || true
  fi
}

#######################################
# Docker Build & Load
#######################################

build_and_load_service() {
  [ -d "backend/services/$1" ] || return
  echo "🔨 Building $1..."
  docker build -t "marketplace/$1:latest" "backend/services/$1"
  minikube image load "marketplace/$1:latest"
}

build_all_images() {
  # build the locally shared image
  docker build -t fenap-shared-local "$ROOT_DIR/backend/shared"
  
  for service in "${SERVICES[@]}"; do
    build_and_load_service "$service"
  done

  if [ -d "frontend" ]; then
    echo "🔨 Building admin-dashboard..."
    docker build -t marketplace/admin-dashboard:latest frontend/ || true
    minikube image load marketplace/admin-dashboard:latest || true
  fi
}

#######################################
# Kubernetes Lifecycle
#######################################

apply_manifests() {
  kubectl apply -f k8s/base/
  kubectl apply -f k8s/overlays/development/ 2>/dev/null || true
}

wait_for_ready() {
  kubectl wait \
    --for=condition=available \
    --timeout=300s \
    deployment --all -n "$NAMESPACE"
}

start_services() {
  if [ -z "${1:-}" ]; then
    apply_manifests
    wait_for_ready
  else
    kubectl apply -f "k8s/base/$1"
  fi
}

stop_services() {
  if [ -z "${1:-}" ]; then
    kubectl delete namespace "$NAMESPACE" --ignore-not-found
  else
    kubectl delete deployment "$1" -n "$NAMESPACE" --ignore-not-found
  fi
}

restart_services() {
  if [ -z "${1:-}" ]; then
    kubectl rollout restart deployment -n "$NAMESPACE"
  else
    kubectl rollout restart deployment "$1" -n "$NAMESPACE"
  fi
}

#######################################
# Operational Commands
#######################################

logs_service() {
  require_service "$1"
  kubectl logs -n "$NAMESPACE" -l app="$1" -f --tail=100
}

status_service() {
  if [ -z "${1:-}" ]; then
    kubectl get all -n "$NAMESPACE"
  else
    kubectl get pods,svc,deploy -n "$NAMESPACE" -l app="$1"
  fi
}

scale_service() {
  require_service "$1"
  require_value "${2:-}"
  kubectl scale deployment "$1" -n "$NAMESPACE" --replicas="$2"
}

describe_service() {
  require_service "$1"
  kubectl describe deployment "$1" -n "$NAMESPACE"
}

exec_service() {
  require_service "$1"
  local pod
  pod="$(get_pod_by_service "$1")"
  if [ -z "${pod:-}" ]; then
    echo "❌ No pod found for service '$1' (label app=$1)"
    exit 1
  fi
  kubectl exec -it "$pod" -n "$NAMESPACE" -- /bin/sh
}

port_forward_service() {
  require_service "$1"
  require_value "${2:-}"
  kubectl port-forward deployment/"$1" "$2" -n "$NAMESPACE"
}

#######################################
# Observability & DB
#######################################

top_service() {
  require_service "$1"
  ensure_metrics_server
  kubectl top pod -n "$NAMESPACE" -l app="$1"
}

health_service() {
  require_service "$1"
  kubectl get pod -n "$NAMESPACE" -l app="$1" \
    -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[*].ready,STATUS:.status.phase
}

psql_service() {
  require_service "$1"
  local pod
  pod="$(get_pod_by_service "$1")"
  if [ -z "${pod:-}" ]; then
    echo "❌ No pod found for service '$1' (label app=$1)"
    exit 1
  fi
  kubectl exec -it "$pod" -n "$NAMESPACE" -- psql -U postgres
}

#######################################
# CLI Parsing
#######################################

SERVICE=""
VALUE=""

if [[ "${2:-}" == --*=* ]]; then
  SERVICE="${2%%=*}"
  SERVICE="${SERVICE#--}"
  VALUE="${2##*=}"
elif [[ "${2:-}" == --* ]]; then
  SERVICE="${2#--}"
fi

#######################################
# Dispatcher
#######################################

case "${1:-}" in
  k8:up)
    preflight
    enable_ingress
    create_namespace
    build_all_images
    start_services "$SERVICE"
    ;;

  k8:down|k8:restart|k8:logs|k8:status|k8:scale|k8:describe|k8:exec|k8:port-forward|k8:top|k8:health|k8:psql)
    preflight
    ;;

  *)
    echo "Usage:"
    echo "  k8:up | k8:down | k8:restart [--service]"
    echo "  k8:logs --service"
    echo "  k8:status [--service]"
    echo "  k8:scale --service=replicas"
    echo "  k8:describe --service"
    echo "  k8:exec --service"
    echo "  k8:port-forward --service=8080:80"
    echo "  k8:top --service"
    echo "  k8:health --service"
    echo "  k8:psql --service"
    exit 1
    ;;
esac

case "${1:-}" in
  k8:down) stop_services "$SERVICE" ;;
  k8:restart) restart_services "$SERVICE" ;;
  k8:logs) logs_service "$SERVICE" ;;
  k8:status) status_service "$SERVICE" ;;
  k8:scale) scale_service "$SERVICE" "$VALUE" ;;
  k8:describe) describe_service "$SERVICE" ;;
  k8:exec) exec_service "$SERVICE" ;;
  k8:port-forward) port_forward_service "$SERVICE" "$VALUE" ;;
  k8:top) top_service "$SERVICE" ;;
  k8:health) health_service "$SERVICE" ;;
  k8:psql) psql_service "$SERVICE" ;;
  k8:up) : ;; # already handled
  *) exit 1 ;;
esac
