import { api, endpoints, type JsonApiList } from "@/api";
import { AuthGate } from "@/components/AuthGate";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SRAttrs = { day_of_week: number | string; created_at: string };
type SR = {
  id: string;
  attrs: SRAttrs;
  recipeId?: string | null;
  recipeTitle?: string | null;
};
type Included = { id: string; type: string; attributes: any };
type RecipeIncluded = Included & {
  attributes: { title: string; [k: string]: any };
};

const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export default function PlanningTabIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SR[]>([]);
  const insets = useSafeAreaInsets();

  const toDayIndex = (val: number | string): number => {
    if (typeof val === "number") return val;
    const map: Record<string, number> = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };
    return map[(val || "").toString().toLowerCase()] ?? 0;
  };

  const fetchData = async (mountedRef?: { current: boolean }) => {
    try {
      const res = await api.get<JsonApiList<SRAttrs>>(
        endpoints.scheduled_recipes
      );
      const data = res.data.data;
      const included = (res.data as any)?.included as
        | RecipeIncluded[]
        | undefined;
      const recipeById = new Map<string, RecipeIncluded>();
      included?.forEach((i) => {
        if (i.type === "recipe") recipeById.set(i.id, i);
      });

      const mapped: SR[] = data.map((r: any) => {
        const relRecipeId = r.relationships?.recipe?.data?.id ?? null;
        const title = relRecipeId
          ? (recipeById.get(relRecipeId)?.attributes?.title ?? null)
          : null;
        const dayIndex = toDayIndex(r.attributes?.day_of_week);
        const attrsNorm: SRAttrs = { ...r.attributes, day_of_week: dayIndex };
        return {
          id: r.id,
          attrs: attrsNorm,
          recipeId: relRecipeId,
          recipeTitle: title,
        };
      });

      const byDay = new Map<number, SR>();
      mapped.forEach((m) => byDay.set(m.attrs.day_of_week, m));
      const full: SR[] = [];
      for (let day = 0; day < 7; day++) {
        full.push(
          byDay.get(day) || {
            id: `new-${day}`,
            attrs: { day_of_week: day, created_at: "" },
            recipeId: null,
          }
        );
      }

      if (!mountedRef || mountedRef.current) setItems(full);
    } catch (e) {
      if (!mountedRef || mountedRef.current) setItems([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchData({ current: mounted });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`${endpoints.scheduled_recipes}/${id}`);
      await fetchData();
    } catch (e) {}
  };

  const renderItem = ({ item }: { item: SR }) => {
    const dayName =
      DAYS[item.attrs.day_of_week] || `Jour ${item.attrs.day_of_week}`;
    const hasRecipe = !!item.recipeId;
    return (
      <Pressable style={[styles.row, hasRecipe ? styles.rowFilled : null]}>
        <View style={styles.rowLeft}>
          <ThemedText style={styles.dayText}>{dayName}</ThemedText>
        </View>
        <View style={styles.rowRight}>
          {hasRecipe ? (
            <>
              {item.recipeTitle ? (
                <ThemedText style={styles.recipeText} numberOfLines={1}>
                  {item.recipeTitle}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={() =>
                  item.recipeId &&
                  router.push(`/(tabs)/recipes/${item.recipeId}`)
                }
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                accessibilityLabel="Voir la recette"
              >
                <FontAwesome name="book" size={16} color="#2563EB" />
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item.id)}
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                accessibilityLabel="Retirer la recette du jour"
              >
                <FontAwesome name="trash" size={16} color="#B91C1C" />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/planning/select-recipe",
                  params: { day: String(item.attrs.day_of_week) },
                })
              }
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
              accessibilityLabel="Assigner une recette"
            >
              <FontAwesome name="plus" size={18} color="#16A34A" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      );
    }
    return (
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    );
  }, [items, loading]);

  const handleResetPress = async () => {
    try {
      console.log('[Planning] Reset button pressed');
      const confirm = await (async () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
          return window.confirm('Supprimer toutes les planifications de la semaine ?');
        }
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            'Réinitialiser le planning',
            'Supprimer toutes les planifications de la semaine ?',
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Réinitialiser', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
      })();
      if (!confirm) return;
      await api.delete(`${endpoints.scheduled_recipes}/clear`);
      await fetchData();
    } catch (e) {
      console.error('[Planning] Reset failed', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert("Impossible de réinitialiser le planning pour le moment.");
      } else {
        Alert.alert('Échec', "Impossible de réinitialiser le planning pour le moment.");
      }
    }
  };

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ThemedView style={[styles.container, { paddingTop: 16 + insets.top }]}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              Planning
            </ThemedText>
            <Pressable onPress={handleResetPress} style={styles.clearBtn} accessibilityRole="button">
              <ThemedText style={styles.clearBtnText}>Réinitialiser le planning</ThemedText>
            </Pressable>
          </View>
          {content}
        </ThemedView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontWeight: "800", fontSize: 20 },
  clearBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: { color: "#B91C1C", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  rowFilled: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dayBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  dayText: { color: "#111827", fontSize: 16, fontWeight: "700" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  recipeText: { color: "#111827", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#6B7280", fontSize: 14, fontStyle: "italic" },
});
