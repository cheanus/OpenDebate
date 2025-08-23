import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UiButton from '@/components/ui/UiButton.vue'

describe('UiButton', () => {
  it('renders properly', () => {
    const wrapper = mount(UiButton, { 
      slots: { default: 'Test Button' } 
    })
    expect(wrapper.text()).toContain('Test Button')
  })

  it('emits click event', async () => {
    const wrapper = mount(UiButton, {
      slots: { default: 'Click me' }
    })
    
    await wrapper.find('.ui-button').trigger('click')
    expect(wrapper.emitted().click).toHaveLength(1)
  })

  it('handles disabled state', () => {
    const wrapper = mount(UiButton, {
      props: { disabled: true },
      slots: { default: 'Disabled Button' }
    })
    
    expect(wrapper.find('.ui-button').attributes('disabled')).toBeDefined()
  })

  it('applies correct variant classes', () => {
    const wrapper = mount(UiButton, {
      props: { variant: 'primary' },
      slots: { default: 'Primary Button' }
    })
    
    expect(wrapper.find('.ui-button').classes()).toContain('ui-button--primary')
  })

  it('applies correct size classes', () => {
    const wrapper = mount(UiButton, {
      props: { size: 'small' },
      slots: { default: 'Small Button' }
    })
    
    expect(wrapper.find('.ui-button').classes()).toContain('ui-button--small')
  })

  it('shows loading state', () => {
    const wrapper = mount(UiButton, {
      props: { loading: true },
      slots: { default: 'Loading Button' }
    })
    
    expect(wrapper.find('.button-spinner').exists()).toBe(true)
    expect(wrapper.find('.ui-button').attributes('disabled')).toBeDefined()
  })
})
