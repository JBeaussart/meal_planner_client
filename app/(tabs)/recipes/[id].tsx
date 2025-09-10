import React, { useCallback, useState } from 'react'
import BaseRecipeDetail from '@/app/recipes/[id]'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { api, endpoints } from '@/api'

export default function RecipeDetailWithAssign() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const onAssign = useCallback(async () => {
    if (!day || !id || saving) return
    setSaving(true)
    try {
      await api.post(endpoints.scheduled_recipes, {
        scheduled_recipe: { day_of_week: Number(day), recipe_id: id },
      })
      router.replace('/(tabs)/planning')
    } catch (e) {
      setSaving(false)
    }
  }, [day, id, saving, router])

  return (
    <View style={{ flex: 1 }}>
      <BaseRecipeDetail />
      {day ? (
        <Pressable
          onPress={onAssign}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 30,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#16A34A',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
          accessibilityLabel="Assigner cette recette au jour choisi"
        >
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  )
}
