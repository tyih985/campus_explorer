FROM jenkins/jenkins:lts

USER root

# install docker CLI
RUN apt-get update && \
    apt-get install -y docker.io ca-certificates && \
    rm -rf /var/lib/apt/lists/*

USER jenkins
