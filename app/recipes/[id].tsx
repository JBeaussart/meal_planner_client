import { api, BASE_URL, endpoints, type JsonApiOne } from '@/api'
import { AuthGate } from '@/components/AuthGate'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { Link, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'

type RecipeAttrs = {
  title: string
  made_by_mom: boolean
  taste: number
  created_at: string
  image_url?: string | null
}

type Ingredient = {
  id: string
  name: string
  quantity?: number | null
  unit?: string | null
}

type Step = {
  id: string
  position?: number | null
  description?: string | null
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [recipe, setRecipe] = useState<{ id: string; attrs: RecipeAttrs } | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [steps, setSteps] = useState<Step[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get<JsonApiOne<RecipeAttrs>>(`${endpoints.recipes}/${id}`)
        const r = res.data.data
        if (mounted) {
          setRecipe({ id: r.id, attrs: r.attributes })

          const included = res.data.included || []
          const ing: Ingredient[] = included
            .filter((i: any) => i.type === 'ingredient')
            .map((i: any) => ({
              id: i.id,
              name: i.attributes?.name,
              quantity: i.attributes?.quantity ?? null,
              unit: i.attributes?.unit ?? null,
            }))
          const stp: Step[] = included
            .filter((i: any) => i.type === 'step')
            .map((i: any) => ({
              id: i.id,
              position: i.attributes?.position ?? null,
              description: i.attributes?.description ?? null,
            }))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

          setIngredients(ing)
          setSteps(stp)
        }
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
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#16A34A" />
            </View>
          ) : recipe ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.imageWrapper}>
                {imgUri ? (
                  <Image source={{ uri: imgUri }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                {recipe.attrs.made_by_mom ? (
                  <View style={styles.badge}>
                    <IconSymbol name="chefhat.fill" size={16} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>

              <View style={styles.header}>
                <ThemedText type="title" style={styles.title}>
                  {recipe.attrs.title}
                </ThemedText>
                <Link href={{ pathname: '/(tabs)/recipes/[id]/edit', params: { id } }} asChild>
                  <Pressable style={styles.editBtn} accessibilityLabel="Éditer la recette">
                    <ThemedText style={styles.editBtnText}>Éditer</ThemedText>
                  </Pressable>
                </Link>
              </View>

              <View style={styles.blocksContainer}>
                <View style={[styles.block, styles.blockIngredients]}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol name="list.bullet" size={18} color="#111827" />
                    <ThemedText style={styles.sectionTitle}>Ingrédients</ThemedText>
                  </View>
                  {ingredients.length ? (
                    ingredients.map((ing) => (
                      <View key={ing.id} style={styles.ingredientRow}>
                        <View style={styles.bullet} />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
                          <ThemedText style={styles.ingredientName}>{ing.name}</ThemedText>
                          {ing.quantity != null && ing.quantity !== undefined && ing.quantity !== 0 ? (
                            <ThemedText style={styles.ingredientQty}> {ing.quantity}</ThemedText>
                          ) : null}
                          {ing.unit ? (
                            <ThemedText style={styles.ingredientQty}> {ing.unit}</ThemedText>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.emptyText}>Aucun ingrédient</ThemedText>
                  )}
                </View>

                <View style={[styles.block, styles.blockSteps]}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol name="list.number" size={18} color="#111827" />
                    <ThemedText style={styles.sectionTitle}>Préparation</ThemedText>
                  </View>
                  {steps.length ? (
                    steps.map((s, idx) => (
                      <View key={s.id} style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                          <ThemedText style={styles.stepBadgeText}>
                            {s.position ?? idx + 1}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.stepText}>{s.description}</ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.emptyText}>Aucune étape</ThemedText>
                  )}
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <ThemedText>Recette introuvable.</ThemedText>
            </View>
          )}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800' },
  editBtn: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#FFFFFF', fontWeight: '700' },
  meta: { color: '#6B7280', marginTop: 6 },
  image: { width: '100%', height: 240, backgroundColor: '#EEE' },
  imagePlaceholder: { borderWidth: 1, borderColor: '#E5E7EB' },
  imageWrapper: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  blocksContainer: { paddingHorizontal: 20, paddingTop: 8 },
  block: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  blockIngredients: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  blockSteps: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111827',
    marginTop: 8,
    marginRight: 10,
  },
  ingredientQty: { color: '#6B7280', fontSize: 14 },
  ingredientName: { color: '#111827', fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  stepText: { color: '#111827', fontSize: 14, flex: 1, lineHeight: 20 },
  emptyText: { fontSize: 14, color: '#6B7280' },
})
