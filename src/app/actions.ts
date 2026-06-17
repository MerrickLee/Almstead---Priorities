'use server'

import { cookies } from 'next/headers'

export async function setViewAsUser(userId: string | null) {
  const cookieStore = await cookies()
  if (userId) {
    cookieStore.set('view_as_user_id', userId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 1 day
    })
  } else {
    cookieStore.delete('view_as_user_id')
  }
}
