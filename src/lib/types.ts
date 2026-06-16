export type Role = 'member' | 'manager' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  branch_id?: string
  active: boolean
}

export interface Branch {
  id: string
  name: string
}

export interface List {
  id: string
  branch_id: string
  type: 'branch' | 'arborist'
  arborist_user_id?: string
  name: string
  color?: string
  archived: boolean
}

export interface Item {
  id: string
  list_id: string
  title: string
  notes?: any
  sort_order: number
  status: 'open' | 'completed'
  due_date?: string
  assignee_id?: string
  pinned: boolean
  source: 'manual' | 'hubspot' | 'acorn'
  created_by?: string
  completed_by?: string
  created_at: string
  updated_at: string
  completed_at?: string
  // Virtual joined fields
  images?: ItemImage[]
  links?: ItemLink[]
  tags?: string[]
  activity?: ActivityLog[]
  assignee?: User
  completer?: User
}

export interface ItemImage {
  id: string
  item_id: string
  storage_path: string
  thumb_path?: string
  uploaded_by?: string
  created_at: string
}

export interface ItemLink {
  id: string
  item_id: string
  system: 'hubspot' | 'acorn'
  record_type?: string
  external_id: string
  cached_label?: string
  cached_status?: string
  last_synced_at: string
}

export interface ActivityLog {
  id: string
  item_id?: string
  list_id?: string
  actor_id?: string
  actor?: User
  action: 'created' | 'edited' | 'completed' | 'reopened' | 'moved_rank' | 'moved_list' | 'deleted' | 'linked'
  detail?: any
  created_at: string
}
