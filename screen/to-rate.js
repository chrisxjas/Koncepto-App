import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';

// Define colors in a shared object for consistency
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
  red: '#E53935',    // For 'To Pay' status
  orange: '#FF9800', // For 'To Confirm' status
  blue: '#2196F3',   // For 'To Rate' status
  gold: '#FFD700',   // For star ratings
};


const ToRate = ({ route, navigation }) => {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackTexts, setFeedbackTexts] = useState({});
  const [ratings, setRatings] = useState({});
  const [submitted, setSubmitted] = useState({}); // To track submitted feedback locally until refresh
  const [errorStars, setErrorStars] = useState({}); // To show error if stars not selected
  const [showRated, setShowRated] = useState(false); // Toggle between To Rate and Rated

  // Helper function to clean and parse price strings
  const parsePrice = (priceString) => {
    if (typeof priceString !== 'string') {
      return 0; // Return 0 if it's not a string
    }
    // Remove non-numeric characters except for the dot
    const cleanedPrice = priceString.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanedPrice);
    return isNaN(parsed) ? 0 : parsed; // Return 0 if parsing results in NaN
  };

  const fetchToRateOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/get-to-rate-orders.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setFeedbackTexts({});
        setRatings({});
        setSubmitted({});
        setErrorStars({});
      }
    } catch (error) {
      console.error('Fetch To Rate error:', error);
      Alert.alert('Error', 'Failed to load orders to rate. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRatedOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/get-rated-orders.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setFeedbackTexts({});
        setRatings({});
        setSubmitted({});
        setErrorStars({});
      }
    } catch (error) {
      console.error('Fetch Rated Orders error:', error);
      Alert.alert('Error', 'Failed to load rated orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // This listener ensures data is fetched when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      // Fetch based on the current showRated state
      if (showRated) {
        fetchRatedOrders();
      } else {
        fetchToRateOrders();
      }
    });

    return unsubscribe; // Clean up the listener
  }, [navigation, showRated]); // Re-run effect if showRated changes

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
      [key]: false, // Clear error when a star is selected
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
          [key]: { feedback, star }, // Mark as submitted locally
        }));
        // Optionally, re-fetch orders to update the list, or remove the item
        // For simplicity, we'll re-fetch based on current toggle state
        if (showRated) {
          fetchRatedOrders();
        } else {
          fetchToRateOrders();
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to submit feedback.');
      }
    } catch (error) {
      console.error('Feedback Submit Error:', error);
      Alert.alert('Error', 'Something went wrong while submitting feedback.');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to pay':
        return styles.statusRed;
      case 'to confirm':
        return styles.statusOrange;
      case 'to receive': // Corrected from 'to recieve'
        return styles.statusGreen;
      case 'to rate':
        return styles.statusBlue;
      default:
        return styles.statusDefault;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }) => {
    // Filter items based on the showRated toggle and whether they have feedback
    const itemsToDisplay = item.items.filter((subItem) => {
      const alreadyRated = !!subItem.feedback; // Check if feedback exists for this item
      return showRated ? alreadyRated : !alreadyRated; // Show rated if true, show unrated if false
    });

    if (itemsToDisplay.length === 0) {
      return null; // Don't render card if no items match filter
    }

    return (
      <View style={styles.orderCard}>
        <Text style={styles.orderInfo}>Order Date: {formatDate(item.Orderdate)}</Text>
        <View style={styles.itemsContainer}>
          {itemsToDisplay.map((subItem, index) => {
            const key = `${item.order_id}-${subItem.product_id}`;
            // Determine if feedback is locally submitted or already from API
            const isSubmitted = submitted[key] || subItem.feedback;
            // Use local rating, then submitted local, then API rating, default to 0
            const displayedStar = ratings[key] ?? submitted[key]?.star ?? subItem.star ?? 0;
            // Use local feedback, then submitted local, then API feedback, default to empty
            const displayedFeedback = feedbackTexts[key] ?? submitted[key]?.feedback ?? subItem.feedback ?? '';
            const hasError = errorStars[key]; // Check for star selection error

            // Calculate item subtotal for display consistency with ToPay/ToReceive
            const itemPrice = parsePrice(subItem.price);
            const itemQuantity = parseInt(subItem.quantity, 10);
            const itemSubtotal = itemPrice * itemQuantity;

            return (
              <View key={index} style={styles.itemRow}>
                <Image
                  source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${subItem.image}` }}
                  style={styles.image}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productName}>{subItem.productName}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.qty}>Qty: {subItem.quantity}</Text>
                    {/* Display item subtotal (price * quantity) */}
                    <Text style={styles.price}>₱ {itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                  <Text style={[styles.status, getStatusColor(item.status)]}>{item.status}</Text>

                  {/* Star Rating Section */}
                  <View style={[styles.starRow, hasError && styles.starErrorBorder]}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const starIcon = (
                        <Ionicons
                          name={displayedStar >= star ? 'star' : 'star-outline'}
                          size={20}
                          color={hasError ? colors.red : colors.gold} // Red if error, else gold
                        />
                      );

                      if (isSubmitted) { // If already submitted, just display stars, no touch
                        return <View key={star}>{starIcon}</View>;
                      }

                      return (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleStarPress(item.order_id, subItem.product_id, star)}
                        >
                          {starIcon}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {hasError && (
                    <Text style={styles.errorMessage}>
                      Please select a star rating (1 as lowest, 5 as highest).
                    </Text>
                  )}

                  {/* Feedback Input/Display Section */}
                  {isSubmitted ? (
                    <>
                      <Text style={styles.submittedRatingText}>⭐ {displayedStar} star(s)</Text>
                      <Text style={styles.submittedFeedbackText}>{displayedFeedback}</Text>
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
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        onPress={() => confirmSubmitFeedback(item.order_id, subItem.product_id)}
                      >
                        <Ionicons name="arrow-forward-circle" size={32} color={colors.primaryGreen} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { user })}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>To Rate</Text>
        <View style={{ width: 24 }} /> {/* Spacer for consistent centering */}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('ToPay', { user })}
        >
          <Text style={styles.tabText}>To Pay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('ToConfirm', { user })}
        >
          <Text style={styles.tabText}>To Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('ToReceive', { user })}
        >
          <Text style={styles.tabText}>To Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, styles.activeTabButton]}>
          <Text style={[styles.tabText, styles.activeTabText]}>To Rate</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Button for Rated/To Rate */}
      <View style={styles.toggleButtonContainer}>
        <TouchableOpacity
          onPress={() => {
            if (!showRated) {
              fetchRatedOrders();
            } else {
              fetchToRateOrders();
            }
            setShowRated(!showRated);
          }}
        >
          <Text style={styles.toggleRatedText}>
            {showRated ? 'See To Rate' : 'See Rated Orders'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primaryGreen} style={styles.loadingIndicator} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>
          {showRated ? 'No rated orders yet.' : 'No orders to rate yet.'}
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductList', { user })}
          style={styles.navButton}
        >
          <Ionicons name="home" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Message', { user })}
          style={styles.navButton}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Carts', { user })}
          style={styles.navButton}
        >
          <Ionicons name="cart" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { user })}
          style={styles.navButton}
        >
          <Ionicons name="person" size={24} color={colors.white} />
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ToRate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Ensures space around title
    paddingHorizontal: 15,
    paddingVertical: 12, // Adjusted padding
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    // No marginLeft here for better centering with space-between
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10, // Adjusted padding
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15, // Wider touch area
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabButton: {
    // No specific style for the button itself, only its text
  },
  activeTabText: {
    fontWeight: 'bold',
    color: colors.primaryGreen,
    borderBottomWidth: 2, // Underline effect
    borderColor: colors.primaryGreen,
    paddingBottom: 2, // Space between text and underline
  },

  toggleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10, // Adjusted margin
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  toggleRatedText: {
    fontSize: 13, // Slightly larger font
    color: colors.primaryGreen,
    fontWeight: '600', // Stronger weight
  },

  orderCard: {
    backgroundColor: colors.white,
    marginTop: 10,
    marginHorizontal: 15, // Consistent horizontal margin
    padding: 15, // Consistent padding
    borderRadius: 8,
    shadowColor: '#000', // Shadow properties
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderInfo: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder, // Consistent border color
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center', // Aligns items vertically
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, // Thin separator
    borderBottomColor: colors.greyBorder,
  },
  image: {
    width: 70, // Larger image
    height: 70,
    borderRadius: 6, // Slightly larger border radius
    backgroundColor: colors.lightGreyBackground,
    marginRight: 12, // Consistent margin
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center', // Center content vertically within the flex item
  },
  productName: {
    fontSize: 15, // Larger font
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row', // Display qty and price in a row
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  qty: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 14, // Consistent price font size
    fontWeight: 'bold',
    color: colors.darkerGreen, // Consistent price color
  },
  // No priceCancelRow needed explicitly if itemMeta handles layout
  status: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    alignSelf: 'flex-end', // Aligns status to the right
  },
  statusRed: {
    color: colors.red,
  },
  statusOrange: {
    color: colors.orange,
  },
  statusGreen: {
    color: colors.primaryGreen,
  },
  statusBlue: {
    color: colors.blue,
  },
  statusDefault: {
    color: colors.textSecondary,
  },

  // Feedback specific styles
  starRow: {
    flexDirection: 'row',
    marginVertical: 5,
    gap: 5, // Space between stars
    paddingVertical: 3,
  },
  starErrorBorder: { // Style for error border around stars
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 5,
    paddingHorizontal: 2,
  },
  errorMessage: {
    color: colors.red,
    fontSize: 11, // Smaller font for error messages
    marginTop: 2,
    marginBottom: 5,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align input and button at the bottom
    marginTop: 10,
    gap: 8,
  },
  feedbackInput: {
    flex: 1,
    borderColor: colors.greyBorder, // Consistent border color
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: colors.white, // Explicit white background
    height: 80,
    textAlignVertical: 'top',
    color: colors.textPrimary, // Ensure text color is readable
  },
  submittedRatingText: {
    fontStyle: 'italic',
    color: colors.darkerGreen, // Green for submitted rating
    fontSize: 13,
    marginTop: 5,
    fontWeight: '500',
  },
  submittedFeedbackText: {
    fontStyle: 'italic',
    color: colors.textSecondary, // Grey for submitted feedback
    fontSize: 13,
    marginTop: 2,
  },

  loadingIndicator: {
    marginTop: 50,
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Bottom Navigation consistent styles
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: colors.primaryGreen, // Primary green background
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopLeftRadius: 15, // Rounded top corners
    borderTopRightRadius: 15,
    shadowColor: '#000', // Shadow for depth
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  navLabel: {
    color: colors.white, // White text
    fontSize: 11, // Smaller font
    textAlign: 'center',
    marginTop: 2,
  },
  navButton: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 5,
  },
  flatListContent: {
    paddingBottom: 100, // Ensure content isn't hidden by bottom nav
  },
});