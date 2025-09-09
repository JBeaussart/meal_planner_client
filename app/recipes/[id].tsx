import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { AuthGate } from '@/components/AuthGate'
import { api, endpoints, BASE_URL, type JsonApiOne } from '@/api'
import { useLocalSearchParams } from 'expo-router'

type RecipeAttrs = {
  title: string
  made_by_mom: boolean
  taste: number
  created_at: string
  image_url?: string | null
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [recipe, setRecipe] = useState<{ id: string; attrs: RecipeAttrs } | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get<JsonApiOne<RecipeAttrs>>(`${endpoints.recipes}/${id}`)
        const r = res.data.data
        if (mounted) setRecipe({ id: r.id, attrs: r.attributes })
      } catch (e) {
        // no-op for now
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])

  const imgUri = recipe?.attrs.image_url
    ? recipe?.attrs.image_url.startsWith('http')
      ? recipe?.attrs.image_url
      : `${BASE_URL}${recipe?.attrs.image_url}`
    : undefined

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ThemedView style={styles.container}>
          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
          ) : recipe ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.header}> 
                <ThemedText type="title" style={styles.title}>{recipe.attrs.title}</ThemedText>
                <ThemedText style={styles.meta}>Créée le {new Date(recipe.attrs.created_at).toLocaleDateString()}</ThemedText>
              </View>
              {imgUri ? (
                <Image source={{ uri: imgUri }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Détails</ThemedText>
                <ThemedText>Préparée par maman: {recipe.attrs.made_by_mom ? 'Oui' : 'Non'}</ThemedText>
                <ThemedText>Saveur: {recipe.attrs.taste}</ThemedText>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.center}><ThemedText>Recette introuvable.</ThemedText></View>
          )}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800' },
  meta: { color: '#6B7280', marginTop: 6 },
  image: { width: '100%', height: 240, backgroundColor: '#EEE' },
  imagePlaceholder: { borderWidth: 1, borderColor: '#E5E7EB' },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
})

