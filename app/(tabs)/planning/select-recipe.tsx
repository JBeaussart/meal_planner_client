import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, View } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { api, endpoints, type JsonApiList } from '@/api'
import { useLocalSearchParams, useRouter } from 'expo-router'

type RecipeAttrs = { title: string; made_by_mom: boolean; taste: 'salt' | 'sugar' }

export default function SelectRecipeScreen() {
  const { day } = useLocalSearchParams<{ day: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<{ id: string; attrs: RecipeAttrs }[]>([])
  const dayNum = Number(day)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get<JsonApiList<RecipeAttrs>>(endpoints.recipes)
        const list = res.data.data.map((r) => ({ id: r.id, attrs: r.attributes }))
        if (mounted) setRecipes(list)
      } catch (e) {
        if (mounted) setRecipes([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const onSelect = async (recipeId: string) => {
    try {
      await api.post(endpoints.scheduled_recipes, {
        scheduled_recipe: { day_of_week: dayNum, recipe_id: recipeId },
      })
      router.back()
    } catch (e) {}
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      )
    }
    return (
      <FlatList
        data={recipes}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={{ flex: 1, paddingRight: 8 }}
              onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: item.id, day } })}
              accessibilityLabel="Voir le détail de la recette"
            >
              <ThemedText style={styles.title}>{item.attrs.title}</ThemedText>
              <ThemedText style={styles.meta}>
                {item.attrs.made_by_mom ? 'Maman' : ''} {item.attrs.taste === 'salt' ? 'Salé' : 'Sucré'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => onSelect(item.id)}
              style={styles.addBtn}
              accessibilityLabel="Assigner cette recette"
            >
              <FontAwesome name="plus" size={18} color="#16A34A" />
            </Pressable>
          </View>
        )}
      />
    )
  }, [loading, recipes])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.header}>
          Choisir une recette
        </ThemedText>
        {content}
      </ThemedView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontWeight: '800', fontSize: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  row: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  title: { color: '#111827', fontWeight: '700' },
  meta: { color: '#6B7280', marginTop: 4 },
})
