import { api, BASE_URL, endpoints, type JsonApiList } from '@/api'
import { AuthGate } from '@/components/AuthGate'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'

type RecipeAttrs = {
  title: string
  made_by_mom: boolean
  taste: 'salt' | 'sugar'
  created_at: string
  image_url?: string | null
}

export default function RecipesListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<{ id: string; attrs: RecipeAttrs }[]>([])
  const [query, setQuery] = useState('')
  const [onlyMom, setOnlyMom] = useState(false)
  const [taste, setTaste] = useState<'all' | 'salt' | 'sugar'>('all')

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
    const imgUri = item.attrs.image_url
      ? item.attrs.image_url?.startsWith('http')
        ? item.attrs.image_url
        : `${BASE_URL}${item.attrs.image_url}`
      : undefined
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/recipes/${item.id}`)}>
        <View style={styles.imageWrapper}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
          {item.attrs.made_by_mom ? (
            <View style={styles.badge}>
              <IconSymbol name="chefhat.fill" size={14} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.title} numberOfLines={2}>
          {item.attrs.title}
        </ThemedText>
      </Pressable>
    )
  }

  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  const filteredRecipes = useMemo(() => {
    const q = normalize(query.trim())
    let list = recipes
    if (q) list = list.filter((r) => normalize(r.attrs.title).includes(q))
    if (onlyMom) list = list.filter((r) => r.attrs.made_by_mom)
    if (taste !== 'all') list = list.filter((r) => r.attrs.taste === taste)
    return list
  }, [recipes, query, onlyMom, taste])

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      )
    }
    if (!recipes.length && !query) {
      return (
        <View style={styles.center}>
          <ThemedText>Aucune recette pour le moment.</ThemedText>
        </View>
      )
    }
    return (
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
        data={filteredRecipes}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={() => (
          <View style={[styles.center, { paddingTop: 40 }]}>
            <ThemedText>Aucune recette trouvée.</ThemedText>
          </View>
        )}
      />
    )
  }, [loading, recipes, filteredRecipes, query])

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              Mes Recettes
            </ThemedText>
            <View style={styles.filtersRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une recette..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.searchInput, { flex: 1 }]}
              />
              <Pressable
                onPress={() => setOnlyMom((v) => !v)}
                style={styles.checkboxContainer}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: onlyMom }}
              >
                <View style={[styles.checkbox, onlyMom && styles.checkboxChecked]} />
                <ThemedText style={styles.checkboxLabel}>Maman</ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  setTaste((t) => (t === 'all' ? 'salt' : t === 'salt' ? 'sugar' : 'all'))
                }
                style={styles.select}
                hitSlop={8}
              >
                <ThemedText style={styles.selectLabel}>
                  Goût: {taste === 'all' ? 'Tous' : taste === 'salt' ? 'Salé' : 'Sucré'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
          {content}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 30 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  searchContainer: { marginTop: 10 },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkboxLabel: { color: '#111827', fontSize: 12, fontWeight: '600' },
  select: {
    marginLeft: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
  },
  selectLabel: { color: '#111827', fontSize: 12, fontWeight: '600' },
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
  imageWrapper: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 6, color: '#6B7280', fontSize: 12 },
})
