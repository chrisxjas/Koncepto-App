import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';

const Receipt = ({ route }) => {
  const { user_id, order_code } = route.params;
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/get-receipt.php?user_id=${user_id}&order_code=${order_code}`)
      .then(res => res.json())
      .then(json => {
        setReceiptData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user_id, order_code]);

  if (loading) return <Text style={styles.loadingText}>Loading receipt...</Text>;
  if (!receiptData || !receiptData.success) return <Text style={styles.loadingText}>No receipt found</Text>;

  const { order } = receiptData;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Receipt</Text>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Order Code:</Text>
          <Text style={styles.value}>{order.order_code}</Text>

          <Text style={styles.label}>Order Status:</Text>
          <Text style={styles.value}>{order.order_status}</Text>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.subHeading}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemText}>{item.productName} ({item.brandName})</Text>
              <Text style={styles.itemText}>Qty: {item.quantity}</Text>
              <Text style={styles.itemText}>₱{parseFloat(item.price).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Payment Info */}
        {order.payment && (
          <View style={styles.section}>
            <Text style={styles.subHeading}>Payment</Text>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>₱{parseFloat(order.payment.amount).toFixed(2)}</Text>

            <Text style={styles.label}>Order Type:</Text>
            <Text style={styles.value}>{order.payment.order_type}</Text>

            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{order.payment.payment_method}</Text>

            <Text style={styles.label}>Payment Status:</Text>
            <Text style={styles.value}>{order.payment.payment_status}</Text>

            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{order.payment.payment_date}</Text>

            {order.payment.payment_proof && (
              <>
                <Text style={styles.label}>Payment Proof:</Text>
                <Image source={{ uri: `${BASE_URL}/${order.payment.payment_proof}` }} style={styles.paymentImage} />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Receipt;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 15 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  section: { marginBottom: 20, padding: 15, borderRadius: 10, backgroundColor: '#f5f5f5' },
  subHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  label: { fontWeight: 'bold', color: '#333', marginTop: 5 },
  value: { color: '#555', marginBottom: 5 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  itemText: { fontSize: 14, color: '#333' },
  paymentImage: { width: '100%', height: 200, marginTop: 10, borderRadius: 8 },
  loadingText: { padding: 15, fontSize: 16, textAlign: 'center' },
});
