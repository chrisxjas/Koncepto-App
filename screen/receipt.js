import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../config";

export default function Receipts({ route }) {
  const navigation = useNavigation();
  const { user } = route.params; // ✅ FIX: Get user from route params
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!user || !user.id) {
        setError("User information missing.");
        setLoading(false);
        return;
      }

      try {
        const url = `${BASE_URL}/receipt.php?user_id=${user.id}`;
        console.log("Fetching receipts from:", url);

        const res = await axios.get(url, {
          headers: { Accept: "application/json" },
        });

        if (res.data && res.data.success) {
          console.log("Fetched receipts:", res.data.receipts);
          setReceipts(res.data.receipts);
          setError("");
        } else {
          setError(res.data?.message || "No receipts found.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Unable to fetch receipts. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [user]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading receipts...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#E8F5E9" }}>
      {/* ✅ HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Receipts</Text>
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {receipts.length === 0 ? (
          <Text style={styles.noData}>No receipts found.</Text>
        ) : (
          receipts.map((order, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.section}>
                <Text style={styles.orderCode}>
                  Order Code: <Text style={styles.blue}>{order.order_code}</Text>
                </Text>
                <Text>
                  Type: <Text style={styles.purple}>{order.order_type}</Text>
                </Text>
                <Text>
                  Status: <Text style={styles.green}>{order.status}</Text>
                </Text>
                <Text>
                  Customer: <Text style={styles.bold}>{order.customer_name}</Text>
                </Text>
                <Text>Email: {order.customer_email}</Text>
                <Text>Contact: {order.customer_contact}</Text>
                <Text>
                  Order Date:{" "}
                  {order.order_date
                    ? new Date(order.order_date).toLocaleDateString()
                    : "N/A"}
                </Text>
                {order.ship_date && (
                  <Text>
                    Ship Date: {new Date(order.ship_date).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* Items */}
              {order.items && order.items.length > 0 ? (
                order.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemDetail}>
                          {item.quantity} × ₱{item.unit_price.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemTotal}>
                      ₱{item.item_total.toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noData}>No items found.</Text>
              )}

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text>Payment Method:</Text>
                <Text style={styles.bold}>{order.payment_method || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text>Total Amount:</Text>
                <Text style={styles.total}>
                  ₱{parseFloat(order.payment_amount || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text>Payment Date:</Text>
                <Text>
                  {order.payment_date
                    ? new Date(order.payment_date).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>

              <Text style={styles.footer}>Thank you for your purchase!</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    height: Platform.OS === "ios" ? 90 : 70,
    paddingTop: Platform.OS === "ios" ? 40 : 0,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  section: { marginBottom: 8 },
  orderCode: { fontWeight: "bold", fontSize: 16 },
  blue: { color: "#1D4ED8" },
  purple: { color: "#7C3AED" },
  green: { color: "#059669" },
  bold: { fontWeight: "500" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    alignItems: "center",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemName: { fontWeight: "500" },
  itemDetail: { color: "#6B7280", fontSize: 12 },
  itemTotal: { fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  total: { fontWeight: "700", color: "#059669" },
  footer: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    fontStyle: "italic",
    fontSize: 12,
  },
  error: { color: "red", textAlign: "center", fontSize: 14 },
  noData: { textAlign: "center", color: "#6B7280", fontSize: 14 },
});
