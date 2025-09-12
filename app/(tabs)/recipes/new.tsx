import { api, endpoints, type JsonApiOne } from '@/api'
import { AuthGate } from '@/components/AuthGate'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { Stack, useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { SafeAreaView, StyleSheet, TextInput, View, Switch, Pressable, ActivityIndicator, ScrollView, Image, Platform } from 'react-native'

type RecipeAttrs = {
  title: string
  made_by_mom: boolean
  taste: 'salt' | 'sugar'
}

export default function NewRecipeScreen() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [madeByMom, setMadeByMom] = useState(false)
  const [taste, setTaste] = useState<'salt' | 'sugar'>('salt')

  type IngredientForm = { name: string; quantity: string; unit: string }
  type StepForm = { description: string }
  const [ingredients, setIngredients] = useState<IngredientForm[]>([])
  const [steps, setSteps] = useState<StepForm[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUri, setImageUri] = useState<string | null>(null)

  const canSubmit = useMemo(() => title.trim().length > 0 && !submitting, [title, submitting])

  const onSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      // Build multipart/form-data payload for potential image upload
      const form = new FormData()
      form.append('recipe[title]', title.trim())
      form.append('recipe[made_by_mom]', String(madeByMom))
      form.append('recipe[taste]', taste)

      // Ingredients
      const cleanedIngredients = ingredients
        .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim(), unit: i.unit.trim() }))
        .filter((i) => i.name.length > 0)
        .map((i) => ({ name: i.name, unit: i.unit || null, quantity: i.quantity ? Number(i.quantity) : null }))
      cleanedIngredients.forEach((ing, idx) => {
        form.append(`recipe[ingredients_attributes][${idx}][name]`, ing.name)
        if (ing.unit != null) form.append(`recipe[ingredients_attributes][${idx}][unit]`, String(ing.unit))
        if (ing.quantity != null) form.append(`recipe[ingredients_attributes][${idx}][quantity]`, String(ing.quantity))
      })

      // Steps
      const cleanedSteps = steps
        .map((s) => s.description.trim())
        .filter((d) => d.length > 0)
        .map((description, idx) => ({ description, position: idx + 1 }))
      cleanedSteps.forEach((st, idx) => {
        form.append(`recipe[steps_attributes][${idx}][description]`, st.description)
        form.append(`recipe[steps_attributes][${idx}][position]`, String(st.position))
      })

      // Image
      if (imageUri) {
        const name = imageUri.split('/').pop() || 'image.jpg'
        if (Platform.OS === 'web') {
          const resp = await fetch(imageUri)
          const blob = await resp.blob()
          form.append('recipe[image]', blob, name)
        } else {
          const ext = name.includes('.') ? name.split('.').pop() : 'jpg'
          const type = `image/${ext}`
          form.append('recipe[image]', { uri: imageUri, name, type } as any)
        }
      }

      const res = await api.post<JsonApiOne<RecipeAttrs>>(endpoints.recipes, form)
      const id = res.data.data.id
      // Go to the new recipe detail
      router.replace({ pathname: '/(tabs)/recipes/[id]', params: { id } })
    } catch (e: any) {
      const msg = e?.response?.data?.errors?.join?.('\n') || "Impossible de créer la recette."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const pickImage = async () => {
    // Request permissions on native platforms
    await ImagePicker.requestMediaLibraryPermissionsAsync()
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri)
    }
  }

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.headerTitle}>Nouvelle Recette</ThemedText>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Titre</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de la recette"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="sentences"
              autoCorrect
              editable={!submitting}
            />
          </View>

          {/* Image */}
          <View style={[styles.formGroup, { marginTop: 18 }] }>
            <ThemedText style={styles.label}>Image</ThemedText>
            {imageUri ? (
              <View style={{ gap: 8 }}>
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: '#E5E7EB' }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={pickImage} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Changer l'image">
                    <ThemedText style={styles.secondaryBtnText}>Changer l'image</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setImageUri(null)} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Retirer l'image">
                    <ThemedText style={styles.secondaryBtnText}>Retirer</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={pickImage} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Ajouter une image">
                <ThemedText style={styles.secondaryBtnText}>+ Ajouter une image</ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.formRow}>
            <ThemedText style={styles.label}>De Maman</ThemedText>
            <Switch
              value={madeByMom}
              onValueChange={setMadeByMom}
              thumbColor={madeByMom ? '#10B981' : '#F3F4F6'}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              disabled={submitting}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Goût</ThemedText>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setTaste('salt')}
                style={[styles.segmentBtn, taste === 'salt' && styles.segmentBtnActive]}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ selected: taste === 'salt' }}
              >
                <ThemedText style={[styles.segmentText, taste === 'salt' && styles.segmentTextActive]}>Salé</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setTaste('sugar')}
                style={[styles.segmentBtn, taste === 'sugar' && styles.segmentBtnActive]}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ selected: taste === 'sugar' }}
              >
                <ThemedText style={[styles.segmentText, taste === 'sugar' && styles.segmentTextActive]}>Sucré</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Ingrédients */}
          <View style={[styles.formGroup, { marginTop: 18 }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Ingrédients</ThemedText>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.row3}>
                <TextInput
                  value={ing.name}
                  onChangeText={(t) => {
                    const copy = [...ingredients];
                    copy[idx] = { ...copy[idx], name: t };
                    setIngredients(copy);
                  }}
                  placeholder="Nom"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.inputGrow]}
                  editable={!submitting}
                />
                <TextInput
                  value={ing.quantity}
                  onChangeText={(t) => {
                    const copy = [...ingredients];
                    copy[idx] = { ...copy[idx], quantity: t.replace(/[^0-9]/g, '') };
                    setIngredients(copy);
                  }}
                  placeholder="Qté"
                  keyboardType="number-pad"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.inputQty]}
                  editable={!submitting}
                />
                <TextInput
                  value={ing.unit}
                  onChangeText={(t) => {
                    const copy = [...ingredients];
                    copy[idx] = { ...copy[idx], unit: t };
                    setIngredients(copy);
                  }}
                  placeholder="Unité"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.inputUnit]}
                  editable={!submitting}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  disabled={submitting}
                  style={styles.removeBtn}
                  accessibilityLabel="Retirer cet ingrédient"
                >
                  <ThemedText style={styles.removeBtnText}>✕</ThemedText>
                </Pressable>
              </View>
            ))}
            <View style={{ marginTop: 8 }}>
              <Pressable
                onPress={() => setIngredients((list) => [...list, { name: '', quantity: '', unit: '' }])}
                disabled={submitting}
                style={styles.secondaryBtn}
                accessibilityLabel="Ajouter un ingrédient"
              >
                <ThemedText style={styles.secondaryBtnText}>+ Ajouter un ingrédient</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Étapes */}
          <View style={[styles.formGroup, { marginTop: 18 }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Étapes</ThemedText>
            {steps.map((st, idx) => (
              <View key={idx} style={styles.rowStep}>
                <ThemedText style={styles.stepIndex}>{idx + 1}.</ThemedText>
                <TextInput
                  value={st.description}
                  onChangeText={(t) => {
                    const copy = [...steps];
                    copy[idx] = { description: t };
                    setSteps(copy);
                  }}
                  placeholder={`Description de l'étape ${idx + 1}`}
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.inputGrow]}
                  editable={!submitting}
                  multiline
                />
                <Pressable
                  onPress={() => setSteps(steps.filter((_, i) => i !== idx))}
                  disabled={submitting}
                  style={styles.removeBtn}
                  accessibilityLabel="Retirer cette étape"
                >
                  <ThemedText style={styles.removeBtnText}>✕</ThemedText>
                </Pressable>
              </View>
            ))}
            <View style={{ marginTop: 8 }}>
              <Pressable
                onPress={() => setSteps((list) => [...list, { description: '' }])}
                disabled={submitting}
                style={styles.secondaryBtn}
                accessibilityLabel="Ajouter une étape"
              >
                <ThemedText style={styles.secondaryBtnText}>+ Ajouter une étape</ThemedText>
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <PrimaryButton title={submitting ? 'Création…' : 'Créer la recette'} onPress={onSubmit} style={styles.submit} />
          </View>

          {submitting ? (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#16A34A" />
            </View>
          ) : null}
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  formGroup: { marginTop: 14 },
  formRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#111827', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  inputGrow: { flex: 1 },
  inputQty: { width: 70, marginLeft: 8 },
  inputUnit: { width: 90, marginLeft: 8 },
  row3: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rowStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  stepIndex: { color: '#6B7280', width: 18, textAlign: 'right', paddingTop: 12 },
  removeBtn: { marginLeft: 6, paddingHorizontal: 8, paddingVertical: 8 },
  removeBtnText: { color: '#9CA3AF', fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  secondaryBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  segmentText: { color: '#6B7280', fontWeight: '700' },
  segmentTextActive: { color: '#111827' },
  submit: { marginTop: 6 },
  errorBox: { marginTop: 12, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#991B1B', fontSize: 13, fontWeight: '600' },
})
