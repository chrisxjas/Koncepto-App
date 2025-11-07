import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { BASE_URL } from '../config';

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#F0F8F0',
  accentGreen: '#8BC34A',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  white: '#FFFFFF',
  greyBorder: '#E0E0E0',
  lightGreyBackground: '#F8F9FA',
  red: '#E74C3C',
  orange: '#F39C12',
  blue: '#3498DB',
  purple: '#9B59B6',
  background: '#F5F7FA',
};

const ViewOrderDetails = ({ route, navigation }) => {
  const { order, user } = route.params;

  const copyToClipboard = () => {
    const orderCode = order.order_code;
    Clipboard.setString(orderCode);
    Alert.alert('Copied!', 'Order code copied to clipboard');
  };

  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { 
          text: 'No', 
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/cancel-order.php`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  order_id: order.order_id || order.id,
                }),
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Order has been cancelled successfully!', [
                  { 
                    text: 'OK', 
                    onPress: () => navigation.goBack() 
                  }
                ]);
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel order. Please try again.');
              }
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Network error while canceling order. Please check your connection.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return colors.red;
      case 'to confirm': return colors.orange;
      case 'to receive': return colors.blue;
      case 'to rate': return colors.purple;
      case 'delivered': return colors.primaryGreen;
      case 'cancelled': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return 'card-outline';
      case 'to confirm': return 'time-outline';
      case 'to receive': return 'cube-outline';
      case 'to rate': return 'star-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  };

  const renderDeliverySteps = () => {
    const steps = [
      { status: 'To Confirm', icon: 'time-outline' },
      { status: 'To Pay', icon: 'card-outline' },
      { status: 'To Receive', icon: 'cube-outline' },
      { status: 'To Rate', icon: 'star-outline' },
    ];
    
    const currentStatus = order.status.toLowerCase();
    const currentIndex = steps.findIndex(step => step.status.toLowerCase() === currentStatus);

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <View key={idx} style={styles.progressStep}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepIconContainer,
                  isCompleted && styles.stepCompleted,
                  isCurrent && styles.stepCurrent,
                  isPending && styles.stepPending,
                ]}>
                  <Ionicons 
                    name={isCompleted ? 'checkmark' : step.icon} 
                    size={16} 
                    color={isCompleted || isCurrent ? colors.white : colors.textSecondary} 
                  />
                </View>
                <Text style={[
                  styles.stepText,
                  isCompleted && styles.stepTextCompleted,
                  isCurrent && styles.stepTextCurrent,
                  isPending && styles.stepTextPending,
                ]}>
                  {step.status}
                </Text>
              </View>
              {idx < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  isCompleted && styles.progressLineCompleted,
                  isPending && styles.progressLinePending,
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    if (typeof priceString === 'number') return priceString;
    if (typeof priceString === 'string') {
      const cleaned = priceString.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const calculateOrderTotal = () => {
    if (order.total_price) {
      return parsePrice(order.total_price);
    }
    // Calculate from items if total_price is not available
    return order.items.reduce((total, item) => {
      const itemPrice = parsePrice(item.price);
      const itemQuantity = parseInt(item.quantity, 10) || 1;
      return total + (itemPrice * itemQuantity);
    }, 0);
  };

  const orderTotal = calculateOrderTotal();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primaryGreen} barStyle="light-content" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Order Card - Combined Information */}
        <View style={styles.mainCard}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderCodeMainContainer}>
              <View style={styles.orderCodeContainer}>
                <Ionicons name="receipt-outline" size={20} color={colors.primaryGreen} />
                <Text style={styles.orderCode}>{order.order_code}</Text>
              </View>
              <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={18} color={colors.primaryGreen} />
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Ionicons 
                name={getStatusIcon(order.status)} 
                size={14} 
                color={getStatusColor(order.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status}
              </Text>
            </View>
          </View>

          {/* Order Date */}
          <View style={styles.orderDateContainer}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.orderDate}>
              {new Date(order.Orderdate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Order Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items && order.items.map((item, idx) => {
              const itemPrice = parsePrice(item.price);
              const itemQuantity = parseInt(item.quantity, 10) || 1;
              const itemSubtotal = itemPrice * itemQuantity;

              return (
                <View key={idx} style={[
                  styles.itemRow,
                  idx === order.items.length - 1 && styles.lastItemRow
                ]}>
                  <Image
                    source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${item.image}` }}
                    style={styles.productImage}
                    defaultSource={require('../assets/logo.png')}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.quantity}>Qty: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>
                        ₱{itemPrice.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </Text>
                    </View>
                    <Text style={styles.itemSubtotal}>
                      ₱{itemSubtotal.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Order Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>
                ₱{orderTotal.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </Text>
            </View>
          </View>

          {/* Cancel Button */}
          {['to pay', 'to confirm', 'pending'].includes(order.status.toLowerCase()) && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
              <Ionicons name="close-circle-outline" size={20} color={colors.white} />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Progress */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>
          {renderDeliverySteps()}
        </View>

        {/* Delivery Location */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Location</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: 13.7563,
                longitude: 121.0583,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              <Marker
                coordinate={{ latitude: 13.7563, longitude: 121.0583 }}
                title="Delivery Location"
                description="Your order will be delivered here"
                pinColor={colors.primaryGreen}
              />
            </MapView>
            <View style={styles.mapOverlay}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.mapAddress}>Delivery address will be shown here</Text>
            </View>
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Order Code</Text>
              <Text style={styles.infoValue}>{order.order_code}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>
                {new Date(order.Orderdate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            {order.Shipdate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Est. Delivery</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.Shipdate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ViewOrderDetails;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primaryGreen,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: colors.white,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 30,
    gap: 16,
  },
  mainCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCodeMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  copyButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.lightGreen,
  },
  orderDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGreen,
  },
  orderDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGreen,
  },
  lastItemRow: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.lightGreyBackground,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkerGreen,
  },
  itemSubtotal: {
    fontSize: 14,
    color: colors.primaryGreen,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalSection: {
    backgroundColor: colors.lightGreen,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryGreen,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: colors.primaryGreen,
  },
  stepCurrent: {
    backgroundColor: colors.blue,
  },
  stepPending: {
    backgroundColor: colors.lightGreyBackground,
    borderWidth: 2,
    borderColor: colors.greyBorder,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepTextCompleted: {
    color: colors.primaryGreen,
    fontWeight: 'bold',
  },
  stepTextCurrent: {
    color: colors.blue,
    fontWeight: 'bold',
  },
  stepTextPending: {
    color: colors.textSecondary,
  },
  progressLine: {
    position: 'absolute',
    top: 16,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: colors.greyBorder,
  },
  progressLineCompleted: {
    backgroundColor: colors.primaryGreen,
  },
  progressLinePending: {
    backgroundColor: colors.greyBorder,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 160,
  },
  mapOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lightGreyBackground,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },
  mapAddress: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.lightGreyBackground,
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});