import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, View } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { AuthGate } from '@/components/AuthGate'
import { api, endpoints, BASE_URL, type JsonApiList } from '@/api'
import { useRouter } from 'expo-router'

type RecipeAttrs = {
  title: string
  made_by_mom: boolean
  taste: number
  created_at: string
  image_url?: string | null
}

export default function RecipesListScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<Array<{ id: string; attrs: RecipeAttrs }>>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get<JsonApiList<RecipeAttrs>>(endpoints.recipes)
        const list = res.data.data.map((r) => ({ id: r.id, attrs: r.attributes }))
        if (mounted) setRecipes(list)
      } catch (e) {
        // no-op for now
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const renderItem = ({ item }: { item: { id: string; attrs: RecipeAttrs } }) => {
    const imgUri = item.attrs.image_url ? (item.attrs.image_url?.startsWith('http') ? item.attrs.image_url : `${BASE_URL}${item.attrs.image_url}`) : undefined
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/recipes/${item.id}`)}>
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <ThemedText style={styles.title} numberOfLines={2}>{item.attrs.title}</ThemedText>
        <ThemedText style={styles.meta}>Créée le {new Date(item.attrs.created_at).toLocaleDateString()}</ThemedText>
      </Pressable>
    )
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      )
    }
    if (!recipes.length) {
      return (
        <View style={styles.center}>
          <ThemedText>Aucune recette pour le moment.</ThemedText>
        </View>
      )
    }
    return (
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={recipes}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
      />
    )
  }, [loading, recipes])

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ThemedView style={styles.container}>
          <View style={styles.header}> 
            <ThemedText type="title" style={styles.headerTitle}>Mes Recettes</ThemedText>
          </View>
          {content}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#EEE' },
  imagePlaceholder: { borderWidth: 1, borderColor: '#E5E7EB' },
  title: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 6, color: '#6B7280', fontSize: 12 },
})

