import { describe, it, expect, beforeEach } from 'vitest'
import { useDebates } from '@/composables/useDebates'
import { debateService } from '@/services/debate'

// Mock the service
vi.mock('@/services/debate', () => ({
  debateService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}))

describe('useDebates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { debates, loading, error } = useDebates()
    
    expect(debates.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('loads debates successfully', async () => {
    const mockDebates = [
      { id: 1, title: 'Test Debate 1', description: 'Description 1' },
      { id: 2, title: 'Test Debate 2', description: 'Description 2' }
    ]
    
    debateService.getAll.mockResolvedValue(mockDebates)
    
    const { debates, loading, loadDebates } = useDebates()
    
    await loadDebates()
    
    expect(loading.value).toBe(false)
    expect(debates.value).toEqual(mockDebates)
    expect(debateService.getAll).toHaveBeenCalledOnce()
  })

  it('handles loading error', async () => {
    const errorMessage = 'Failed to load debates'
    debateService.getAll.mockRejectedValue(new Error(errorMessage))
    
    const { debates, loading, error, loadDebates } = useDebates()
    
    await loadDebates()
    
    expect(loading.value).toBe(false)
    expect(debates.value).toEqual([])
    expect(error.value).toContain(errorMessage)
  })

  it('creates new debate successfully', async () => {
    const newDebate = { title: 'New Debate', description: 'New Description' }
    const createdDebate = { id: 3, ...newDebate }
    
    debateService.create.mockResolvedValue(createdDebate)
    
    const { debates, createDebate } = useDebates()
    
    const result = await createDebate(newDebate)
    
    expect(result).toEqual(createdDebate)
    expect(debates.value).toContain(createdDebate)
    expect(debateService.create).toHaveBeenCalledWith(newDebate)
  })

  it('deletes debate successfully', async () => {
    const existingDebates = [
      { id: 1, title: 'Debate 1', description: 'Desc 1' },
      { id: 2, title: 'Debate 2', description: 'Desc 2' }
    ]
    
    debateService.delete.mockResolvedValue(true)
    
    const { debates, deleteDebate } = useDebates()
    debates.value = [...existingDebates]
    
    await deleteDebate(1)
    
    expect(debates.value).toHaveLength(1)
    expect(debates.value.find(d => d.id === 1)).toBeUndefined()
    expect(debateService.delete).toHaveBeenCalledWith(1)
  })
})
