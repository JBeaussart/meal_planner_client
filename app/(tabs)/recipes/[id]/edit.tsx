import { api, endpoints, type JsonApiOne, BASE_URL } from "@/api";
import { AuthGate } from "@/components/AuthGate";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  Image,
  Platform,
} from "react-native";

type RecipeAttrs = {
  title: string;
  made_by_mom: boolean;
  taste: "salt" | "sugar" | number;
};

type IngredientForm = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
};
type StepForm = { id?: string; description: string; position?: number | null };

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [madeByMom, setMadeByMom] = useState(false);
  const [taste, setTaste] = useState<"salt" | "sugar">("salt");
  const [ingredients, setIngredients] = useState<IngredientForm[]>([]);
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [deletedIngredientIds, setDeletedIngredientIds] = useState<string[]>(
    []
  );
  const [deletedStepIds, setDeletedStepIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<JsonApiOne<any>>(
          `${endpoints.recipes}/${id}`
        );
        const r = res.data.data;
        const attrs = r.attributes;
        if (!mounted) return;
        setTitle(attrs.title);
        setMadeByMom(!!attrs.made_by_mom);
        // server sends enum as number (0/1); map to union
        const t = attrs.taste;
        setTaste(t === 1 || t === "sugar" ? "sugar" : "salt");

        const included = res.data.included || [];
        const rawImageUrl = (attrs as any).image_url as string | undefined;
        if (rawImageUrl) {
          setExistingImageUrl(rawImageUrl.startsWith('http') ? rawImageUrl : `${BASE_URL}${rawImageUrl}`);
        } else {
          setExistingImageUrl(null);
        }
        const ing = included
          .filter((i: any) => i.type === "ingredient")
          .map((i: any) => ({
            id: i.id as string,
            name: i.attributes?.name || "",
            quantity: (i.attributes?.quantity ?? "").toString(),
            unit: i.attributes?.unit || "",
          }));
        const stp = included
          .filter((i: any) => i.type === "step")
          .map((i: any) => ({
            id: i.id as string,
            description: i.attributes?.description || "",
            position: i.attributes?.position ?? null,
          }))
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
        setIngredients(ing);
        setSteps(stp);
      } catch (e) {
        // no-op
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !submitting,
    [title, submitting]
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Use multipart/form-data to support image upload and nested attributes
      const form = new FormData();
      form.append('recipe[title]', title.trim());
      form.append('recipe[made_by_mom]', String(madeByMom));
      form.append('recipe[taste]', taste as string);

      // Ingredients (including existing IDs and deletions)
      const normalizedIngredients = ingredients
        .map((i) => ({ id: i.id, name: i.name.trim(), quantity: i.quantity.trim(), unit: i.unit.trim() }))
        .filter((i) => i.name.length > 0)
        .map((i) => ({ id: i.id, name: i.name, unit: i.unit || null, quantity: i.quantity ? Number(i.quantity) : null }));
      let ingIdx = 0;
      normalizedIngredients.forEach((ing) => {
        if (ing.id) form.append(`recipe[ingredients_attributes][${ingIdx}][id]`, ing.id);
        form.append(`recipe[ingredients_attributes][${ingIdx}][name]`, ing.name);
        if (ing.unit != null) form.append(`recipe[ingredients_attributes][${ingIdx}][unit]`, String(ing.unit));
        if (ing.quantity != null) form.append(`recipe[ingredients_attributes][${ingIdx}][quantity]`, String(ing.quantity));
        ingIdx++;
      });
      deletedIngredientIds.forEach((delId) => {
        form.append(`recipe[ingredients_attributes][${ingIdx}][id]`, delId);
        form.append(`recipe[ingredients_attributes][${ingIdx}][_destroy]`, 'true');
        ingIdx++;
      });

      // Steps
      const normalizedSteps = steps
        .map((s, idx) => ({ id: s.id, description: s.description.trim(), position: idx + 1 }))
        .filter((s) => s.description.length > 0);
      let stepIdx = 0;
      normalizedSteps.forEach((st) => {
        if (st.id) form.append(`recipe[steps_attributes][${stepIdx}][id]`, st.id);
        form.append(`recipe[steps_attributes][${stepIdx}][description]`, st.description);
        form.append(`recipe[steps_attributes][${stepIdx}][position]`, String(st.position));
        stepIdx++;
      });
      deletedStepIds.forEach((delId) => {
        form.append(`recipe[steps_attributes][${stepIdx}][id]`, delId);
        form.append(`recipe[steps_attributes][${stepIdx}][_destroy]`, 'true');
        stepIdx++;
      });

      // Image changes
      if (imageUri) {
        const name = imageUri.split('/').pop() || 'image.jpg';
        if (Platform.OS === 'web') {
          const resp = await fetch(imageUri);
          const blob = await resp.blob();
          form.append('recipe[image]', blob, name);
        } else {
          const ext = name.includes('.') ? name.split('.').pop() : 'jpg';
          const type = `image/${ext}`;
          form.append('recipe[image]', { uri: imageUri, name, type } as any);
        }
      }
      if (removeImage) {
        form.append('recipe[remove_image]', 'true');
      }

      await api.put(`${endpoints.recipes}/${id}`, form);

      router.replace({ pathname: "/(tabs)/recipes/[id]", params: { id } });
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.join?.("\n") ||
        "Impossible de mettre à jour la recette.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setRemoveImage(false);
    }
  };

  const removeIngredient = (idx: number) => {
    const it = ingredients[idx];
    if (it?.id) setDeletedIngredientIds((arr) => [...arr, it.id!]);
    setIngredients((list) => list.filter((_, i) => i !== idx));
  };
  const removeStep = (idx: number) => {
    const it = steps[idx];
    if (it?.id) setDeletedStepIds((arr) => [...arr, it.id!]);
    setSteps((list) => list.filter((_, i) => i !== idx));
  };

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#16A34A" />
            </View>
          ) : (
            <>
              <ThemedText type="title" style={styles.headerTitle}>
                Éditer la recette
              </ThemedText>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Image */}
                <View style={[styles.formGroup, { marginBottom: 8 }]}>
                  <ThemedText style={styles.label}>Image</ThemedText>
                  {imageUri ? (
                    <View style={{ gap: 8 }}>
                      <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: '#E5E7EB' }} />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={pickImage} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Changer l'image">
                          <ThemedText style={styles.secondaryBtnText}>Changer l'image</ThemedText>
                        </Pressable>
                        <Pressable onPress={() => { setImageUri(null); setRemoveImage(true); }} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Retirer l'image">
                          <ThemedText style={styles.secondaryBtnText}>Retirer</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : existingImageUrl && !removeImage ? (
                    <View style={{ gap: 8 }}>
                      <Image source={{ uri: existingImageUrl }} style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: '#E5E7EB' }} />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={pickImage} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Changer l'image">
                          <ThemedText style={styles.secondaryBtnText}>Changer l'image</ThemedText>
                        </Pressable>
                        <Pressable onPress={() => setRemoveImage(true)} disabled={submitting} style={styles.secondaryBtn} accessibilityLabel="Retirer l'image">
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

                <View style={styles.formRow}>
                  <ThemedText style={styles.label}>Recette de Maman</ThemedText>
                  <Switch
                    value={madeByMom}
                    onValueChange={setMadeByMom}
                    thumbColor={madeByMom ? "#10B981" : "#F3F4F6"}
                    trackColor={{ false: "#D1D5DB", true: "#34D399" }}
                    disabled={submitting}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Goût</ThemedText>
                  <View style={styles.segment}>
                    <Pressable
                      onPress={() => setTaste("salt")}
                      style={[
                        styles.segmentBtn,
                        taste === "salt" && styles.segmentBtnActive,
                      ]}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityState={{ selected: taste === "salt" }}
                    >
                      <ThemedText
                        style={[
                          styles.segmentText,
                          taste === "salt" && styles.segmentTextActive,
                        ]}
                      >
                        Salé
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setTaste("sugar")}
                      style={[
                        styles.segmentBtn,
                        taste === "sugar" && styles.segmentBtnActive,
                      ]}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityState={{ selected: taste === "sugar" }}
                    >
                      <ThemedText
                        style={[
                          styles.segmentText,
                          taste === "sugar" && styles.segmentTextActive,
                        ]}
                      >
                        Sucré
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.formGroup, { marginTop: 18 }]}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Ingrédients
                  </ThemedText>
                  {ingredients.map((ing, idx) => (
                    <View key={ing.id || idx} style={styles.row3}>
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
                          copy[idx] = {
                            ...copy[idx],
                            quantity: t.replace(/[^0-9]/g, ""),
                          };
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
                        onPress={() => removeIngredient(idx)}
                        disabled={submitting}
                        style={styles.removeBtn}
                        accessibilityLabel="Retirer l'ingrédient"
                      >
                        <ThemedText style={styles.removeBtnText}>✕</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                  <View style={{ marginTop: 8 }}>
                    <Pressable
                      onPress={() =>
                        setIngredients((list) => [
                          ...list,
                          { name: "", quantity: "", unit: "" },
                        ])
                      }
                      disabled={submitting}
                      style={styles.secondaryBtn}
                      accessibilityLabel="Ajouter un ingrédient"
                    >
                      <ThemedText style={styles.secondaryBtnText}>
                        + Ajouter un ingrédient
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.formGroup, { marginTop: 18 }]}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Étapes
                  </ThemedText>
                  {steps.map((st, idx) => (
                    <View key={st.id || idx} style={styles.rowStep}>
                      <ThemedText style={styles.stepIndex}>
                        {idx + 1}.
                      </ThemedText>
                      <TextInput
                        value={st.description}
                        onChangeText={(t) => {
                          const copy = [...steps];
                          copy[idx] = { ...copy[idx], description: t };
                          setSteps(copy);
                        }}
                        placeholder={`Description de l'étape ${idx + 1}`}
                        placeholderTextColor="#9CA3AF"
                        style={[styles.input, styles.inputGrow]}
                        editable={!submitting}
                        multiline
                      />
                      <Pressable
                        onPress={() => removeStep(idx)}
                        disabled={submitting}
                        style={styles.removeBtn}
                        accessibilityLabel="Retirer l'étape"
                      >
                        <ThemedText style={styles.removeBtnText}>✕</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                  <View style={{ marginTop: 8 }}>
                    <Pressable
                      onPress={() =>
                        setSteps((list) => [...list, { description: "" }])
                      }
                      disabled={submitting}
                      style={styles.secondaryBtn}
                      accessibilityLabel="Ajouter une étape"
                    >
                      <ThemedText style={styles.secondaryBtnText}>
                        + Ajouter une étape
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                  </View>
                ) : null}

                <View style={{ marginTop: 12 }}>
                  <PrimaryButton
                    title={submitting ? "Sauvegarde…" : "Enregistrer"}
                    onPress={onSubmit}
                    style={styles.submit}
                  />
                </View>

                {submitting ? (
                  <View style={{ marginTop: 12, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#16A34A" />
                  </View>
                ) : null}
              </ScrollView>
            </>
          )}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  formGroup: { marginTop: 14 },
  formRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  input: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
    paddingTop: 10,
    paddingBottom: 10,
  },
  inputGrow: { flex: 1 },
  inputQty: { width: 70, marginLeft: 8 },
  inputUnit: { width: 90, marginLeft: 8 },
  row3: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  rowStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  stepIndex: {
    color: "#6B7280",
    width: 18,
    textAlign: "right",
    paddingTop: 12,
  },
  removeBtn: { marginLeft: 6, paddingHorizontal: 8, paddingVertical: 8 },
  removeBtnText: { color: "#9CA3AF", fontWeight: "900" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  secondaryBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  secondaryBtnText: { color: "#111827", fontWeight: "700" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  segmentText: { color: "#6B7280", fontWeight: "700" },
  segmentTextActive: { color: "#111827" },
  submit: { marginTop: 6 },
  errorBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#991B1B", fontSize: 13, fontWeight: "600" },
});
