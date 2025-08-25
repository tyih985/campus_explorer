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
          // Set environment variables so they are available in later stages
          env.COMMIT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          env.IMAGE_BACKEND = "ghcr.io/${env.GITHUB_USER}/${env.REPO}-backend:sha-${env.COMMIT}"
          env.IMAGE_FRONTEND = "ghcr.io/${env.GITHUB_USER}/${env.REPO}-frontend:sha-${env.COMMIT}"
          echo "COMMIT=${env.COMMIT}"
          echo "IMAGE_BACKEND=${env.IMAGE_BACKEND}"
          echo "IMAGE_FRONTEND=${env.IMAGE_FRONTEND}"
        }
      }
    }

    stage('Verify docker available') {
      steps {
        // sanity check
        sh 'docker --version'
        sh 'echo "Docker is available; proceeding to build."'
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
        withCredentials([usernamePassword(credentialsId: 'ghcr-creds', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
          sh 'echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin'
          sh '''
            docker push ${IMAGE_BACKEND}
            docker push ${IMAGE_FRONTEND}
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
