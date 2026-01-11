# Microservices Node.js B2B B2C Platform - Complete Documentation

A comprehensive, enterprise-grade microservices Node.js B2B B2C marketplace platform built with TypeScript, microservices architecture, AI-powered recommendations, and modern web technologies. Fully typed with interfaces, repositories, services, and dependency injection providers.

## 🏗️ Architecture Overview

### **21 Production-Ready Microservices:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Authentication │────│    Products     │────│   Recommender   │
│   (Port 9000)   │    │   (Port 9001)   │    │   (Port 9002)   │    │   (Port 9011)   │
│                 │    │                 │    │                 │    │  🤖 AI-Powered  │
│ • Load Balancing│    │ • JWT Auth      │    │ • Catalog       │    │ • ML Algorithms │
│ • Rate Limiting │    │ • User Mgmt     │    │ • Search/Filter │    │ • Real-time     │
│ • Circuit Breaker│    │ • Business Reg │    │ • Reviews       │    │ • Personalization│
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                        │                        │
          └────────────────────────┼────────────────────────┼────────────────────────┘
                                   │                        │
                     ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                     │     Transactions         │    │       Messaging           │
                     │      (Port 9003)         │    │      (Port 9004)          │
                     │                          │    │                           │
                     │ • Payment Processing     │    │ • Real-time Chat         │
                     │ • Wallet Management      │    │ • File Sharing           │
                     │ • Subscription Billing   │    │ • Conversation Threads   │
                     │ • Multi-gateway Support  │    │ • WebSocket Support      │
                     └──────────────────────────┘    └───────────────────────────┘
                                   │                        │
                                   ├────────────────────────┤
                                   │                        │
                     ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                     │      Reviews             │    │     Promotions            │
                     │      (Port 9008)         │    │      (Port 9009)          │
                     │                          │    │                           │
                     │ • Product Reviews        │    │ • Coupons & Discounts    │
                     │ • Seller Ratings         │    │ • Flash Sales            │
                     │ • Moderation Tools       │    │ • Promotional Banners    │
                     │ • Analytics & Insights   │    │ • Marketing Campaigns    │
                     └──────────────────────────┘    └───────────────────────────┘
```

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Notifications   │────│   Advertising   │────│   Ticketing     │────│     System      │
│   (Port 9005)   │    │   (Port 9006)   │    │   (Port 9007)   │    │   (Port 9012)   │
│                 │    │                 │    │                 │    │                 │
│ • Email/SMS     │    │ • Campaign Mgmt │    │ • Support Sys   │    │ • Admin Panel   │
│ • Push Notifs   │    │ • Ad Serving    │    │ • SLA Tracking  │    │ • User Mgmt     │
│ • Templates     │    │ • Performance   │    │ • Agent Assign  │    │ • Audit Logs    │
│ • Multi-channel │    │ • ROI Analytics │    │ • File Attach   │    │ • Health Mon    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                        │                        │
          └────────────────────────┼────────────────────────┼────────────────────────┘
                                   │                        │
                     ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                     │      Analytics           │    │       Shipping            │
                     │      (Port 9013)         │    │      (Port 9010)          │
                     │                          │    │                           │
                     │ • Business Intel        │    │ • Multi-carrier           │
                     │ • Real-time Metrics     │    │ • Tracking/Automation     │
                     │ • Custom Dashboards     │    │ • Address Validation      │
                     │ • Performance Analytics │    │ • Delivery Analytics      │
                      └──────────────────────────┘    └───────────────────────────┘
                                    │                        │
                                    ├────────────────────────┤
                                    │                        │
                      ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                      │     Wishlist             │    │                           │
                      │      (Port 9014)         │    │                           │
                      │                          │    │                           │
                      │ • Favorites Management   │    │ •                         │
                      │ • Price Alerts           │    │ •                         │
                      │ • Sharing & Social       │    │ •                         │
                      │ • Wishlist Analytics     │    │ •                         │
                      └──────────────────────────┘    └───────────────────────────┘
                                    │                        │
                                    ├────────────────────────┤
                                    │                        │
                      ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                      │       Search             │    │                           │
                      │      (Port 9015)         │    │                           │
                      │                          │    │                           │
                      │ • Elasticsearch          │    │ •                         │
                      │ • Fuzzy Search           │    │ •                         │
                      │ • Autocomplete           │    │ •                         │
                      │ • Analytics & Cache      │    │ •                         │
                      └──────────────────────────┘    └───────────────────────────┘
                                     │                        │
                                     ├────────────────────────┤
                                     │                        │
                       ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                       │         SEO               │    │       Loyalty            │
                       │      (Port 9016)         │    │      (Port 9017)         │
                       │                          │    │                          │
                       │ • Meta Tags & Schema     │    │ • Points & Tiers         │
                       │ • Sitemaps & Robots      │    │ • Rewards & Referrals    │
                       │ • SEO Analytics          │    │ • Loyalty Analytics      │
                       │ • Redirect Management    │    │ • Gamification           │
                       └──────────────────────────┘    └───────────────────────────┘
                                     │                        │
                                     ├────────────────────────┤
                                     │                        │
                       ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                       │       Social             │    │   Enhanced Analytics     │
                       │      (Port 9018)         │    │      (Port 9019)         │
                       │                          │    │                          │
                       │ • Social Feed & Posts    │    │ • Predictive Analytics   │
                       │ • Following & Sharing    │    │ • Business Intelligence  │
                       │ • Social Commerce        │    │ • Real-time Dashboards   │
                       │ • Social Notifications   │    │ • ML Model Management    │
                       └──────────────────────────┘    └───────────────────────────┘
                                    │                        │
                                    ├────────────────────────┤
                                    │                        │
                      ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                      │       Loyalty            │    │                           │
                      │      (Port 9017)         │    │                           │
                      │                          │    │                           │
                      │ • Points & Tiers         │    │ •                         │
                      │ • Rewards & Redemption   │    │ •                         │
                      │ • Referrals Program      │    │ •                         │
                      │ • Customer Retention     │    │ •                         │
                      └──────────────────────────┘    └───────────────────────────┘
                                    │                        │
                                    ├────────────────────────┤
                                    │                        │
                      ┌─────────────┴─────────────┐    ┌─────┴─────────────────────┐
                      │       Social             │    │                           │
                      │      (Port 9018)         │    │                           │
                      │                          │    │                           │
                      │ • Following & Sharing    │    │ •                         │
                      │ • Social Feed & Posts    │    │ •                         │
                      │ • Notifications & Chat   │    │ •                         │
                       │ • Social Commerce        │    │ •                         │
                       └──────────────────────────┘    └───────────────────────────┘
```

## 🔧 Services Documentation

This section provides comprehensive documentation for all 21 microservices in the Microservices B2B-B2C Multivendor Marketplace platform.

### **Technology Stack:**
- **Backend:** Node.js/Express/TypeScript + Python/FastAPI (AI)
- **Database:** MySQL 8.0 + Redis Cache + Sequelize ORM
- **Message Queue:** RabbitMQ
- **Container:** Docker + Kubernetes (with HPA auto-scaling)
- **Frontend:** Vue.js 3 + TypeScript + Pure CSS
- **Architecture:** Microservices with TypeScript interfaces, repositories, services, and providers
- **Monitoring:** Health Checks + Auto-scaling + Circuit Breaker
- **Load Balancing:** Gateway-based routing with multiple strategies
- **Security:** JWT Auth + Rate Limiting + CORS + Helmet

---

## 📊 Monitoring & Observability

### **Health Checks**
All services expose health endpoints for monitoring:
```bash
# Gateway health check
curl http://localhost:9000/health

# Individual service health
curl http://localhost:9001/health  # Auth
curl http://localhost:9002/health  # Products
# ... etc for all services
```

### **Kubernetes Monitoring**
```bash
# View all services status
kubectl get all -n marketplace

# Monitor auto-scaling
kubectl get hpa -n marketplace

# Check resource usage
kubectl top pods -n marketplace

# View logs
kubectl logs -f deployment/gateway -n marketplace

# Access Kubernetes dashboard
minikube dashboard
```

### **Metrics & Alerts**
- **Auto-scaling**: CPU/memory based scaling (2-10 replicas)
- **Circuit Breaker**: Automatic failover for unhealthy services
- **Load Balancing**: Round-robin and least-connections strategies
- **Rate Limiting**: Per-service rate limits with Redis backing

### **Logging**
All services use Winston for structured logging:
- Request/response logging
- Error tracking
- Performance metrics
- Audit trails

### **Troubleshooting Commands**
```bash
# Check pod status
kubectl describe pod <pod-name> -n marketplace

# Restart deployment
kubectl rollout restart deployment/gateway -n marketplace

# Scale manually
kubectl scale deployment gateway --replicas=5 -n marketplace

# Debug with shell access
kubectl exec -it deployment/gateway -n marketplace -- /bin/sh
```

---

## 🚀 Quick Start

### **Prerequisites:**
```bash
# Required software (Local Development)
Node.js 18+        # Backend services
Python 3.9+        # AI recommender service
Docker 20.10+      # Containerization
Docker Compose     # Orchestration
MySQL 8.0          # Database
Redis 7+           # Cache
RabbitMQ 3.12+     # Message queue

# Required software (Kubernetes Deployment)
kubectl            # Kubernetes CLI
minikube           # Local Kubernetes cluster
# Or access to a Kubernetes cluster (AKS, EKS, GKE)
```

### **Installation & Setup:**

#### **Option 1: Local Development (Docker Compose)**

```bash
# 1. Clone the repository
git clone <repository-url>
cd multivendor-marketplace

# 2. Install all dependencies (Node.js + Python)
make install

# 3. Start infrastructure services
docker-compose up -d mysql redis rabbitmq

# 4. Run database migrations for all services
make db-up

# 5. Enable watermark feature (optional, adds watermark settings to sellers)
npm run db:up:auth:watermark

# 6. Start all microservices
make start

# 7. Start frontend (Vue.js)
cd frontend
npm run dev

# Access points:
# - Frontend: http://localhost:3000
# - API Gateway: http://localhost:9000
# - Admin Dashboard: http://localhost:3000/admin
```

#### **Option 2: Kubernetes Deployment (Production)**

```bash
# 1. Clone the repository
git clone <repository-url>
cd multivendor-marketplace

# 2. Run the automated Kubernetes setup
./scripts/k8-setup.sh

# This script will:
# - Install kubectl and minikube
# - Start Kubernetes cluster
# - Deploy all services with auto-scaling
# - Configure ingress and load balancing

# Access points:
# - API Gateway: http://$(minikube ip):30900
# - Admin Dashboard: http://$(minikube ip):3000/admin
# - Ingress: http://marketplace.example.com (add to hosts file)
```

#### **Option 3: Manual Kubernetes Deployment**

```bash
# 1. Ensure kubectl is configured for your cluster
kubectl cluster-info

# 2. Create namespace
kubectl create namespace marketplace

# 3. Apply configurations
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml
kubectl apply -f k8s/base/mysql.yaml
kubectl apply -f k8s/base/redis.yaml
kubectl apply -f k8s/base/rabbitmq.yaml

# 4. Apply service manifests
kubectl apply -f k8s/base/

# 5. Apply overlays (development/production)
kubectl apply -f k8s/overlays/development/

# 6. Check deployment status
kubectl get pods -n marketplace
kubectl get svc -n marketplace
```

### **Individual Service Startup:**

```bash
# Start specific services
npm run start:gateway      # API Gateway
npm run start:auth         # Authentication
npm run start:products     # Products service
npm run start:transactions # Transactions service
npm run start:messaging    # Messaging service
npm run start:notifications # Notifications service
npm run start:advertising  # Advertising service
npm run start:ticketing    # Ticketing service
npm run start:reviews      # Reviews service
npm run start:promotions   # Promotions service
npm run start:shipping     # Shipping service
npm run start:recommender  # AI Recommender (Python)
npm run start:system       # System service
npm run start:analytics    # Analytics service
npm run start:wishlist     # Wishlist service
npm run start:search       # Search service
npm run start:seo          # SEO service
npm run start:loyalty      # Loyalty service
npm run start:social       # Social service
npm run start:enhanced-analytics # Enhanced Analytics service
```

### **Kubernetes Deployment:**

The platform includes full Kubernetes manifests with auto-scaling capabilities. Use the provided setup script for easy deployment.

```bash
# 1. Run the Kubernetes setup script (installs kubectl, minikube, and deploys all services)
./scripts/k8-setup.sh

# This will:
# - Install kubectl and minikube if not present
# - Start minikube cluster
# - Create marketplace namespace
# - Apply all Kubernetes manifests
# - Enable ingress for external access
# - Set up auto-scaling (HPA) for all services

# Access your services:
# - API Gateway: http://$(minikube ip):30900
# - Admin Dashboard: http://$(minikube ip):3000/admin
```

### **Monitoring Services:**

The platform provides comprehensive monitoring capabilities:

```bash
# Check cluster status
kubectl get pods -n marketplace
kubectl get svc -n marketplace
kubectl get hpa -n marketplace

# View logs for a specific service
kubectl logs -f deployment/gateway -n marketplace
kubectl logs -f deployment/auth -n marketplace

# Monitor auto-scaling
kubectl describe hpa gateway-hpa -n marketplace

# Check service health
kubectl exec -it deployment/gateway -n marketplace -- curl http://localhost:9000/health

# View resource usage
kubectl top pods -n marketplace
kubectl top nodes

# Access Kubernetes dashboard (if installed)
minikube dashboard
```

### **Service Health Checks:**

Each service exposes health endpoints:

- `GET /health` - Service health status
- `GET /api/services` - Gateway service discovery
- `GET /api/system/health` - System-wide health overview

### **Auto-Scaling Configuration:**

All services are configured with Horizontal Pod Autoscaler (HPA):

- **CPU/Memory thresholds**: Scales based on resource utilization
- **Min replicas**: 2 (for high availability)
- **Max replicas**: 10 (to handle traffic spikes)
- **Cooldown period**: Prevents thrashing

### **Load Balancing:**

- **Gateway**: Routes requests with load balancing and circuit breaker
- **Analytics/Dashboard/Reports**: Least-connections strategy
- **Shipping/Ticketing**: Round-robin strategy
- **All services**: Health-checked and auto-failover

### **Troubleshooting:**

```bash
# Restart a service
kubectl rollout restart deployment/gateway -n marketplace

# Scale manually
kubectl scale deployment gateway --replicas=3 -n marketplace

# Debug pod issues
kubectl describe pod <pod-name> -n marketplace
kubectl logs <pod-name> -n marketplace

# Access pod shell
kubectl exec -it <pod-name> -n marketplace -- /bin/sh
```

### **Database Migrations:**

```bash
# Run all migrations
npm run db:up

# Run specific service migrations
npm run db:up:auth          # Authentication service
npm run db:up:products      # Products service
npm run db:up:transactions  # Transactions service
npm run db:up:messaging     # Messaging service
npm run db:up:notifications # Notifications service
npm run db:up:advertising   # Advertising service
npm run db:up:ticketing     # Ticketing service
npm run db:up:system        # System service
npm run db:up:analytics     # Analytics service
npm run db:up:shipping      # Shipping service
npm run db:up:recommender   # AI Recommender service

# Rollback migrations
npm run db:down            # All services
npm run db:down:auth       # Specific service
```

---

## 📊 API Endpoints & Payloads

### **1. 🔐 Authentication Service (Port 9001)**

#### **POST /api/auth/register**
**Register a new user**
```bash
curl -X POST http://localhost:9001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "buyer"
  }'
```
**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-123",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer",
      "isEmailVerified": false
    },
    "token": "jwt-token-here"
  }
}
```

#### **POST /api/auth/login**
**User login**
```bash
curl -X POST http://localhost:9001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-123",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "buyer"
    },
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here"
  }
}
```

#### **GET /api/auth/profile**
**Get user profile (Authenticated)**
```bash
curl -X GET http://localhost:9001/api/auth/profile \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profile": {
      "bio": "Bike enthusiast",
      "location": "New York, NY",
      "interests": ["cycling", "technology"]
    },
    "business": null,
    "kyc": {
      "status": "approved"
    }
  }
}
```

#### **PUT /api/auth/profile**
**Update user profile (Authenticated)**
```bash
curl -X PUT http://localhost:9001/api/auth/profile \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "profile": {
      "bio": "Updated bio",
      "location": "Los Angeles, CA"
    }
  }'
```

#### **POST /api/auth/business/register**
**Register business for sellers (Authenticated)**
```bash
curl -X POST http://localhost:9001/api/auth/business/register \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "John's Bike Shop",
    "businessType": "retail",
    "businessAddress": "123 Main St, NYC, NY 10001",
    "taxId": "12-3456789",
    "industry": "retail",
    "employeeCount": "1-10",
    "annualRevenue": "$100K-$500K"
  }'
```

### **2. 📦 Products Service (Port 9002)**

#### **GET /api/products**
**List products with filters**
```bash
curl -X GET "http://localhost:9002/api/products?page=1&limit=20&category=bikes&minPrice=100&maxPrice=1000&sort=price&order=asc"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "name": "Mountain Bike Pro",
        "price": 899.99,
        "category": "Mountain Bikes",
        "images": ["image1.jpg", "image2.jpg"],
        "rating": 4.5,
        "reviewCount": 25,
        "seller": {
          "name": "Bike Store Inc",
          "rating": 4.8
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    },
    "filters": {
      "categories": ["Mountain Bikes", "Road Bikes"],
      "priceRange": { "min": 100, "max": 5000 }
    }
  }
}
```

#### **POST /api/products**
**Create product (Seller only)**
```bash
curl -X POST http://localhost:9002/api/products \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Mountain Bike",
    "description": "High-quality mountain bike for all terrains",
    "price": 1299.99,
    "categoryId": "bike-cat-2",
    "brand": "Trek",
    "stock": 50,
    "images": ["bike1.jpg", "bike2.jpg"],
    "specifications": {
      "frame": "Aluminum",
      "gears": "21-speed",
      "weight": "15kg"
    },
    "tags": ["mountain", "aluminum", "21-speed"]
  }'
```

#### **POST /api/products/upload/images**
**Upload product images with automatic watermarking (Seller only)**
```bash
curl -X POST http://localhost:9002/api/products/upload/images \
  -H "Authorization: Bearer jwt-token-here" \
  -F "images=@bike1.jpg" \
  -F "images=@bike2.jpg"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "urls": [
      "/uploads/bike1_watermarked.jpg",
      "/uploads/bike2_watermarked.jpg"
    ],
    "watermarkResults": [
      {
        "filename": "bike1.jpg",
        "watermarked": true,
        "watermarkText": "Bike Store Inc",
        "position": "bottom-right"
      },
      {
        "filename": "bike2.jpg",
        "watermarked": true,
        "watermarkText": "Bike Store Inc",
        "position": "bottom-right"
      }
    ],
    "message": "2 images uploaded successfully"
  }
}
```

### **Watermark Feature**
- **Automatic watermarking** on all seller product images
- **Customizable watermark text** (defaults to business name)
- **Configurable settings**: opacity, position, font size, colors
- **Toggleable per seller** via database settings
- **Supported formats**: JPEG, PNG, WebP
- **Settings stored in** `user_business` table:
  - `enableWatermark`: Enable/disable watermarking
  - `watermarkText`: Custom watermark text
  - `watermarkOpacity`: Opacity (0.1-1.0)
  - `watermarkPosition`: Position (top-left, top-right, bottom-left, bottom-right, center)
  - `watermarkFontSize`: Font size in pixels
  - `watermarkColor`: Text color (hex)
  - `watermarkBackgroundColor`: Background color (hex)
  - `watermarkBackgroundOpacity`: Background opacity

#### **GET /api/products/:id**
**Get product details**
```bash
curl -X GET http://localhost:9002/api/products/product-uuid
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product-uuid",
    "name": "Premium Mountain Bike",
    "description": "High-quality mountain bike...",
    "price": 1299.99,
    "images": ["bike1.jpg", "bike2.jpg"],
    "specifications": {
      "frame": "Aluminum",
      "gears": "21-speed"
    },
    "reviews": [
      {
        "id": "review-1",
        "rating": 5,
        "comment": "Excellent bike!",
        "user": "John Doe",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "seller": {
      "name": "Bike Store Inc",
      "rating": 4.8,
      "totalSales": 1250
    }
  }
}
```

#### **POST /api/products/:id/reviews**
**Add product review (Authenticated)**
```bash
curl -X POST http://localhost:9002/api/products/product-uuid/reviews \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Amazing Bike!",
    "comment": "Best mountain bike I've ever owned",
    "verified": true
  }'
```

### **3. 💳 Transactions Service (Port 9003)**

#### **POST /api/transactions/payment**
**Process payment**
```bash
curl -X POST http://localhost:9003/api/transactions/payment \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1299.99,
    "currency": "USD",
    "paymentMethod": "stripe",
    "orderItems": [
      {
        "productId": "product-uuid",
        "quantity": 1,
        "price": 1299.99
      }
    ],
    "billingAddress": {
      "street": "123 Main St",
      "city": "NYC",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```
**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_12345",
    "status": "completed",
    "amount": 1299.99,
    "currency": "USD",
    "paymentIntentId": "pi_stripe_123",
    "orderId": "order_67890"
  }
}
```

#### **GET /api/transactions/wallet**
**Get wallet balance (Authenticated)**
```bash
curl -X GET http://localhost:9003/api/transactions/wallet \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 250.50,
    "currency": "USD",
    "transactions": [
      {
        "id": "txn_123",
        "type": "credit",
        "amount": 100.00,
        "description": "Refund for order #12345",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### **POST /api/transactions/wallet/deposit**
**Add funds to wallet**
```bash
curl -X POST http://localhost:9003/api/transactions/wallet/deposit \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "paymentMethod": "stripe",
    "description": "Wallet deposit"
  }'
```

### **4. 💬 Messaging Service (Port 9004)**

#### **GET /api/messaging/conversations**
**List user conversations**
```bash
curl -X GET http://localhost:9004/api/messaging/conversations \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-123",
        "type": "direct",
        "participants": [
          {
            "id": "user-456",
            "name": "Bike Store Inc",
            "avatar": "avatar.jpg"
          }
        ],
        "lastMessage": {
          "content": "Your order has been shipped!",
          "timestamp": "2024-01-15T10:30:00Z",
          "sender": "Bike Store Inc"
        },
        "unreadCount": 2
      }
    ]
  }
}
```

#### **POST /api/messaging/conversations**
**Create new conversation**
```bash
curl -X POST http://localhost:9004/api/messaging/conversations \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "direct",
    "participantIds": ["seller-uuid"],
    "initialMessage": "Hi, I have a question about your mountain bike"
  }'
```

#### **WebSocket Connection**
```javascript
// Connect to WebSocket for real-time messaging
const ws = new WebSocket('ws://localhost:9004/ws?token=jwt-token-here');

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New message:', data);
};

// Send message
ws.send(JSON.stringify({
  type: 'send_message',
  conversationId: 'conv-123',
  content: 'Thank you for the update!'
}));
```

### **5. 📧 Notifications Service (Port 9005)**

#### **GET /api/notifications**
**Get user notifications**
```bash
curl -X GET http://localhost:9005/api/notifications?page=1&limit=20 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-123",
        "type": "order_update",
        "title": "Order Shipped",
        "message": "Your order #12345 has been shipped",
        "read": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "orderId": "order-12345",
          "trackingNumber": "1Z999AA1234567890"
        }
      }
    ],
    "unreadCount": 5
  }
}
```

#### **POST /api/notifications/campaigns**
**Create notification campaign (Admin)**
```bash
curl -X POST http://localhost:9005/api/notifications/campaigns \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product Launch",
    "type": "email",
    "subject": "Check out our new mountain bikes!",
    "content": "<h1>New Bikes Available!</h1><p>Discover our latest collection...</p>",
    "targetAudience": {
      "userTypes": ["buyer"],
      "interests": ["cycling"]
    },
    "schedule": {
      "sendAt": "2024-01-20T09:00:00Z"
    }
  }'
```

### **6. 📢 Advertising Service (Port 9006)**

#### **GET /api/advertising/campaigns**
**List ad campaigns**
```bash
curl -X GET http://localhost:9006/api/advertising/campaigns \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "camp-123",
        "name": "Mountain Bike Sale",
        "status": "active",
        "budget": 500.00,
        "spent": 125.50,
        "impressions": 2500,
        "clicks": 125,
        "conversions": 8,
        "ctr": 5.0,
        "cpc": 1.00,
        "roas": 3.2
      }
    ]
  }
}
```

#### **POST /api/advertising/campaigns**
**Create ad campaign (Seller/Admin)**
```bash
curl -X POST http://localhost:9006/api/advertising/campaigns \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Premium Bikes Promotion",
    "campaignType": "promotional",
    "budgetType": "daily",
    "dailyBudget": 50.00,
    "totalBudget": 1000.00,
    "bidStrategy": "manual",
    "maxBid": 2.50,
    "startDate": "2024-01-15",
    "endDate": "2024-02-15",
    "title": "Premium Mountain Bikes",
    "description": "Discover our high-quality mountain bikes",
    "landingUrl": "https://marketplace.com/products/mountain-bikes",
    "targetAudience": {
      "locations": ["USA", "Canada"],
      "interests": ["cycling", "outdoor"]
    }
  }'
```

#### **GET /api/advertising/ads/serve/:placement**
**Serve ads for placement (Public)**
```bash
curl -X GET "http://localhost:9006/api/advertising/ads/serve/homepage_banner?user_id=user-123&location=USA"
```
**Response:**
```json
{
  "ads": [
    {
      "campaign_id": "camp-123",
      "ad_id": "ad-456",
      "title": "Premium Mountain Bikes",
      "description": "Discover our high-quality bikes",
      "image_url": "ad-image.jpg",
      "landing_url": "https://marketplace.com/bikes",
      "call_to_action": "Shop Now"
    }
  ]
}
```

### **7. 🎫 Ticketing Service (Port 9007)**

#### **GET /api/ticketing/tickets**
**List support tickets**
```bash
curl -X GET http://localhost:9007/api/ticketing/tickets \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "ticket-123",
        "ticketNumber": "TCK-20240115-0001",
        "title": "Order not received",
        "status": "open",
        "priority": "medium",
        "category": "shipping",
        "createdAt": "2024-01-15T10:30:00Z",
        "lastMessage": {
          "content": "We're investigating your order",
          "timestamp": "2024-01-15T11:00:00Z",
          "sender": "Support Agent"
        }
      }
    ],
    "stats": {
      "total": 5,
      "open": 2,
      "in_progress": 1,
      "resolved": 2
    }
  }
}
```

#### **POST /api/ticketing/tickets**
**Create support ticket**
```bash
curl -X POST http://localhost:9007/api/ticketing/tickets \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Order not received",
    "description": "I placed an order 5 days ago but haven't received it yet",
    "category": "shipping",
    "priority": "medium",
    "orderId": "order-12345"
  }'
```

#### **POST /api/ticketing/tickets/:id/messages**
**Add message to ticket**
```bash
curl -X POST http://localhost:9007/api/ticketing/tickets/ticket-123/messages \
  -H "Authorization: Bearer jwt-token-here" \
  -F "content=I still haven't received my order. Can you provide tracking info?" \
  -F "attachments=@receipt.jpg"
```

#### **GET /api/ticketing/admin/stats**
**Get admin statistics (Admin only)**
```bash
curl -X GET http://localhost:9007/api/ticketing/admin/stats \
  -H "Authorization: Bearer admin-jwt-token"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": {
      "total": 150,
      "open": 25,
      "in_progress": 15,
      "resolved": 98,
      "closed": 12,
      "urgent": 3,
      "avg_resolution_time": "4.2 hours",
      "sla_breaches_today": 1
    },
    "agents": {
      "total_agents": 8,
      "available_agents": 5,
      "avg_workload": 18.75
    }
  }
}
```

### **8. ⚙️ System Service (Port 9008)**

#### **GET /api/system/users**
**List users (Admin only)**
```bash
curl -X GET http://localhost:9008/api/system/users?page=1&limit=20&role=buyer \
  -H "Authorization: Bearer admin-jwt-token"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-123",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "buyer",
        "status": "active",
        "createdAt": "2024-01-10T08:30:00Z",
        "lastLogin": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

#### **PUT /api/system/users/:id/status**
**Update user status (Admin only)**
```bash
curl -X PUT http://localhost:9008/api/system/users/user-123/status \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "reason": "Violation of terms of service",
    "suspensionDuration": 7
  }'
```

#### **GET /api/system/health**
**System health check**
```bash
curl -X GET http://localhost:9008/api/system/health
```
**Response:**
```json
{
  "service": "system",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "message_queue": "healthy",
    "services": {
      "auth": "healthy",
      "products": "healthy",
      "transactions": "healthy",
      "all_other_services": "healthy"
    }
  },
  "metrics": {
    "uptime": "99.9%",
    "active_users": 1250,
    "total_orders": 5847,
    "system_load": "45%"
  }
}
```

### **9. ⭐ Reviews Service (Port 9008)**

#### **GET /api/products/:productId/reviews**
**Get product reviews with pagination**
```bash
curl -X GET "http://localhost:9008/api/products/product-123/reviews?page=1&limit=10&sort=newest&verified=true"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review-123",
        "rating": 5,
        "title": "Excellent Product!",
        "comment": "Best purchase I've made",
        "verifiedPurchase": true,
        "helpfulVotes": 12,
        "createdAt": "2024-01-15T10:30:00Z",
        "user": {
          "id": "user-456",
          "name": "John Doe",
          "avatar": "avatar.jpg"
        },
        "images": ["review1.jpg", "review2.jpg"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    },
    "stats": {
      "averageRating": 4.2,
      "totalReviews": 45,
      "ratingDistribution": {
        "5": 25,
        "4": 12,
        "3": 5,
        "2": 2,
        "1": 1
      }
    }
  }
}
```

#### **POST /api/products/:productId/reviews**
**Create product review (Authenticated)**
```bash
curl -X POST http://localhost:9008/api/products/product-123/reviews \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Amazing Product!",
    "comment": "Highly recommend this product",
    "orderId": "order-456"
  }'
```

#### **GET /api/products/:productId/analytics**
**Get product review analytics**
```bash
curl -X GET http://localhost:9008/api/products/product-123/analytics
```
**Response:**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.2,
    "totalReviews": 45,
    "ratingDistribution": {
      "5": 25,
      "4": 12,
      "3": 5,
      "2": 2,
      "1": 1
    }
  }
}
```

#### **POST /api/reviews/:reviewId/report**
**Report inappropriate review (Authenticated)**
```bash
curl -X POST http://localhost:9008/api/reviews/review-123/report \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "inappropriate",
    "description": "Contains offensive language"
  }'
```

### **10. 🎫 Promotions Service (Port 9009)**

#### **GET /api/coupons**
**Get available coupons for user (Authenticated)**
```bash
curl -X GET http://localhost:9009/api/coupons \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "coupon-123",
        "code": "SAVE20",
        "name": "20% Off Electronics",
        "description": "Get 20% off on all electronics",
        "type": "percentage",
        "value": 20,
        "minOrderAmount": 50,
        "usageLimit": 1000,
        "usageCount": 45,
        "endDate": "2024-12-31T23:59:59Z"
      }
    ]
  }
}
```

#### **POST /api/coupons/validate**
**Validate and apply coupon**
```bash
curl -X POST http://localhost:9009/api/coupons/validate \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE20",
    "orderAmount": 150.00,
    "userId": "user-123",
    "items": [
      {
        "productId": "product-456",
        "quantity": 2,
        "price": 75.00
      }
    ]
  }'
```
**Response:**
```json
{
  "success": true,
  "data": {
    "coupon": {
      "id": "coupon-123",
      "code": "SAVE20",
      "name": "20% Off Electronics",
      "discountAmount": 30.00,
      "freeShipping": false
    }
  }
}
```

#### **GET /api/flash-sales**
**Get active flash sales**
```bash
curl -X GET http://localhost:9009/api/flash-sales
```
**Response:**
```json
{
  "success": true,
  "data": {
    "flashSales": [
      {
        "id": "flash-123",
        "name": "Electronics Flash Sale",
        "description": "Limited time offer!",
        "discountPercentage": 30,
        "startTime": "2024-01-15T00:00:00Z",
        "endTime": "2024-01-16T23:59:59Z",
        "products": [
          {
            "productId": "product-456",
            "originalPrice": 100.00,
            "salePrice": 70.00,
            "soldQuantity": 45,
            "maxQuantity": 100
          }
        ]
      }
    ]
  }
}
```

#### **GET /api/banners**
**Get promotional banners**
```bash
curl -X GET "http://localhost:9009/api/banners?position=homepage"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "id": "banner-123",
        "title": "New Year Sale!",
        "imageUrl": "banner.jpg",
        "linkUrl": "/products?category=electronics",
        "position": "homepage",
        "clickCount": 1250
      }
    ]
  }
}
```

#### **POST /api/admin/coupons**
**Create coupon (Admin only)**
```bash
curl -X POST http://localhost:9009/api/admin/coupons \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "name": "Welcome Discount",
    "description": "10% off for new customers",
    "type": "percentage",
    "value": 10,
    "minOrderAmount": 25,
    "usageLimit": 10000,
    "perUserLimit": 1,
    "firstTimeCustomersOnly": true,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "applicableCategories": ["electronics", "books"]
  }'
```

### **14. 🔍 Search Service (Port 9015)**

#### **POST /api/search**
**Perform product search**
```bash
curl -X POST http://localhost:3015/api/search \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "wireless headphones",
    "category": "electronics",
    "brand": "Sony",
    "minPrice": 50,
    "maxPrice": 200,
    "inStock": true,
    "sortBy": "relevance",
    "page": 1,
    "limit": 20
  }'
```

#### **GET /api/search/autocomplete**
**Get search suggestions**
```bash
curl -X GET http://localhost:3015/api/search/autocomplete?q=headphones&limit=5 \
  -H "Authorization: Bearer jwt-token-here"
```

### **15. 🚀 SEO Service (Port 9016)**

#### **GET /api/seo/meta/:entityType/:entityId**
**Get SEO meta data for entity**
```bash
curl -X GET http://localhost:3016/api/seo/meta/product/123 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "title": "Wireless Bluetooth Headphones | Multivendor Marketplace",
  "description": "Premium wireless headphones with noise cancellation. Shop now for the best deals on audio equipment.",
  "keywords": ["wireless", "headphones", "bluetooth", "audio"],
  "canonicalUrl": "https://marketplace.com/product/wireless-headphones",
  "robots": "index,follow",
  "openGraph": {
    "title": "Wireless Bluetooth Headphones",
    "description": "Premium wireless headphones with noise cancellation",
    "image": "https://marketplace.com/images/product-123.jpg",
    "type": "product"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "Wireless Bluetooth Headphones",
    "description": "Premium wireless headphones",
    "image": "https://marketplace.com/images/product-123.jpg"
  },
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Wireless Bluetooth Headphones",
    "offers": {
      "@type": "Offer",
      "price": "149.99",
      "priceCurrency": "USD",
      "availability": "InStock"
    }
  }
}
```

#### **PUT /api/seo/meta/:entityType/:entityId**
**Update SEO meta data**
```bash
curl -X PUT http://localhost:3016/api/seo/meta/product/123 \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium Wireless Headphones",
    "description": "Best wireless headphones with superior sound quality",
    "keywords": ["premium", "wireless", "headphones", "sound quality"],
    "isActive": true
  }'
```

#### **GET /sitemap.xml**
**Get sitemap index**
```bash
curl -X GET http://localhost:3016/sitemap.xml
```

#### **GET /sitemaps/:filename**
**Get specific sitemap**
```bash
curl -X GET http://localhost:3016/sitemaps/products.xml
```

#### **GET /robots.txt**
**Get robots.txt**
```bash
curl -X GET http://localhost:3016/robots.txt
```

#### **POST /api/seo/redirects**
**Create SEO redirect**
```bash
curl -X POST http://localhost:3016/api/seo/redirects \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "oldUrl": "/old-product-page",
    "newUrl": "/new-product-page",
    "redirectType": "301"
  }'
```

#### **GET /api/seo/analytics**
**Get SEO analytics**
```bash
curl -X GET http://localhost:3016/api/seo/analytics?period=30d \
  -H "Authorization: Bearer jwt-token-here"
```

### **14. 🔍 Search Service (Port 9015)**

#### **POST /api/search**
**Perform product search**
```bash
curl -X POST http://localhost:3015/api/search \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "wireless headphones",
    "category": "electronics",
    "brand": "Sony",
    "minPrice": 50,
    "maxPrice": 200,
    "inStock": true,
    "sortBy": "relevance",
    "page": 1,
    "limit": 20
  }'
```

#### **GET /api/search/autocomplete**
**Get search suggestions**
```bash
curl -X GET http://localhost:3015/api/search/autocomplete?q=headphones&limit=5 \
  -H "Authorization: Bearer jwt-token-here"
```

### **15. 💎 Loyalty Service (Port 9017)**

#### **GET /api/loyalty/account/:userId**
**Get user loyalty account**
```bash
curl -X GET http://localhost:3017/api/loyalty/account/user-123 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "id": "account-uuid",
  "user_id": "user-123",
  "current_points": 2500,
  "total_points_earned": 3200,
  "total_points_redeemed": 700,
  "current_tier": "gold",
  "tier_progress": 75,
  "tier_upgrade_date": "2024-01-15T10:30:00Z",
  "is_active": true,
  "next_tier": "platinum"
}
```

#### **POST /api/loyalty/points/award**
**Award points to user**
```bash
curl -X POST http://localhost:3017/api/loyalty/points/award \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "points": 150,
    "transactionType": "earned",
    "referenceType": "purchase",
    "referenceId": "order-456",
    "description": "Points for purchase"
  }'
```

#### **GET /api/loyalty/rewards**
**Get rewards catalog**
```bash
curl -X GET http://localhost:3017/api/loyalty/rewards?category=discount \
  -H "Authorization: Bearer jwt-token-here"
```

#### **POST /api/loyalty/rewards/redeem**
**Redeem reward**
```bash
curl -X POST http://localhost:3017/api/loyalty/rewards/redeem \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward-uuid",
    "userId": "user-123"
  }'
```

#### **POST /api/loyalty/referrals**
**Create referral**
```bash
curl -X POST http://localhost:3017/api/loyalty/referrals \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "referrerId": "user-123",
    "refereeEmail": "friend@example.com"
  }'
```

### **16. 🌟 Social Features Service (Port 9018)**

#### **GET /api/social/following/:userId**
**Get user's following list**
```bash
curl -X GET http://localhost:3018/api/social/following/user-123 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "following": [
    {
      "user_id": "user-456",
      "username": "seller_pro",
      "followed_at": "2024-01-15T10:30:00Z",
      "is_business": true
    }
  ],
  "total": 1
}
```

#### **POST /api/social/follow/:userId**
**Follow a user**
```bash
curl -X POST http://localhost:3018/api/social/follow/user-456 \
  -H "Authorization: Bearer jwt-token-here"
```

#### **POST /api/social/posts**
**Create social post**
```bash
curl -X POST http://localhost:3018/api/social/posts \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out this amazing product!",
    "product_id": "product-789",
    "visibility": "public"
  }'
```

#### **GET /api/social/feed/:userId**
**Get social feed**
```bash
curl -X GET http://localhost:3018/api/social/feed/user-123?page=1&limit=20 \
  -H "Authorization: Bearer jwt-token-here"
```

#### **POST /api/social/share**
**Share product on social platforms**
```bash
curl -X POST http://localhost:3018/api/social/share \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "product-789",
    "platforms": ["facebook", "twitter"],
    "message": "Loving this product!"
  }'
```

### **17. 📊 Enhanced Analytics Service (Port 9019)**

#### **GET /api/analytics/business-overview**
**Get business overview metrics**
```bash
curl -X GET http://localhost:3019/api/analytics/business-overview \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "total_revenue": 125430.50,
  "total_users": 1250,
  "total_orders": 5847,
  "avg_order_value": 21.45,
  "performance_score": 8.7,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

#### **GET /api/cohorts**
**Get user cohorts**
```bash
curl -X GET http://localhost:3019/api/cohorts?type=time_based \
  -H "Authorization: Bearer jwt-token-here"
```

#### **POST /api/models**
**Create predictive model**
```bash
curl -X POST http://localhost:3019/api/models \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "Customer Churn Predictor",
    "model_type": "customer_churn",
    "algorithm": "decision_tree"
  }'
```

#### **POST /api/predict/churn/:userId**
**Predict customer churn**
```bash
curl -X POST http://localhost:3019/api/predict/churn/user-123 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "prediction_id": "pred-uuid",
  "score": 0.25,
  "label": "low_risk",
  "confidence": 0.8
}
```

#### **POST /api/predict/purchase/:userId/:productId**
**Predict purchase likelihood**
```bash
curl -X POST http://localhost:3019/api/predict/purchase/user-123/product-456 \
  -H "Authorization: Bearer jwt-token-here"
```

#### **GET /api/analytics/cross-service-report**
**Get comprehensive business report**
```bash
curl -X GET "http://localhost:3019/api/analytics/cross-service-report?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer jwt-token-here"
```

#### **GET /api/dashboards**
**Get user dashboards**
```bash
curl -X GET http://localhost:3019/api/dashboards \
  -H "Authorization: Bearer jwt-token-here"
```

### **13. ❤️ Wishlist Service (Port 9014)**

#### **GET /api/analytics/dashboard**
**Get business dashboard data**
```bash
curl -X GET http://localhost:9009/api/analytics/dashboard?period=30d \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRevenue": 125430.50,
      "totalOrders": 5847,
      "totalUsers": 1250,
      "conversionRate": 3.2
    },
    "charts": {
      "revenue": [
        {"date": "2024-01-01", "value": 15230.50},
        {"date": "2024-01-02", "value": 18750.25}
      ],
      "orders": [
        {"date": "2024-01-01", "value": 145},
        {"date": "2024-01-02", "value": 167}
      ]
    },
    "topProducts": [
      {
        "name": "Premium Mountain Bike",
        "revenue": 45230.00,
        "orders": 35,
        "growth": "+15%"
      }
    ],
    "topSellers": [
      {
        "name": "Bike Store Inc",
        "revenue": 67890.00,
        "orders": 234,
        "rating": 4.8
      }
    ]
  }
}
```

#### **GET /api/analytics/reports/export**
**Export analytics report**
```bash
curl -X GET "http://localhost:9009/api/analytics/reports/export?type=sales&format=csv&start_date=2024-01-01&end_date=2024-01-15" \
  -H "Authorization: Bearer jwt-token-here" \
  --output sales_report.csv
```

### **10. 🚚 Shipping Service (Port 9010)**

#### **POST /api/shipping/calculate**
**Calculate shipping rates**
```bash
curl -X POST http://localhost:9010/api/shipping/calculate \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "country": "USA",
      "state": "NY",
      "city": "New York",
      "zipCode": "10001"
    },
    "destination": {
      "country": "USA",
      "state": "CA",
      "city": "Los Angeles",
      "zipCode": "90210"
    },
    "packages": [
      {
        "weight": 15.5,
        "dimensions": {
          "length": 48,
          "width": 12,
          "height": 30
        },
        "value": 1299.99
      }
    ],
    "carrier": "fedex"
  }'
```
**Response:**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "carrier": "fedex",
        "service": "GROUND",
        "cost": 24.50,
        "currency": "USD",
        "estimatedDays": 3,
        "guaranteed": true
      },
      {
        "carrier": "fedex",
        "service": "2_DAY",
        "cost": 45.80,
        "currency": "USD",
        "estimatedDays": 2,
        "guaranteed": true
      }
    ]
  }
}
```

#### **POST /api/shipping/create**
**Create shipment**
```bash
curl -X POST http://localhost:9010/api/shipping/create \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-12345",
    "carrier": "fedex",
    "service": "GROUND",
    "sender": {
      "name": "Bike Store Inc",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA"
      },
      "phone": "+1234567890"
    },
    "recipient": {
      "name": "John Doe",
      "address": {
        "street": "456 Oak Ave",
        "city": "Los Angeles",
        "state": "CA",
        "zipCode": "90210",
        "country": "USA"
      },
      "phone": "+1987654321"
    },
    "packages": [
      {
        "weight": 15.5,
        "dimensions": {
          "length": 48,
          "width": 12,
          "height": 30
        },
        "description": "Mountain Bike"
      }
    ]
  }'
```

#### **GET /api/shipping/track/:id**
**Track shipment**
```bash
curl -X GET http://localhost:9010/api/shipping/track/SH123456789 \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "SH123456789",
    "carrier": "fedex",
    "status": "in_transit",
    "estimatedDelivery": "2024-01-18T15:00:00Z",
    "events": [
      {
        "timestamp": "2024-01-15T08:30:00Z",
        "status": "picked_up",
        "location": "New York, NY",
        "description": "Package picked up"
      },
      {
        "timestamp": "2024-01-16T14:20:00Z",
        "status": "in_transit",
        "location": "Chicago, IL",
        "description": "Departed FedEx location"
      }
    ]
  }
}
```

### **11. 🤖 AI Recommender Service (Port 9011)**

#### **GET /api/recommendations/personalized**
**Get personalized recommendations**
```bash
curl -X GET "http://localhost:9011/api/recommendations/personalized?user_id=user-123&limit=10&algorithm=hybrid" \
  -H "Authorization: Bearer jwt-token-here"
```
**Response:**
```json
{
  "user_id": "user-123",
  "algorithm": "hybrid",
  "recommendations": [
    {
      "product_id": "product-456",
      "name": "Advanced Mountain Bike",
      "score": 0.85,
      "reason": "Based on your interest in mountain biking",
      "category": "Mountain Bikes",
      "price": 1599.99,
      "rating": 4.7
    },
    {
      "product_id": "product-789",
      "name": "Cycling Helmet Pro",
      "score": 0.72,
      "reason": "Popular with mountain bike owners",
      "category": "Equipment",
      "price": 89.99,
      "rating": 4.5
    }
  ],
  "total": 10,
  "generated_at": "2024-01-15T10:30:00Z"
}
```

#### **GET /api/recommendations/similar/:product_id**
**Get similar products**
```bash
curl -X GET "http://localhost:9011/api/recommendations/similar/product-456?limit=5&algorithm=content_based"
```
**Response:**
```json
{
  "product_id": "product-456",
  "algorithm": "content_based",
  "similar_products": [
    {
      "product_id": "product-789",
      "name": "Similar Mountain Bike",
      "similarity": 0.78,
      "reason": "Similar specifications and features",
      "price": 1399.99,
      "category": "Mountain Bikes"
    }
  ],
  "total": 5,
  "generated_at": "2024-01-15T10:30:00Z"
}
```

#### **GET /api/recommendations/trending**
**Get trending products**
```bash
curl -X GET "http://localhost:9011/api/recommendations/trending?limit=10"
```
**Response:**
```json
{
  "algorithm": "trending",
  "recommendations": [
    {
      "product_id": "product-123",
      "name": "Hot Selling Bike",
      "trend_score": 0.95,
      "sales_velocity": "+150% this week",
      "category": "Mountain Bikes",
      "price": 899.99
    }
  ],
  "total": 10,
  "generated_at": "2024-01-15T10:30:00Z"
}
```

#### **GET /api/recommendations/performance**
**Get model performance metrics**
```bash
curl -X GET http://localhost:9011/api/recommendations/performance \
  -H "Authorization: Bearer admin-jwt-token"
```
**Response:**
```json
{
  "success": true,
  "metrics": {
    "models_loaded": 3,
    "last_model_update": "2024-01-15T08:00:00Z",
    "algorithms": ["collaborative", "content_based", "hybrid"],
    "performance": {
      "collaborative": {
        "precision@10": 0.23,
        "recall@10": 0.18,
        "ndcg@10": 0.25
      },
      "content_based": {
        "precision@10": 0.19,
        "recall@10": 0.15,
        "ndcg@10": 0.21
      },
      "hybrid": {
        "precision@10": 0.28,
        "recall@10": 0.22,
        "ndcg@10": 0.31
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🖼️ Image Watermarking Feature

### **Overview**
The Microservices B2B-B2C Multivendor Marketplace includes an advanced image watermarking system that automatically adds seller branding to product images. This feature helps protect intellectual property and provides brand recognition.

### **How It Works**
1. **Seller uploads product images** via the `/api/products/upload/images` endpoint
2. **System fetches watermark settings** from the seller's business profile
3. **Watermark is applied** to each image if enabled
4. **Watermarked images are saved** and URLs returned to the seller
5. **Original images are cleaned up** to save storage space

### **Watermark Settings**
Watermark settings are stored in the `user_business` table and can be configured per seller:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enableWatermark` | BOOLEAN | TRUE | Enable/disable watermarking |
| `watermarkText` | VARCHAR | Business Name | Custom watermark text |
| `watermarkOpacity` | DECIMAL | 0.3 | Watermark opacity (0.1-1.0) |
| `watermarkPosition` | ENUM | 'bottom-right' | Position on image |
| `watermarkFontSize` | INT | 24 | Font size in pixels |
| `watermarkColor` | VARCHAR | '#FFFFFF' | Text color (hex) |
| `watermarkBackgroundColor` | VARCHAR | '#000000' | Background color (hex) |
| `watermarkBackgroundOpacity` | DECIMAL | 0.5 | Background opacity |

### **Supported Positions**
- `top-left` - Top left corner
- `top-right` - Top right corner
- `bottom-left` - Bottom left corner
- `bottom-right` - Bottom right corner (default)
- `center` - Center of image

### **Supported Image Formats**
- JPEG/JPG
- PNG
- WebP

### **Admin Management**
Administrators can manage watermark settings for sellers through the admin panel or API:

```bash
# Update seller watermark settings
curl -X PUT http://localhost:9001/api/auth/business/{sellerId} \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "enableWatermark": true,
    "watermarkText": "Custom Store Name",
    "watermarkOpacity": 0.4,
    "watermarkPosition": "bottom-left",
    "watermarkFontSize": 28,
    "watermarkColor": "#FF0000"
  }'
```

### **Benefits**
- **Brand Protection**: Prevents unauthorized use of product images
- **Brand Recognition**: Increases seller brand visibility
- **Intellectual Property**: Protects seller's visual content
- **Configurable**: Each seller can customize their watermark
- **Performance**: Efficient processing with Sharp library
- **Storage Optimized**: Original images cleaned up automatically

### **Technical Implementation**
- **Library**: Uses Sharp for high-performance image processing
- **Canvas API**: HTML5 Canvas for text overlay generation
- **Async Processing**: Non-blocking image processing
- **Error Handling**: Graceful fallback if watermarking fails
- **Memory Management**: Efficient memory usage for large images

---

## ⭐ Reviews & Rating System

### **Overview**
The Reviews and Rating Service provides a comprehensive review system for products and sellers, enabling marketplace trust and user engagement. Built as a dedicated microservice, it handles review creation, moderation, analytics, and reputation management.

### **Key Features:**
- **Product Reviews**: Users can review products with ratings (1-5 stars), titles, comments, and images
- **Seller Ratings**: Separate rating system for seller performance and reliability
- **Verified Purchases**: Reviews from verified buyers get special badges
- **Helpful Voting**: Community voting on review helpfulness
- **Review Moderation**: Admin tools for managing inappropriate content
- **Analytics Dashboard**: Review insights and rating distributions
- **Report System**: Users can report abusive or fake reviews

### **Review Workflow:**
1. **Purchase Verification**: System verifies if reviewer actually purchased the product
2. **Review Submission**: Users submit ratings, titles, comments, and optional images
3. **Auto-Moderation**: Basic spam and content filtering
4. **Admin Review**: Human moderation for flagged content
5. **Public Display**: Approved reviews appear on product pages
6. **Analytics Update**: Rating distributions and averages update in real-time

### **Database Schema:**
```sql
-- Product reviews with images, votes, and moderation
-- Seller reviews with performance metrics
-- Review reports for admin moderation
-- Analytics cache for performance optimization
```

### **API Endpoints:**
- `GET /api/products/:id/reviews` - Fetch product reviews
- `POST /api/products/:id/reviews` - Submit product review
- `GET /api/products/:id/analytics` - Review analytics
- `POST /api/reviews/:id/report` - Report inappropriate review
- `POST /api/reviews/:id/vote` - Vote on review helpfulness

---

## ❤️ Wishlist & Favorites System

### **Overview**
The Wishlist Service provides comprehensive wishlist and favorites functionality for users. Built as a dedicated microservice, it enables users to save products, create multiple wishlists, share wishlists, and receive price alerts.

### **Key Features:**
- **Multiple Wishlists**: Users can create and manage multiple wishlists
- **Product Organization**: Add products with quantities, priorities, and notes
- **Price Alerts**: Get notified when wishlist items go on sale
- **Wishlist Sharing**: Share wishlists publicly or with specific users
- **Social Features**: Follow public wishlists and discover new products
- **Availability Alerts**: Get notified when out-of-stock items become available
- **Priority Management**: Organize items by priority (low, medium, high)
- **Analytics**: Track wishlist performance and conversion rates

### **Wishlist Workflow:**
1. **Create Wishlist**: Users create named wishlists with descriptions
2. **Add Products**: Add products with custom quantities and notes
3. **Set Alerts**: Configure price and availability alerts
4. **Share & Discover**: Share wishlists and follow others
5. **Track Changes**: Receive notifications for price drops and availability
6. **Purchase Planning**: Use wishlists for future purchases

### **Database Schema:**
```sql
-- User wishlists with public/private settings
-- Wishlist items with priorities and notes
-- Price alert tracking and notifications
-- Wishlist sharing and follower system
-- Analytics and performance metrics
```

### **API Endpoints:**
- `GET /api/wishlists` - Fetch user wishlists
- `POST /api/wishlists` - Create new wishlist
- `PUT /api/wishlists/:id` - Update wishlist
- `DELETE /api/wishlists/:id` - Delete wishlist
- `POST /api/wishlists/:id/items` - Add item to wishlist
- `PUT /api/wishlists/:id/items/:itemId` - Update wishlist item
- `DELETE /api/wishlists/:id/items/:itemId` - Remove item from wishlist
- `POST /api/wishlists/:id/share` - Share wishlist
- `GET /api/shared-wishlist/:token` - View shared wishlist
- `POST /api/alerts/availability` - Create availability alert
- `GET /api/alerts` - Get user alerts

### **Example API Usage:**
```bash
# Create a new wishlist
curl -X POST http://localhost:3014/api/wishlists \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics Wishlist",
    "description": "My favorite tech gadgets",
    "isPublic": false
  }'

# Add product to wishlist
curl -X POST http://localhost:3014/api/wishlists/wishlist-uuid/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "quantity": 1,
    "priority": "high",
    "priceAlert": true,
    "alertPrice": 99.99
  }'

# Share wishlist publicly
curl -X POST http://localhost:3014/api/wishlists/wishlist-uuid/share \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shareType": "public_link"
  }'
```

### **Frontend Components:**
- **WishlistCard**: Display wishlist summaries with item previews
- **WishlistItem**: Individual wishlist item with actions
- **WishlistShare**: Modal for sharing options and social media
- **useWishlist**: Composable for wishlist state management

### **Real-time Features:**
- **Price Alert Notifications**: Instant alerts for price drops
- **Availability Updates**: Notifications when items come back in stock
- **Wishlist Activity**: Real-time updates for shared wishlists
- **Social Interactions**: Follow/unfollow notifications

### **Security & Privacy:**
- **Private by Default**: Wishlists are private unless explicitly shared
- **Granular Permissions**: Control who can view shared wishlists
- **Data Protection**: Secure handling of user wishlist data
- **Audit Trail**: Track all wishlist modifications and shares

### **Analytics & Insights:**
- **Conversion Tracking**: Measure wishlist-to-purchase rates
- **Popular Items**: Identify trending products in wishlists
- **User Behavior**: Analyze wishlist creation and sharing patterns
- **Performance Metrics**: Track wishlist engagement and activity

---

## 🔍 Advanced Search & Discovery System

### **Overview**
The Search Service provides enterprise-grade product search capabilities powered by Elasticsearch. As a dedicated microservice, it handles complex queries, faceted search, autocomplete, analytics, and personalized search experiences.

### **Key Features:**
- **Elasticsearch Integration**: Full-text search with advanced scoring algorithms
- **Fuzzy Matching**: Handles typos and partial matches automatically
- **Faceted Search**: Filter by categories, brands, price ranges, and availability
- **Autocomplete**: Real-time search suggestions as users type
- **Personalization**: Search history and preference learning
- **Analytics**: Comprehensive search performance metrics and insights
- **Caching**: Redis-based result caching for optimal performance
- **Spell Correction**: Automatic spelling correction and suggestions

### **Search Capabilities:**
- **Multi-field Search**: Searches across product names, descriptions, categories, brands, and tags
- **Weighted Scoring**: Different fields have different importance (name > description > tags)
- **Typo Tolerance**: Fuzzy matching with configurable edit distance
- **Stemming**: Reduces words to root forms for better matching
- **Stopword Removal**: Ignores common words that don't add meaning
- **Synonym Support**: Handles product synonyms and variations
- **Boosting**: Promotes certain products based on sales, ratings, or recency

### **Advanced Features:**
- **Query Understanding**: Parses complex queries with multiple terms and operators
- **Result Diversification**: Ensures variety in search results
- **Personalization**: Learns from user behavior and preferences
- **A/B Testing**: Test different search algorithms and ranking
- **Real-time Indexing**: Products are indexed immediately when added/modified
- **Search Analytics**: Track popular queries, conversion rates, and user behavior

### **Database Schema:**
```sql
-- Search queries and analytics tracking
-- Autocomplete suggestions and popular terms
-- Search performance metrics and caching
-- User search personalization and history
-- Spell corrections and query recommendations
```

### **Frontend Integration:**
- **Search Bar**: Intelligent search input with autocomplete
- **Filters Panel**: Dynamic faceted filtering with counts
- **Results Grid**: Sortable results with multiple view modes
- **Pagination**: Efficient pagination with result counts
- **Analytics Dashboard**: Search performance insights for admins

### **Performance Optimizations:**
- **Result Caching**: 5-minute cache for popular queries
- **Index Optimization**: Optimized Elasticsearch mappings and settings
- **Query Optimization**: Efficient query construction and execution
- **Shard Management**: Proper shard allocation for scalability
- **Memory Management**: Efficient memory usage for large result sets

### **Search Algorithms:**
- **TF-IDF Scoring**: Term frequency-inverse document frequency
- **BM25**: Advanced probabilistic ranking model
- **Field Boosting**: Different weights for different product fields
- **Recency Boosting**: Newer products get slight ranking boost
- **Popularity Boosting**: Best-selling products rank higher
- **Personalization**: User-specific ranking adjustments

### **API Endpoints:**
- `POST /api/search` - Main search with full filtering and sorting
- `GET /api/search/autocomplete` - Real-time autocomplete suggestions
- `GET /api/search/suggestions` - Search term suggestions
- `GET /api/search/related/:query` - Related search terms
- `GET /api/search/popular` - Popular search terms
- `GET /api/search/analytics` - Search analytics and metrics
- `GET /api/search/spellcheck/:word` - Spell checking

### **Real-time Features:**
- **Live Indexing**: Products indexed immediately upon creation/update
- **Search Analytics**: Real-time tracking of search performance
- **Query Suggestions**: Dynamic suggestion updates based on popularity
- **Cache Invalidation**: Smart cache clearing for updated products

### **Security & Privacy:**
- **Query Logging**: Secure logging without exposing sensitive data
- **Rate Limiting**: Prevents search abuse and ensures fair usage
- **Data Sanitization**: Cleans and validates all search inputs
- **Access Control**: Different search capabilities for users vs admins

### **Scalability:**
- **Horizontal Scaling**: Elasticsearch clusters for high availability
- **Load Balancing**: Distribute search requests across nodes
- **Index Sharding**: Split large indexes for better performance
- **Query Optimization**: Efficient query planning and execution

### **Example Search Queries:**
```bash
# Basic product search
{
  "q": "wireless bluetooth headphones",
  "sortBy": "relevance",
  "page": 1,
  "limit": 20
}

# Advanced filtered search
{
  "q": "laptop",
  "category": "electronics",
  "brand": "Apple",
  "minPrice": 1000,
  "maxPrice": 2000,
  "inStock": true,
  "sortBy": "rating"
}

# Category-specific search
{
  "category": "fashion",
  "sortBy": "newest",
  "filters": {
    "size": "M",
    "color": "blue"
  }
}
```

### **Analytics & Insights:**
- **Query Performance**: Response times, cache hit rates, error rates
- **User Behavior**: Popular searches, conversion funnels, bounce rates
- **Content Effectiveness**: Which products are found easily vs difficult
- **Search Quality**: Zero-result queries, spelling corrections used
- **Business Intelligence**: Category performance, brand popularity trends

---

## 🚀 Advanced SEO & Search Engine Optimization System

### **Overview**
The SEO Service provides comprehensive search engine optimization capabilities for the marketplace. As a dedicated microservice, it handles dynamic meta tag generation, XML sitemaps, structured data (JSON-LD), robots.txt management, SEO analytics, and redirect management to ensure maximum search engine visibility and organic traffic.

### **Key Features:**
- **Dynamic Meta Tags**: Automatic generation of title, description, and Open Graph tags for all pages
- **Structured Data**: JSON-LD schema markup for products, organizations, and content
- **XML Sitemaps**: Automated sitemap generation and management for search engine crawling
- **Robots.txt**: Dynamic robots.txt generation with crawl directives
- **SEO Redirects**: 301/302 redirect management for URL changes and migrations
- **SEO Analytics**: Comprehensive tracking of search performance and rankings
- **Content Optimization**: SEO scoring and recommendations for content improvement
- **Social Media Integration**: Optimized meta tags for social sharing

### **Meta Tag Management:**
- **Title Optimization**: 50-60 character titles with proper branding
- **Description Optimization**: 150-160 character descriptions with calls-to-action
- **Keyword Integration**: Natural keyword placement without stuffing
- **Open Graph Tags**: Facebook, LinkedIn, and social media optimization
- **Twitter Cards**: Optimized Twitter sharing with images and descriptions
- **Canonical URLs**: Proper canonicalization to prevent duplicate content issues

### **Structured Data (Schema.org):**
- **Product Schema**: Rich snippets for products with pricing, availability, and reviews
- **Organization Schema**: Company information and contact details
- **Breadcrumb Schema**: Navigation path markup for better user experience
- **Review Schema**: Aggregate rating and review markup
- **FAQ Schema**: Frequently asked questions structured data
- **Event Schema**: Event markup for promotional activities
- **Recipe Schema**: Content schema for blog posts and tutorials

### **Sitemap Management:**
- **Multi-type Sitemaps**: Separate sitemaps for products, categories, brands, and pages
- **Automatic Updates**: Real-time sitemap updates when content changes
- **Priority Settings**: Custom priority and change frequency settings
- **Last Modified Dates**: Accurate modification timestamps
- **Compression**: Gzipped sitemaps for faster loading
- **Index Files**: Master sitemap index for large sites

### **SEO Analytics & Reporting:**
- **Page Performance**: Track views, unique visitors, and engagement metrics
- **Search Rankings**: Monitor keyword positions and ranking changes
- **Organic Traffic**: Measure organic search traffic and conversion rates
- **Content Effectiveness**: Identify top-performing pages and content types
- **Backlink Tracking**: Monitor backlink growth and domain authority
- **Technical SEO**: Crawl errors, indexation issues, and site health

### **Redirect Management:**
- **301 Redirects**: Permanent redirects for SEO value preservation
- **302 Redirects**: Temporary redirects for seasonal content
- **Redirect Tracking**: Monitor redirect usage and effectiveness
- **Bulk Operations**: Import/export redirects in bulk
- **Redirect Chains**: Automatic detection and resolution of redirect chains
- **Analytics Integration**: Track redirect performance and user behavior

### **Content Optimization:**
- **SEO Scoring**: 0-100 SEO scores for all pages and content
- **Readability Analysis**: Content readability and user experience metrics
- **Keyword Optimization**: Target keyword analysis and optimization suggestions
- **Image Optimization**: Alt text and image SEO recommendations
- **Mobile Optimization**: Mobile-friendly content analysis
- **Performance Metrics**: Page speed and Core Web Vitals tracking

### **Database Schema:**
```sql
-- SEO meta data for all entities (pages, products, categories)
-- SEO redirects with tracking and analytics
-- Sitemap management and URL tracking
-- SEO analytics and performance metrics
-- Content optimization scores and recommendations
-- Structured data templates and configurations
-- Robots.txt directives and crawl management
-- Social media optimization settings
```

### **Frontend Integration:**
- **useSEO Composable**: Vue composable for SEO management in components
- **Auto SEO**: Automatic SEO setup for products, categories, and pages
- **SEO Dashboard**: Admin interface for SEO management and analytics
- **Meta Tag Injection**: Dynamic meta tag injection in Vue components
- **Structured Data**: Automatic JSON-LD injection for rich snippets

### **API Endpoints:**
- `GET /api/seo/meta/:entityType/:entityId` - Get SEO meta data
- `PUT /api/seo/meta/:entityType/:entityId` - Update SEO meta data
- `GET /sitemap.xml` - Sitemap index
- `GET /sitemaps/:filename` - Individual sitemaps
- `GET /robots.txt` - Dynamic robots.txt
- `POST /api/seo/redirects` - Create redirects
- `GET /api/seo/analytics` - SEO analytics
- `POST /api/admin/seo/generate-sitemaps` - Generate sitemaps

### **Example Meta Data Generation:**
```javascript
// Product page SEO
const productSEO = {
  title: "Wireless Bluetooth Headphones | Premium Audio",
  description: "Experience crystal-clear sound with our wireless Bluetooth headphones. Noise-cancelling technology, 30-hour battery life.",
  keywords: ["wireless headphones", "bluetooth", "noise cancelling", "premium audio"],
  canonicalUrl: "https://marketplace.com/product/wireless-headphones",
  openGraph: {
    title: "Wireless Bluetooth Headphones",
    description: "Premium wireless headphones with noise cancellation",
    image: "https://marketplace.com/images/product-123-hero.jpg",
    type: "product"
  },
  structuredData: {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Wireless Bluetooth Headphones",
    "offers": {
      "@type": "Offer",
      "price": "149.99",
      "priceCurrency": "USD"
    }
  }
};
```

### **Robots.txt Configuration:**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /*?*sort=
Crawl-delay: 1

User-agent: Googlebot
Allow: /

Sitemap: https://marketplace.com/sitemap.xml
```

### **Sitemap Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://marketplace.com/product/wireless-headphones</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### **Performance Optimizations:**
- **Caching**: Redis caching for meta data and sitemaps
- **CDN Integration**: Static asset optimization for images and resources
- **Lazy Loading**: Progressive loading of SEO data
- **Compression**: Gzipped responses for faster delivery
- **Database Indexing**: Optimized queries for SEO analytics

### **Security & Privacy:**
- **Data Sanitization**: Clean and validate all SEO inputs
- **Access Control**: Role-based permissions for SEO management
- **Audit Trail**: Track all SEO changes and modifications
- **Rate Limiting**: Prevent abuse of SEO management endpoints
- **Data Protection**: Secure handling of SEO analytics data

### **Scalability Features:**
- **Distributed Caching**: Redis cluster for high-availability caching
- **Database Sharding**: Scale SEO analytics across multiple databases
- **Queue Processing**: Asynchronous sitemap generation and updates
- **CDN Integration**: Global distribution of static SEO assets
- **Microservice Communication**: Event-driven updates between services

### **Integration Points:**
- **Product Service**: Automatic SEO data generation for new products
- **Category Service**: SEO optimization for category pages
- **Content Management**: Blog post and page SEO management
- **Analytics Service**: Integration with traffic and conversion data
- **Search Service**: SEO-driven search result optimization

### **Monitoring & Alerts:**
- **SEO Score Alerts**: Notifications for pages with low SEO scores
- **Indexation Monitoring**: Track pages indexed by search engines
- **Ranking Changes**: Alerts for significant ranking fluctuations
- **Crawl Errors**: Detection and reporting of crawl issues
- **Performance Degradation**: Monitor SEO-related performance metrics

---

## 💎 Advanced Loyalty & Rewards System

### **Overview**
The Loyalty Service provides a comprehensive customer loyalty program with points, tiers, rewards, and referrals. As a dedicated microservice, it handles point calculation, reward management, tier progression, referral programs, and customer retention analytics to increase customer lifetime value and engagement.

### **Key Features:**
- **Points System**: Automatic point earning for purchases, reviews, referrals, and activities
- **Tier Progression**: Multi-tier loyalty program (Bronze, Silver, Gold, Platinum, Diamond)
- **Rewards Catalog**: Diverse reward options including discounts, free shipping, and products
- **Referral Program**: Earn points by inviting friends with unique referral codes
- **Tier Benefits**: Exclusive perks and multipliers based on loyalty tier
- **Expiration Management**: Automatic point expiration and renewal notifications
- **Analytics Dashboard**: Comprehensive loyalty program performance metrics
- **Campaign Management**: Special loyalty campaigns and bonus point events

### **Points Earning System:**
- **Purchase Points**: 1 point per $1 spent (tier multipliers apply)
- **Review Bonus**: 50 points for product reviews
- **Referral Rewards**: 250 points for successful referrals
- **Signup Bonus**: 100 points for new account registration
- **Birthday Bonus**: 200 points on account anniversary
- **Social Sharing**: Points for social media engagement
- **Account Milestones**: Bonus points for account anniversaries

### **Loyalty Tiers:**
- **Bronze** (0-999 points): Basic member, 1x multiplier
- **Silver** (1,000-4,999 points): Priority support, 1.1x multiplier, free shipping $50+
- **Gold** (5,000-14,999 points): VIP support, 1.2x multiplier, free shipping all orders
- **Platinum** (15,000-49,999 points): Dedicated manager, 1.3x multiplier, early access
- **Diamond** (50,000+ points): All Platinum benefits, 1.5x multiplier, exclusive events

### **Rewards Catalog:**
- **Discount Codes**: Percentage or fixed amount discounts
- **Free Shipping**: Waived shipping costs on orders
- **Product Rewards**: Free or discounted products
- **Cashback**: Direct refunds to payment methods
- **Experiences**: Exclusive access to events or services
- **Donations**: Charitable giving options for points

### **Referral Program:**
- **Unique Codes**: Auto-generated referral codes with QR codes
- **Dual Rewards**: Points for both referrer and referee
- **Tracking**: Complete referral funnel analytics
- **Expiration**: Time-limited referral validity
- **Multi-Channel**: Email, social media, and direct sharing
- **Conversion Tracking**: Monitor referral-to-purchase rates

### **Tier Progression:**
- **Automatic Upgrades**: Seamless tier advancement based on points
- **Progress Tracking**: Visual progress bars and notifications
- **Retention Incentives**: Points to maintain tier status
- **Downgrade Protection**: Grace periods before tier reduction
- **Upgrade Celebrations**: Special rewards for tier advancements

### **Database Schema:**
```sql
-- User loyalty accounts and point balances
-- Points transactions and earning history
-- Rewards catalog and redemption tracking
-- Loyalty tiers and benefit configurations
-- Referral program and conversion tracking
-- Loyalty analytics and performance metrics
-- Campaign management and special events
-- User preferences and notification settings
```

### **Frontend Integration:**
- **Loyalty Dashboard**: Comprehensive customer loyalty interface
- **useLoyalty Composable**: Reactive loyalty state management
- **Tier Progress**: Visual tier advancement tracking
- **Rewards Gallery**: Interactive rewards browsing and redemption
- **Referral Sharing**: Easy referral code generation and sharing
- **Transaction History**: Complete points earning and spending history

### **API Endpoints:**
- `GET /api/loyalty/account/:userId` - Get loyalty account details
- `POST /api/loyalty/points/award` - Award points to users
- `GET /api/loyalty/transactions/:userId` - Get points transaction history
- `GET /api/loyalty/rewards` - Browse rewards catalog
- `POST /api/loyalty/rewards/redeem` - Redeem rewards
- `GET /api/loyalty/redemptions/:userId` - Get redemption history
- `POST /api/loyalty/referrals` - Create referral invitations
- `GET /api/loyalty/referrals/:code` - Get referral by code
- `GET /api/loyalty/tiers` - Get loyalty tier information
- `GET /api/loyalty/analytics` - Get loyalty program analytics

### **Example Points Calculation:**
```javascript
// Purchase points calculation
const purchasePoints = (orderTotal, userTier) => {
  const basePoints = Math.floor(orderTotal); // 1 point per dollar

  const tierMultipliers = {
    bronze: 1.0,
    silver: 1.1,
    gold: 1.2,
    platinum: 1.3,
    diamond: 1.5
  };

  return Math.floor(basePoints * (tierMultipliers[userTier] || 1.0));
};

// Example: $149.99 purchase by Gold member
const pointsEarned = purchasePoints(149.99, 'gold'); // Returns 180 points
```

### **Referral Flow:**
```javascript
// Referral creation and tracking
const referralFlow = {
  // 1. Generate unique referral code
  code: generateReferralCode(userId),

  // 2. Create referral URL
  url: `https://marketplace.com/ref/${code}`,

  // 3. Generate QR code for sharing
  qrCode: await generateReferralQR(code, url),

  // 4. Track when referee signs up
  onRefereeSignup: (refereeId) => {
    // Award 250 points to referrer
    awardPoints(referrerId, 250, 'referral');

    // Award 100 points to referee
    awardPoints(refereeId, 100, 'signup');

    // Mark referral as completed
    updateReferralStatus(code, 'completed');
  }
};
```

### **Analytics & Insights:**
- **Point Velocity**: Points earned vs redeemed over time
- **Tier Distribution**: Customer distribution across loyalty tiers
- **Reward Popularity**: Most redeemed rewards and categories
- **Referral Effectiveness**: Conversion rates and viral coefficients
- **Retention Metrics**: Customer lifetime value and churn prevention
- **ROI Tracking**: Loyalty program cost vs benefit analysis

### **Campaign Management:**
- **Bonus Point Events**: Special point multipliers for holidays
- **Tier Boost Campaigns**: Accelerated tier advancement periods
- **Reward Multipliers**: Double/triple points on specific categories
- **Referral Bonuses**: Increased referral rewards for limited time
- **Reactivation Campaigns**: Win-back incentives for inactive members

### **Customer Retention Strategies:**
- **Point Expiration Warnings**: Proactive notifications before point loss
- **Tier Maintenance Alerts**: Notifications to maintain tier status
- **Personalized Offers**: AI-driven reward recommendations
- **Birthday Campaigns**: Anniversary bonus point events
- **Win-back Emails**: Re-engagement campaigns for lapsed members

### **Integration Points:**
- **Order Service**: Automatic point awarding on purchases
- **Review Service**: Bonus points for product reviews
- **Email Service**: Loyalty notifications and reward confirmations
- **Analytics Service**: Comprehensive loyalty program reporting
- **Notification Service**: Push notifications for loyalty events

### **Security & Compliance:**
- **Point Validation**: Fraud prevention and duplicate transaction detection
- **Audit Trail**: Complete transaction history and change tracking
- **GDPR Compliance**: Data portability and right to erasure
- **Fraud Detection**: Abnormal activity pattern recognition
- **Secure Redemptions**: Verification processes for reward claims

### **Scalability Features:**
- **Event-Driven Architecture**: Asynchronous point processing via message queues
- **Database Sharding**: Scale loyalty data across multiple databases
- **Caching Layer**: Redis caching for frequently accessed loyalty data
- **Batch Processing**: Efficient bulk point awards and expirations
- **Global Support**: Multi-currency and multi-language loyalty programs

### **Business Impact:**
- **Increased Retention**: Higher customer lifetime value through engagement
- **Boosted Revenue**: Repeat purchases driven by loyalty incentives
- **Customer Insights**: Valuable behavioral data for personalization
- **Competitive Advantage**: Superior customer experience and satisfaction
- **Brand Loyalty**: Emotional connection through reward experiences
- **Word-of-Mouth**: Viral growth through referral programs

---

## 🎫 Promotions & Marketing System

### **Overview**
The Promotions Service manages all marketing campaigns, discounts, and promotional activities. As a dedicated microservice, it handles coupons, flash sales, banner ads, and marketing automation.

### **Key Features:**
- **Coupon Management**: Percentage/fixed amount/free shipping coupons
- **Flash Sales**: Limited-time offers with quantity limits
- **Promotional Banners**: Dynamic banner ads with click tracking
- **Newsletter Campaigns**: Email marketing with segmentation
- **Abandoned Cart Recovery**: Automated promotional emails
- **User Segmentation**: Targeted promotions based on user behavior
- **Performance Analytics**: Campaign ROI and conversion tracking

### **Promotion Types:**
1. **Coupons**: Code-based discounts with usage limits and expiration
2. **Flash Sales**: Time-limited offers with inventory controls
3. **Banners**: Visual advertisements with click-through tracking
4. **Campaigns**: Email/SMS marketing with audience targeting

### **Business Logic:**
- **Usage Tracking**: Monitor coupon usage and prevent abuse
- **Inventory Management**: Control flash sale quantities per user
- **A/B Testing**: Compare different promotional strategies
- **Dynamic Pricing**: Automated price adjustments based on demand
- **Geographic Targeting**: Location-based promotions and restrictions

### **Database Schema:**
```sql
-- Coupons with complex rules and usage tracking
-- Flash sales with product associations and limits
-- Promotional banners with performance metrics
-- User segments for targeted marketing
-- Campaign analytics and reporting
```

### **API Endpoints:**
- `GET /api/coupons` - Available user coupons
- `POST /api/coupons/validate` - Apply coupon to order
- `GET /api/flash-sales` - Active flash sales
- `GET /api/banners` - Promotional banners
- `POST /api/admin/coupons` - Create coupon (admin)

---

## 🚀 Enhanced Features Summary

### **New Microservices Added:**
1. **⭐ Reviews Service (Port 9008)** - Product and seller reviews with moderation
2. **🎫 Promotions Service (Port 9009)** - Coupons, flash sales, and marketing campaigns

### **Enhanced Capabilities:**
- **Trust & Reputation**: Comprehensive review system builds marketplace credibility
- **Marketing Automation**: Advanced promotional tools for seller success
- **Monetization**: Multiple revenue streams through promotions and advertising
- **User Engagement**: Interactive features increase platform stickiness
- **Analytics**: Deep insights into user behavior and campaign performance

### **Technical Enhancements:**
- **Event-Driven Architecture**: Services communicate via message queues
- **Caching Layer**: Redis for performance optimization
- **Real-time Updates**: WebSocket integration for live features
- **Content Moderation**: AI-assisted review and content filtering
- **Scalable Storage**: Efficient handling of images and large datasets

---

## 🔄 System Events & Message Flow

### **Core System Events:**

#### **User Events:**
- `user.registered` → Notifications, Analytics, Recommender
- `user.login` → Analytics, Security monitoring
- `user.profile_updated` → Analytics, Notifications
- `user.business_registered` → Notifications, System verification

#### **Product Events:**
- `product.created` → Analytics, Search indexing, Recommender
- `product.updated` → Analytics, Notifications, Recommender
- `product.viewed` → Analytics, Recommender (interaction tracking)
- `product.purchased` → Analytics, Recommender, Notifications

#### **Order Events:**
- `order.created` → Transactions, Analytics, Notifications, Shipping
- `order.payment_completed` → Transactions, Notifications, Analytics, Recommender
- `order.shipped` → Shipping, Notifications, Analytics
- `order.delivered` → Analytics, Notifications, Recommender
- `order.cancelled` → Transactions, Analytics, Notifications, Refunds

#### **Communication Events:**
- `message.sent` → Messaging, Notifications, Analytics
- `ticket.created` → Ticketing, Notifications, Analytics
- `ticket.updated` → Ticketing, Notifications, Analytics
- `notification.sent` → Analytics, Reporting

#### **Advertising Events:**
- `campaign.created` → Advertising, Analytics
- `ad.impression` → Advertising, Analytics
- `ad.click` → Advertising, Analytics, Recommender
- `ad.conversion` → Advertising, Analytics, Transactions

### **Event Flow Examples:**

#### **New User Registration Flow:**
```mermaid
graph TD
    A[User submits registration] --> B[Auth Service: user.registered]
    B --> C[Notifications: Welcome email]
    B --> D[Analytics: User tracking]
    B --> E[Recommender: Cold start profile]
```

#### **Order Completion Flow:**
```mermaid
graph TD
    A[Payment successful] --> B[Transactions: order.payment_completed]
    B --> C[Notifications: Order confirmation]
    B --> D[Analytics: Revenue tracking]
    B --> E[Shipping: Create shipment]
    B --> F[Recommender: Purchase interaction]
```

#### **Product Recommendation Flow:**
```mermaid
graph TD
    A[User views product] --> B[Products: product.viewed]
    B --> C[Recommender: Track interaction]
    C --> D[Analytics: Behavior tracking]
    D --> E[Recommender: Update model]
```

---

## 🎨 Frontend - Vue.js Implementation

### **Technology Stack:**
- **Framework:** Vue.js 3 + Composition API
- **Language:** TypeScript
- **Styling:** Pure CSS (No Framework)
- **State Management:** Pinia
- **HTTP Client:** Axios
- **Routing:** Vue Router 4
- **Build Tool:** Vite

### **Project Structure:**
```
frontend/
├── src/
│   ├── components/          # Reusable Vue components
│   │   ├── ui/             # Base UI components
│   │   ├── products/       # Product-related components
│   │   ├── cart/           # Shopping cart components
│   │   ├── user/           # User profile components
│   │   └── admin/          # Admin dashboard components
│   ├── views/              # Page components
│   │   ├── Home.vue
│   │   ├── Products.vue
│   │   ├── ProductDetail.vue
│   │   ├── Cart.vue
│   │   ├── Checkout.vue
│   │   ├── User/
│   │   │   ├── Profile.vue
│   │   │   ├── Orders.vue
│   │   │   └── Wishlist.vue
│   │   └── Admin/
│   │       ├── Dashboard.vue
│   │       ├── Products.vue
│   │       ├── Orders.vue
│   │       └── Analytics.vue
│   ├── composables/        # Vue composables
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useCart.ts
│   │   └── useRecommendations.ts
│   ├── stores/             # Pinia stores
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── cart.ts
│   │   └── recommendations.ts
│   ├── types/              # TypeScript types
│   │   ├── api.ts
│   │   ├── product.ts
│   │   ├── user.ts
│   │   └── recommendation.ts
│   ├── utils/              # Utility functions
│   │   ├── api.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── router/             # Vue Router configuration
│   ├── App.vue
│   └── main.ts
├── public/                 # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── styles/
    │   ├── main.css           # Main stylesheet with CSS variables
    │   ├── components.css     # Reusable component styles
    │   ├── layout.css         # Layout and grid system
    │   ├── responsive.css     # Media queries and breakpoints
    │   ├── themes.css         # Color schemes and themes
    │   └── utilities.css      # Utility classes
    └── assets/
        ├── fonts/             # Custom fonts
        └── images/            # Static images and icons
```

### **CSS Methodology:**

#### **BEM (Block Element Modifier):**
```css
/* Block */
.product-card { }

/* Element */
.product-card__title { }
.product-card__price { }

/* Modifier */
.product-card--featured { }
.product-card__title--large { }
```

#### **CSS Grid & Flexbox:**
```css
/* Grid Layout */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

/* Flexbox Layout */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

#### **CSS Variables for Theming:**
```css
:root {
  --color-primary: #2563eb;
  --color-text: #1e293b;
  --font-family: 'Inter', sans-serif;
}

[data-theme="dark"] {
  --color-primary: #3b82f6;
  --color-text: #f1f5f9;
}
```

### **Key Features:**

#### **Product Discovery with AI:**
```vue
<template>
  <div class="product-discovery">
    <div class="product-discovery__section product-discovery__section--recommendations">
      <h2 class="product-discovery__title">Recommended for You</h2>
      <ProductGrid :products="personalizedProducts" />
    </div>

    <div class="product-discovery__section product-discovery__section--trending">
      <h2 class="product-discovery__title">Trending Now</h2>
      <ProductGrid :products="trendingProducts" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRecommendations } from '@/composables/useRecommendations'
import ProductGrid from '@/components/products/ProductGrid.vue'

const { getPersonalizedRecommendations, getTrendingProducts } = useRecommendations()

const personalizedProducts = ref([])
const trendingProducts = ref([])

onMounted(async () => {
  personalizedProducts.value = await getPersonalizedRecommendations({ limit: 12 })
  trendingProducts.value = await getTrendingProducts({ limit: 8 })
})
</script>

<style scoped>
.product-discovery {
  display: grid;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.product-discovery__section {
  background: var(--color-white);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.product-discovery__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
  text-align: center;
}

@media (min-width: 768px) {
  .product-discovery {
    grid-template-columns: 1fr 1fr;
  }

  .product-discovery__section--recommendations {
    border-right: 2px solid var(--color-border);
  }
}
</style>
```

#### **CSS Architecture (Pure CSS with BEM Methodology):**
```css
/* src/styles/main.css */
:root {
  /* Color Variables */
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-white: #ffffff;
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
}

/* Button Component */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: 6px;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.btn--primary:hover {
  background-color: #1d4ed8;
}

/* Card Component */
.card {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card__header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.card__body {
  padding: var(--space-lg);
}

/* Grid System */
.grid {
  display: grid;
  gap: var(--space-md);
}

.grid--cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid--cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid--cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid--cols-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid--cols-2,
  .grid--cols-3,
  .grid--cols-4 {
    grid-template-columns: 1fr;
  }
}
```

#### **Real-time Features:**
```typescript
// Real-time messaging with WebSocket
import { useWebSocket } from '@/composables/useWebSocket'

export function useRealTimeMessaging() {
  const { connect, disconnect, send, onMessage } = useWebSocket('/ws')

  const sendMessage = (conversationId: string, content: string) => {
    send('send_message', { conversationId, content })
  }

  const onNewMessage = (callback: (message: Message) => void) => {
    onMessage('message_received', callback)
  }

  return {
    connect,
    disconnect,
    sendMessage,
    onNewMessage
  }
}
```

### **Frontend Setup:**
```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🚀 Production Deployment

### **Docker Compose Production:**
```bash
# Start all services in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale individual services
docker-compose up -d --scale recommender=3
docker-compose up -d --scale gateway=5
```

### **Kubernetes Production:**
```bash
# Deploy to Kubernetes
kubectl apply -k k8s/overlays/production/

# Check deployment status
kubectl get pods -n marketplace
kubectl get ingress -n marketplace

# Monitor HPA
kubectl get hpa -n marketplace
```

### **Environment Configuration:**
```bash
# Production environment variables
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
DB_HOST=production-db-host
REDIS_HOST=production-redis-host
RABBITMQ_URL=amqp://prod-user:prod-pass@prod-rabbitmq:5672/marketplace
```

---

## 📊 Monitoring & Analytics

### **Service Health Checks:**
```bash
# Check all service health
curl http://localhost:4000/health
curl http://localhost:9001/health
curl http://localhost:9011/health
```

### **Performance Metrics:**
```bash
# Gateway metrics
curl http://localhost:4000/metrics

# Individual service metrics
curl http://localhost:9009/metrics
curl http://localhost:9011/api/recommendations/performance
```

### **Log Aggregation:**
```bash
# View service logs
docker logs marketplace-gateway
kubectl logs -f deployment/recommender -n marketplace

# Search logs
kubectl logs -l app.kubernetes.io/name=marketplace -n marketplace | grep ERROR
```

---

## 🔒 Security Features

### **Authentication & Authorization:**
- JWT token-based authentication
- Role-based access control (Buyer/Seller/Admin)
- Multi-factor authentication support
- Session management with Redis

### **Data Protection:**
- End-to-end encryption (HTTPS/TLS)
- Sensitive data encryption at rest
- SQL injection prevention
- XSS protection
- CSRF protection

### **Security Monitoring:**
- Failed login attempt tracking
- Suspicious activity detection
- Audit logging for all actions
- Rate limiting and DDoS protection

---

## 🧪 Testing

### **API Testing:**
```bash
# Run Postman collection
npm run test:api

# Load testing with Artillery
npm run test:load
```

### **Unit Testing:**
```bash
# Run all tests
npm test

# Run specific service tests
npm run test:auth
npm run test:products
npm run test:recommender
```

### **Integration Testing:**
```bash
# End-to-end testing
npm run test:e2e
```

---

## 📈 Scaling & Performance

### **Horizontal Scaling:**
```bash
# Scale recommender service
kubectl scale deployment recommender --replicas=5 -n marketplace

# Auto-scaling with HPA
kubectl autoscale deployment recommender --cpu-percent=70 --min=2 --max=10 -n marketplace
```

### **Database Scaling:**
```bash
# Add read replicas
kubectl apply -f k8s/mysql-read-replica.yaml

# Database optimization
npm run db:optimize
```

### **Caching Strategies:**
- **Redis** for API responses, session data, and frequently accessed data
- **CDN** for static assets and product images
- **Application-level caching** for expensive computations


## 📄 License

This project is own by Fenap, developed my Hitek Financials Ltd

---

**🎉 The Microservices B2B-B2C multivendor marketplace with AI-powered recommendations is now ready for production deployment!**

**All 14 microservices are fully implemented, tested, and production-ready:**
- ✅ **API Gateway** - Load balancing and routing
- ✅ **Authentication** - JWT-based user management
- ✅ **Products** - Catalog management with automatic watermarking
- ✅ **Transactions** - Payment processing and wallets
- ✅ **Messaging** - Real-time communication
- ✅ **Notifications** - Multi-channel messaging
- ✅ **Advertising** - Campaign management and serving
- ✅ **Ticketing** - Customer support system
- ✅ **⭐ Reviews** - Product and seller ratings with moderation
- ✅ **🎫 Promotions** - Coupons, flash sales, and marketing campaigns
- ✅ **System** - Admin panel and monitoring
- ✅ **Analytics** - Business intelligence
- ✅ **Shipping** - Multi-carrier integration
- ✅ **🤖 AI Recommender** - ML-powered personalization

**Built with modern technologies, following best practices, and designed for scale.** 🚀🤖✨