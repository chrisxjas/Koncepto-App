// view-order-detail.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { BASE_URL } from '../config';

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#F0F8F0',
  accentGreen: '#8BC34A',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  greyBorder: '#DDDDDD',
  lightGreyBackground: '#FAFAFA',
  red: '#E53935',
  orange: '#FF9800',
  blue: '#2196F3',
};

const ViewOrderDetails = ({ route, navigation }) => {
  const { order, user } = route.params;

  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('order_id', order.order_id);

              const res = await fetch(`${BASE_URL}/cancel-order-item.php`, {
                method: 'POST',
                body: formData,
              });

              const data = await res.json();
              if (data.success) {
                Alert.alert('Success', 'Order cancelled successfully!');
                navigation.goBack();
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel order.');
              }
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Network error while canceling order.');
            }
          },
        },
      ]
    );
  };

  const renderDeliverySteps = () => {
    const steps = ['To Confirm', 'To Pay', 'To Receive', 'To Rate'];
    return (
      <View style={styles.progressContainer}>
        {steps.map((step, idx) => {
          const active = step.toLowerCase() === order.status.toLowerCase();
          return (
            <View key={idx} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  active && { backgroundColor: colors.primaryGreen },
                ]}
              />
              <Text style={[styles.progressText, active && { color: colors.primaryGreen }]}>
                {step}
              </Text>
              {idx < steps.length - 1 && <View style={styles.progressLine} />}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Order Info */}
        <Text style={styles.sectionTitle}>Order #{order.order_id}</Text>
        <Text style={styles.subText}>
          Date: {new Date(order.Orderdate).toLocaleDateString()}
        </Text>
        <Text style={[styles.status, { marginBottom: 10 }]}>Status: {order.status}</Text>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Image
                source={{ uri: `${BASE_URL.replace('/api', '')}/../storage/${item.image}` }}
                style={styles.image}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.qty}>Qty: {item.quantity}</Text>
                <Text style={styles.price}>₱ {parseFloat(item.price).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Total: ₱ {parseFloat(order.total_price).toFixed(2)}</Text>

        {/* Cancel Button for To Pay or To Confirm */}
        {['to pay', 'to confirm'].includes(order.status.toLowerCase()) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        {/* Delivery Progress */}
        <Text style={styles.sectionTitle}>Delivery Progress</Text>
        {renderDeliverySteps()}

        {/* Map */}
        <Text style={styles.sectionTitle}>Delivery Location</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 13.7563, // placeholder
            longitude: 121.0583, // placeholder
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={{ latitude: 13.7563, longitude: 121.0583 }}
            title="Delivery Address"
            description="Your order is on the way"
          />
        </MapView>
      </ScrollView>
    </View>
  );
};

export default ViewOrderDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGreyBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  scrollContent: { padding: 15, paddingBottom: 80 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  subText: { fontSize: 13, color: colors.textSecondary },
  status: { fontSize: 14, fontStyle: 'italic', color: colors.orange },
  itemsContainer: { backgroundColor: colors.white, borderRadius: 8, padding: 10 },
  itemRow: { flexDirection: 'row', marginBottom: 10 },
  image: { width: 70, height: 70, marginRight: 10, borderRadius: 6 },
  productName: { fontSize: 14, fontWeight: 'bold' },
  qty: { fontSize: 13, color: colors.textSecondary },
  price: { fontSize: 14, fontWeight: 'bold', color: colors.darkerGreen },
  total: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  cancelButton: {
    backgroundColor: colors.red,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.white, fontWeight: 'bold' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    justifyContent: 'space-between',
  },
  progressStep: { flex: 1, alignItems: 'center' },
  progressCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.greyBorder,
    marginBottom: 5,
  },
  progressText: { fontSize: 12, color: colors.textSecondary },
  progressLine: {
    position: 'absolute',
    top: 9,
    right: -50,
    width: 100,
    height: 2,
    backgroundColor: colors.greyBorder,
  },
  map: { width: '100%', height: 200, marginTop: 10, borderRadius: 8 },
});
