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
                    def commit = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.COMMIT = commit
                    env.IMAGE_BACKEND = "ghcr.io/${env.GHCR_USER}/${env.GHCR_REPO}-backend:sha-${commit}"
                    env.IMAGE_FRONTEND = "ghcr.io/${env.GHCR_USER}/${env.GHCR_REPO}-frontend:sha-${commit}"
                    echo "COMMIT=${env.COMMIT}"
                    echo "IMAGE_BACKEND=${env.IMAGE_BACKEND}"
                    echo "IMAGE_FRONTEND=${env.IMAGE_FRONTEND}"
                }
            }
        }

        stage('Verify docker available') {
            steps {
                sh '''docker --version'''
            }
        }

        stage('Build images') {
            steps {
                sh '''
                    docker build -f Dockerfile.prod -t ${IMAGE_BACKEND} .
                    docker build -f frontend/Dockerfile.prod -t ${IMAGE_FRONTEND} ./frontend
                '''
            }
        }

        stage('Login & Push to GHCR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-creds', passwordVariable: 'GHCR_TOKEN', usernameVariable: 'GHCR_USER')]) {
                    sh '''
                        echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USER --password-stdin
                        docker push ${IMAGE_BACKEND}
                        docker push ${IMAGE_FRONTEND}
                        docker tag ${IMAGE_BACKEND} ghcr.io/$GHCR_USER/${GHCR_REPO}-backend:latest
                        docker tag ${IMAGE_FRONTEND} ghcr.io/$GHCR_USER/${GHCR_REPO}-frontend:latest
                        docker push ghcr.io/$GHCR_USER/${GHCR_REPO}-backend:latest
                        docker push ghcr.io/$GHCR_USER/${GHCR_REPO}-frontend:latest
                    '''
                }
            }
        }

        stage('Validate kubeconfig (quick test)') {
            steps {
                withCredentials([file(credentialsId: 'jenkins-kubeconfig-file', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        cp "${KUBECONFIG_FILE}" kubeconfig
                        sed -i '1s/^\\xEF\\xBB\\xBF//' kubeconfig || true
                        chmod 644 kubeconfig || true

                        # test connectivity from the same container that will be used for deployment
                        docker run --rm --network=minikube -i --user root --entrypoint sh bitnami/kubectl:latest -c "mkdir -p /root/.kube && cat > /root/.kube/config && chmod 644 /root/.kube/config && echo '=== kubectl cluster-info inside container ===' && kubectl --kubeconfig=/root/.kube/config cluster-info || true && kubectl --kubeconfig=/root/.kube/config get pods -n default -o wide" < kubeconfig
                    '''
                }
            }
        }

        stage('Deploy to k8s') {
            steps {
                withCredentials([file(credentialsId: 'jenkins-kubeconfig-file', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        cp "${KUBECONFIG_FILE}" kubeconfig
                        sed -i '1s/^\\xEF\\xBB\\xBF//' kubeconfig || true
                        chmod 644 kubeconfig || true

                        # Pipe the kubeconfig into the kubectl container as root (avoids mount permission issues)
                        docker run --rm --network=minikube -i --user root --entrypoint sh bitnami/kubectl:latest -c "mkdir -p /root/.kube && cat > /root/.kube/config && chmod 644 /root/.kube/config && kubectl --kubeconfig=/root/.kube/config -n default set image deployment/backend backend=${IMAGE_BACKEND} && kubectl --kubeconfig=/root/.kube/config -n default set image deployment/frontend frontend=${IMAGE_FRONTEND}" < kubeconfig
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout ghcr.io || true'
        }
    }
}
