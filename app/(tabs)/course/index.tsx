import { api, endpoints, type JsonApiList } from "@/api";
import { AuthGate } from "@/components/AuthGate";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  TextInput,
  Pressable as RNPressable,
  View,
} from "react-native";

type ShoppingItemAttrs = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  checked?: boolean;
  deletable?: boolean;
};
type ShoppingItem = { id: string; attrs: ShoppingItemAttrs };

export default function CourseTabIndex() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const fetchData = async (mountedRef?: { current: boolean }) => {
    try {
      const res = await api.get<JsonApiList<ShoppingItemAttrs>>(
        endpoints.shopping_list
      );
      const data = res.data.data.map((r) => ({ id: r.id, attrs: r.attributes }));
      if (!mountedRef || mountedRef.current) {
        setItems(data);
        const initial = new Set<string>();
        data.forEach((i) => {
          if (i.attrs.checked) initial.add(i.id);
        });
        setChecked(initial);
      }
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const addItem = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const qtyNum = newQty.trim() ? parseInt(newQty.trim(), 10) : undefined;
    try {
      await api.post(endpoints.shopping_list, {
        name,
        unit: newUnit.trim() || null,
        quantity: Number.isFinite(qtyNum as any) ? qtyNum : undefined,
      });
      setNewName("");
      setNewQty("");
      setNewUnit("");
      await fetchData();
    } catch (e) {}
  }, [newName, newQty, newUnit]);

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const q = item.attrs.quantity;
    const showQty = q != null && q !== 0;
    const isChecked = checked.has(item.id);
    const toggle = async () => {
      const willCheck = !isChecked;
      setChecked((prev) => {
        const next = new Set(prev);
        if (willCheck) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      try {
        await api.post(endpoints.shopping_list_check, {
          name: item.attrs.name,
          unit: item.attrs.unit ?? null,
          checked: willCheck,
        });
      } catch (e) {
        // revert
        setChecked((prev) => {
          const next = new Set(prev);
          if (willCheck) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }
    };
    return (
      <Pressable
        style={[styles.row, isChecked && styles.rowChecked]}
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
      >
        <View style={styles.left}>
          <View
            style={[styles.checkbox, isChecked && styles.checkboxChecked]}
          />
          <ThemedText
            style={[styles.itemName, isChecked && styles.itemNameChecked]}
            numberOfLines={2}
          >
            {item.attrs.name}
          </ThemedText>
        </View>
        <View style={styles.right}>
          {showQty ? <ThemedText style={styles.qty}>{q}</ThemedText> : null}
          {item.attrs.unit ? (
            <ThemedText style={styles.qty}> {item.attrs.unit}</ThemedText>
          ) : null}
          {item.attrs.deletable ? (
            <Pressable
              onPress={async () => {
                try {
                  await api.delete(endpoints.shopping_list, {
                    data: { name: item.attrs.name, unit: item.attrs.unit ?? null },
                  })
                  await fetchData()
                } catch (e) {}
              }}
              style={styles.trashBtn}
              accessibilityLabel="Supprimer cet élément"
            >
              <ThemedText style={styles.trashIcon}>🗑️</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const sortedItems = useMemo(() => {
    // Checked items should go to the bottom; un-checked stay on top
    const list = items.slice();
    list.sort((a, b) => {
      const ac = checked.has(a.id);
      const bc = checked.has(b.id);
      if (ac !== bc) return ac ? 1 : -1;
      // then by name for stability
      return a.attrs.name.localeCompare(b.attrs.name, "fr", {
        sensitivity: "base",
      });
    });
    return list;
  }, [items, checked]);

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
        data={sortedItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={[styles.center, { paddingTop: 40 }]}>
            <ThemedText>Aucune recette planifiée.</ThemedText>
          </View>
        )}
      />
    );
  }, [sortedItems, loading, refreshing]);

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              Course
            </ThemedText>
          </View>
          <View style={styles.formRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de l'élément"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="sentences"
            />
            <TextInput
              value={newQty}
              onChangeText={setNewQty}
              placeholder="Qté"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              style={[styles.input, styles.inputSmall]}
            />
            <TextInput
              value={newUnit}
              onChangeText={setNewUnit}
              placeholder="Unité"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              style={[styles.input, styles.inputSmallWide]}
            />
            <RNPressable onPress={addItem} style={styles.addBtn} accessibilityLabel="Ajouter">
              <ThemedText style={styles.addBtnText}>Ajouter</ThemedText>
            </RNPressable>
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
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontWeight: "800", fontSize: 20 },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  inputSmall: { width: 60 },
  inputSmallWide: { width: 80 },
  addBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowChecked: { opacity: 0.6 },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  itemName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    paddingRight: 10,
  },
  itemNameChecked: { textDecorationLine: "line-through", color: "#6B7280" },
  right: { flexDirection: "row", alignItems: "center" },
  qty: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  trashBtn: { marginLeft: 10, paddingHorizontal: 6, paddingVertical: 4 },
  trashIcon: { color: "#B91C1C", fontSize: 16 },
});
