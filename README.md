# UBC Campus Explorer

[Video Demo](https://www.youtube.com/watch?v=YIxMDEBNB6k)

UBC Campus Explorer helps visualize routes and walking distances between classes on campus. This README explains how to run the project three different ways: locally, via Docker Compose, or deploying using Kubernetes + Jenkins CI/CD.

---

## Table of Contents
- [Prerequisites](#prerequisites)  
- [Run Locally (development)](#run-locally-development)  
- [Docker Compose (dev vs prod)](#docker-compose-dev-vs-prod)  
- [Build and Push Docker Images (GHCR)](#build-and-push-docker-images-ghcr)  
- [Kubernetes Deployment (minikube)](#kubernetes-deployment-minikube)  
- [Jenkins CI/CD Setup](#jenkins-cicd-setup)  

---

## Prerequisites
- Node.js (tested with v23.x) — installs npm
```
node --version
npm --version
```

- Docker (desktop or engine)  
- Docker Compose (modern CLI `docker compose` or `docker-compose`)  
- minikube (if using Kubernetes locally)  
- kubectl (local testing/debug)  
- Jenkins (for CI/CD), with Docker CLI available to the Jenkins node  
- GitHub Container Registry (GHCR) Personal Access Token  

---

## Run Locally (development)

1. Clone the repo and install dependencies:
```
git clone https://github.com/tyih985/campus_explorer.git
cd campus_explorer
npm install
cd frontend
npm install
```

2. Run frontend
```
# in frontend/
npm run dev
```

3. Run backend:
```
# back in project root
npm run start
```

4. Add the Dataset

The application requires a dataset (`campus.zip`) from the `/data` folder. Add it via HTTP PUT to the backend using Postman or curl:

**Using Postman:**
- Method: PUT  
- URL: `http://localhost:4321/dataset/:id/rooms` 
- Body: Select binary and upload `campus.zip`  

**Using curl:**
```
curl -X PUT --data-binary @data/campus.zip http://localhost:4321/dataset/:id/rooms
```

_Replace `:id` with a dataset identifier (e.g., rooms)._

---

## Docker Compose (dev vs prod)
- `docker-compose.dev.yml` (development):
  - mounts source as volumes (changes apply live)
  - hot reload enabled
- `docker-compose.prod.yml` (production-like):
  - builds static assets
  - frontend served via nginx
  - smaller optimized images

Start dev stack:
```
docker compose -f docker-compose.dev.yml up --build
```
Start prod stack:
```
docker compose -f docker-compose.prod.yml up --build -d
```
Stop:
```
docker compose down
```

---

## Build and Push Docker Images (GHCR)
This repo’s pipeline builds two images (backend & frontend). Example manual steps:

Build:
```
docker build -f Dockerfile.prod -t ghcr.io/<GHCR_USER>/campus_explorer-backend:sha-<COMMIT> .
docker build -f frontend/Dockerfile.prod -t ghcr.io/<GHCR_USER>/campus_explorer-frontend:sha-<COMMIT> ./frontend
```

Login and push:
```
echo <GHCR_TOKEN> | docker login ghcr.io -u <GHCR_USER> --password-stdin
docker push ghcr.io/<GHCR_USER>/campus_explorer-backend:sha-<COMMIT>
docker push ghcr.io/<GHCR_USER>/campus_explorer-frontend:sha-<COMMIT>
# optionally tag and push 'latest'
docker tag ghcr.io/<GHCR_USER>/campus_explorer-backend:sha-<COMMIT> ghcr.io/<GHCR_USER>/campus_explorer-backend:latest
docker push ghcr.io/<GHCR_USER>/campus_explorer-backend:latest
```
- GHCR token: create a GitHub PAT with package write/read permissions for GHCR (and any repo scope needed if images are in private org repos). Store this token securely in Jenkins credentials or your local docker credential store.

---

## Kubernetes Deployment (minikube)
This section assumes you are using minikube locally and want the Jenkins pipeline to talk to your minikube cluster.
- IMPORTANT: Do not commit `jenkins-kubeconfig` or any file containing the token to source control. Keep it only in Jenkins Credentials (Secret file).

1. Start minikube
```
minikube start --driver=docker
minikube ip
# note the IP, e.g. 192.168.49.2
```

2. Create a Jenkins serviceaccount & grant RBAC (development)
On your host (PowerShell or bash):
PowerShell:
```
kubectl create namespace jenkins
kubectl create serviceaccount jenkins -n jenkins
kubectl create clusterrolebinding jenkins-cluster-admin --clusterrole=cluster-admin --serviceaccount=jenkins:jenkins
```

bash:
```
kubectl create namespace jenkins
kubectl create serviceaccount jenkins -n jenkins
kubectl create clusterrolebinding jenkins-cluster-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=jenkins:jenkins
```

3. Create a long-lived token for Jenkins to use

PowerShell:
```
kubectl -n jenkins create token jenkins --duration=87600h
# copy the printed token to use in kubeconfig
```

bash:
```
kubectl -n jenkins create token jenkins --duration=87600h
```
4. Create a `jenkins-kubeconfig` for Jenkins (use the template in the project repo)
```
apiVersion: v1
kind: Config
clusters:
- name: minikube
  cluster:
    insecure-skip-tls-verify: true
    server: https://<MINIKUBE_IP>:8443
contexts:
- name: jenkins@minikube
  context:
    cluster: minikube
    user: jenkins
current-context: jenkins@minikube
users:
- name: jenkins
  user:
    token: <TOKEN>
```
- Replace `<TOKEN>` with a token generated with `kubectl -n jenkins create token jenkins --duration=87600h`
- Replace `<MINIKUBE_IP>` with the output from `minikube ip`
- NOTE: Minikube’s IP and cluster certs can change after minikube delete/recreate or host restarts. If you recreate minikube you must regenerate the kubeconfig (update <MINIKUBE_IP> and token or CA as needed)

5. Upload kubeconfig to Jenkins as a Secret file
- Jenkins → Credentials → (choose domain) → Add Credentials
- Kind: Secret file
-  ID: `jenkins-kubeconfig-file` (this is exact ID expected by the Jenkinsfile)
- Upload the `jenkins-kubeconfig` file you made

6. Ensure GHCR credentials exist in Jenkins
- Kind: Username with password
- Username: `<GHCR_USERNAME>`
- Password: `<GHCR_PAT>`
- ID: `ghcr-creds`

## Jenkins CI/CD Setup
1. Create a Jenkins Pipeline job and point it at your GitHub repo. Ensure it uses the Jenkinsfile in the repo
2. Add Jenkins Credentials:
	- Secret file with ID `jenkins-kubeconfig-file` (upload the kubeconfig from above)
 	- Username+password with ID `ghcr-creds` (GHCR user & PAT)
5. Ensure the Jenkins node/agent has Docker CLI and can run containers and reach the minikube Docker network

- (Optional) Add a GitHub webhook:
	- GitHub repo → Settings → Webhooks → add http://<JENKINS_HOST>/github-webhook/
	- In Jenkins job: enable GitHub hook trigger for GITScm polling.
	- This gives near-instant CI/CD. Otherwise Poll SCM (cron) also works.

6. Run the job. Check the Validate kubeconfig (quick test) stage output — it should print cluster-info and pods from inside the kubectl container. If that passes, the Deploy stage will run kubectl set image on your backend and frontend Deployments.

Finally, retrieve the externally reachable URL for the frontend service (provided by minikube) by running:
```
minikube service frontend --url
```
