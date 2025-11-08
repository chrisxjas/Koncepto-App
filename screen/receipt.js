import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../config";

export default function Receipts({ route }) {
  const navigation = useNavigation();
  const { user } = route.params;
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchReceipts = useCallback(async () => {
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
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReceipts();
  }, [fetchReceipts]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'paid':
        return "#059669"; // green
      case 'pending':
      case 'to confirm':
        return "#D97706"; // orange
      case 'cancelled':
      case 'denied':
        return "#DC2626"; // red
      case 'to receive':
        return "#2563EB"; // blue
      default:
        return "#6B7280"; // gray
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return "#059669"; // green
      case 'pending':
        return "#D97706"; // orange
      case 'failed':
      case 'cancelled':
        return "#DC2626"; // red
      default:
        return "#6B7280"; // gray
    }
  };

  if (loading && !refreshing)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading receipts...</Text>
      </View>
    );

  if (error && !refreshing)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReceipts}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#E8F5E9" }}>
      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Receipts</Text>
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
      >
        {receipts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.noData}>No receipts found</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check back later for new receipts
            </Text>
          </View>
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
                <View style={styles.statusRow}>
                  <Text>Order Status: </Text>
                  <Text style={[styles.status, { color: getStatusColor(order.status) }]}>
                    {order.status}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text>Payment Status: </Text>
                  <Text style={[styles.status, { color: getPaymentStatusColor(order.payment_status) }]}>
                    {order.payment_status}
                  </Text>
                </View>
                <Text>
                  Customer: <Text style={styles.bold}>{order.customer_name}</Text>
                </Text>
                <Text>Email: {order.customer_email}</Text>
                <Text>Contact: {order.customer_contact}</Text>
                {order.ship_date && (
                  <Text>
                    Ship Date: {new Date(order.ship_date).toLocaleDateString()}
                  </Text>
                )}
                {order.payment_date && (
                  <Text>
                    Payment Date: {new Date(order.payment_date).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text>Payment Method:</Text>
                <Text style={styles.bold}>{order.payment_method || "N/A"}</Text>
              </View>
              
              {/* Payment Proof */}
              {order.payment_proof && (
                <View style={styles.row}>
                  <Text>Payment Proof:</Text>
                  <Text style={styles.blue}>Available</Text>
                </View>
              )}

              <View style={styles.row}>
                <Text>Total Amount:</Text>
                <Text style={styles.total}>
                  ₱{parseFloat(order.total_amount || 0).toFixed(2)}
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
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 1,
  },
  status: {
    fontWeight: "600",
    fontSize: 13,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
    alignItems: "center",
  },
  total: { 
    fontWeight: "700", 
    color: "#059669",
    fontSize: 16,
  },
  footer: {
    marginTop: 12,
    textAlign: "center",
    color: "#6B7280",
    fontStyle: "italic",
    fontSize: 12,
  },
  error: { 
    color: "red", 
    textAlign: "center", 
    fontSize: 14,
    marginBottom: 16,
  },
  noData: { 
    textAlign: "center", 
    color: "#6B7280", 
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptySubtitle: {
    textAlign: "center", 
    color: "#6B7280", 
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});