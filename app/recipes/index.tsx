import { api, BASE_URL, endpoints, type JsonApiList } from "@/api";
import { AuthGate } from "@/components/AuthGate";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RecipeAttrs = {
  title: string;
  made_by_mom: boolean;
  taste: "salt" | "sugar";
  created_at: string;
  image_url?: string | null;
  // Provided by API for client-side search
  ingredient_names?: string[];
};

export default function RecipesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<{ id: string; attrs: RecipeAttrs }[]>(
    []
  );
  const [query, setQuery] = useState("");
  const [serverList, setServerList] = useState<
    { id: string; attrs: RecipeAttrs }[] | null
  >(null);
  const [searching, setSearching] = useState(false);
  const [onlyMom, setOnlyMom] = useState(false);
  const [taste, setTaste] = useState<"all" | "salt" | "sugar">("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<JsonApiList<RecipeAttrs>>(endpoints.recipes);
        const list = res.data.data.map((r) => ({
          id: r.id,
          attrs: r.attributes,
        }));
        if (mounted) setRecipes(list);
      } catch (e) {
        // no-op for now
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced server-side search for ingredients/title when query is set
  useEffect(() => {
    if (!query.trim()) {
      setServerList(null);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get<JsonApiList<RecipeAttrs>>(endpoints.recipes, {
          params: { q: query.trim() },
        });
        if (!active) return;
        const list = res.data.data.map((r) => ({ id: r.id, attrs: r.attributes }));
        setServerList(list);
      } catch {
        if (active) setServerList(null);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const renderItem = ({
    item,
  }: {
    item: { id: string; attrs: RecipeAttrs };
  }) => {
    const imgUri = item.attrs.image_url
      ? item.attrs.image_url?.startsWith("http")
        ? item.attrs.image_url
        : `${BASE_URL}${item.attrs.image_url}`
      : undefined;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/(tabs)/recipes/${item.id}`)}
      >
        <View style={styles.imageWrapper}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
        </View>
        <View style={styles.cardBody}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {item.attrs.title}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={[styles.chip, styles.chipNeutral]}>
              <ThemedText style={styles.chipText}>
                {item.attrs.taste === "salt" ? "Salé" : "Sucré"}
              </ThemedText>
            </View>
            {item.attrs.made_by_mom ? (
              <View style={[styles.chip, styles.chipMom]}>
                <IconSymbol name="pawprint.fill" size={12} color="#BE185D" />
                <ThemedText style={[styles.chipText, { color: "#BE185D" }]}>
                  Maman
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filteredRecipes = useMemo(() => {
    const q = normalize(query.trim());
    // Prefer server-provided list for query to ensure ingredient search works
    let list = query.trim() && serverList ? serverList : recipes;
    if (q) {
      list = list.filter((r) => {
        const inTitle = normalize(r.attrs.title).includes(q);
        const names =
          r.attrs.ingredient_names || (r.attrs as any)["ingredient-names"] || [];
        const inIngredients = names.some((n) => normalize(n).includes(q));
        return inTitle || inIngredients;
      });
    }
    if (onlyMom) list = list.filter((r) => r.attrs.made_by_mom);
    if (taste !== "all") list = list.filter((r) => r.attrs.taste === taste);
    return list
      .slice()
      .sort((a, b) => a.attrs.title.localeCompare(b.attrs.title, "fr"));
  }, [recipes, serverList, query, onlyMom, taste]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      );
    }
    if (!recipes.length && !query) {
      return (
        <View style={styles.center}>
          <ThemedText>Aucune recette pour le moment.</ThemedText>
        </View>
      );
    }
    return (
      <FlatList
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24 + insets.bottom,
        }}
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
    );
  }, [loading, recipes, filteredRecipes, query]);

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              📖 Recettes disponibles
            </ThemedText>
            <View style={styles.actionsRow}>
              <Link href="/(tabs)/recipes/new" asChild>
                <PrimaryButton
                  title="Ajouter une recette"
                  style={styles.addBtn}
                />
              </Link>
            </View>
            <View style={styles.searchContainer}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une recette…"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.filtersRow}>
              <View style={styles.segmented}>
                {(
                  [
                    { key: "all", label: "Tous" },
                    { key: "salt", label: "Salé" },
                    { key: "sugar", label: "Sucré" },
                  ] as const
                ).map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setTaste(opt.key)}
                    style={[
                      styles.segment,
                      taste === opt.key ? styles.segmentActive : null,
                    ]}
                    hitSlop={8}
                  >
                    <ThemedText
                      style={[
                        styles.segmentText,
                        taste === opt.key ? styles.segmentTextActive : null,
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => setOnlyMom((v) => !v)}
                style={styles.checkboxContainer}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: onlyMom }}
              >
                <View
                  style={[styles.checkbox, onlyMom && styles.checkboxChecked]}
                />
                <ThemedText style={styles.checkboxLabel}>
                  Recettes de maman
                </ThemedText>
              </Pressable>
            </View>
          </View>
          {content}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 16 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  searchContainer: { marginTop: 10 },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  rightFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 6,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
  },
  segmentText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  segmentTextActive: { color: "#111827" },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    marginRight: 6,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  checkboxLabel: { color: "#111827", fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: "#EEE",
  },
  imagePlaceholder: { borderWidth: 1, borderColor: "#E5E7EB" },
  imageWrapper: { position: "relative" },
  cardBody: { paddingHorizontal: 4, paddingTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipNeutral: { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  chipMom: { borderColor: "#F9A8D4", backgroundColor: "#FDF2F8" },
  chipText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  title: { marginTop: 10, fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 6, color: "#6B7280", fontSize: 12 },
  typeContainer: { flexDirection: "row", alignItems: "center" },
  typeLabel: { color: "#374151", fontSize: 12, marginRight: 4 },
});
