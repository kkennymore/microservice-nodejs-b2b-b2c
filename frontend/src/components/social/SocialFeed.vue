<template>
  <div class="social-feed">
    <div class="feed-header">
      <h2 class="feed-title">Social Feed</h2>
      <div class="feed-controls">
        <div class="feed-tabs">
          <button
            v-for="tab in feedTabs"
            :key="tab.id"
            :class="['feed-tab', { 'feed-tab--active': activeFeedType === tab.id }]"
            @click="switchFeedType(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <button @click="showCreatePost = true" class="create-post-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Share
        </button>
      </div>
    </div>

    <!-- Create Post Modal -->
    <div v-if="showCreatePost" class="modal-overlay" @click.self="showCreatePost = false">
      <div class="modal">
        <div class="modal__header">
          <h3>Create Post</h3>
          <button @click="showCreatePost = false" class="modal-close">×</button>
        </div>
        <div class="modal__body">
          <form @submit.prevent="submitPost">
            <div class="form-group">
              <label class="form-label">Post Type</label>
              <select v-model="postForm.postType" class="form-select" required>
                <option value="product_share">Share Product</option>
                <option value="review">Review</option>
                <option value="question">Question</option>
                <option value="tip">Tip</option>
                <option value="story">Story</option>
              </select>
            </div>

            <div v-if="postForm.postType === 'product_share'" class="form-group">
              <label class="form-label">Product URL or ID</label>
              <input
                v-model="postForm.entityId"
                type="text"
                class="form-input"
                placeholder="Enter product URL or ID"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Content</label>
              <textarea
                v-model="postForm.content"
                class="form-textarea"
                placeholder="What's on your mind?"
                rows="4"
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Tags (optional)</label>
              <input
                v-model="postForm.tagsText"
                type="text"
                class="form-input"
                placeholder="Add tags separated by commas"
              />
            </div>

            <div class="form-group">
              <label class="form-checkbox">
                <input
                  v-model="postForm.isPublic"
                  type="checkbox"
                  class="form-checkbox__input"
                />
                <span class="form-checkbox__checkmark"></span>
                Make this post public
              </label>
            </div>

            <div class="modal__actions">
              <button type="button" @click="showCreatePost = false" class="btn btn--outline">
                Cancel
              </button>
              <button type="submit" class="btn btn--primary" :disabled="!postForm.content.trim()">
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Feed Content -->
    <div class="feed-content">
      <!-- Loading State -->
      <div v-if="isLoading && !socialFeed" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading feed...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && (!socialFeed || socialFeed.posts.length === 0)" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>No posts yet</h3>
        <p v-if="activeFeedType === 'following'">
          Follow some users to see their posts here
        </p>
        <p v-else>
          Check back later for trending content
        </p>
        <button @click="showCreatePost = true" class="btn btn--primary">
          Create First Post
        </button>
      </div>

      <!-- Posts -->
      <div v-else-if="socialFeed && socialFeed.posts.length > 0" class="posts-list">
        <div
          v-for="post in socialFeed.posts"
          :key="post.id"
          class="post-card"
        >
          <!-- Post Header -->
          <div class="post-header">
            <div class="post-author">
              <div class="author-avatar">
                <img
                  v-if="post.avatar"
                  :src="post.avatar"
                  :alt="post.username"
                  class="avatar-image"
                />
                <div v-else class="avatar-placeholder">
                  {{ post.username.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="author-info">
                <div class="author-name">{{ post.username }}</div>
                <div class="post-time">{{ formatPostTime(post.created_at) }}</div>
              </div>
            </div>
            <div class="post-actions">
              <button class="post-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Post Content -->
          <div class="post-content">
            <div v-if="post.title" class="post-title">{{ post.title }}</div>
            <div class="post-text">{{ post.content }}</div>

            <!-- Media -->
            <div v-if="post.media_urls && post.media_urls.length > 0" class="post-media">
              <div
                v-for="(media, index) in post.media_urls.slice(0, 4)"
                :key="index"
                class="media-item"
              >
                <img :src="media" :alt="`Media ${index + 1}`" class="media-image" />
              </div>
              <div v-if="post.media_urls.length > 4" class="media-more">
                +{{ post.media_urls.length - 4 }} more
              </div>
            </div>

            <!-- Tags -->
            <div v-if="post.tags && post.tags.length > 0" class="post-tags">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="post-tag"
              >
                #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Post Stats -->
          <div class="post-stats">
            <div class="stat-item">
              <span class="stat-count">{{ post.view_count }}</span>
              <span class="stat-label">views</span>
            </div>
            <div class="stat-item">
              <span class="stat-count">{{ post.like_count }}</span>
              <span class="stat-label">likes</span>
            </div>
            <div class="stat-item">
              <span class="stat-count">{{ post.comment_count }}</span>
              <span class="stat-label">comments</span>
            </div>
            <div class="stat-item">
              <span class="stat-count">{{ post.share_count }}</span>
              <span class="stat-label">shares</span>
            </div>
          </div>

          <!-- Post Actions -->
          <div class="post-actions-bar">
            <button
              :class="['action-btn', { 'action-btn--active': isLiked(post.id) }]"
              @click="toggleLike(post.id)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like
            </button>

            <button class="action-btn" @click="toggleComments(post.id)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Comment
            </button>

            <button class="action-btn" @click="sharePost(post)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <path d="m8.59 13.51 6.83 3.98"/>
                <path d="m15.41 6.51-6.82 3.98"/>
              </svg>
              Share
            </button>
          </div>

          <!-- Comments Section -->
          <div v-if="expandedComments[post.id]" class="comments-section">
            <div class="comments-list">
              <!-- Comments would be loaded here -->
              <div class="no-comments">No comments yet. Be the first to comment!</div>
            </div>

            <div class="comment-form">
              <input
                v-model="commentTexts[post.id]"
                type="text"
                class="comment-input"
                placeholder="Write a comment..."
                @keyup.enter="submitComment(post.id)"
              />
              <button
                class="comment-submit"
                @click="submitComment(post.id)"
                :disabled="!commentTexts[post.id]?.trim()"
              >
                Post
              </button>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMorePosts" class="load-more">
          <button @click="loadMorePosts" class="load-more-btn" :disabled="isLoading">
            {{ isLoading ? 'Loading...' : 'Load More Posts' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="clearError" class="error-message__close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSocial, type SocialPost } from '@/composables/useSocial'
import { useAuth } from '@/composables/useAuth'

const {
  socialFeed,
  isLoading,
  error,
  getSocialFeed,
  createPost,
  interactWithPost,
  clearError
} = useSocial()

const { user } = useAuth()

// Local state
const activeFeedType = ref<'following' | 'trending' | 'discovery'>('following')
const showCreatePost = ref(false)
const currentPage = ref(1)
const expandedComments = ref<Record<string, boolean>>({})
const commentTexts = ref<Record<string, string>>({})
const likedPosts = ref<Set<string>>(new Set())

const feedTabs = [
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'discovery', label: 'Discover' }
]

const postForm = ref({
  postType: 'product_share' as 'product_share' | 'review' | 'question' | 'tip' | 'story',
  entityId: '',
  content: '',
  tagsText: '',
  isPublic: true
})

// Computed
const hasMorePosts = computed(() => {
  return socialFeed.value && currentPage.value < socialFeed.value.pagination.totalPages
})

// Methods
const switchFeedType = async (type: 'following' | 'trending' | 'discovery') => {
  activeFeedType.value = type
  currentPage.value = 1
  await loadFeed()
}

const loadFeed = async () => {
  try {
    await getSocialFeed({
      type: activeFeedType.value,
      page: currentPage.value,
      limit: 20
    })
  } catch (err) {
    console.error('Failed to load feed:', err)
  }
}

const loadMorePosts = async () => {
  currentPage.value++
  await loadFeed()
}

const submitPost = async () => {
  if (!postForm.value.content.trim()) return

  try {
    const tags = postForm.value.tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    await createPost({
      postType: postForm.value.postType,
      entityId: postForm.value.entityId || undefined,
      content: postForm.value.content,
      tags,
      isPublic: postForm.value.isPublic
    })

    // Reset form
    postForm.value = {
      postType: 'product_share',
      entityId: '',
      content: '',
      tagsText: '',
      isPublic: true
    }

    showCreatePost.value = false

    // Reload feed
    await loadFeed()
  } catch (err) {
    console.error('Failed to create post:', err)
  }
}

const toggleLike = async (postId: string) => {
  try {
    const isCurrentlyLiked = likedPosts.value.has(postId)

    await interactWithPost(postId, {
      interactionType: isCurrentlyLiked ? 'like' : 'like' // API handles toggle
    })

    if (isCurrentlyLiked) {
      likedPosts.value.delete(postId)
    } else {
      likedPosts.value.add(postId)
    }

    // Update local counts
    if (socialFeed.value) {
      const post = socialFeed.value.posts.find(p => p.id === postId)
      if (post) {
        post.like_count += isCurrentlyLiked ? -1 : 1
      }
    }
  } catch (err) {
    console.error('Failed to toggle like:', err)
  }
}

const isLiked = (postId: string) => {
  return likedPosts.value.has(postId)
}

const toggleComments = (postId: string) => {
  expandedComments.value[postId] = !expandedComments.value[postId]
}

const submitComment = async (postId: string) => {
  const commentText = commentTexts.value[postId]?.trim()
  if (!commentText) return

  try {
    await interactWithPost(postId, {
      interactionType: 'comment',
      content: commentText
    })

    commentTexts.value[postId] = ''

    // Update local counts
    if (socialFeed.value) {
      const post = socialFeed.value.posts.find(p => p.id === postId)
      if (post) {
        post.comment_count += 1
      }
    }
  } catch (err) {
    console.error('Failed to submit comment:', err)
  }
}

const sharePost = (post: SocialPost) => {
  // Implement post sharing
  console.log('Share post:', post)
}

const formatPostTime = (timestamp: string) => {
  const now = new Date()
  const postTime = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`

  return postTime.toLocaleDateString()
}

// Initialize
onMounted(async () => {
  await loadFeed()
})
</script>

<style scoped>
.social-feed {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.feed-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.feed-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.feed-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.25rem;
}

.feed-tab {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.feed-tab:hover {
  color: var(--text-primary);
}

.feed-tab--active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.create-post-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-post-btn:hover {
  background: var(--primary-dark);
}

.feed-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.post-time {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.post-actions {
  position: relative;
}

.post-action-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.post-action-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.post-content {
  padding: 0 1.5rem;
  margin-bottom: 1rem;
}

.post-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.post-text {
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.post-media {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.media-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-more {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.post-tag {
  color: var(--primary-color);
  font-size: 0.9rem;
  font-weight: 500;
}

.post-stats {
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-count {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.post-actions-bar {
  display: flex;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid var(--border-color-light);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 6px;
}

.action-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.action-btn--active {
  color: var(--error-color);
}

.action-btn--active svg {
  fill: var(--error-color);
  stroke: var(--error-color);
}

.comments-section {
  border-top: 1px solid var(--border-color-light);
  padding: 1rem 1.5rem;
}

.comments-list {
  margin-bottom: 1rem;
}

.no-comments {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

.comment-form {
  display: flex;
  gap: 0.5rem;
}

.comment-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
}

.comment-input:focus {
  border-color: var(--primary-color);
}

.comment-submit {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.comment-submit:hover:not(:disabled) {
  background: var(--primary-dark);
}

.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-more {
  text-align: center;
  padding: 2rem 0;
}

.load-more-btn {
  padding: 0.75rem 2rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal__body {
  padding: 2rem;
}

.modal__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.form-checkbox__input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.form-checkbox__checkmark {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn--primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.btn--outline {
  background: transparent;
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn--outline:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--error-color);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.error-message__close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-message__close:hover {
  opacity: 1;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .social-feed {
    padding: 1rem;
  }

  .feed-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .feed-controls {
    justify-content: center;
  }

  .feed-tabs {
    order: 2;
  }

  .create-post-btn {
    order: 1;
  }

  .post-header {
    padding: 1rem;
  }

  .post-content {
    padding: 0 1rem;
  }

  .post-stats {
    padding: 0.75rem 1rem;
  }

  .post-actions-bar {
    padding: 0.5rem 1rem;
  }

  .comments-section {
    padding: 1rem;
  }

  .modal {
    width: 95%;
    margin: 1rem;
  }

  .modal__body {
    padding: 1.5rem;
  }
}
</style>