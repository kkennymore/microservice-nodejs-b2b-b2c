"""
Content-Based Filtering - Product feature similarity algorithms
===============================================================

Implements content-based filtering using product features and descriptions.
"""

import logging
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from typing import List, Dict, Any, Optional
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import joblib

logger = logging.getLogger(__name__)


class ContentBasedFiltering:
    """Content-based filtering recommendation engine"""

    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2
        )
        self.feature_scaler = StandardScaler()
        self.category_encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
        self.product_features = None
        self.product_ids = None
        self.similarity_matrix = None
        self.is_trained = False

        # Text preprocessing
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))

    async def train(self, products_df: pd.DataFrame) -> None:
        """Train content-based filtering model"""
        try:
            logger.info("🔄 Training content-based filtering model...")

            if products_df.empty:
                logger.warning("No product data for content-based filtering")
                return

            # Extract and process features
            await self._extract_product_features(products_df)

            # Calculate similarity matrix
            await self._calculate_similarity_matrix()

            self.is_trained = True
            logger.info("✅ Content-based filtering model trained")

        except Exception as e:
            logger.error(f"❌ Failed to train content-based filtering: {e}")
            raise

    async def _extract_product_features(self, products_df: pd.DataFrame) -> None:
        """Extract features from product data"""
        try:
            self.product_ids = products_df['id'].tolist()

            # Text features from name and description
            text_features = self._process_text_features(products_df)

            # Numerical features
            numerical_features = self._process_numerical_features(products_df)

            # Categorical features (category)
            categorical_features = self._process_categorical_features(products_df)

            # Combine all features
            self.product_features = np.concatenate([
                text_features,
                numerical_features,
                categorical_features
            ], axis=1)

            logger.info(f"📊 Extracted features for {len(self.product_ids)} products: {self.product_features.shape}")

        except Exception as e:
            logger.error(f"Failed to extract product features: {e}")
            raise

    def _process_text_features(self, products_df: pd.DataFrame) -> np.ndarray:
        """Process text features from product name and description"""
        # Combine name and description
        text_data = products_df['name'].fillna('') + ' ' + products_df['description'].fillna('')

        # Preprocess text
        processed_text = text_data.apply(self._preprocess_text)

        # Convert to TF-IDF vectors
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(processed_text)

        return tfidf_matrix.toarray()

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for feature extraction"""
        try:
            # Convert to lowercase
            text = text.lower()

            # Remove special characters and numbers
            text = re.sub(r'[^a-zA-Z\s]', '', text)

            # Tokenize and remove stop words
            words = text.split()
            words = [word for word in words if word not in self.stop_words]

            # Lemmatize
            words = [self.lemmatizer.lemmatize(word) for word in words]

            return ' '.join(words)

        except Exception as e:
            logger.warning(f"Text preprocessing error: {e}")
            return text

    def _process_numerical_features(self, products_df: pd.DataFrame) -> np.ndarray:
        """Process numerical features"""
        numerical_cols = ['price']

        # Add derived features
        products_df_copy = products_df.copy()

        # Price categories (log-transformed)
        products_df_copy['price_log'] = np.log1p(products_df_copy['price'])

        # Length features
        products_df_copy['name_length'] = products_df_copy['name'].str.len()
        products_df_copy['desc_length'] = products_df_copy['description'].fillna('').str.len()

        numerical_features = ['price_log', 'name_length', 'desc_length']

        # Fill missing values and scale
        features_df = products_df_copy[numerical_features].fillna(0)
        scaled_features = self.feature_scaler.fit_transform(features_df)

        return scaled_features

    def _process_categorical_features(self, products_df: pd.DataFrame) -> np.ndarray:
        """Process categorical features"""
        # Category encoding
        category_features = self.category_encoder.fit_transform(
            products_df[['category_id']].fillna(0)
        )

        return category_features

    async def _calculate_similarity_matrix(self) -> None:
        """Calculate product similarity matrix"""
        try:
            if self.product_features is None or len(self.product_features) == 0:
                logger.warning("No product features to calculate similarity")
                return

            # Normalize features
            features_norm = self.product_features / (np.linalg.norm(self.product_features, axis=1, keepdims=True) + 1e-8)

            # Calculate cosine similarity
            self.similarity_matrix = cosine_similarity(features_norm)

            logger.info(f"✅ Similarity matrix calculated: {self.similarity_matrix.shape}")

        except Exception as e:
            logger.error(f"Failed to calculate similarity matrix: {e}")
            self.similarity_matrix = None

    async def get_similar_products(self, product_id: int, n_similar: int = 10,
                                 min_similarity: float = 0.1) -> List[Dict[str, Any]]:
        """Get products similar to the given product"""
        if not self.is_trained or self.similarity_matrix is None:
            logger.warning("Content-based filtering model not trained")
            return []

        try:
            # Find product index
            if product_id not in self.product_ids:
                logger.warning(f"Product {product_id} not found in training data")
                return []

            product_idx = self.product_ids.index(product_id)

            # Get similarity scores
            similarities = self.similarity_matrix[product_idx]

            # Get top similar products (excluding itself)
            similar_indices = np.argsort(similarities)[::-1][1:n_similar+1]

            similar_products = []
            for idx in similar_indices:
                similarity_score = float(similarities[idx])

                # Filter by minimum similarity threshold
                if similarity_score >= min_similarity:
                    similar_product_id = self.product_ids[idx]
                    similar_products.append({
                        'product_id': similar_product_id,
                        'similarity': similarity_score,
                        'method': 'content_based'
                    })

            return similar_products[:n_similar]

        except Exception as e:
            logger.error(f"Failed to get similar products for {product_id}: {e}")
            return []

    async def recommend_for_user(self, user_profile: Dict[str, Any], n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """Recommend products based on user profile/preferences"""
        try:
            # This is a simplified version - in practice, you'd build a user profile vector
            # and find products most similar to that profile

            # For now, return products similar to user's preferred categories
            preferred_categories = user_profile.get('interests', [])

            if not preferred_categories:
                return []

            # Get products from preferred categories and score by popularity/similarity
            # This would be implemented with actual user preference modeling
            recommendations = []

            # Placeholder implementation - in practice, this would use user preference vectors
            logger.info(f"Content-based recommendation for user profile: {user_profile.get('user_id', 'unknown')}")

            return recommendations[:n_recommendations]

        except Exception as e:
            logger.error(f"Failed to recommend for user profile: {e}")
            return []

    def get_product_features(self, product_id: int) -> Optional[np.ndarray]:
        """Get feature vector for a product"""
        if not self.is_trained or product_id not in self.product_ids:
            return None

        product_idx = self.product_ids.index(product_id)
        return self.product_features[product_idx]

    def get_feature_importance(self) -> Dict[str, Any]:
        """Get feature importance information"""
        if not self.is_trained:
            return {}

        # Get top TF-IDF features
        feature_names = self.tfidf_vectorizer.get_feature_names_out()
        tfidf_scores = np.asarray(self.tfidf_vectorizer.idf_)

        # Sort by importance (lower IDF = more important)
        top_features = np.argsort(tfidf_scores)[:20]
        important_features = [feature_names[i] for i in top_features]

        return {
            'text_features': important_features,
            'total_features': len(feature_names),
            'numerical_features': ['price_log', 'name_length', 'desc_length'],
            'categorical_features': ['category']
        }

    def save_model(self, filepath: str) -> bool:
        """Save trained model to disk"""
        try:
            model_data = {
                'tfidf_vectorizer': self.tfidf_vectorizer,
                'feature_scaler': self.feature_scaler,
                'category_encoder': self.category_encoder,
                'product_features': self.product_features,
                'product_ids': self.product_ids,
                'similarity_matrix': self.similarity_matrix,
                'is_trained': self.is_trained
            }

            joblib.dump(model_data, filepath)
            logger.info(f"✅ Content-based filtering model saved to {filepath}")
            return True

        except Exception as e:
            logger.error(f"Failed to save content-based filtering model: {e}")
            return False

    def load_model(self, filepath: str) -> bool:
        """Load trained model from disk"""
        try:
            model_data = joblib.load(filepath)

            self.tfidf_vectorizer = model_data['tfidf_vectorizer']
            self.feature_scaler = model_data['feature_scaler']
            self.category_encoder = model_data['category_encoder']
            self.product_features = model_data['product_features']
            self.product_ids = model_data['product_ids']
            self.similarity_matrix = model_data['similarity_matrix']
            self.is_trained = model_data['is_trained']

            logger.info(f"✅ Content-based filtering model loaded from {filepath}")
            return True

        except Exception as e:
            logger.error(f"Failed to load content-based filtering model: {e}")
            return False

    def get_model_stats(self) -> Dict[str, Any]:
        """Get model statistics and performance metrics"""
        if not self.is_trained:
            return {'status': 'not_trained'}

        stats = {
            'status': 'trained',
            'products': len(self.product_ids) if self.product_ids else 0,
            'features_shape': self.product_features.shape if self.product_features is not None else None,
            'similarity_matrix_shape': self.similarity_matrix.shape if self.similarity_matrix is not None else None,
            'vocabulary_size': len(self.tfidf_vectorizer.vocabulary_) if hasattr(self.tfidf_vectorizer, 'vocabulary_') else 0
        }

        return stats