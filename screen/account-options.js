import React, { useState, useEffect, useCallback } from 'react';
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
  Platform, // For platform-specific styles
  SafeAreaView, // For safe area handling
  KeyboardAvoidingView, // For keyboard handling in modals
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // For navigation
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // For safe area insets

// Define a consistent color palette for the entire app (copied from profile.js)
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

// Define the API base URL (ensure this matches your actual backend)
import { BASE_URL } from '../config';

export default function AccountOptions({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { user } = route.params; // Expecting user object with at least user.id and user.email

  const [profile, setProfile] = useState(null); // To store fetched profile details (especially email)
  const [loading, setLoading] = useState(true);

  // States for the edit modals (copied from profile.js logic)
  const [editAccountModalVisible, setEditAccountModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordVerificationModalVisible, setPasswordVerificationModalVisible] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [confirmChangesModalVisible, setConfirmChangesModalVisible] = useState(false);

  // --- Fetch Account Options (Email) ---
  const fetchAccountOptions = useCallback(async () => {
    setLoading(true);
    if (!user?.id) {
      console.warn("User ID not available for fetching account options.");
      setLoading(false);
      return;
    }
    try {
      // Fetch user data to get the latest email
      const response = await fetch(`${API_BASE_URL}/get-user.php?id=${user.id}`);
      const resJson = await response.json();
      if (resJson.success && resJson.user) {
        setProfile(resJson.user); // Store the full user object as profile
        setNewEmail(resJson.user.email); // Initialize newEmail with current email
      } else {
        Alert.alert('Error', resJson.message || 'Failed to load account details.');
      }
    } catch (error) {
      console.error('Fetch Account Options Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccountOptions();
    // Add a focus listener to re-fetch data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAccountOptions();
    });
    return unsubscribe; // Clean up the listener
  }, [fetchAccountOptions, navigation]);

  // --- Input Validation Functions (copied from profile.js) ---
  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePassword = useCallback((password) => {
    return password.length >= 8;
  }, []);

  // --- Open Edit Account Modal (initiates password verification) ---
  const openEditAccountModal = useCallback(() => {
    if (profile) {
      setNewEmail(profile.email); // Pre-fill with current email
      setNewPassword(''); // Always clear password fields
      setConfirmNewPassword('');
      setCurrentPasswordInput(''); // Clear current password input
      setPasswordVerificationModalVisible(true); // First, show password verification modal
    }
  }, [profile]);

  // --- Handle Current Password Verification ---
  const handleVerifyCurrentPassword = useCallback(async () => {
    if (!currentPasswordInput) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}api/verify-current-password.php`, {
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
    const isEmailSame = newEmail === profile.email;
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
  }, [newEmail, newPassword, confirmNewPassword, profile, validateEmail, validatePassword]);

  // --- Confirm and Send Changes to Backend ---
  const confirmChanges = useCallback(async () => {
    setConfirmChangesModalVisible(false); // Close confirmation modal

    try {
      const response = await fetch(`${API_BASE_URL}api/update-account-options.php`, {
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
        fetchAccountOptions(); // Re-fetch profile to show updated email
      } else {
        Alert.alert('Error', data.message || 'Failed to update account details.');
      }
    } catch (error) {
      console.error('Update Account Options Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, [user?.id, newEmail, newPassword, fetchAccountOptions]);

  // Determine active tab for bottom navigation (copied from profile.js)
  const currentRouteName = route.name;
  const isHomeActive = currentRouteName === 'ProductList';
  const isChatActive = currentRouteName === 'Message' || currentRouteName === 'ChatBot';
  const isCartActive = currentRouteName === 'Carts';
  const isOrdersActive = ['ToPay', 'ToConfirm', 'ToReceive', 'ToRate', 'OrderHistory'].includes(currentRouteName);
  const isAccountActive = currentRouteName === 'Profile' || currentRouteName === 'MyProfile' || currentRouteName === 'AccountOptions';

  // Fallback for profile image if user.profilepic is not available or invalid
  const profileImageSource = profile?.profilepic && profile.profilepic !== 'null'
    ? { uri: `${API_BASE_URL}api/uploads/${profile.profilepic}?t=${Date.now()}` }
    : require('../assets/user.png'); // Ensure you have a default-profile.png in your assets folder

  if (loading || !profile) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loaderText}>Loading account details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header (styled like profile.js header, but with back button) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Options</Text>
          <View style={{ width: 24 }} /> {/* Placeholder for alignment */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {/* User Profile Picture */}
          <View style={styles.profileImageContainer}>
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              onError={(e) => console.log('Profile Image Load Error:', e.nativeEvent.error)}
            />
          </View>

          {/* Account Details Section (styled like sections in profile.js) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Account Details</Text>
              <TouchableOpacity onPress={openEditAccountModal}>
                <Ionicons name="create-outline" size={24} color={colors.primaryGreen} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{profile?.email || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Password:</Text>
              <Text style={styles.detailValue}>********</Text> {/* Always masked */}
            </View>
          </View>
        </ScrollView>

        {/* --- Current Password Verification Modal --- */}
        <Modal
          visible={passwordVerificationModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setPasswordVerificationModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Verify Current Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter current password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={currentPasswordInput}
                onChangeText={setCurrentPasswordInput}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.modalActionButton} onPress={handleVerifyCurrentPassword}>
                <Text style={styles.modalActionButtonText}>Verify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelActionButton]}
                onPress={() => setPasswordVerificationModalVisible(false)}
              >
                <Text style={[styles.modalActionButtonText, styles.modalCancelActionButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* --- Edit Email/Password Modal --- */}
        <Modal
          visible={editAccountModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditAccountModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Edit Account Details</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="New Email"
                placeholderTextColor={colors.textSecondary}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="New Password (leave blank to keep current)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.modalActionButton} onPress={handleSaveAccountOptions}>
                <Text style={styles.modalActionButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelActionButton]}
                onPress={() => setEditAccountModalVisible(false)}
              >
                <Text style={[styles.modalActionButtonText, styles.modalCancelActionButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* --- Final Confirmation Modal --- */}
        <Modal
          visible={confirmChangesModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setConfirmChangesModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Confirm Changes</Text>
              <Text style={[styles.detailLabel, { textAlign: 'center', marginBottom: 20 }]}>
                Are you sure you want to apply these changes?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButton} onPress={confirmChanges}>
                  <Text style={styles.modalButtonText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setConfirmChangesModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, styles.modalCancelButtonText]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Bottom Navigation (copied from profile.js) */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductList', { user })}
            style={styles.navButton}
          >
            <Ionicons name="home" size={24} color={isHomeActive ? colors.white : colors.lightGreen} />
            <Text style={[styles.navLabel, isHomeActive && styles.activeNavLabel]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Message', { user })}
            style={styles.navButton}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={isChatActive ? colors.white : colors.lightGreen} />
            <Text style={[styles.navLabel, isChatActive && styles.activeNavLabel]}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Carts', { user })}
            style={styles.navButton}
          >
            <Ionicons name="cart" size={24} color={isCartActive ? colors.white : colors.lightGreen} />
            <Text style={[styles.navLabel, isCartActive && styles.activeNavLabel]}>Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('OrderHistory', { user })}
            style={styles.navButton}
          >
            <Ionicons name="receipt" size={24} color={isOrdersActive ? colors.white : colors.lightGreen} />
            <Text style={[styles.navLabel, isOrdersActive && styles.activeNavLabel]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { user })}
            style={styles.navButton}
          >
            <Ionicons name="person" size={24} color={isAccountActive ? colors.white : colors.lightGreen} />
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGreyBackground,
  },
  loaderText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    backgroundColor: colors.primaryGreen,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // To space out back button, title, and placeholder
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 20,
  },
  scrollViewContent: {
    flexGrow: 1, // Allows content to grow and be scrollable
    padding: 16,
    paddingBottom: 100, // Ensure space for bottom nav
  },
  // New styles for profile image container
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primaryGreen,
    backgroundColor: colors.greyBorder, // Placeholder background
  },
  section: {
    backgroundColor: colors.white,
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    paddingBottom: 8,
  },
  sectionHeading: {
    fontWeight: 'bold',
    fontSize: 18, // Adjusted for section titles
    color: colors.primaryGreen,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 16,
  },
  detailValue: {
    color: colors.textSecondary,
    fontSize: 16,
    flexShrink: 1,
    marginLeft: 10,
    textAlign: 'right',
  },
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 + insets.bottom : 10,
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  navLabel: {
    color: colors.white, // Changed to white as requested
    fontSize: 12,
    marginTop: 2,
  },
  activeNavLabel: {
    color: colors.white,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 25,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    backgroundColor: colors.white,
    padding: Platform.OS === 'ios' ? 15 : 12,
    marginVertical: 8,
    borderRadius: 10,
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalActionButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
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
    color: colors.textSecondary,
  },
  modalButtons: { // For the Yes/No buttons in confirmation modal
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: { // For Yes/No buttons in confirmation modal
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    backgroundColor: colors.primaryGreen,
    marginHorizontal: 5,
  },
  modalButtonText: { // For Yes/No buttons in confirmation modal
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCancelButton: { // For Cancel button in confirmation modal
    backgroundColor: colors.greyBorder,
  },
  modalCancelButtonText: { // For Cancel button text in confirmation modal
    color: colors.textSecondary,
  },
});
