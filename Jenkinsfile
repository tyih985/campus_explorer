pipeline {
    agent any

    environment {
        GHCR_USER = 'tyih985'
        GHCR_REPO = 'campus_explorer'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    IMAGE_BACKEND = "ghcr.io/${GHCR_USER}/${GHCR_REPO}-backend:sha-${COMMIT}"
                    IMAGE_FRONTEND = "ghcr.io/${GHCR_USER}/${GHCR_REPO}-frontend:sha-${COMMIT}"
                    echo "COMMIT=${COMMIT}"
                    echo "IMAGE_BACKEND=${IMAGE_BACKEND}"
                    echo "IMAGE_FRONTEND=${IMAGE_FRONTEND}"
                }
            }
        }

        stage('Verify docker available') {
            steps {
                sh 'docker --version'
            }
        }

        stage('Build images') {
            steps {
                sh """
                  docker build -f Dockerfile.prod -t ${IMAGE_BACKEND} .
                  docker build -f frontend/Dockerfile.prod -t ${IMAGE_FRONTEND} ./frontend
                """
            }
        }

        stage('Login & Push to GHCR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-creds', passwordVariable: 'GHCR_TOKEN', usernameVariable: 'GHCR_USER')]) {
                    sh """
                      echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USER --password-stdin
                      docker push ${IMAGE_BACKEND}
                      docker push ${IMAGE_FRONTEND}
                      docker tag ${IMAGE_BACKEND} ghcr.io/${GHCR_USER}/${GHCR_REPO}-backend:latest
                      docker tag ${IMAGE_FRONTEND} ghcr.io/${GHCR_USER}/${GHCR_REPO}-frontend:latest
                      docker push ghcr.io/${GHCR_USER}/${GHCR_REPO}-backend:latest
                      docker push ghcr.io/${GHCR_USER}/${GHCR_REPO}-frontend:latest
                    """
                }
            }
        }

stage('Deploy to k8s') {
  steps {
    withCredentials([file(credentialsId: 'jenkins-kubeconfig-file', variable: 'KUBECONFIG_FILE')]) {
      sh """
        cp "\${KUBECONFIG_FILE}" kubeconfig
        sed -i '1s/^\\\\xEF\\\\xBB\\\\xBF//' kubeconfig || true
        chmod 644 kubeconfig || true

        # pipe the kubeconfig into the kubectl container as root (avoids mount permission issues)
        docker run --rm --network=minikube -i --user root --entrypoint sh bitnami/kubectl:latest -c '
          mkdir -p /root/.kube && cat > /root/.kube/config && chmod 644 /root/.kube/config && \
          kubectl --kubeconfig=/root/.kube/config -n default set image deployment/backend backend=${IMAGE_BACKEND} && \
          kubectl --kubeconfig=/root/.kube/config -n default set image deployment/frontend frontend=${IMAGE_FRONTEND}
        ' < kubeconfig
      """
    }
  }
}


    post {
        always {
            sh 'docker logout ghcr.io || true'
        }
    }
}
