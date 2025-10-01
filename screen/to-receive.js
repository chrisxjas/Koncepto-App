import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';

// Shared colors
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
  red: '#E53935',    // To Pay
  orange: '#FF9800', // To Confirm
  blue: '#2196F3',   // To Rate
};

const ToReceive = ({ route, navigation }) => {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    toPay: 0,
    toConfirm: 0,
    toReceive: 0,
    toRate: 0,
  });

  const parsePrice = (priceString) => {
    if (typeof priceString !== 'string') return 0;
    const cleaned = priceString.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const fetchToReceiveOrders = async () => {
    try {
      const res = await fetch(`${BASE_URL}/get-to-receive-orders.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const processed = data.orders.map(order => {
          const orderTotal = order.items.reduce((sum, item) => {
            return sum + parsePrice(item.price) * parseInt(item.quantity, 10);
          }, 0);
          return { ...order, total_price: orderTotal.toFixed(2) };
        });
        setOrders(processed);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Fetch To Receive error:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderCounts = async () => {
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
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchToReceiveOrders();
      fetchOrderCounts();
    });
    return unsubscribe;
  }, [navigation]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return styles.statusRed;
      case 'to confirm': return styles.statusOrange;
      case 'to receive': return styles.statusGreen;
      case 'to rate': return styles.statusBlue;
      default: return styles.statusDefault;
    }
  };

  const renderItem = ({ item }) => {
    const orderDate = new Date(item.Orderdate);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <View style={styles.orderCard}>
        <Text style={styles.orderInfo}>Order Date: {formattedDate}</Text>
        <View style={styles.itemsContainer}>
          {item.items.map((subItem, idx) => {
            const itemSubtotal = parsePrice(subItem.price) * parseInt(subItem.quantity, 10);
            return (
              <View key={idx} style={styles.itemRow}>
                <Image
                  source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${subItem.image}` }}
                  style={styles.image}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productName}>{subItem.productName}</Text>
                  <Text style={styles.qty}>Qty: {subItem.quantity}</Text>
                  <View style={styles.priceCancelRow}>
                    <Text style={styles.price}>
                      ₱ {itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={[styles.status, getStatusColor(item.status)]}>{item.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.orderTotalContainer}>
          <Text style={styles.orderTotalText}>
            Total: ₱ {parsePrice(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  };

  const grandTotal = orders.reduce((sum, order) => sum + parsePrice(order.total_price), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { user })}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>To Receive</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Fixed Tabs */}
      <View style={styles.fixedTabContainer}>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('ToPay', { user })}>
          <View style={styles.tabInner}>
            <Text style={styles.tabText}>To Pay</Text>
            {counts.toPay > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{counts.toPay}</Text></View>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('ToConfirm', { user })}>
          <View style={styles.tabInner}>
            <Text style={styles.tabText}>To Confirm</Text>
            {counts.toConfirm > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{counts.toConfirm}</Text></View>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabButton, styles.activeTabButton]}>
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, styles.activeTabText]}>To Receive</Text>
            {counts.toReceive > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{counts.toReceive}</Text></View>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('ToRate', { user })}>
          <View style={styles.tabInner}>
            <Text style={styles.tabText}>To Rate</Text>
            {counts.toRate > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{counts.toRate}</Text></View>}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primaryGreen} style={styles.loadingIndicator} />
      ) : (
        <>
          <View style={styles.summaryContainer}>
            <Text style={styles.orderCountText}>Total Orders: {orders.length}</Text>
            {orders.length > 0 && (
              <Text style={styles.grandTotalText}>
                Grand Total: ₱ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>

          {orders.length === 0 ? (
            <Text style={styles.empty}>No orders to receive yet.</Text>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.order_id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('ProductList', { user })} style={styles.navButton}>
          <Ionicons name="home" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Message', { user })} style={styles.navButton}>
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Carts', { user })} style={styles.navButton}>
          <Ionicons name="cart" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { user })} style={styles.navButton}>
          <Ionicons name="person" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ToReceive;

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
  
  // Fixed tab container
  fixedTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    height: 50, // fixed height
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  tabInner: { flexDirection: 'row', alignItems: 'center' },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  activeTabButton: {},
  activeTabText: {
    fontWeight: 'bold',
    color: colors.primaryGreen,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryGreen,
    paddingBottom: 2,
  },
  badge: {
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

  summaryContainer: {
    backgroundColor: colors.white,
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCountText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 5 },
  grandTotalText: { fontSize: 16, fontWeight: 'bold', color: colors.darkerGreen },

  orderCard: {
    backgroundColor: colors.white,
    marginTop: 10,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderInfo: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: colors.textPrimary },
  itemsContainer: { borderTopWidth: 1, borderTopColor: colors.greyBorder, paddingTop: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.greyBorder,
  },
  image: { width: 70, height: 70, borderRadius: 6, backgroundColor: colors.lightGreyBackground, marginRight: 12 },
  itemDetails: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  qty: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  priceCancelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  price: { fontSize: 14, fontWeight: 'bold', color: colors.darkerGreen },
  status: { fontSize: 12, marginTop: 6, fontStyle: 'italic', alignSelf: 'flex-end' },
  statusRed: { color: colors.red }, statusOrange: { color: colors.orange },
  statusGreen: { color: colors.primaryGreen }, statusBlue: { color: colors.blue },
  statusDefault: { color: colors.textSecondary },
  orderTotalContainer: { borderTopWidth: 1, borderTopColor: colors.greyBorder, paddingTop: 10, marginTop: 10 },
  orderTotalText: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },

  loadingIndicator: { marginTop: 50 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 15, color: colors.textSecondary, fontStyle: 'italic' },
  
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  navLabel: { color: colors.white, fontSize: 11, textAlign: 'center', marginTop: 2 },
  navButton: { alignItems: 'center', padding: 5, borderRadius: 5 },
  flatListContent: { paddingBottom: 100 },
});
