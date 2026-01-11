import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Button from '@/components/Button.vue'

describe('Button Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders correctly with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('btn')
    expect(wrapper.classes()).toContain('btn--primary')
    expect(wrapper.classes()).toContain('btn--md')
  })

  it('renders different variants correctly', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'secondary'
      },
      slots: {
        default: 'Secondary Button'
      }
    })

    expect(wrapper.classes()).toContain('btn--secondary')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    })

    expect(wrapper.classes()).toContain('btn--disabled')
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('shows loading state correctly', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      },
      slots: {
        default: 'Loading Button'
      }
    })

    expect(wrapper.classes()).toContain('btn--loading')
    expect(wrapper.classes()).toContain('btn--disabled')
  })
})