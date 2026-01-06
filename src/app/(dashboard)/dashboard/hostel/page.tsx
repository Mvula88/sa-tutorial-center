'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Plus,
  Building,
  DoorOpen,
  Users,
  Eye,
  Pencil,
  Trash2,
  Home,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Block {
  id: string
  name: string
  description: string | null
  gender_restriction: string | null
  is_active: boolean
  _count?: {
    rooms: number
    occupants: number
    capacity: number
  }
}

interface HostelStats {
  totalBlocks: number
  totalRooms: number
  totalCapacity: number
  currentOccupancy: number
  availableSpaces: number
}

export default function HostelPage() {
  const { user, canAccessModule, isCenterAdmin } = useAuthStore()
  const canEdit = isCenterAdmin() // Only center admin can manage blocks/rooms
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<HostelStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.center_id && canAccessModule('hostel')) {
      fetchBlocks()
      fetchStats()
    }
  }, [user?.center_id])

  async function fetchBlocks() {
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('hostel_blocks')
        .select('*')
        .eq('center_id', user.center_id)
        .order('name')

      if (error) throw error

      // Fetch room counts for each block
      const blocksWithCounts = await Promise.all(
        ((data || []) as Block[]).map(async (block) => {
          const { data: rooms } = await supabase
            .from('hostel_rooms')
            .select('capacity, current_occupancy')
            .eq('block_id', block.id)
            .eq('is_active', true)

          const roomData = (rooms || []) as { capacity: number; current_occupancy: number }[]
          const totalCapacity = roomData.reduce((sum, r) => sum + r.capacity, 0)
          const currentOccupancy = roomData.reduce((sum, r) => sum + r.current_occupancy, 0)

          return {
            ...block,
            _count: {
              rooms: roomData.length,
              capacity: totalCapacity,
              occupants: currentOccupancy,
            },
          }
        })
      )

      setBlocks(blocksWithCounts)
    } catch (error) {
      console.error('Error fetching blocks:', error)
      toast.error('Failed to fetch hostel blocks')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchStats() {
    if (!user?.center_id) return

    const supabase = createClient()

    try {
      const { data: blocks } = await supabase
        .from('hostel_blocks')
        .select('id')
        .eq('center_id', user.center_id)
        .eq('is_active', true)

      const { data: rooms } = await supabase
        .from('hostel_rooms')
        .select('capacity, current_occupancy')
        .eq('center_id', user.center_id)
        .eq('is_active', true)

      const roomData = (rooms || []) as { capacity: number; current_occupancy: number }[]
      const totalCapacity = roomData.reduce((sum, r) => sum + r.capacity, 0)
      const currentOccupancy = roomData.reduce((sum, r) => sum + r.current_occupancy, 0)

      setStats({
        totalBlocks: blocks?.length || 0,
        totalRooms: roomData.length,
        totalCapacity,
        currentOccupancy,
        availableSpaces: totalCapacity - currentOccupancy,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function handleDelete() {
    if (!blockToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('hostel_blocks')
        .delete()
        .eq('id', blockToDelete.id)

      if (error) throw error

      toast.success('Block deleted successfully')
      setDeleteModalOpen(false)
      setBlockToDelete(null)
      fetchBlocks()
      fetchStats()
    } catch (error) {
      console.error('Error deleting block:', error)
      toast.error('Failed to delete block. Make sure all rooms are removed first.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!canAccessModule('hostel')) {
    return (
      <div className="p-4 md:p-8 text-center">
        <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Hostel Module Not Enabled</h2>
        <p className="text-gray-500 text-sm md:text-base">Contact your administrator to enable the hostel management module.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Hostel Management</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Manage hostel blocks, rooms, and allocations</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link href="/dashboard/hostel/allocations" className="flex-1 sm:flex-none">
              <Button variant="outline" leftIcon={<UserPlus className="w-4 h-4" />} className="w-full sm:w-auto">
                Allocations
              </Button>
            </Link>
            <Link href="/dashboard/hostel/rooms" className="flex-1 sm:flex-none">
              <Button variant="outline" leftIcon={<DoorOpen className="w-4 h-4" />} className="w-full sm:w-auto">
                All Rooms
              </Button>
            </Link>
            {canEdit && (
              <Link href="/dashboard/hostel/blocks/new" className="w-full sm:w-auto">
                <Button leftIcon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
                  Add Block
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalBlocks || 0}</p>
              <p className="text-sm text-gray-500">Blocks</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <DoorOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalRooms || 0}</p>
              <p className="text-sm text-gray-500">Rooms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Home className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCapacity || 0}</p>
              <p className="text-sm text-gray-500">Capacity</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.currentOccupancy || 0}</p>
              <p className="text-sm text-gray-500">Occupied</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100">
              <DoorOpen className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.availableSpaces || 0}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blocks Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hostel Blocks</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hostel blocks yet</h3>
          <p className="text-gray-500 mb-4">{canEdit ? 'Get started by adding your first hostel block' : 'No hostel blocks available yet'}</p>
          {canEdit && (
            <Link href="/dashboard/hostel/blocks/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Add Block
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocks.map((block) => {
            const occupancyPercent = block._count?.capacity
              ? Math.round((block._count.occupants / block._count.capacity) * 100)
              : 0

            return (
              <div
                key={block.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{block.name}</h3>
                      {block.gender_restriction && (
                        <span className="text-sm text-gray-500 capitalize">
                          {block.gender_restriction} only
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    block.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {block.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {block.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{block.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{block._count?.rooms || 0}</p>
                    <p className="text-xs text-gray-500">Rooms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{block._count?.occupants || 0}</p>
                    <p className="text-xs text-gray-500">Occupied</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{block._count?.capacity || 0}</p>
                    <p className="text-xs text-gray-500">Capacity</p>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Occupancy</span>
                    <span>{occupancyPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPercent >= 90 ? 'bg-red-500' :
                        occupancyPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${occupancyPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Link href={`/dashboard/hostel/blocks/${block.id}`}>
                    <Button variant="outline" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                      View
                    </Button>
                  </Link>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Link href={`/dashboard/hostel/blocks/${block.id}/edit`}>
                        <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          setBlockToDelete(block)
                          setDeleteModalOpen(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setBlockToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Block"
        message={`Are you sure you want to delete "${blockToDelete?.name}"? All rooms in this block will also be deleted. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
