import React, { useEffect } from 'react'
import { View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'

// Simple gate: redirect to login or recipes
export default function Index() {
  const { token, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (token) router.replace('/recipes')
    else router.replace('/login')
  }, [loading, token, router])

  return <View />
}
