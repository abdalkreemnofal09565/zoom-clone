# Zoom-like Conferencing Service (Multi-Tenancy) - Backend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Schema Design](#database-schema-design)
   - [Schema Diagram](#schema-diagram)
   - [Database Tables](#database-tables)
3. [File Storage Strategy](#file-storage-strategy)
4. [Security Measures for Recorded Files](#security-measures-for-recorded-files)
5. [Webhook API Contract](#webhook-api-contract)
5. [NestJS Implementation](#nestjs-implementation)
6. [Deployment to Kubernetes Using GitLab CI/CD](#deployment-to-kubernetes-using-gitlab-cicd)

---

## Overview

This backend service is part of a Zoom-like conferencing system supporting multi-tenancy. Multiple organizations (tenants) can use the service independently. This documentation outlines the architecture, including the NestJS controller/service for managing conference recordings, the database schema, file storage strategies, and security measures for recorded session files.


## Database Schema Design
### Schema Diagram

![Schema Diagram](Untitled%20(3).png)

---
## **File Storage Strategy**

### **1. Storage Location**
- **Cloud Storage Solutions**:
  - Use services like **Amazon S3**, **Google Cloud Storage**, or **Azure Blob Storage** for storing recorded session files.
  
- **Folder Structure and Organization**:
  Use a logical folder structure to organize files by tenant, conference, and session:
  ```
  /<tenant_id>/<conference_id>/<session_id>/<recording_id>.mp4
  ```
  Example:
  ```
  /12345/67890/11122/recording_001.mp4
  ```

### **2. Relating Files to Database Tables**
- Store the file path in the **`file_path`** column of the `Recordings` table.
- Use foreign key relationships to associate recordings with sessions (`session_id`) and conferences (`conference_id`).
- Keep binary data out of the database for performance reasons.

### **3. File Naming Convention**
- Use unique identifiers (e.g., UUIDs) combined with tenant, conference, or session IDs.
- Example: `12345-67890-recording.mp4`.

---

## **Security Measures for Recorded Files**

### **1. Signed URLs**
- Generate **temporary signed URLs** to restrict access to files for a limited time.
- Example: Using AWS S3's `getSignedUrl` method to create a URL valid for 15 minutes:
  ```typescript
  const s3 = new AWS.S3();
  const signedUrl = s3.getSignedUrl('getObject', {
    Bucket: 'my-bucket',
    Key: 'path/to/recording.mp4',
    Expires: 900, // URL valid for 15 minutes
  });
  ```

### **2. Access Control Policies**
- **Bucket Policies**:
  - Restrict access to authorized users or roles.
  - Example AWS S3 bucket policy:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": "arn:aws:iam::123456789012:user/application-user"
          },
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::my-bucket/path/to/*"
        }
      ]
    }
    ```

### **3. Authentication and Authorization**
- Ensure only authenticated users can access APIs for generating signed URLs.
- Implement **role-based access control (RBAC)** to restrict access based on user roles (e.g., admin, host, participant).

---


# Webhook API for Recording Start Event

### Overview
This section explains the implementation of a webhook API that gets notified whenever a recording has started. The webhook will be triggered by external services like conferencing platforms, and it will notify the backend system whenever a new recording is initiated.

### **Webhook API Contract**

#### **1. Webhook API Request (Payload)**

The webhook request will contain information about the recording, conference, session, and tenant. The payload will be in JSON format and should follow this structure:

```json
{
  "event": "recording.started",
  "data": {
    "recording_id": "string",
    "conference_id": "string",
    "tenant_id": "string",
    "session_id": "string",
    "recording_url": "string",
    "title": "string",
    "start_time": "string",
    "host_user_id": "string",
    "host_user_name": "string",
    "tenant_name": "string"
  }
}
```

### Fields Explanation:

- **event**: A string indicating the type of event, in this case, `recording.started`.
- **data**: Contains the data for the event.
  - **recording_id**: Unique identifier for the recording.
  - **conference_id**: Unique identifier for the conference in which the recording took place.
  - **tenant_id**: Unique identifier for the tenant (organization).
  - **session_id**: Unique identifier for the session.
  - **recording_url**: URL where the recording is stored.
  - **title**: Title of the recording.
  - **start_time**: Timestamp when the recording started.
  - **host_user_id**: ID of the user who started the recording (host).
  - **host_user_name**: Name of the user who started the recording.
  - **tenant_name**: The name of the tenant (organization) in whose account the recording was made.



### 2. Webhook API Response

The API will respond with a JSON object indicating whether the event was processed successfully or not.

```json
{
  "status": "success",
  "message": "Recording start event received successfully."
}
```

- **status**: Indicates the status of the operation, either `"success"` or `"failure"`.
- **message**: A descriptive message detailing the result of the request processing.

In case of an error or failure, the response might look like:

```json
{
  "status": "failure",
  "message": "Failed to process recording start event."
}
```
### 3. Webhook API Endpoints

The webhook will be available at the following endpoint:

```bash
POST /recordings/webhook/recording-started
```
This endpoint will accept the payload mentioned above, process it, and store relevant information about the recording in the database.


## NestJS Implementation 

### 1. Create DTO for Webhook Payload

```typescript
export class WebhookRecordingStartedDto {
  event: string;

  data: {
    recording_id: string;

    conference_id: string;

    tenant_id: string;

    session_id: string;

    recording_url: string;

    title: string;

    start_time: string;

    host_user_id: string;

    host_user_name: string;

    tenant_name?: string;
  };
}

```
### 2. Recording Controller

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Patch, Delete } from '@nestjs/common'; // Import Get here
import { RecordingsService } from './recordings.service';
import { WebhookRecordingStartedDto } from './dto/webhook-start-recording.dto/webhook-start-recording.dto';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  // Handle the webhook when a recording starts
  @Post('webhook/recording-started')
  @HttpCode(HttpStatus.OK)
  async recordingStarted(@Body() payload: WebhookRecordingStartedDto) {
    return this.recordingsService.handleRecordingStartedEvent(payload);
  }
}

```
### 3. Recording Service

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';  // Import Logger here
import { CreateRecordingDto } from './dto/create-recording.dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto/update-recording.dto';
import { WebhookRecordingStartedDto } from './dto/webhook-start-recording.dto/webhook-start-recording.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordingsService {
  private recordings = []; // Temporary storage, replace with database logic
  
  private readonly logger = new Logger(RecordingsService.name);

  constructor(private readonly prisma: PrismaService) {}

   // Handle the webhook event when a recording starts
   async handleRecordingStartedEvent(payload: WebhookRecordingStartedDto) {
    const { data } = payload;
    const {
      recording_id,
      conference_id,
      tenant_id,
      session_id,
      recording_url,
      title,
      start_time,
      host_user_id,
      host_user_name,
      tenant_name,
    } = data;

    try {
      const tenantId = Number(tenant_id); // Convert tenant_id to number (if needed)

      // Save the recording data to the database using Prisma
      const recording = await this.prisma.recording.create({
        data: {
          title,
          conference_id: Number(conference_id), // Convert conference_id to number (if needed)
          tenantId: tenantId,
          file_path: recording_url,
          created_at: new Date(start_time),
          updated_at: new Date(),
        },
      });

      // Save session data if needed
      await this.prisma.session.update({
        where: {
          id: Number(session_id), // Convert session_id to number
        },
        data: {
          recording_url: recording_url,
        },
      });

      // Log the successful processing of the recording event
      this.logger.log('Recording started event processed successfully.');

      return { status: 'success', message: 'Recording start event received successfully.' };
    } catch (error) {
      // Handle any errors that might occur
      this.logger.error('Error processing recording start event', error);
      throw new NotFoundException('Failed to process recording start event.');
    }
  }
}

```
### 4. Prisma Model

```prisma
model Conference {
  id            BigInt     @id @default(autoincrement()) // Primary Key
  name          String     // Conference name
  host_user_id  BigInt     // Foreign key to User (this will be removed)
  tenantId      Int
  start_time    DateTime   // Conference start time
  end_time      DateTime?  // Conference end time
  created_at    DateTime   @default(now()) // Timestamp when the conference is created
  updated_at    DateTime   @updatedAt      // Automatically updated timestamp

  recordings    Recording[] // A conference can have many recordings
  sessions      Session[]   // A conference can have many sessions
}

model Recording {
  id            BigInt     @id @default(autoincrement()) // Primary Key
  title         String     // Recording title
  conference_id BigInt     // Foreign key to Conference
  tenantId      Int
  file_path     String     // Path to the recording file
  created_at    DateTime   @default(now()) // Timestamp when the recording is created
  updated_at    DateTime   @updatedAt      // Automatically updated timestamp

  conference    Conference @relation(fields: [conference_id], references: [id]) // Relationship with Conference
}

model Session {
  id              BigInt       @id @default(autoincrement()) // Primary Key
  conference_id   BigInt       // Foreign key to Conference
  session_name    String       // Session name
  start_time      DateTime     // Session start time
  end_time        DateTime?    // Session end time
  recording_url   String       // URL of the recording
  duration_seconds Int         // Session duration in seconds
  file_size_mb    Decimal      @db.Decimal(10, 2) // File size in MB (with precision and scale)
  created_at      DateTime     @default(now()) // Timestamp when the session is created
  updated_at      DateTime     @updatedAt      // Automatically updated timestamp

  conference      Conference   @relation(fields: [conference_id], references: [id]) // Relationship with Conference
  participants    Participant[] // A session can have many participants
}
```


With this setup, the system will be able to receive webhook notifications for recording start events, store relevant details in the database, and return appropriate responses. The integration with Prisma allows for seamless database management, while NestJS provides a robust structure for API development. This design supports scalability and modularity, making it easy to extend or modify as needed.





# Deployment to Kubernetes Using GitLab CI/CD

## Deployment Process Overview:

### 1. **Source Code Versioning & CI/CD Pipeline:**
- **GitLab Repository**: The NestJS backend service code is hosted in a GitLab repository.
- **GitLab CI/CD Pipeline**: Automated pipelines are set up using `.gitlab-ci.yml` configuration file. This file defines various jobs like build, test, and deploy.

### 2. **CI/CD Process:**

- **Build Stage**: 
  - When new code is pushed to GitLab (via a merge request or direct commit), the pipeline triggers the build stage.
  - The pipeline runs tests to ensure that the application behaves as expected.
  - Build Docker image for the backend service.
  - Store Docker image in a container registry (GitLab container registry or external one like Docker Hub).

- **Deploy Stage**: 
  - Once the Docker image is built and tested, the deployment job is triggered.
  - The appropriate Kubernetes environment (staging or production) is selected.
  - The Kubernetes deployment process will use Helm or `kubectl` to deploy the updated Docker container image.

### 3. **Kubernetes Cluster:**

- **Kubernetes Deployment**: 
  - The service is deployed to a Kubernetes cluster.
  
- **Pods**: 
  - The backend service is containerized and deployed into Pods in the Kubernetes cluster.
  
- **Services**: 
  - Expose the NestJS backend using a Kubernetes service .
  
- **Ingress**: 
  - If required, use an Ingress resource to manage external access and routing to the service.

### 4. **Continuous Monitoring & Alerts:**

- Integration with monitoring tools like **Prometheus**, **Grafana**, and **ELK stack** for logging and metrics.

## Diagram of Deployment Process


![Schema Diagram](Untitled%20Diagram%20(1).jpg)



# Managing Secrets for Different Environments

Managing secrets securely across multiple environments (staging and production) is crucial in any deployment process. Here's how we can handle this:

## Secrets Management Strategy:

### 1. **GitLab CI/CD Secrets:**

- **GitLab CI/CD Variables**: Use GitLab CI/CD’s built-in secrets management to store sensitive data, such as database credentials, API keys, etc., for each environment. 
  You can set up different variables for staging and production. For example, `DATABASE_URL`, `API_KEY`, etc. GitLab allows you to store environment-specific secrets securely under CI/CD settings.

### 2. **Kubernetes Secrets:**

- **Kubernetes Secrets**: Kubernetes has a built-in Secret resource to securely store and manage sensitive information. You can store secrets for each environment (e.g., staging or production) as Kubernetes Secret objects.
  
- **Helm Charts**: Use Helm for managing Kubernetes deployments. Helm allows you to specify environment-specific values (like secrets) for each release.
  For example, you can use helm secrets to manage secrets in a secure and encrypted way.

### 3. **Environment-specific Configurations:**

- **Staging & Production Configs**: Use separate configuration files for staging and production, both within GitLab and Kubernetes.  
  Example:
  - `config/staging.env`
  - `config/production.env`
  
  The CI/CD pipeline can then inject these files into the appropriate deployment.

### 4. **Vault or External Secret Management:**

For an added layer of security and scalability, consider using a secret management system like HashiCorp Vault, AWS Secrets Manager, or Google Secret Manager. These tools can securely store and retrieve secrets at runtime, further reducing the risks associated with managing secrets in CI/CD or Kubernetes.

#### Example GitLab CI/CD configuration:

```yaml
stages:
  - build
  - deploy

variables:
  STAGING_DB_URL: $STAGING_DB_URL  # Defined in GitLab Secrets
  PRODUCTION_DB_URL: $PRODUCTION_DB_URL  # Defined in GitLab Secrets

build:
  stage: build
  script:
    - docker build -t my-app:$CI_COMMIT_REF_NAME .
    - docker push my-app:$CI_COMMIT_REF_NAME

deploy_staging:
  stage: deploy
  script:
    - kubectl apply -f k8s/staging-deployment.yaml
  only:
    - staging

deploy_production:
  stage: deploy
  script:
    - kubectl apply -f k8s/production-deployment.yaml
  only:
    - main
```

# Diagnosing & Troubleshooting Production Issues (e.g., 500 Errors)

When things go wrong in production (e.g., an API returning a 500 error without any detailed message), diagnosing and troubleshooting the issue becomes critical. Here’s how to approach it:

## 1. **Logs and Monitoring:**

### Centralized Logging (ELK Stack/EFK):
- **ELK Stack** (Elasticsearch, Logstash, Kibana) or **EFK** (Elasticsearch, Fluentd, Kibana) can aggregate logs from various services running in your Kubernetes cluster.
- Logs are invaluable for understanding what went wrong during the request processing. Ensure that all services are configured to log relevant data, especially error messages, request IDs, and stack traces.

#### Example of Kubernetes logging setup:
- Set up Fluentd or a similar log collector to send logs to Elasticsearch.
- Use Kibana for visualizing and querying logs.

### Prometheus + Grafana:
- **Prometheus** can be used to monitor the health and performance metrics of your Kubernetes cluster.
- Integrating **Grafana** for dashboards allows you to visualize metrics like request rate, error rates, and response times, helping to spot anomalies that could lead to errors.

#### Example metrics to watch:
- Request errors (4xx, 5xx response codes)
- Request latency (response time)
- Resource usage (CPU, Memory)

## 2. **Debugging via Kubernetes Logs and Metrics:**

### Kubernetes Logs:
- Use `kubectl logs` to retrieve logs from the pods. This helps identify if there’s an issue with your container or the code.

#### Example command:
```bash
kubectl logs <pod-name> --tail=100
```
### Kubernetes Resource Monitoring:
- **kubectl top:** Check the CPU and memory usage of the pods. If resources are exhausted, Kubernetes may be killing the pod, causing unexpected errors.
```bash
kubectl top pod <pod-name>
```

## 3. API Monitoring & Alerting:

### Error Tracking with Sentry:
- Integrate **Sentry** or similar error-tracking tools to capture stack traces, context, and error details automatically whenever an API returns a 500 error.
- **Sentry** can help alert your team with detailed error context and breadcrumbs leading to the issue.

### Health Checks:
- Ensure the Kubernetes deployment includes **liveness** and **readiness probes**, so Kubernetes can restart pods that are unresponsive or unhealthy.

## 4. Step-by-step Troubleshooting Approach:

1. **Check logs for stack traces**: Look for error logs and stack traces that could explain the issue.
2. **Examine database and external services**: Ensure that there’s no issue with external dependencies, such as the database being down or the API failing to connect.
3. **Check metrics**: Review **Prometheus/Grafana** dashboards to look for performance bottlenecks or resource exhaustion.
4. **Run API tests**: Run isolated tests against the affected APIs to reproduce the error in a staging environment.

## Tools Recommended:
- **GitLab CI/CD** for pipeline automation.
- **Kubernetes** for deployment and orchestration.
- **Prometheus** for monitoring and **Grafana** for dashboards.
- **ELK Stack/EFK** for centralized logging.
- **Sentry** for error tracking.
- **HashiCorp Vault** or **AWS Secrets Manager** for secret management.
