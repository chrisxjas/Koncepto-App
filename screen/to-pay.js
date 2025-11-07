import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  purple: '#9C27B0',
  background: '#F8F9FA',
};

const ToPay = ({ route, navigation }) => {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    toPay: 0,
    toConfirm: 0,
    toReceive: 0,
    toRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const parsePrice = (priceString) => {
    if (typeof priceString !== 'string') return 0;
    const cleaned = priceString.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const sortOrdersByDate = (ordersArray) => {
    return ordersArray.sort((a, b) => {
      const dateA = new Date(a.Orderdate || a.created_at || a.order_date);
      const dateB = new Date(b.Orderdate || b.created_at || b.order_date);
      return dateB - dateA; // Newest first
    });
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/get-to-pay-orders.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const sortedOrders = sortOrdersByDate(data.orders || []);
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Fetch To Pay error:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again later.');
    }
  }, [user]);

  const fetchCounts = useCallback(async () => {
    try {
      const [resPay, resConfirm, resReceive, resRate] = await Promise.all([
        fetch(`${BASE_URL}/get-to-pay-orders.php?user_id=${user.id}`),
        fetch(`${BASE_URL}/get-to-confirm-orders.php?user_id=${user.id}`),
        fetch(`${BASE_URL}/get-to-receive-orders.php?user_id=${user.id}`),
        fetch(`${BASE_URL}/get-to-rate-orders.php?user_id=${user.id}`),
      ]);

      const [dataPay, dataConfirm, dataReceive, dataRate] = await Promise.all([
        resPay.json(),
        resConfirm.json(),
        resReceive.json(),
        resRate.json(),
      ]);

      setCounts({
        toPay: dataPay.success ? dataPay.orders.length : 0,
        toConfirm: dataConfirm.success ? dataConfirm.orders.length : 0,
        toReceive: dataReceive.success ? dataReceive.orders.length : 0,
        toRate: dataRate.success ? dataRate.orders.length : 0,
      });
    } catch (error) {
      console.error('Fetch counts error:', error);
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchCounts()]);
    setLoading(false);
  }, [fetchOrders, fetchCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchAllData);
    return unsubscribe;
  }, [navigation, fetchAllData]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return colors.red;
      case 'to confirm': return colors.orange;
      case 'to receive': return colors.blue;
      case 'to rate': return colors.purple;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return 'card-outline';
      case 'to confirm': return 'time-outline';
      case 'to receive': return 'cube-outline';
      case 'to rate': return 'star-outline';
      default: return 'ellipse-outline';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays === 0) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderItem = ({ item, index }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={[
        styles.orderCard,
        index === 0 && styles.firstOrderCard,
        index === orders.length - 1 && styles.lastOrderCard
      ]}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderDate}>{formatDate(item.Orderdate)}</Text>
            <Text style={styles.orderTime}>{formatTime(item.Orderdate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsContainer}>
          {item.items.map((subItem, idx) => {
            const itemPrice = parsePrice(subItem.price);
            const itemQuantity = parseInt(subItem.quantity, 10);
            const itemSubtotal = itemPrice * itemQuantity;

            return (
              <View key={idx} style={[
                styles.itemRow,
                idx === item.items.length - 1 && styles.lastItemRow
              ]}>
                <Image
                  source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${subItem.image}` }}
                  style={styles.productImage}
                  defaultSource={require('../assets/logo.png')}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {subItem.productName}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.quantity}>Qty: {subItem.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      ₱{itemSubtotal.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Footer */}
        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Order Total:</Text>
            <Text style={styles.totalAmount}>
              ₱{parsePrice(item.total_price).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('ViewOrderDetails', { order: item, user })}
          >
            <Ionicons name="eye-outline" size={16} color={colors.white} />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const grandTotal = orders.reduce((sum, order) => sum + parsePrice(order.total_price), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile', { user })}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <View style={styles.tabContent}>
            <Ionicons name="card-outline" size={18} color={colors.white} />
            <Text style={styles.activeTabText}>To Pay</Text>
            {counts.toPay > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.toPay}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab}
          onPress={() => navigation.navigate('ToConfirm', { user })}
        >
          <View style={styles.tabContent}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>To Confirm</Text>
            {counts.toConfirm > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.toConfirm}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab}
          onPress={() => navigation.navigate('ToReceive', { user })}
        >
          <View style={styles.tabContent}>
            <Ionicons name="cube-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>To Receive</Text>
            {counts.toReceive > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.toReceive}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab}
          onPress={() => navigation.navigate('ToRate', { user })}
        >
          <View style={styles.tabContent}>
            <Ionicons name="star-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>To Rate</Text>
            {counts.toRate > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.toRate}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <>
          {/* Summary Card */}
          {orders.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Orders</Text>
                  <Text style={styles.summaryValue}>{orders.length}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Grand Total</Text>
                  <Text style={styles.summaryValue}>
                    ₱{grandTotal.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Orders List */}
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={colors.greyBorder} />
              <Text style={styles.emptyTitle}>No Orders to Pay</Text>
              <Text style={styles.emptySubtitle}>
                When you have pending payments, they will appear here
              </Text>
              <TouchableOpacity 
                style={styles.shopButton}
                onPress={() => navigation.navigate('ProductList', { user })}
              >
                <Text style={styles.shopButtonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.order_id?.toString() || Math.random().toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primaryGreen]}
                  tintColor={colors.primaryGreen}
                />
              }
            />
          )}
        </>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('ProductList', { user })} style={styles.navButton}>
          <Ionicons name="home" size={22} color={colors.white} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Message', { user })} style={styles.navButton}>
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Carts', { user })} style={styles.navButton}>
          <Ionicons name="cart" size={22} color={colors.white} />
          <Text style={styles.navLabel}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Profile', { user })} style={styles.navButton}>
          <Ionicons name="person" size={22} color={colors.white} />
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ToPay;

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
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: colors.white, 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: colors.greyBorder,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tab: { 
    flex: 1, 
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeTab: { 
    backgroundColor: colors.primaryGreen,
    elevation: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: { 
    fontSize: 12, 
    color: colors.textSecondary, 
    fontWeight: '600',
  },
  activeTabText: { 
    color: colors.white, 
    fontWeight: 'bold',
    fontSize: 12,
  },
  badge: { 
    backgroundColor: colors.red, 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 2,
  },
  badgeText: { 
    color: colors.white, 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.greyBorder,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryGreen,
  },
  orderCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryGreen,
  },
  firstOrderCard: {
    marginTop: 16,
  },
  lastOrderCard: {
    marginBottom: 100,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 13,
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
    fontWeight: '600',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
    paddingTop: 16,
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
  },
  quantity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkerGreen,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryGreen,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
  },
  viewButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.darkerGreen,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  navLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  flatListContent: {
    paddingBottom: 120,
  },
});