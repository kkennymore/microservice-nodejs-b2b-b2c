import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { VueIntersectionObserver } from 'vue-intersection-observer'
import Toaster from '@meforma/vue-toaster'
import { usePerformanceMonitoring } from '@/composables/usePerformanceMonitoring'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(VueIntersectionObserver)
app.use(Toaster)

// Initialize performance monitoring
usePerformanceMonitoring()

app.mount('#app')
