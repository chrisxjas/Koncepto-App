import React, { useState, useEffect, RefreshControl, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Animated,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';
import { ASSETS_URL } from '../config';
import UnavailableAlert from './essentials/not-available';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

// Define a consistent color palette for the entire app
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
  gold: '#FFD700', // For the coin icon
};

export default function Profile({ route }) {

  const [unavailableAlertVisible, setUnavailableAlertVisible] = useState(false);
  const showUnavailableAlert = () => setUnavailableAlertVisible(true);
  const closeUnavailableAlert = () => setUnavailableAlertVisible(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const [toPayCount, setToPayCount] = useState(0);
  const [toConfirmCount, setToConfirmCount] = useState(0);
  const [toReceiveCount, setToReceiveCount] = useState(0);
  const [toRateCount, setToRateCount] = useState(0);
  const [customOrderCount, setCustomOrderCount] = useState(0);

  const userFromParams = route.params?.user || {};
  const [user, setUser] = useState(userFromParams);

  const [modalVisible, setModalVisible] = useState(false); // For profile picture options
  const [uploading, setUploading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Animated value for the settings sidebar (translateX animation)
  const [slideAnim] = useState(new Animated.Value(screenWidth));

  const [selectedItems, setSelectedItems] = useState({});
  const hasSelectedItems = Object.values(selectedItems).some(selected => selected);

  const [frequentlyPurchasedItems, setFrequentlyPurchasedItems] = useState([]);
  const [starterPackItems, setStarterPackItems] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [hasCustomOrders, setHasCustomOrders] = useState(false);

  const flatListRef = useRef(null);
  const scrollIndex = useRef(0);
  const autoScrollInterval = useRef(null); // Correct initialization
  const userInteracted = useRef(false);

  // States for account editing modals (email/password)
  const [editAccountModalVisible, setEditAccountModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = '';
  const [passwordVerificationModalVisible, setPasswordVerificationModalVisible] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [confirmChangesModalVisible, setConfirmChangesModalVisible] = useState(false);


  // --- Fetch User Data (including email) ---
  const fetchUserData = useCallback(async () => {
    if (!userFromParams.id) {
      console.warn("User ID not available for fetching profile data.");
      setLoadingRecommendations(false);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/get-user.php?id=${userFromParams.id}`);
      const resJson = await response.json();
      if (resJson.success && resJson.user) {
        setUser(resJson.user);
        setNewEmail(resJson.user.email);
      } else {
        console.log('Failed to fetch user data:', resJson.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Fetch user data network error:', err);
    }
  }, [userFromParams.id]);

  // --- Fetch Recommendations ---
  const fetchFrequentlyPurchasedItems = useCallback(async () => {
    if (!user.id) return;
    try {
      const response = await fetch(`${BASE_URL}/get-frequently-purchased.php?user_id=${user.id}`);
      const resJson = await response.json();
      if (resJson.success && resJson.items) {
        setFrequentlyPurchasedItems(resJson.items);
      }
    } catch (err) {
      console.error('Failed to fetch frequently purchased items:', err);
    }
  }, [user.id]);

  // Handler for pull-to-refresh action
    const onRefresh = () => {
        setRefreshing(true); // Activate refreshing indicator
        fetchProfile();      // Re-fetch profile
    };

  const fetchStarterPackItems = useCallback(async () => {
    if (!user.id) return;
    try {
      const response = await fetch(`${BASE_URL}/get-starter-pack.php?user_id=${user.id}`);
      const resJson = await response.json();
      if (resJson.success && resJson.items) {
        setStarterPackItems(resJson.items);
      }
    } catch (err) {
      console.error('Failed to fetch starter pack items:', err);
    }
  }, [user.id]);

  // --- Check for Custom Orders ---
  const getCustomOrders = useCallback(async () => {
    console.log('getCustomOrders called. User ID:', user.id); // Debugging
    if (!user.id) {
      console.log('User ID is null or undefined, returning.'); // Debugging
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/get-custom-orders.php?user_id=${user.id}`);
      const resJson = await response.json();
      console.log('getCustomOrders response:', resJson); // Debugging: See the full response
      if (resJson.success && typeof resJson.has_orders === 'boolean') {
        setHasCustomOrders(resJson.has_orders);
        console.log('hasCustomOrders set to:', resJson.has_orders); // Debugging
      } else {
        console.log('getCustomOrders: Response not successful or has_orders not boolean.', resJson); // Debugging
        setHasCustomOrders(false); // Default to false on error or malformed response
      }
    } catch (err) {
      console.error('Failed to check custom orders:', err);
      setHasCustomOrders(false); // Default to false on network error
    }
  }, [user.id]);


  useEffect(() => {
    fetch(`${BASE_URL}/get-to-pay-orders.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setToPayCount(data.orders?.length || 0))
      .catch(err => console.log(err));

    fetch(`${BASE_URL}/get-to-confirm-orders.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setToConfirmCount(data.orders?.length || 0))
      .catch(err => console.log(err));

    fetch(`${BASE_URL}/get-to-receive-orders.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setToReceiveCount(data.orders?.length || 0))
      .catch(err => console.log(err));

    fetch(`${BASE_URL}/get-to-rate-orders.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setToRateCount(data.orders?.length || 0))
      .catch(err => console.log(err));

    fetch(`${BASE_URL}/get-custom-order-counts.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setCustomOrderCount(data.count || 0))
      .catch(err => console.log(err));
  }, [user.id]);

  const renderBadge = (count) => {
    if (count <= 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    );
  };


  useEffect(() => {
    const initializeData = async () => {
      setLoadingRecommendations(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library access is needed to upload your photo.');
      }
      await fetchUserData(); // Fetch user data first
      // After user data is potentially updated, fetch other data
      await Promise.all([
        fetchFrequentlyPurchasedItems(),
        fetchStarterPackItems(),
        getCustomOrders(),
      ]);
      setLoadingRecommendations(false);
    };

    initializeData();

    // Re-fetch data when the screen is focused
    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchUserData();
      fetchFrequentlyPurchasedItems();
      fetchStarterPackItems();
      getCustomOrders();
    });

    return unsubscribeFocus; // Clean up the listener
  }, [fetchUserData, fetchFrequentlyPurchasedItems, fetchStarterPackItems, getCustomOrders, navigation]);

  const recommendationSections = [
    {
      key: 'frequentlyPurchased',
      title: 'Frequently Purchased Items',
      description: 'Based on your purchase habits, you might need these:',
      items: frequentlyPurchasedItems || [], // Safeguard: ensure items is always an array
      emptyMessage: 'No frequently purchased recommendations yet.',
    },
    {
      key: 'starterPack',
      title: 'Starter Pack Recommendations',
      description: 'Get started with these essential items:',
      items: starterPackItems || [], // Safeguard: ensure items is always an array
      emptyMessage: 'No starter pack recommendations available.',
    },
  ];

  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollInterval.current) { // Clear existing interval if any
        clearInterval(autoScrollInterval.current);
      }
      autoScrollInterval.current = setInterval(() => {
        if (flatListRef.current && !userInteracted.current && recommendationSections.length > 1) {
          scrollIndex.current = (scrollIndex.current + 1) % recommendationSections.length;
          flatListRef.current.scrollToIndex({ animated: true, index: scrollIndex.current });
        }
      }, 5000);
    };

    const stopAutoScroll = () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };

    // Initial stop and start
    stopAutoScroll();
    if (recommendationSections.length > 1) { // Only start if there's more than one section to scroll
        startAutoScroll();
    }


    return () => stopAutoScroll(); // Cleanup on unmount
  }, [frequentlyPurchasedItems, starterPackItems, recommendationSections.length]); // Depend on relevant data changes

  const handleScrollBeginDrag = () => {
    userInteracted.current = true;
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }], // must exist in root navigator
        })
      );
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const handleScrollEndDrag = () => {
    setTimeout(() => {
      userInteracted.current = false;
      // Only restart auto-scroll if it's not already running and there's more than one section
      if (!autoScrollInterval.current && recommendationSections.length > 1) {
        autoScrollInterval.current = setInterval(() => {
          if (flatListRef.current && !userInteracted.current && recommendationSections.length > 1) {
            scrollIndex.current = (scrollIndex.current + 1) % recommendationSections.length;
            flatListRef.current.scrollToIndex({ animated: true, index: scrollIndex.current });
          }
        }, 5000);
      }
    }, 2000);
  };

  const openSettings = () => {
    setSettingsVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0, // Animate to 0 (fully visible)
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSettings = () => {
    // Set visibility to false immediately for smoother transition
    // The animation will slide out, then modal will unmount
    setSettingsVisible(false);
    Animated.timing(slideAnim, {
      toValue: screenWidth, // Animate back to screenWidth (off-screen)
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.uri) {
          uploadImage(selectedAsset.uri);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append('photo', {
        uri,
        name: filename,
        type,
      });
      formData.append('id', user.id);

      const response = await fetch(`${BASE_URL}/upload-profile-image.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const resJson = await response.json();
      if (resJson.success && resJson.profilepic) {
        setUser((prev) => ({ ...prev, profilepic: resJson.profilepic }));
        Alert.alert('Success', 'Profile picture updated.');
      } else {
        Alert.alert('Upload failed', resJson.message || 'Something went wrong.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
      setModalVisible(false);
    }
  };

  const handleAddToCart = async (itemsToAdd) => {
    const selectedIds = Object.entries(selectedItems)
      .filter(([id, isSelected]) => isSelected)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      Alert.alert('No items selected', 'Please select at least one item to add to cart.');
      return;
    }

    try {
      for (const itemId of selectedIds) {
        const item = itemsToAdd.find(item => item.id.toString() === itemId);
        if (!item) continue;

        await fetch(`${BASE_URL}/add-to-cart.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            product_id: item.product_id,
            quantity: 1,
          }),
        });
      }
      Alert.alert('Success', 'Items added to cart.');
      navigation.navigate('Carts', { user });
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add items to cart.');
    } finally {
      setSelectedItems({});
    }
  };

  const handleBuyNow = (itemsToBuy) => {
    const selected = itemsToBuy
      .filter(item => selectedItems[item.id])
      .map(item => ({
        product_id: item.product_id,
        productName: item.name,
        price: parseFloat(item.price), // Ensure price is numeric
        quantity: 1,
        image: item.image,
      }));

    if (selected.length === 0) {
      Alert.alert('No items selected', 'Please select at least one item to proceed.');
      return;
    }

    const total = selected.reduce((sum, item) => sum + parseFloat(item.price), 0);

    navigation.navigate('PlaceRequest', {
      user,
      selectedItems: selected,
      total,
    });
    setSelectedItems({});
  };

  const handleDeletePicture = async () => {
    setModalVisible(false);
    Alert.alert(
      'Delete Profile Picture',
      'Are you sure you want to delete your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/delete-profile-image.php?user_id=${user.id}`);
              const resJson = await response.json();
              if (resJson.success) {
                setUser((prev) => ({ ...prev, profilepic: null }));
                Alert.alert('Deleted', 'Profile picture deleted.');
              } else {
                Alert.alert('Error', resJson.message || 'Could not delete profile picture.');
              }
            } catch {
              Alert.alert('Error', 'Failed to delete profile picture.');
            }
          },
        },
      ]
    );
  };

  const scrollRecommendation = (direction) => {
    userInteracted.current = true;
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }

    let nextIndex = scrollIndex.current;
    if (direction === 'next') {
      nextIndex = (scrollIndex.current + 1) % recommendationSections.length;
    } else if (direction === 'prev') {
      nextIndex = (scrollIndex.current - 1 + recommendationSections.length) % recommendationSections.length;
    }

    flatListRef.current.scrollToIndex({ animated: true, index: nextIndex });
    scrollIndex.current = nextIndex;

    setTimeout(() => {
      userInteracted.current = false;
      if (!autoScrollInterval.current && recommendationSections.length > 1) { // Only restart if more than one section
        autoScrollInterval.current = setInterval(() => {
          if (flatListRef.current && !userInteracted.current && recommendationSections.length > 1) {
            scrollIndex.current = (scrollIndex.current + 1) % recommendationSections.length;
            flatListRef.current.scrollToIndex({ animated: true, index: scrollIndex.current });
          }
        }, 5000);
      }
    }, 2000);
  };

  const renderRecommendationSlide = ({ item: section }) => {
    const isAnyItemSelectedInSection = section.items.some(
      (item) => selectedItems[item.id]
    );

    return (
      <View style={styles.recommendBoxContainer}>
        <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 2, fontSize: 12, fontWeight: 'bold' }]}>
          {section.title}
        </Text>
        <View style={styles.recommendBox}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.recommendText}>
              {section.description}
            </Text>
          </View>

          {loadingRecommendations ? (
            // Adjusted margin for ActivityIndicator
            <ActivityIndicator size="small" color={colors.primaryGreen} style={{ marginTop: 5 }} />
          ) : section.items.length === 0 ? (
            <Text style={{ marginTop: 2, fontStyle: 'italic', color: colors.textSecondary, fontSize: 9 }}>
              {section.emptyMessage}
            </Text>
          ) : (
            <>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    setSelectedItems(prev => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  <Checkbox
                    value={!!selectedItems[item.id]}
                    onValueChange={() =>
                      setSelectedItems(prev => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    color={selectedItems[item.id] ? colors.primaryGreen : undefined}
                  />
                  <Image
                    source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${item.image}` }}
                    style={styles.itemImage}
                    onError={(e) =>
                      console.log(
                        'Image Load Error:',
                        e.nativeEvent.error,
                        'for URI:',
                        `${BASE_URL.replace(/\/$/, '')}/../storage/${item.image}`
                      )
                    }
                  />

                  <Text style={styles.itemText}>
                    {(item.name ? item.name : '') + ' - ₱' + (item.price ? parseFloat(item.price).toFixed(2) : '0.00')}
                  </Text>
                </TouchableOpacity>
              ))}

              {section.items.length > 0 && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.cartButton,
                      isAnyItemSelectedInSection && styles.cartButtonActive,
                    ]}
                    onPress={() => handleAddToCart(section.items)}
                    disabled={!isAnyItemSelectedInSection}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isAnyItemSelectedInSection && styles.cartButtonTextActive,
                      ]}
                    >
                      Add to Cart
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      !isAnyItemSelectedInSection && { backgroundColor: colors.textSecondary }
                    ]}
                    onPress={() => handleBuyNow(section.items)}
                    disabled={!isAnyItemSelectedInSection}
                  >
                    <Text style={styles.buttonText}>Buy Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // --- Input Validation Functions (from AccountCredentials.js logic) ---
  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePassword = useCallback((password) => {
    return password.length >= 8;
  }, []);

  // --- Open Edit Account Modal (initiates password verification) ---
  const openEditAccountModal = useCallback(() => {
    if (user) {
      setNewEmail(user.email); // Pre-fill with current email
      setNewPassword(''); // Always clear password fields
      setConfirmNewPassword('');
      setCurrentPasswordInput(''); // Clear current password input
      setPasswordVerificationModalVisible(true); // First, show password verification modal
    }
  }, [user]);

  // --- Handle Current Password Verification ---
  const handleVerifyCurrentPassword = useCallback(async () => {
    if (!currentPasswordInput) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/verify_current_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          current_password: currentPasswordInput,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setPasswordVerificationModalVisible(false); // Close verification modal
        setEditAccountModalVisible(true); // Open edit modal
      } else {
        Alert.alert('Error', data.message || 'Incorrect current password. Please try again.');
      }
    } catch (error) {
      console.error('Password Verification Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, [user?.id, currentPasswordInput]);

  // --- Handle Save Account Options (validates new inputs) ---
  const handleSaveAccountOptions = useCallback(() => {
    // Check if new email/password are identical to current ones
    const isEmailSame = newEmail === user.email;
    const isPasswordProvided = newPassword !== '';

    if (isEmailSame && !isPasswordProvided) {
      Alert.alert('Validation Error', 'No changes detected. Please modify email or password to save.');
      return;
    }

    // Validate new email if it's changed
    if (!isEmailSame && !validateEmail(newEmail)) {
      Alert.alert('Validation Error', 'Invalid email format');
      return;
    }

    // Validate new password if provided
    if (isPasswordProvided) {
      if (!validatePassword(newPassword)) {
        Alert.alert('Validation Error', 'Password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Alert.alert('Validation Error', 'New password and confirm password do not match.');
        return;
      }
    }

    // Show final confirmation modal
    setConfirmChangesModalVisible(true);
  }, [newEmail, newPassword, confirmNewPassword, user, validateEmail, validatePassword]);

  // --- Confirm and Send Changes to Backend ---
  const confirmChanges = useCallback(async () => {
    setConfirmChangesModalVisible(false); // Close confirmation modal

    try {
      const response = await fetch(`${BASE_URL}/update_account_options.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          new_email: newEmail,
          new_password: newPassword, // Send empty string if not changing
        }),
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Account details updated successfully!');
        setEditAccountModalVisible(false); // Close edit modal
        fetchUserData(); // Re-fetch profile to show updated email
      } else {
        Alert.alert('Error', data.message || 'Failed to update account details.');
      }
    } catch (error) {
      console.error('Update Account Options Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, [user?.id, newEmail, newPassword, fetchUserData]);


  // Determine active tab for bottom navigation using useNavigationState
  // This is more robust for nested navigators than route.name directly
  const routeName = useNavigationState(state => state.routes[state.index].name);
  const currentRouteName = routeName;

  const isHomeActive = currentRouteName === 'ProductList';
  const isChatActive = currentRouteName === 'Message' || currentRouteName === 'ChatBot';
  const isCartActive = currentRouteName === 'Carts';
  const isAccountActive = currentRouteName === 'Profile' || currentRouteName === 'MyProfile' || currentRouteName === 'AccountOptions';


  // Fallback for profile image if user.profilepic is not available or invalid
  const profileImageSource = user?.profilepic && user.profilepic !== 'null'
    ? { uri: `${BASE_URL}/uploads/${user.profilepic}?t=${Date.now()}` }
    : require('../assets/user.png');

  if (loadingRecommendations && !user?.id) { // Show initial loader if user data is not yet loaded
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Fixed Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.profileIcon}>
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              onError={(e) => console.log('Profile Image Load Error:', e.nativeEvent.error)}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.first_name ?? 'First Name'} {user.last_name ?? 'Last Name'}</Text>
            <Text style={styles.email}>{user.email ?? 'email@example.com'}</Text>
          </View>
          {/* Coin Icon and Settings Icon Container */}
          <View style={styles.headerIconsContainer}>
            {/* Coin Icon Button */}
              <TouchableOpacity 
                style={styles.coinIcon} 
                onPress={() => navigation.navigate('Points', { user })}
              >
                <Image 
                  source={require('../assets/kpoints.png')} // place your PNG logo in assets folder
                  style={{ width: 24, height: 24, resizeMode: 'contain' }} // adjust size as needed
                />
              </TouchableOpacity>
            {/* Settings Icon Button */}
            <TouchableOpacity style={styles.settingsIcon} onPress={openSettings}>
              <Ionicons name="settings-outline" size={20} color="white" /> {/* Smaller icon */}
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollableContent}>
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Recommendations</Text>
            <Text style={styles.description}>
              Discover items based on your past purchases or get started with essential packs.
            </Text>

            <View style={styles.recommendationsWrapper}>
              <TouchableOpacity
                style={[styles.arrowButton, { left: 0 }]}
                onPress={() => scrollRecommendation('prev')}
              >
                <Ionicons name="chevron-back-circle-outline" size={30} color="black" style={{ opacity: 0.5 }} />
              </TouchableOpacity>

              <FlatList
                ref={flatListRef}
                data={recommendationSections}
                renderItem={renderRecommendationSlide}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                contentContainerStyle={styles.recommendationsFlatListContainer}
                onLayout={() => flatListRef.current?.scrollToIndex({ animated: false, index: scrollIndex.current })}
                getItemLayout={(_, index) => ({
                  length: screenWidth * 0.85, // Adjusted width for smaller boxes
                  offset: (screenWidth * 0.85) * index, // Adjusted offset
                  index,
                })}
              />

              <TouchableOpacity
                style={[styles.arrowButton, { right: 0 }]}
                onPress={() => scrollRecommendation('next')}
              >
                <Ionicons name="chevron-forward-circle-outline" size={30} color="black" style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeading}>My Purchases</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrderHistory', { user })}>
                <Text style={styles.link}>View Purchase History</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.purchaseRow}>
              <TouchableOpacity
                style={styles.purchaseItem}
                onPress={() => navigation.navigate('ToPay', { user })}
              >
                <FontAwesome name="credit-card" size={20} color={colors.darkerGreen} />
                {renderBadge(toPayCount)}
                <Text style={styles.purchaseItemText}>To Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.purchaseItem}
                onPress={() => navigation.navigate('ToConfirm', { user })}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.darkerGreen} />
                {renderBadge(toConfirmCount)}
                <Text style={styles.purchaseItemText}>To Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.purchaseItem}
                onPress={() => navigation.navigate('ToReceive', { user })}
              >
                <Ionicons name="cube-outline" size={20} color={colors.darkerGreen} />
                {renderBadge(toReceiveCount)}
                <Text style={styles.purchaseItemText}>To Receive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.purchaseItem}
                onPress={() => navigation.navigate('ToRate', { user })}
              >
                <Ionicons name="star-outline" size={20} color={colors.darkerGreen} />
                {renderBadge(toRateCount)}
                <Text style={styles.purchaseItemText}>To Rate</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.customOrderItem}
              onPress={() => navigation.navigate('ViewCustomOrder', { user })}
            >
              <Ionicons name="eye-outline" size={18} color={colors.darkerGreen} />
              {renderBadge(customOrderCount)}
              <Text style={styles.customOrderText}>View Custom Orders</Text>
            </TouchableOpacity>
          </View>
          

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Support</Text>
            <TouchableOpacity style={styles.supportItem} onPress={showUnavailableAlert}>
              <Ionicons name="help-circle-outline" size={18} color={colors.darkerGreen} />
              <Text style={styles.supportText}>Help Center</Text>
            </TouchableOpacity>

            {/* Make sure you have this in your component */}
            <UnavailableAlert
              visible={unavailableAlertVisible}
              onClose={closeUnavailableAlert}
            />
            <TouchableOpacity style={styles.supportItem} onPress={() => navigation.navigate('ChatBot', { user })}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.darkerGreen} /> {/* Smaller icon */}
              <Text style={styles.supportText}>Chat with Koncepto</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 20 }} />{/* Add some padding at the bottom of the scroll view */}
        </ScrollView>

        {/* Modal for Profile Picture Options - Positioned at the bottom */}
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={styles.modalView}> {/* This is the content box for profile pic options */}
              {uploading ? (
                <ActivityIndicator size="large" color={colors.primaryGreen} style={{ paddingVertical: 20 }} />
              ) : (
                <>
                  <TouchableOpacity onPress={pickImage} style={styles.modalButton}>
                    <Ionicons name="image-outline" size={20} color={colors.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={styles.modalButtonText}>Edit Profile Picture</Text>
                  </TouchableOpacity>
                  {user.profilepic && user.profilepic !== 'null' && ( // Only show delete if there's a picture
                    <TouchableOpacity onPress={handleDeletePicture} style={styles.modalButton}>
                      <Ionicons name="trash-outline" size={20} color={colors.errorRed} style={{ marginRight: 10 }} />
                      <Text style={[styles.modalButtonText, { color: colors.errorRed }]}>Delete Profile Picture</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Settings Sidebar Modal */}
        {/* Settings Sidebar Modal */}
<Modal
  animationType="none"
  transparent={true}
  visible={settingsVisible}
  onRequestClose={closeSettings}
>
  <TouchableOpacity
    style={styles.settingsOverlay}
    activeOpacity={1}
    onPress={closeSettings}
  >
    <Animated.View style={[styles.settingsModal, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <TouchableOpacity onPress={closeSettings}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.settingsContent}>

          <TouchableOpacity style={styles.settingsOption} onPress={() => navigation.navigate('MyProfile', { user })}>
            <Ionicons name="person-outline" size={20} color={colors.textPrimary} style={styles.settingsOptionIcon} />
            <Text style={styles.settingsOptionText}>Profile</Text>
          </TouchableOpacity>

          {/* Show UnavailableAlert for these buttons */}
          <TouchableOpacity style={styles.settingsOption} onPress={showUnavailableAlert}>
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} style={styles.settingsOptionIcon} />
            <Text style={styles.settingsOptionText}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsOption} onPress={showUnavailableAlert}>
            <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} style={styles.settingsOptionIcon} />
            <Text style={styles.settingsOptionText}>Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsOption} onPress={showUnavailableAlert}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textPrimary} style={styles.settingsOptionIcon} />
            <Text style={styles.settingsOptionText}>Help Center</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsOption} onPress={showUnavailableAlert}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} style={styles.settingsOptionIcon} />
            <Text style={styles.settingsOptionText}>About</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsOption, styles.logoutButton]}
            onPress={() =>
              Alert.alert('Logout', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: handleLogout }
              ])
            }
          >
            <Ionicons name="log-out-outline" size={20} color={colors.errorRed} style={styles.settingsOptionIcon} />
            <Text style={[styles.settingsOptionText, { color: colors.errorRed }]}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  </TouchableOpacity>
</Modal>


{/* Unavailable Alert Modal */}
<UnavailableAlert
  visible={unavailableAlertVisible}
  onClose={closeUnavailableAlert}
/>

        {/* Current Password Verification Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={passwordVerificationModalVisible}
          onRequestClose={() => setPasswordVerificationModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centeredModalOverlay}
          >
            <View style={styles.passwordVerificationModalView}>
              <Text style={styles.modalTitle}>Verify Current Password</Text>
              <Text style={styles.modalDescription}>Please enter your current password to proceed with account changes.</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Current Password"
                secureTextEntry
                value={currentPasswordInput}
                onChangeText={setCurrentPasswordInput}
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.greyBorder }]}
                  onPress={() => setPasswordVerificationModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleVerifyCurrentPassword}
                >
                  <Text style={styles.modalButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Account Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editAccountModalVisible}
          onRequestClose={() => setEditAccountModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centeredModalOverlay}
          >
            <View style={styles.editAccountModalView}>
              <Text style={styles.modalTitle}>Edit Account Details</Text>
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="New Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.modalLabel}>New Password (leave blank if not changing)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.greyBorder }]}
                  onPress={() => setEditAccountModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleSaveAccountOptions}
                >
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Confirm Changes Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={confirmChangesModalVisible}
          onRequestClose={() => setConfirmChangesModalVisible(false)}
        >
          <View style={styles.centeredModalOverlay}>
            <View style={styles.confirmChangesModalView}>
              <Text style={styles.modalTitle}>Confirm Changes</Text>
              <Text style={styles.modalDescription}>Are you sure you want to apply these changes to your account?</Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.greyBorder }]}
                  onPress={() => setConfirmChangesModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={confirmChanges}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Fixed Bottom Navigation */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductList', { user })}
            style={styles.navButton}
          >
            <Ionicons name="home" size={24} color={isHomeActive ? colors.white : '#B0E0A0'} />
            <Text style={[styles.navLabel, isHomeActive && styles.activeNavLabel]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Message', { user })}
            style={styles.navButton}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={isChatActive ? colors.white : '#B0E0A0'} />
            <Text style={[styles.navLabel, isChatActive && styles.activeNavLabel]}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Carts', { user })}
            style={styles.navButton}
          >
            <Ionicons name="cart" size={24} color={isCartActive ? colors.white : '#B0E0A0'} />
            <Text style={[styles.navLabel, isCartActive && styles.activeNavLabel]}>Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { user })}
            style={styles.navButton}
          >
            <Ionicons name="person" size={24} color={isAccountActive ? colors.white : '#B0E0A0'} />
            <Text style={[styles.navLabel, isAccountActive && styles.activeNavLabel]}>Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
  },
  scrollableContent: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGreyBackground,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 16,
    paddingBottom: 15, // Made smaller
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  profileIcon: {
    marginRight: 15,
  },
  profileImage: {
    width: 60, // Made smaller
    height: 60, // Made smaller
    borderRadius: 30, // Adjusted for new size
    borderWidth: 2, // Slightly smaller border
    borderColor: colors.white,
    backgroundColor: colors.lightGreen,
  },
  name: {
    color: colors.white,
    fontSize: 18, // Made smaller
    fontWeight: 'bold',
  },
  email: {
    color: colors.white,
    fontSize: 11, // Made smaller
    marginTop: 1,
    opacity: 0.8,
  },
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  coinIcon: {
    padding: 6, // Made smaller
    marginRight: 8, // Made smaller
  },
  settingsIcon: {
    padding: 6, // Made smaller
  },
    customOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },

  customOrderText: {
    marginLeft: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  recommendationsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 220, // Reduced height
    position: 'relative',
    overflow: 'hidden',
  },
  recommendationsFlatListContainer: {
    alignItems: 'center',
  },
  recommendBoxContainer: {
    width: screenWidth * 0.85, // Adjusted width for smaller boxes
    marginHorizontal: 5, // Smaller horizontal margin
    alignItems: 'center',
  },
  recommendBox: {
    backgroundColor: colors.lightGreen,
    borderRadius: 8, // Smaller border radius
    padding: 10, // Reduced padding
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2, // Smaller margin
  },
  recommendText: {
    fontSize: 11, // Smaller font size
    color: colors.textSecondary,
    marginLeft: 3, // Smaller margin
    flexShrink: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Smaller padding
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  itemImage: {
    width: 35, // Smaller image
    height: 35, // Smaller image
    borderRadius: 5,
    marginHorizontal: 8, // Smaller margin
    backgroundColor: colors.white,
  },
  itemText: {
    flex: 1,
    fontSize: 12, // Smaller font size
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10, // Smaller margin
  },
  cartButton: {
    backgroundColor: colors.greyBorder,
    paddingVertical: 6, // Smaller padding
    paddingHorizontal: 12, // Smaller padding
    borderRadius: 18, // Adjusted border radius
  },
  cartButtonActive: {
    backgroundColor: colors.primaryGreen,
  },
  buyButton: {
    backgroundColor: colors.darkerGreen,
    paddingVertical: 6, // Smaller padding
    paddingHorizontal: 12, // Smaller padding
    borderRadius: 18, // Adjusted border radius
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 11, // Smaller font size
  },
  cartButtonTextActive: {
    color: colors.white,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -15 }],
    zIndex: 1,
    padding: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: colors.primaryGreen,
    fontSize: 12,
    fontWeight: 'bold',
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  purchaseItem: {
    alignItems: 'center',
    padding: 5,
    flex: 1,
  },
  purchaseItemText: {
    fontSize: 10, // Made smaller
    color: colors.textPrimary,
    marginTop: 5,
    textAlign: 'center',
    marginBottom: 10
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Made smaller
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  supportText: {
    marginLeft: 10,
    fontSize: 13, // Made smaller
    color: colors.textPrimary,
  },

  // MODIFIED Modal Styles (for profile picture options - now at bottom)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Aligns modal content to the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: colors.white,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12, // Made smaller
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    justifyContent: 'flex-start',
  },
  modalButtonText: {
    fontSize: 15, // Made smaller
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Settings Sidebar Modal Styles
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  settingsModal: {
    width: screenWidth * 0.75,
    height: '100%',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    backgroundColor: colors.primaryGreen,
    paddingTop: Platform.OS === 'android' ? 30 : 50,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  settingsContent: {
    padding: 20,
    paddingBottom: 50,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryGreen,
    marginTop: 20,
    marginBottom: 10,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Made smaller
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  settingsOptionIcon: {
    marginRight: 8, // Made smaller
  },
  settingsOptionText: {
    fontSize: 14, // Made smaller
    color: colors.textPrimary,
  },
  logoutButton: {
    marginTop: 30,
    borderBottomWidth: 0,
  },

  // Modals for Account Editing (re-used general modal styles)
  centeredModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  passwordVerificationModalView: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  editAccountModalView: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmChangesModalView: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryGreen,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
  },
  modalInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  modalActionButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCancelActionButton: {
    backgroundColor: colors.greyBorder,
  },
  modalCancelActionButtonText: {
    color: colors.textPrimary,
  },

  // Bottom Navigation
  bottomNav: {
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
    position: 'absolute',
    bottom: 0,
    width: '100%',
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
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  purchaseItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  purchaseItemText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.darkerGreen,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'red',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  customOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  customOrderText: {
    marginLeft: 6,
    color: colors.darkerGreen,
    fontSize: 14,
  },
});