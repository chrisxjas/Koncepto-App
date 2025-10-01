import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config';
import { ASSETS_URL } from '../config';

// Define colors in a shared object for consistency
const colors = {
  primaryGreen: '#4CAF50', // A vibrant green
  darkerGreen: '#388E3C', // A slightly darker green for active states/accents
  lightGreen: '#F0F8F0', // Very light green for backgrounds
  accentGreen: '#8BC34A', // Another shade of green if needed
  textPrimary: '#333333', // Dark text for readability
  textSecondary: '#666666', // Lighter text for secondary info
  white: '#FFFFFF',
  greyBorder: '#DDDDDD', // Light grey for borders and lines
  lightGreyBackground: '#FAFAFA', // General light background
  errorRed: '#e53935', // For prices and errors, or special alerts
};

const CustomCheckBox = ({ value, onValueChange }) => (
  <TouchableOpacity onPress={onValueChange} style={styles.checkboxContainer}>
    <Ionicons
      name={value ? 'checkbox-outline' : 'square-outline'}
      size={20}
      color={value ? colors.primaryGreen : colors.textSecondary}
    />
  </TouchableOpacity>
);

// Removed: formatGroupTimestamp function is no longer needed

const Carts = ({ route }) => {
  const navigation = useNavigation();
  const { user } = route.params;
  const [cartItems, setCartItems] = useState([]); // Raw cart items from BASE_URL
  const [selectedItems, setSelectedItems] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Carts');
  const [searchQuery, setSearchQuery] = useState(''); // State for search input

  // --- Fetch Cart Items ---
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/get-cart-items.php?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCartItems(data.items);
        // Initialize selection based on fetched items
        const initialSelection = {};
        data.items.forEach(item => {
          initialSelection[item.id] = false;
        });
        setSelectedItems(initialSelection);
        setSelectAll(false); // Reset select all
      } else {
        Alert.alert('Error', data.message || 'Failed to load cart items.');
        setCartItems([]); // Clear items on error
      }
    } catch (error) {
      console.error('Fetch cart items error:', error);
      Alert.alert('Error', 'Failed to fetch cart items from server.');
      setCartItems([]); // Clear items on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
    setActiveTab('Carts'); // Ensure 'Carts' tab is active when component mounts
  }, []); // Empty dependency array means this runs once on mount

  // --- Filtering and Sorting Logic (Simplified) ---
  const filteredAndSortedItems = useMemo(() => {
    // 1. Filter items based on search query
    let filtered = cartItems.filter(item =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort items by created_at (latest on top)
    // The PHP already orders by created_at DESC, but sorting again client-side ensures consistency
    // especially if you later filter or modify the list in ways that change order.
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || ''); // Handle potential null/invalid dates gracefully
      const dateB = new Date(b.created_at || '');
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });

    // Each item should now be a simple 'item' type for FlatList
    return filtered.map(item => ({ type: 'item', ...item }));
  }, [cartItems, searchQuery]); // Recalculate when cartItems or searchQuery changes

  // --- Selection Logic ---
  const toggleSelectItem = (id) => {
    setSelectedItems(prev => {
      const newSelection = { ...prev, [id]: !prev[id] };
      // Check if all *currently displayed* cart items (excluding headers) are selected
      const allDisplayedItems = filteredAndSortedItems.filter(item => item.type === 'item');
      const allSelected = allDisplayedItems.length > 0 && allDisplayedItems.every(item => newSelection[item.id]);
      setSelectAll(allSelected);
      return newSelection;
    });
  };

  const toggleSelectAll = () => {
    const newState = !selectAll;
    const newSelection = {};
    // Apply select all to *all* items in the original cartItems, not just filtered ones
    cartItems.forEach(item => {
      newSelection[item.id] = newState;
    });
    setSelectedItems(newSelection);
    setSelectAll(newState);
  };

  // --- Update Quantity ---
  const updateQuantity = async (itemId, currentQty, direction, product_id) => {
    const qty = parseInt(currentQty, 10);
    let newQty;
    if (direction === 'inc') {
      newQty = qty + 1;
    } else {
      newQty = Math.max(1, qty - 1); // Ensure quantity doesn't go below 1
      if (newQty === qty) return; // If quantity didn't change (was already 1 and decreased)
    }

    // Optimistic UI update
    const originalCartItems = [...cartItems]; // Store current state for revert
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQty.toString() } : item // Ensure quantity is string if BASE_URL expects it
      )
    );

    try {
      const res = await fetch(`${BASE_URL}/add-to-cart.php`, { // This BASE_URL is used for both add and update with 'replace'
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          product_id,
          quantity: newQty,
          replace: true // Indicate that we are replacing the quantity, not just adding to it
        })
      });
      const result = await res.json();
      if (!result.success) {
        Alert.alert('Error', result.message || 'Failed to update quantity.');
        setCartItems(originalCartItems); // Revert on failure
      }
      // If success, no need to re-fetch all items if the optimistic update was correct.
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to communicate with server to update quantity.');
      setCartItems(originalCartItems); // Revert on network error
    }
  };

  // --- Remove Cart Item ---
  const removeCartItem = async (cartItemId) => {
    Alert.alert(
      'Remove from Cart',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            // Optimistic UI update for removal
            const originalCartItems = [...cartItems];
            const originalSelectedItems = { ...selectedItems }; // Store original selection for revert

            setCartItems(prev => prev.filter(item => item.id !== cartItemId));
            setSelectedItems(prev => {
              const updated = { ...prev };
              delete updated[cartItemId];
              return updated;
            });

            try {
              const response = await fetch(`${BASE_URL}/remove-from-cart.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_item_id: cartItemId }),
              });
              const result = await response.json();

              if (!result.success) {
                Alert.alert('Error', result.message || 'Failed to delete item.');
                setCartItems(originalCartItems); // Revert on failure
                setSelectedItems(originalSelectedItems); // Revert selection too
              }
              // If success, state is already updated optimistically
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', err.message || 'Something went wrong while removing item.');
              setCartItems(originalCartItems); // Revert on network error
              setSelectedItems(originalSelectedItems); // Revert selection too
            }
          },
        },
      ]
    );
  };

  // --- Calculate Subtotal ---
  const calculateSubtotal = () => {
    return cartItems
      .filter(item => selectedItems[item.id])
      .reduce((total, item) => total + (parseInt(item.quantity, 10) * parseFloat(item.price)), 0);
  };

  // --- Handle Checkout ---
  const handleCheckout = () => {
    const selectedCartItems = cartItems.filter(item => selectedItems[item.id]);

    if (selectedCartItems.length === 0) {
      Alert.alert('No items selected', 'Please select at least one item to checkout.');
      return;
    }

    const totalPrice = selectedCartItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * parseInt(item.quantity, 10),
      0
    );

    navigation.navigate('PlaceRequest', {
      user,
      selectedItems: selectedCartItems, // Pass the actual selected item objects
      total: totalPrice,
      onCheckoutSuccess: () => {
        // Remove checked out items from cart after successful request placement
        // This relies on the original cartItems state
        setCartItems(prev => prev.filter(item => !selectedItems[item.id]));
        setSelectedItems({}); // Clear selections
        setSelectAll(false); // Reset select all
      }
    });
  };

  // --- Render Item for FlatList (now only handles actual items) ---
  const renderFlatListItem = ({ item }) => {
    // Since we no longer have 'header' types, we only render the 'item' type
    return (
      <View style={styles.cartItem}>
        <CustomCheckBox value={selectedItems[item.id]} onValueChange={() => toggleSelectItem(item.id)} />
        <Image
          source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${item.image}` }}
          style={styles.itemImage}
        />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
          <Text style={styles.itemPrice}>₱ {parseFloat(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity, 'dec', item.product_id)} style={styles.qtyButton}>
            <Ionicons name="remove-outline" size={18} color={colors.primaryGreen} />
          </TouchableOpacity>
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity, 'inc', item.product_id)} style={styles.qtyButton}>
            <Ionicons name="add-outline" size={18} color={colors.primaryGreen} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeCartItem(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={colors.errorRed} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Instructional Text */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          The following items show the items you added to cart. Select items by tapping them and click the checkout button to order them.
        </Text>
      </View>

      {/* Search Field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items in your cart..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primaryGreen} style={styles.loadingIndicator} />
      ) : cartItems.length === 0 && searchQuery === '' ? ( // Only show empty cart if no items and no search
        <View style={styles.emptyCartContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.greyBorder} />
          <Text style={styles.emptyCartText}>Your cart is empty!</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('ProductList', { user })}
          >
            <Text style={styles.browseButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAndSortedItems.length === 0 && searchQuery !== '' ? ( // Show no results if filtered list is empty
        <View style={styles.emptyCartContainer}>
          <Ionicons name="sad-outline" size={80} color={colors.greyBorder} />
          <Text style={styles.emptyCartText}>No items found matching your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(item) => item.id.toString()} // Key only needs to be item ID now
          renderItem={renderFlatListItem}
          contentContainerStyle={styles.cartListContent}
        />
      )}

      {/* Footer (Subtotal & Checkout) */}
      {!loading && cartItems.length > 0 && ( // Footer always based on original cart items
        <View style={styles.footer}>
          <View style={styles.selectAllContainer}>
            <CustomCheckBox value={selectAll} onValueChange={toggleSelectAll} />
            <Text style={styles.selectAllText}>All</Text>
          </View>
          <Text style={styles.subtotalText}>
            Subtotal:{' '}
            <Text style={styles.subtotalValue}>
              ₱ {calculateSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </Text>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            disabled={Object.values(selectedItems).every(val => !val)} // Disable if no items selected
          >
            <Text style={styles.checkoutButtonText}>Checkout ({Object.values(selectedItems).filter(val => val).length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('Home');
            navigation.navigate('ProductList', { user });
          }}
          style={styles.navButton}
        >
          <Ionicons name="home" size={24} color={activeTab === 'Home' ? colors.white : '#B0E0A0'} />
          <Text style={[styles.navLabel, activeTab === 'Home' && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Message');
            navigation.navigate('Message', { user });
          }}
          style={styles.navButton}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={activeTab === 'Message' ? colors.white : '#B0E0A0'} />
          <Text style={[styles.navLabel, activeTab === 'Message' && styles.activeNavLabel]}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Carts');
            // Already on Carts screen, no navigation needed
          }}
          style={styles.navButton}
        >
          <Ionicons name="cart" size={24} color={activeTab === 'Carts' ? colors.white : '#B0E0A0'} />
          <Text style={[styles.navLabel, activeTab === 'Carts' && styles.activeNavLabel]}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Profile');
            navigation.navigate('Profile', { user });
          }}
          style={styles.navButton}
        >
          <Ionicons name="person" size={24} color={activeTab === 'Profile' ? colors.white : '#B0E0A0'} />
          <Text style={[styles.navLabel, activeTab === 'Profile' && styles.activeNavLabel]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Carts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    paddingHorizontal: 16,
    paddingBottom: 15,
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  backButton: {
    paddingRight: 10,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 28,
  },

  // Instructional Text Styles
  instructionContainer: {
    backgroundColor: colors.white,
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Search Field Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 25, // Pill shape for search bar
    marginHorizontal: 10,
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5, // Adjust vertical padding for platforms
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 5,
  },

  // Loading Indicator & Empty Cart
  loadingIndicator: {
    marginTop: 40,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Removed: groupHeaderContainer and groupHeaderText styles

  // Cart Item Styles (Adjusted for smaller size)
  cartListContent: {
    padding: 8, // Reduced padding
    paddingBottom: 160,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8, // Slightly less rounded corners
    marginBottom: 8, // Reduced margin
    padding: 8, // Reduced padding inside the item card
    elevation: 1, // Lighter shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 }, // Smaller shadow offset
    shadowOpacity: 0.08, // Lighter shadow opacity
    shadowRadius: 1.5, // Smaller shadow radius
  },
  checkboxContainer: {
    padding: 3, // Reduced padding
    marginRight: 3,
  },
  itemImage: {
    width: 60, // Smaller image width
    height: 60, // Smaller image height
    borderRadius: 6, // Slightly less rounded image corners
    marginRight: 8, // Reduced margin
    backgroundColor: colors.lightGreen,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8, // Reduced margin
  },
  itemName: {
    fontSize: 13, // Smaller font size
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  itemPrice: {
    fontSize: 13, // Smaller font size
    color: colors.errorRed,
    fontWeight: '600',
    marginTop: 3, // Reduced margin
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGreyBackground,
    borderRadius: 15, // Slightly smaller pill shape
    paddingHorizontal: 6, // Reduced padding
    paddingVertical: 2, // Reduced padding
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  qtyButton: {
    padding: 3, // Reduced padding
  },
  itemQuantity: {
    marginHorizontal: 6, // Reduced margin
    fontWeight: 'bold',
    fontSize: 14, // Smaller font size
    color: colors.textPrimary,
  },
  deleteButton: {
    marginLeft: 8, // Reduced margin
    padding: 3, // Reduced padding
  },

  // Footer (Subtotal & Checkout)
  footer: {
    position: 'absolute',
    bottom: 70,
    backgroundColor: colors.white,
    width: '100%',
    paddingVertical: 12, // Slightly reduced vertical padding
    paddingHorizontal: 15, // Slightly reduced horizontal padding
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 4,
    fontSize: 13, // Slightly smaller font
    color: colors.textSecondary,
  },
  subtotalText: {
    fontSize: 14, // Slightly smaller font
    color: colors.textPrimary,
  },
  subtotalValue: {
    fontWeight: 'bold',
    color: colors.errorRed,
    fontSize: 15, // Slightly smaller font
  },
  checkoutButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 18, // Reduced padding
    paddingVertical: 10, // Reduced padding
    borderRadius: 20, // Slightly less rounded
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  checkoutButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15, // Slightly smaller font
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: colors.darkerGreen,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navLabel: {
    color: '#B0E0A0',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  activeNavLabel: {
    color: colors.white,
    fontWeight: 'bold',
  },
});