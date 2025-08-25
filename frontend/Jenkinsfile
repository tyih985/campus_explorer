pipeline {
  agent any

  environment {
    GITHUB_USER = 'tyih985'
    REPO = 'campus_explorer'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          IMAGE_BACKEND = "ghcr.io/${GITHUB_USER}/${REPO}-backend:sha-${COMMIT}"
          IMAGE_FRONTEND = "ghcr.io/${GITHUB_USER}/${REPO}-frontend:sha-${COMMIT}"
        }
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
        // use the username/password credential id 'ghcr-creds'
        withCredentials([usernamePassword(credentialsId: 'ghcr-creds', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
          sh 'echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin'
          sh '''
            docker push ${IMAGE_BACKEND}
            docker push ${IMAGE_FRONTEND}
            # optionally tag and push :latest
            docker tag ${IMAGE_BACKEND} ghcr.io/${GITHUB_USER}/${REPO}-backend:latest
            docker tag ${IMAGE_FRONTEND} ghcr.io/${GITHUB_USER}/${REPO}-frontend:latest
            docker push ghcr.io/${GITHUB_USER}/${REPO}-backend:latest
            docker push ghcr.io/${GITHUB_USER}/${REPO}-frontend:latest
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
