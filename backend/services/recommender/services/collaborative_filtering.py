"""
Collaborative Filtering - User-based and Item-based CF algorithms
================================================================

Implements various collaborative filtering techniques for recommendation.
"""

import logging
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse.linalg import svds
import joblib
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class CollaborativeFiltering:
    """Collaborative filtering recommendation engine"""

    def __init__(self):
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None
        self.user_factors = None
        self.item_factors = None
        self.user_id_to_index = {}
        self.item_id_to_index = {}
        self.index_to_user_id = {}
        self.index_to_item_id = {}
        self.is_trained = False

    async def train(self, interactions_df: pd.DataFrame, users_df: pd.DataFrame = None,
                   products_df: pd.DataFrame = None) -> None:
        """Train collaborative filtering models"""
        try:
            logger.info("🔄 Training collaborative filtering models...")

            if interactions_df.empty:
                logger.warning("No interaction data for collaborative filtering")
                return

            # Create user-item interaction matrix
            self._create_user_item_matrix(interactions_df)

            if self.user_item_matrix is not None and self.user_item_matrix.size > 0:
                # Train matrix factorization (SVD)
                await self._train_matrix_factorization()

                # Calculate similarity matrices (sample for performance)
                if self.user_item_matrix.shape[0] <= 5000:  # Limit for memory
                    await self._calculate_similarities()

                self.is_trained = True
                logger.info("✅ Collaborative filtering models trained")
            else:
                logger.warning("Insufficient data for collaborative filtering")

        except Exception as e:
            logger.error(f"❌ Failed to train collaborative filtering: {e}")
            raise

    def _create_user_item_matrix(self, interactions_df: pd.DataFrame) -> None:
        """Create user-item interaction matrix"""
        try:
            # Aggregate interactions by user and product
            matrix_data = interactions_df.groupby(['user_id', 'product_id']).agg({
                'weight': 'sum',
                'created_at': 'max'
            }).reset_index()

            # Create pivot table
            self.user_item_matrix = matrix_data.pivot(
                index='user_id',
                columns='product_id',
                values='weight'
            ).fillna(0)

            # Create ID mappings
            self.user_id_to_index = {user_id: idx for idx, user_id in enumerate(self.user_item_matrix.index)}
            self.item_id_to_index = {item_id: idx for idx, item_id in enumerate(self.user_item_matrix.columns)}
            self.index_to_user_id = {idx: user_id for user_id, idx in self.user_id_to_index.items()}
            self.index_to_item_id = {idx: item_id for item_id, idx in self.item_id_to_index.items()}

            logger.info(f"📊 Created user-item matrix: {self.user_item_matrix.shape[0]} users x {self.user_item_matrix.shape[1]} items")

        except Exception as e:
            logger.error(f"Failed to create user-item matrix: {e}")
            self.user_item_matrix = None

    async def _train_matrix_factorization(self) -> None:
        """Train SVD-based matrix factorization"""
        try:
            # Normalize the matrix
            matrix_norm = self.user_item_matrix.values
            matrix_mean = np.mean(matrix_norm, axis=1).reshape(-1, 1)
            matrix_norm = matrix_norm - matrix_mean

            # Perform SVD
            k = min(50, min(matrix_norm.shape) - 1)  # Number of latent factors
            U, sigma, Vt = svds(matrix_norm, k=k)

            # Convert sigma to diagonal matrix
            sigma = np.diag(sigma)

            # Reconstruct matrices
            self.user_factors = np.dot(U, sigma)
            self.item_factors = Vt.T

            logger.info(f"✅ Matrix factorization completed with {k} latent factors")

        except Exception as e:
            logger.error(f"Failed to train matrix factorization: {e}")
            self.user_factors = None
            self.item_factors = None

    async def _calculate_similarities(self) -> None:
        """Calculate user-user and item-item similarity matrices"""
        try:
            # Normalize the matrix for better similarity
            matrix_norm = self.user_item_matrix.values
            matrix_norm = matrix_norm / (np.linalg.norm(matrix_norm, axis=1, keepdims=True) + 1e-8)

            # User-user similarity (cosine)
            self.user_similarity_matrix = cosine_similarity(matrix_norm)

            # Item-item similarity (cosine)
            item_matrix = matrix_norm.T
            item_matrix = item_matrix / (np.linalg.norm(item_matrix, axis=1, keepdims=True) + 1e-8)
            self.item_similarity_matrix = cosine_similarity(item_matrix)

            logger.info("✅ Similarity matrices calculated")

        except Exception as e:
            logger.error(f"Failed to calculate similarities: {e}")
            self.user_similarity_matrix = None
            self.item_similarity_matrix = None

    async def recommend(self, user_id: int, n_recommendations: int = 10,
                       exclude_interacted: bool = True) -> List[Dict[str, Any]]:
        """Generate recommendations for a user using collaborative filtering"""
        if not self.is_trained or self.user_item_matrix is None:
            logger.warning("Collaborative filtering model not trained")
            return []

        try:
            if user_id not in self.user_id_to_index:
                # Cold start user - return popular items
                return await self._get_popular_recommendations(n_recommendations)

            user_idx = self.user_id_to_index[user_id]

            # Get recommendations using different methods
            svd_recs = await self._get_svd_recommendations(user_idx, n_recommendations)
            neighbor_recs = await self._get_neighbor_recommendations(user_idx, n_recommendations)

            # Combine and deduplicate
            all_recommendations = svd_recs + neighbor_recs
            seen_items = set()
            unique_recs = []

            for rec in all_recommendations:
                if rec['product_id'] not in seen_items:
                    unique_recs.append(rec)
                    seen_items.add(rec['product_id'])
                    if len(unique_recs) >= n_recommendations:
                        break

            # Filter out already interacted items if requested
            if exclude_interacted:
                interacted_items = set(self.user_item_matrix.columns[self.user_item_matrix.iloc[user_idx] > 0])
                unique_recs = [rec for rec in unique_recs if rec['product_id'] not in interacted_items]

            return unique_recs[:n_recommendations]

        except Exception as e:
            logger.error(f"Failed to generate collaborative recommendations for user {user_id}: {e}")
            return []

    async def _get_svd_recommendations(self, user_idx: int, n_recommendations: int) -> List[Dict[str, Any]]:
        """Get recommendations using SVD matrix factorization"""
        if self.user_factors is None or self.item_factors is None:
            return []

        try:
            # Predict user ratings for all items
            user_ratings = np.dot(self.user_factors[user_idx], self.item_factors.T)

            # Get top N recommendations
            top_indices = np.argsort(user_ratings)[::-1][:n_recommendations]

            recommendations = []
            for idx in top_indices:
                item_id = self.index_to_item_id[idx]
                score = float(user_ratings[idx])
                recommendations.append({
                    'product_id': item_id,
                    'score': score,
                    'method': 'svd'
                })

            return recommendations

        except Exception as e:
            logger.error(f"Failed to get SVD recommendations: {e}")
            return []

    async def _get_neighbor_recommendations(self, user_idx: int, n_recommendations: int) -> List[Dict[str, Any]]:
        """Get recommendations using user-based collaborative filtering"""
        if self.user_similarity_matrix is None:
            return []

        try:
            # Find similar users
            user_similarities = self.user_similarity_matrix[user_idx]
            similar_user_indices = np.argsort(user_similarities)[::-1][1:11]  # Top 10 similar users

            # Get items rated highly by similar users
            candidate_items = {}
            user_ratings = self.user_item_matrix.iloc[user_idx]

            for sim_user_idx in similar_user_indices:
                similarity = user_similarities[sim_user_idx]
                sim_user_ratings = self.user_item_matrix.iloc[sim_user_idx]

                # Find items the similar user liked that the target user hasn't rated
                for item_idx, rating in sim_user_ratings.items():
                    if rating > 0 and user_ratings[item_idx] == 0:
                        if item_idx not in candidate_items:
                            candidate_items[item_idx] = 0
                        candidate_items[item_idx] += similarity * rating

            # Sort by predicted rating
            sorted_items = sorted(candidate_items.items(), key=lambda x: x[1], reverse=True)

            recommendations = []
            for item_idx, score in sorted_items[:n_recommendations]:
                item_id = self.index_to_item_id[item_idx]
                recommendations.append({
                    'product_id': item_id,
                    'score': float(score),
                    'method': 'user_based'
                })

            return recommendations

        except Exception as e:
            logger.error(f"Failed to get neighbor recommendations: {e}")
            return []

    async def _get_popular_recommendations(self, n_recommendations: int) -> List[Dict[str, Any]]:
        """Get popular recommendations for cold start users"""
        try:
            # Calculate item popularity
            item_popularity = self.user_item_matrix.sum(axis=0)
            top_items = item_popularity.nlargest(n_recommendations)

            recommendations = []
            for item_id, score in top_items.items():
                recommendations.append({
                    'product_id': item_id,
                    'score': float(score),
                    'method': 'popular'
                })

            return recommendations

        except Exception as e:
            logger.error(f"Failed to get popular recommendations: {e}")
            return []

    async def get_similar_products(self, product_id: int, n_similar: int = 10) -> List[Dict[str, Any]]:
        """Get products similar to the given product"""
        if not self.is_trained or self.item_similarity_matrix is None:
            return []

        try:
            if product_id not in self.item_id_to_index:
                return []

            item_idx = self.item_id_to_index[product_id]
            item_similarities = self.item_similarity_matrix[item_idx]

            # Get most similar items (excluding itself)
            similar_indices = np.argsort(item_similarities)[::-1][1:n_similar+1]

            similar_products = []
            for idx in similar_indices:
                sim_product_id = self.index_to_item_id[idx]
                similarity_score = float(item_similarities[idx])
                similar_products.append({
                    'product_id': sim_product_id,
                    'similarity': similarity_score,
                    'method': 'item_based'
                })

            return similar_products

        except Exception as e:
            logger.error(f"Failed to get similar products for {product_id}: {e}")
            return []

    def save_model(self, filepath: str) -> bool:
        """Save trained model to disk"""
        try:
            model_data = {
                'user_item_matrix': self.user_item_matrix,
                'user_similarity_matrix': self.user_similarity_matrix,
                'item_similarity_matrix': self.item_similarity_matrix,
                'user_factors': self.user_factors,
                'item_factors': self.item_factors,
                'user_id_to_index': self.user_id_to_index,
                'item_id_to_index': self.item_id_to_index,
                'index_to_user_id': self.index_to_user_id,
                'index_to_item_id': self.index_to_item_id,
                'is_trained': self.is_trained
            }

            joblib.dump(model_data, filepath)
            logger.info(f"✅ Collaborative filtering model saved to {filepath}")
            return True

        except Exception as e:
            logger.error(f"Failed to save collaborative filtering model: {e}")
            return False

    def load_model(self, filepath: str) -> bool:
        """Load trained model from disk"""
        try:
            model_data = joblib.load(filepath)

            self.user_item_matrix = model_data['user_item_matrix']
            self.user_similarity_matrix = model_data['user_similarity_matrix']
            self.item_similarity_matrix = model_data['item_similarity_matrix']
            self.user_factors = model_data['user_factors']
            self.item_factors = model_data['item_factors']
            self.user_id_to_index = model_data['user_id_to_index']
            self.item_id_to_index = model_data['item_id_to_index']
            self.index_to_user_id = model_data['index_to_user_id']
            self.index_to_item_id = model_data['index_to_item_id']
            self.is_trained = model_data['is_trained']

            logger.info(f"✅ Collaborative filtering model loaded from {filepath}")
            return True

        except Exception as e:
            logger.error(f"Failed to load collaborative filtering model: {e}")
            return False

    def get_model_stats(self) -> Dict[str, Any]:
        """Get model statistics and performance metrics"""
        if not self.is_trained:
            return {'status': 'not_trained'}

        stats = {
            'status': 'trained',
            'users': len(self.user_id_to_index),
            'items': len(self.item_id_to_index),
            'interactions': int(self.user_item_matrix.sum().sum()) if self.user_item_matrix is not None else 0,
            'sparsity': 1 - (self.user_item_matrix.sum().sum() / (self.user_item_matrix.shape[0] * self.user_item_matrix.shape[1])) if self.user_item_matrix is not None else 1,
            'latent_factors': self.user_factors.shape[1] if self.user_factors is not None else 0
        }

        return stats