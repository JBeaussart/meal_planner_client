import React, { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn, token, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) router.replace('/recipes')
  }, [token, router])

  useEffect(() => {
    if (error) Alert.alert('Connexion', error)
  }, [error])

  const onSubmit = async () => {
    if (!email || !password) return Alert.alert('Champs requis', 'Merci de renseigner email et mot de passe')
    setSubmitting(true)
    const ok = await signIn(email, password)
    setSubmitting(false)
    if (ok) router.replace('/recipes')
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Meal Planner</ThemedText>
          <ThemedText style={styles.subtitle}>Connecte-toi pour accéder à tes recettes</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Mot de passe</ThemedText>
            <TextInput
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
          </View>

          <PrimaryButton title={submitting || loading ? 'Connexion…' : 'Se connecter'} onPress={onSubmit} style={styles.submit} />

          <TouchableOpacity activeOpacity={0.8}>
            <ThemedText type="link" style={styles.help}>Mot de passe oublié ?</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 30,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#6B7280', marginTop: 10 },
  form: {
    marginTop: 10,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16,
  },
  submit: { marginTop: 10 },
  help: { textAlign: 'center', marginTop: 16 },
})

