import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  TextInput,
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
  gold: '#FFD700',
};

const ToRate = ({ route, navigation }) => {
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
  const [feedbackTexts, setFeedbackTexts] = useState({});
  const [ratings, setRatings] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [errorStars, setErrorStars] = useState({});
  const [showRated, setShowRated] = useState(false);

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

  const sortOrdersByDate = (ordersArray) => {
    return ordersArray.sort((a, b) => {
      const dateA = new Date(a.Orderdate || a.created_at || a.order_date);
      const dateB = new Date(b.Orderdate || b.created_at || b.order_date);
      return dateB - dateA;
    });
  };

  const fetchToRateOrders = useCallback(async () => {
    try {
      console.log('🔄 Fetching TO RATE orders...');
      const res = await fetch(`${BASE_URL}/get-to-rate-orders.php?user_id=${user.id}`);
      const data = await res.json();
      
      console.log('📦 TO RATE API Response:', {
        success: data.success,
        ordersCount: data.orders?.length || 0,
        orders: data.orders
      });
      
      if (data.success && data.orders) {
        const processedOrders = data.orders.map(order => {
          const orderTotal = order.items.reduce((sum, item) => {
            const itemPrice = parsePrice(item.price);
            const itemQuantity = parseInt(item.quantity, 10) || 1;
            return sum + (itemPrice * itemQuantity);
          }, 0);
          
          return {
            ...order,
            total_price: orderTotal,
            items: order.items.map(item => ({
              ...item,
              price: parsePrice(item.price),
              quantity: parseInt(item.quantity, 10) || 1,
              feedback: null,
              star: 0
            }))
          };
        });
        
        const sortedOrders = sortOrdersByDate(processedOrders);
        setOrders(sortedOrders);
        console.log('✅ Processed TO RATE orders:', sortedOrders.length);
      } else {
        console.log('❌ No to-rate orders found');
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Fetch To Rate error:', error);
      setOrders([]);
    }
  }, [user]);

  const fetchRatedOrders = useCallback(async () => {
    try {
      console.log('🔄 Fetching RATED orders...');
      const res = await fetch(`${BASE_URL}/get-rated-orders.php?user_id=${user.id}`);
      const data = await res.json();
      
      console.log('⭐ RATED ORDERS FULL API RESPONSE:', JSON.stringify(data, null, 2));
      
      if (data.success && data.orders) {
        console.log(`📊 Found ${data.orders.length} rated orders from API`);
        
        const processedOrders = data.orders.map((order, index) => {
          const orderTotal = order.items.reduce((sum, item) => {
            const itemPrice = parsePrice(item.price);
            const itemQuantity = parseInt(item.quantity, 10) || 1;
            return sum + (itemPrice * itemQuantity);
          }, 0);
          
          console.log(`📦 Order ${index + 1}:`, {
            order_id: order.order_id,
            items_count: order.items.length,
            items_with_feedback: order.items.filter(item => item.feedback && item.feedback.trim() !== '').length
          });

          order.items.forEach((item, itemIndex) => {
            console.log(`   Item ${itemIndex + 1}:`, {
              product_id: item.product_id,
              has_feedback: !!(item.feedback && item.feedback.trim() !== ''),
              feedback_length: item.feedback?.length || 0,
              star: item.star,
              feedback: item.feedback
            });
          });
          
          return {
            ...order,
            total_price: orderTotal,
            items: order.items.map(item => ({
              ...item,
              price: parsePrice(item.price),
              quantity: parseInt(item.quantity, 10) || 1,
              feedback: item.feedback || null,
              star: item.star || 0
            }))
          };
        });
        
        const sortedOrders = sortOrdersByDate(processedOrders);
        setOrders(sortedOrders);
        console.log('✅ Processed RATED orders for display:', sortedOrders.length);
      } else {
        console.log('❌ No rated orders found in API response');
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Fetch Rated Orders error:', error);
      setOrders([]);
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
    console.log(`🔄 Fetching ${showRated ? 'RATED' : 'TO RATE'} orders...`);
    
    if (showRated) {
      await fetchRatedOrders();
    } else {
      await fetchToRateOrders();
    }
    await fetchCounts();
    setLoading(false);
  }, [fetchToRateOrders, fetchRatedOrders, fetchCounts, showRated]);

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
      case 'delivered': return colors.primaryGreen;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay': return 'card-outline';
      case 'to confirm': return 'time-outline';
      case 'to receive': return 'cube-outline';
      case 'to rate': return 'star-outline';
      case 'delivered': return 'checkmark-circle-outline';
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

  const handleFeedbackChange = (orderId, productId, text) => {
    setFeedbackTexts((prev) => ({
      ...prev,
      [`${orderId}-${productId}`]: text,
    }));
  };

  const handleStarPress = (orderId, productId, starCount) => {
    const key = `${orderId}-${productId}`;
    setRatings((prev) => ({
      ...prev,
      [key]: starCount,
    }));
    setErrorStars((prev) => ({
      ...prev,
      [key]: false,
    }));
  };

  const confirmSubmitFeedback = (orderId, productId) => {
    Alert.alert(
      'Submit your feedback now?',
      '',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => handleSubmitFeedback(orderId, productId) },
      ]
    );
  };

  const handleSubmitFeedback = async (orderId, productId) => {
    const key = `${orderId}-${productId}`;
    const feedback = feedbackTexts[key];
    const star = ratings[key];

    if (!star) {
      setErrorStars((prev) => ({
        ...prev,
        [key]: true,
      }));
      Alert.alert('Validation Error', 'Please select a star rating (1 to 5 stars).');
      return;
    }

    if (!feedback || feedback.trim() === '') {
      Alert.alert('Validation Error', 'Please write feedback before submitting.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/send-feedback.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          order_id: orderId,
          product_id: productId,
          feedback: feedback,
          star: star,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Thank you!', 'Your feedback has been submitted.');
        setSubmitted((prev) => ({
          ...prev,
          [key]: { feedback, star },
        }));
        fetchAllData();
      } else {
        Alert.alert('Error', result.message || 'Failed to submit feedback.');
      }
    } catch (error) {
      console.error('Feedback Submit Error:', error);
      Alert.alert('Error', 'Something went wrong while submitting feedback.');
    }
  };

  const handleBuyAgain = async (productId, productData) => {
    try {
      console.log('🛒 Buy Again clicked for product_id:', productId);
      
      // Create product object from available data
      const product = {
        id: productId,
        productName: productData.productName,
        price: productData.price,
        image: productData.image,
        description: productData.description || 'Product description not available.',
        brandName: productData.brandName || 'Unknown Brand',
        ArtMat: productData.ArtMat || 'No'
      };
      
      console.log('📦 Navigating with product:', product);
      
      navigation.navigate('ProductDetail', { 
        product: product,
        user: user 
      });
    } catch (error) {
      console.error('❌ Buy Again error:', error);
      Alert.alert('Error', 'Failed to navigate to product details.');
    }
  };

  const renderItem = ({ item, index }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    // SIMPLE FILTERING: For rated orders, show all items (since API only returns rated items)
    // For to-rate orders, show all items (since API only returns unrated items)
    const itemsToDisplay = item.items;

    console.log(`🎯 Rendering Order ${item.order_id}:`, {
      showRated,
      totalItems: item.items.length,
      itemsToDisplay: itemsToDisplay.length,
      firstItemFeedback: item.items[0]?.feedback || 'none'
    });

    if (itemsToDisplay.length === 0) {
      console.log(`🚫 Skipping order ${item.order_id} - no items to display`);
      return null;
    }

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
            <Text style={styles.orderCode}>Order #: {item.order_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {showRated ? 'Rated' : item.status}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsContainer}>
          {itemsToDisplay.map((subItem, idx) => {
            const key = `${item.order_id}-${subItem.product_id}`;
            
            // FIXED: Properly check if item is submitted/rated
            const hasFeedback = subItem.feedback && subItem.feedback.trim() !== '';
            const isSubmitted = submitted[key] || hasFeedback;
            
            const displayedStar = ratings[key] ?? submitted[key]?.star ?? subItem.star ?? 0;
            const displayedFeedback = feedbackTexts[key] ?? submitted[key]?.feedback ?? subItem.feedback ?? '';
            const hasError = errorStars[key];

            const itemPrice = parsePrice(subItem.price);
            const itemQuantity = parseInt(subItem.quantity, 10);
            const itemSubtotal = itemPrice * itemQuantity;

            console.log(`   📦 Rendering Item ${idx}:`, {
              product_id: subItem.product_id,
              isSubmitted,
              hasFeedback,
              feedback: subItem.feedback,
              displayedStar
            });

            return (
              <View key={idx} style={[
                styles.itemRow,
                idx === itemsToDisplay.length - 1 && styles.lastItemRow
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

                  {/* Star Rating Section - Only show for unrated items */}
                  {!isSubmitted && (
                    <>
                      <View style={[styles.starRow, hasError && styles.starErrorBorder]}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => handleStarPress(item.order_id, subItem.product_id, star)}
                          >
                            <Ionicons
                              name={displayedStar >= star ? 'star' : 'star-outline'}
                              size={20}
                              color={hasError ? colors.red : colors.gold}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>

                      {hasError && (
                        <Text style={styles.errorMessage}>
                          Please select a star rating (1 as lowest, 5 as highest).
                        </Text>
                      )}
                    </>
                  )}

                  {/* Feedback Input/Display Section */}
                  {isSubmitted ? (
                    <>
                      <Text style={styles.submittedRatingText}>⭐ {displayedStar} star(s)</Text>
                      <Text style={styles.submittedFeedbackText}>{displayedFeedback}</Text>
                      
                      {/* Buy Again Button - Only show for rated items */}
                      <TouchableOpacity
                        style={styles.buyAgainButton}
                        onPress={() => handleBuyAgain(subItem.product_id, subItem)}
                      >
                        <Ionicons name="cart" size={16} color={colors.white} />
                        <Text style={styles.buyAgainButtonText}>Buy Again</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.feedbackRow}>
                      <TextInput
                        style={styles.feedbackInput}
                        placeholder="Write your feedback..."
                        value={feedbackTexts[key] || ''}
                        onChangeText={(text) =>
                          handleFeedbackChange(item.order_id, subItem.product_id, text)
                        }
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={() => confirmSubmitFeedback(item.order_id, subItem.product_id)}
                      >
                        <Ionicons name="arrow-up-circle" size={24} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  )}
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
        </View>
      </View>
    );
  };

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
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => navigation.navigate('ToPay', { user })}
        >
          <View style={styles.tabContent}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tabText}>To Pay</Text>
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

        {/* Active Tab for To Rate */}
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <View style={styles.tabContent}>
            <Ionicons name="star-outline" size={18} color={colors.white} />
            <Text style={styles.activeTabText}>To Rate</Text>
            {counts.toRate > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.toRate}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Toggle Button */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => {
            console.log(`🔄 Toggling from showRated: ${showRated} to: ${!showRated}`);
            setShowRated(!showRated);
            // Auto-reload when toggling
            fetchAllData();
          }}
        >
          <Ionicons 
            name={showRated ? "star" : "star-outline"} 
            size={16} 
            color={colors.purple} 
          />
          <Text style={styles.toggleText}>
            {showRated ? 'Show Rated Orders':'Show To Rate' }
          </Text>
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
          {/* Orders List */}
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={showRated ? "star" : "star-outline"} 
                size={64} 
                color={colors.greyBorder} 
              />
              <Text style={styles.emptyTitle}>
                {showRated ? 'No Rated Orders' : 'No Orders to Rate'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {showRated 
                  ? 'When you rate orders, they will appear here'
                  : 'When you have orders to rate, they will appear here'
                }
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

export default ToRate;

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
  toggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: colors.purple,
    fontWeight: '600',
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
    marginBottom: 2,
  },
  orderCode: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
    alignItems: 'flex-start',
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
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkerGreen,
  },
  starRow: {
    flexDirection: 'row',
    marginVertical: 8,
    gap: 4,
  },
  starErrorBorder: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 8,
    padding: 4,
  },
  errorMessage: {
    color: colors.red,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 5,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  feedbackInput: {
    flex: 1,
    borderColor: colors.greyBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: colors.white,
    height: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primaryGreen,
    padding: 8,
    borderRadius: 8,
  },
  submittedRatingText: {
    fontStyle: 'italic',
    color: colors.darkerGreen,
    fontSize: 13,
    marginTop: 5,
    fontWeight: '500',
  },
  submittedFeedbackText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  buyAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  buyAgainButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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