import { createRouter, createWebHistory } from 'vue-router'
import { useSEO } from '@/composables/useSEO'

// Lazy-loaded components for code splitting with webpack chunk names
const Home = () => import(/* webpackChunkName: "home" */ '@/views/Home.vue')
const Products = () => import(/* webpackChunkName: "products" */ '@/views/Products.vue')
const Product = () => import(/* webpackChunkName: "product" */ '@/views/Product.vue')
const Cart = () => import(/* webpackChunkName: "cart" */ '@/views/Cart.vue')
const Checkout = () => import(/* webpackChunkName: "checkout" */ '@/views/Checkout.vue')
const Orders = () => import(/* webpackChunkName: "orders" */ '@/views/Orders.vue')
const OrderDetails = () => import(/* webpackChunkName: "orders" */ '@/views/OrderDetails.vue')
const Messages = () => import(/* webpackChunkName: "messages" */ '@/views/Messages.vue')
const Wishlist = () => import(/* webpackChunkName: "wishlist" */ '@/views/Wishlist.vue')
const SearchResults = () => import(/* webpackChunkName: "search" */ '@/views/SearchResults.vue')
const AdminDashboard = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminDashboard.vue')
const Profile = () => import(/* webpackChunkName: "profile" */ '@/views/Profile.vue')
const Dashboard = () => import(/* webpackChunkName: "dashboard" */ '@/views/Dashboard.vue')
const Admin = () => import(/* webpackChunkName: "admin" */ '@/views/Admin.vue')
const AnalyticsDashboard = () => import(/* webpackChunkName: "analytics" */ '@/views/AnalyticsDashboard.vue')
const Login = () => import(/* webpackChunkName: "auth" */ '@/views/Login.vue')
const Register = () => import(/* webpackChunkName: "auth" */ '@/views/Register.vue')
const VerifyEmail = () => import(/* webpackChunkName: "auth" */ '@/views/VerifyEmail.vue')
const ForgotPassword = () => import(/* webpackChunkName: "auth" */ '@/views/ForgotPassword.vue')
const ResetPassword = () => import(/* webpackChunkName: "auth" */ '@/views/ResetPassword.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: 'Multivendor Marketplace - Shop Amazing Products' }
  },
  {
    path: '/products',
    name: 'Products',
    component: Products,
    meta: { title: 'Products - Multivendor Marketplace' }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Login - Multivendor Marketplace' }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: 'Register - Multivendor Marketplace' }
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail,
    meta: { title: 'Verify Email - Multivendor Marketplace' }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { title: 'Forgot Password - Multivendor Marketplace' }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { title: 'Reset Password - Multivendor Marketplace' }
  },
  {
    path: '/product/:id',
    name: 'Product',
    component: Product,
    meta: { title: 'Product Details - Multivendor Marketplace' }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: Cart,
    meta: { title: 'Shopping Cart - Multivendor Marketplace' }
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: Checkout,
    meta: { title: 'Checkout - Multivendor Marketplace' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    meta: { title: 'My Orders - Multivendor Marketplace' }
  },
  {
    path: '/orders/:id',
    name: 'OrderDetails',
    component: OrderDetails,
    meta: { title: 'Order Details - Multivendor Marketplace' }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: Messages,
    meta: { title: 'Messages - Multivendor Marketplace' }
  },
  {
    path: '/wishlist',
    name: 'Wishlist',
    component: Wishlist,
    meta: { title: 'My Wishlists - Multivendor Marketplace' }
  },
  {
    path: '/wishlist/:id',
    name: 'WishlistDetails',
    component: Wishlist,
    meta: { title: 'Wishlist Details - Multivendor Marketplace' }
  },
  {
    path: '/search',
    name: 'SearchResults',
    component: SearchResults,
    meta: { title: 'Search Results - Multivendor Marketplace' }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { title: 'Admin Dashboard - Multivendor Marketplace' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { title: 'User Profile - Multivendor Marketplace' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Seller Dashboard - Multivendor Marketplace' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { title: 'Admin Panel - Multivendor Marketplace' }
  },
  {
    path: '/analytics',
    name: 'AnalyticsDashboard',
    component: AnalyticsDashboard,
    meta: { title: 'Analytics Dashboard - Multivendor Marketplace' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Set page title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  // Add loading state for route changes
  const app = document.getElementById('app')
  if (app) {
    app.style.opacity = '0.8'
  }

  next()
})

router.afterEach((to) => {
  // Remove loading state
  const app = document.getElementById('app')
  if (app) {
    app.style.opacity = '1'
  }

  // Update SEO for the new route
  const { setSEO } = useSEO()

  // Set basic SEO for each route
  setSEO({
    title: to.meta.title as string,
    description: 'Discover amazing products from trusted sellers worldwide',
    url: window.location.href
  })

  // Analytics tracking
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: to.fullPath
    })
  }
})

export default router