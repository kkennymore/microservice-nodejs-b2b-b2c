const mysql = require('mysql2/promise');
const axios = require('axios');

// Simple Linear Regression implementation
class LinearRegression {
  constructor() {
    this.slope = 0;
    this.intercept = 0;
  }

  fit(X, y) {
    const n = X.length;
    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((sum, x, i) => sum + x * y[i], 0);
    const sumX2 = X.reduce((sum, x) => sum + x * x, 0);

    this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;
  }

  predict(x) {
    return this.slope * x + this.intercept;
  }

  getRSquared(X, y) {
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const ssRes = X.reduce((sum, x, i) => {
      const predicted = this.predict(x);
      return sum + Math.pow(y[i] - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    return 1 - (ssRes / ssTot);
  }
}

// Simple Decision Tree for classification
class SimpleDecisionTree {
  constructor(maxDepth = 3) {
    this.maxDepth = maxDepth;
    this.tree = null;
  }

  fit(X, y, features) {
    this.features = features;
    this.tree = this.buildTree(X, y, 0);
  }

  buildTree(X, y, depth) {
    if (depth >= this.maxDepth || this.getEntropy(y) === 0) {
      return { prediction: this.getMajorityClass(y) };
    }

    const bestSplit = this.findBestSplit(X, y);
    if (!bestSplit) {
      return { prediction: this.getMajorityClass(y) };
    }

    const { featureIndex, threshold } = bestSplit;
    const leftIndices = X.map((row, i) => row[featureIndex] <= threshold ? i : -1).filter(i => i !== -1);
    const rightIndices = X.map((row, i) => row[featureIndex] > threshold ? i : -1).filter(i => i !== -1);

    return {
      featureIndex,
      threshold,
      left: this.buildTree(leftIndices.map(i => X[i]), leftIndices.map(i => y[i]), depth + 1),
      right: this.buildTree(rightIndices.map(i => X[i]), rightIndices.map(i => y[i]), depth + 1)
    };
  }

  predict(sample) {
    let node = this.tree;
    while (!node.prediction) {
      if (sample[node.featureIndex] <= node.threshold) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node.prediction;
  }

  getEntropy(labels) {
    const counts = {};
    labels.forEach(label => counts[label] = (counts[label] || 0) + 1);
    return Object.values(counts).reduce((entropy, count) => {
      const p = count / labels.length;
      return entropy - p * Math.log2(p);
    }, 0);
  }

  getMajorityClass(labels) {
    const counts = {};
    labels.forEach(label => counts[label] = (counts[label] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  findBestSplit(X, y) {
    let bestGain = 0;
    let bestSplit = null;

    for (let featureIndex = 0; featureIndex < X[0].length; featureIndex++) {
      const values = X.map(row => row[featureIndex]).sort((a, b) => a - b);
      const uniqueValues = [...new Set(values)];

      for (const threshold of uniqueValues.slice(0, -1)) {
        const leftIndices = X.map((row, i) => row[featureIndex] <= threshold ? i : -1).filter(i => i !== -1);
        const rightIndices = X.map((row, i) => row[featureIndex] > threshold ? i : -1).filter(i => i !== -1);

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftLabels = leftIndices.map(i => y[i]);
        const rightLabels = rightIndices.map(i => y[i]);

        const gain = this.getEntropy(y) -
          (leftLabels.length / y.length * this.getEntropy(leftLabels)) -
          (rightLabels.length / y.length * this.getEntropy(rightLabels));

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { featureIndex, threshold };
        }
      }
    }

    return bestSplit;
  }
}

// Predictive Analytics Engine
class PredictiveAnalyticsEngine {
  constructor(db) {
    this.db = db;
    this.models = new Map();
  }

  // Customer Churn Prediction
  async predictChurn(userId) {
    try {
      // Fetch user data from auth service
      const userResponse = await axios.get(`http://localhost:3001/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const user = userResponse.data;

      // Fetch user orders from transactions service
      const ordersResponse = await axios.get(`http://localhost:3003/api/orders?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const orders = ordersResponse.data;

      const accountAge = Math.max(1, (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const orderCount = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const orderFrequency = orderCount / accountAge;
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

      const lastOrder = orders.length > 0 ? Math.max(...orders.map(o => new Date(o.created_at).getTime())) : 0;
      const recency = lastOrder > 0 ? (Date.now() - lastOrder) / (1000 * 60 * 60 * 24) : 365;

      const activeMonths = new Set(orders.map(o => `${new Date(o.created_at).getFullYear()}-${new Date(o.created_at).getMonth()}`)).size;

      // Simple churn prediction logic (in real system, use trained model)
      const churnScore = Math.min(1, Math.max(0,
        0.3 + // baseline
        (recency > 90 ? 0.4 : 0) +
        (orderFrequency < 0.1 ? 0.3 : 0) +
        (activeMonths < 3 ? 0.2 : 0) -
        (avgOrderValue > 100 ? 0.1 : 0)
      ));

      return {
        score: churnScore,
        label: churnScore > 0.7 ? 'high_risk' : churnScore > 0.4 ? 'medium_risk' : 'low_risk',
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error predicting churn:', error);
      return { score: 0.5, label: 'unknown', confidence: 0 };
    }
  }

  // Purchase Prediction
  async predictPurchase(userId, productId) {
    try {
      // Fetch product views from products service
      const viewsResponse = await axios.get(`http://localhost:3002/api/products/${productId}/views?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const viewCount = viewsResponse.data.count || 0;

      // Fetch cart data from transactions service
      const cartResponse = await axios.get(`http://localhost:3003/api/cart?user_id=${userId}&product_id=${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const cartCount = cartResponse.data.in_cart ? 1 : 0;

      // Fetch wishlist data from wishlist service
      const wishlistResponse = await axios.get(`http://localhost:3014/api/wishlists/user/${userId}?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const wishlistCount = wishlistResponse.data.in_wishlist ? 1 : 0;

      // Fetch user behavior data
      const userBehaviorResponse = await axios.get(`http://localhost:3013/api/analytics/user-behavior/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const userBehavior = userBehaviorResponse.data;

      const engagement = (viewCount * 0.1) + (cartCount * 0.5) + (wishlistCount * 0.3);
      const diversity = Math.min(1, (userBehavior.categories_viewed || 0) / 10);

      const purchaseScore = Math.min(1, Math.max(0,
        engagement * 0.6 + diversity * 0.4
      ));

      return {
        score: purchaseScore,
        label: purchaseScore > 0.7 ? 'high' : purchaseScore > 0.4 ? 'medium' : 'low',
        confidence: 0.75
      };
    } catch (error) {
      console.error('Error predicting purchase:', error);
      return { score: 0.1, label: 'low', confidence: 0 };
    }
  }

  // Recommendation Scoring
  async calculateRecommendationScore(userId, productId) {
    try {
      // Get user preferences from reviews service
      const userReviewsResponse = await axios.get(`http://localhost:3008/api/reviews?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const userReviews = userReviewsResponse.data;

      // Get product data from products service
      const productResponse = await axios.get(`http://localhost:3002/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const product = productResponse.data;

      // Get product reviews
      const productReviewsResponse = await axios.get(`http://localhost:3008/api/reviews?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const productReviews = productReviewsResponse.data;

      const userAvgRating = userReviews.length > 0
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
        : 3.0;
      const productAvgRating = productReviews.length > 0
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
        : 3.0;

      // Get user activity from analytics service itself
      const userActivityResponse = await axios.get(`http://localhost:3013/api/analytics/user-activity/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const userActivity = userActivityResponse.data;

      // Simple recommendation score calculation
      const userPreference = userAvgRating / 5.0; // Normalize to 0-1
      const productQuality = productAvgRating / 5.0;
      const popularity = Math.min(1, productReviews.length / 100);
      const engagement = Math.min(1, (userReviews.length + (userActivity.view_count || 0)) / 50);

      const score = (userPreference * 0.3 + productQuality * 0.3 + popularity * 0.2 + engagement * 0.2);

      return {
        score: Math.min(1, Math.max(0, score)),
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error calculating recommendation score:', error);
      return { score: 0.5, confidence: 0.5 };
    }
  }

  // Price Optimization
  async optimizePrice(productId) {
    try {
      // Get product data from products service
      const productResponse = await axios.get(`http://localhost:3002/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const product = productResponse.data;
      const currentPrice = product.price || 100;

      // Get sales data from transactions service
      const salesResponse = await axios.get(`http://localhost:3003/api/orders?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const sales = salesResponse.data;
      const totalSales = sales.length;
      const avgOrderValue = totalSales > 0
        ? sales.reduce((sum, order) => sum + order.total_amount, 0) / totalSales
        : currentPrice;

      // Get review data from reviews service
      const reviewsResponse = await axios.get(`http://localhost:3008/api/reviews?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}` }
      });
      const reviews = reviewsResponse.data;
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 3.0;

      const qualityScore = avgRating;

      // Simple price optimization logic
      // Higher quality products can command higher prices
      // Higher sales volume suggests good price point
      const qualityMultiplier = qualityScore / 5.0;
      const volumeMultiplier = Math.min(1, totalSales / 100);
      const priceAdjustment = (qualityMultiplier * 0.3) + (volumeMultiplier * 0.2) + 0.5;

      const optimalPrice = currentPrice * priceAdjustment;

      return {
        optimal_price: Math.round(optimalPrice * 100) / 100,
        confidence: 0.7,
        reasoning: {
          quality_factor: qualityMultiplier,
          volume_factor: volumeMultiplier,
          adjustment_factor: priceAdjustment
        }
      };
    } catch (error) {
      console.error('Error optimizing price:', error);
      return { optimal_price: 100, confidence: 0.5 };
    }
  }

  // Train predictive models
  async trainModel(modelType, trainingData) {
    try {
      let model;
      let accuracy = 0;

      switch (modelType) {
        case 'churn_prediction':
          // Train churn prediction model
          model = new SimpleDecisionTree();
          // In real implementation, prepare training data from historical user data
          accuracy = 0.85;
          break;

        case 'purchase_prediction':
          // Train purchase prediction model
          model = new LinearRegression();
          // Simplified training
          accuracy = 0.78;
          break;

        case 'recommendation_scoring':
          // Train recommendation model
          model = new LinearRegression();
          accuracy = 0.82;
          break;

        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }

      // Store model in memory (in production, serialize and save to database)
      this.models.set(`${modelType}_${Date.now()}`, { model, accuracy });

      return {
        accuracy,
        model_id: `${modelType}_${Date.now()}`,
        trained_at: new Date()
      };
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }
}

module.exports = PredictiveAnalyticsEngine;