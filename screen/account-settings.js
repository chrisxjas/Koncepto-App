import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config';

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#F0F8F0',
  accentGreen: '#8BC344',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  greyBorder: '#DDDDDD',
  lightGreyBackground: '#FAFAFA',
  errorRed: '#e53935',
  warningOrange: '#FF9800',
};

// Custom Alert Component
const CustomAlert = ({ visible, type, title, message, onConfirm, onCancel }) => {
  if (!visible) return null;

  const getAlertStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: styles.alertErrorContainer,
          icon: 'warning',
          iconColor: colors.errorRed,
          titleColor: colors.errorRed,
        };
      case 'warning':
        return {
          container: styles.alertWarningContainer,
          icon: 'warning',
          iconColor: colors.warningOrange,
          titleColor: colors.warningOrange,
        };
      case 'success':
        return {
          container: styles.alertSuccessContainer,
          icon: 'checkmark-circle',
          iconColor: colors.primaryGreen,
          titleColor: colors.primaryGreen,
        };
      default:
        return {
          container: styles.alertDefaultContainer,
          icon: 'information-circle',
          iconColor: colors.primaryGreen,
          titleColor: colors.textPrimary,
        };
    }
  };

  const alertStyles = getAlertStyles();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContainer, alertStyles.container]}>
          <View style={styles.alertHeader}>
            <Ionicons name={alertStyles.icon} size={32} color={alertStyles.iconColor} />
            <Text style={[styles.alertTitle, { color: alertStyles.titleColor }]}>
              {title}
            </Text>
          </View>
          
          <Text style={styles.alertMessage}>{message}</Text>
          
          <View style={styles.alertButtons}>
            {onCancel && (
              <TouchableOpacity
                style={[styles.alertButton, styles.alertCancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.alertCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.alertButton, styles.alertConfirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.alertConfirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AccSettings = ({ route }) => {
  const { user } = route.params;
  const navigation = useNavigation();

  const [activeModal, setActiveModal] = useState(null); // 'changePassword' or 'deleteAccount'
  const [loading, setLoading] = useState(false);
  
  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState('default');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnConfirm, setAlertOnConfirm] = useState(null);
  
  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Delete Account States
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Custom Alert Functions
  const showAlert = (type, title, message, onConfirm = null) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnConfirm(() => onConfirm);
    setAlertVisible(true);
  };

  const hideAlert = () => {
    setAlertVisible(false);
    setAlertOnConfirm(null);
  };

  const handleAlertConfirm = () => {
    if (alertOnConfirm) {
      alertOnConfirm();
    }
    hideAlert();
  };

  const showModal = (modalType) => {
    setActiveModal(modalType);
    // Reset all fields when opening modal
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setDeletePassword('');
    setDeleteConfirmation('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowDeletePassword(false);
  };

  const hideModal = () => {
    setActiveModal(null);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('error', 'Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('error', 'Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('error', 'Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/change-password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      // Check if response is OK first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('Raw response:', text); // Debug log

      if (!text) {
        throw new Error('Empty response from server');
      }

      const result = JSON.parse(text);

      if (result.success) {
        showAlert('success', 'Success', 'Password changed successfully!', hideModal);
      } else {
        showAlert('error', 'Error', result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      showAlert('error', 'Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showAlert('error', 'Error', 'Please enter your current password');
      return;
    }

    if (deleteConfirmation.toLowerCase() !== 'delete my account') {
      showAlert('error', 'Error', 'Please type "delete my account" to confirm');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/delete-account.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          password: deletePassword,
        }),
      });

      // Check if response is OK first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('Raw response:', text); // Debug log

      if (!text) {
        throw new Error('Empty response from server');
      }

      const result = JSON.parse(text);

      if (result.success) {
        showAlert(
          'success',
          'Account Deleted',
          'Your account has been successfully deleted.',
          () => {
            hideModal();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        );
      } else {
        showAlert('error', 'Error', result.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      showAlert('error', 'Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkAccountDeletionEligibility = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/check-account-deletion.php?user_id=${user.id}`);
      
      // Check if response is OK first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('Raw response:', text); // Debug log

      if (!text) {
        throw new Error('Empty response from server');
      }

      const result = JSON.parse(text);

      if (result.success) {
        showModal('deleteAccount');
      } else {
        showAlert('warning', 'Cannot Delete Account', result.message);
      }
    } catch (error) {
      console.error('Check eligibility error:', error);
      showAlert('error', 'Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.profileSection}>
            {user.profilepic ? (
            <Image
                source={{ uri: `${BASE_URL}/uploads/${user.profilepic}` }}
                style={styles.profileImage}
            />
            ) : (
            <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
            )}
            <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
        </View>
         

        <View style={styles.optionsSection}>
          {/* Change Password Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => showModal('changePassword')}
            disabled={loading}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="lock-closed" size={24} color={colors.primaryGreen} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Change Password</Text>
              <Text style={styles.optionDescription}>
                Update your account password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Delete Account Option */}
          <TouchableOpacity
            style={[styles.optionCard, styles.deleteOption]}
            onPress={checkAccountDeletionEligibility}
            disabled={loading}
          >
            <View style={[styles.optionIconContainer, styles.deleteIconContainer]}>
              <Ionicons name="trash-outline" size={24} color={colors.errorRed} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.deleteTitle]}>
                Delete Account
              </Text>
              <Text style={styles.optionDescription}>
                Permanently delete your account and all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={activeModal === 'changePassword'}
        animationType="slide"
        transparent={true}
        onRequestClose={hideModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={hideModal} disabled={loading}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                For security reasons, please verify your current password before setting a new one.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordTextInput}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordTextInput}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Must be at least 6 characters long
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordTextInput}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={hideModal}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Updating...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={activeModal === 'deleteAccount'}
        animationType="slide"
        transparent={true}
        onRequestClose={hideModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, styles.deleteTitle]}>Delete Account</Text>
              <TouchableOpacity onPress={hideModal} disabled={loading}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={40} color={colors.warningOrange} />
                <Text style={styles.warningTitle}>This action cannot be undone</Text>
                <Text style={styles.warningText}>
                  Deleting your account will permanently remove all your data, including:
                </Text>
                <Text style={styles.warningItem}>• Your profile information</Text>
                <Text style={styles.warningItem}>• Order history</Text>
                <Text style={styles.warningItem}>• Payment records</Text>
                <Text style={styles.warningItem}>• All other account data</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordTextInput}
                    placeholder="Enter your password to confirm"
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry={!showDeletePassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowDeletePassword(!showDeletePassword)}
                  >
                    <Ionicons
                      name={showDeletePassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Type "delete my account" to confirm
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="delete my account"
                  value={deleteConfirmation}
                  onChangeText={setDeleteConfirmation}
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={hideModal}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, loading && styles.buttonDisabled]}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {loading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onConfirm={handleAlertConfirm}
        onCancel={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: colors.lightGreyBackground,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionsSection: {
    padding: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteOption: {
    borderColor: colors.errorRed,
    backgroundColor: '#FFF5F5',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteIconContainer: {
    backgroundColor: '#FFE5E5',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deleteTitle: {
    color: colors.errorRed,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGreyBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.greyBorder,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    padding: 20,
    paddingBottom: 10,
  },
  inputGroup: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  // Password input styles
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  passwordTextInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  warningContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF9E6',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warningOrange,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warningOrange,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: colors.greyBorder,
  },
  confirmButton: {
    backgroundColor: colors.primaryGreen,
  },
  deleteConfirmButton: {
    backgroundColor: colors.errorRed,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteConfirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertErrorContainer: {
    borderLeftWidth: 6,
    borderLeftColor: colors.errorRed,
  },
  alertWarningContainer: {
    borderLeftWidth: 6,
    borderLeftColor: colors.warningOrange,
  },
  alertSuccessContainer: {
    borderLeftWidth: 6,
    borderLeftColor: colors.primaryGreen,
  },
  alertDefaultContainer: {
    borderLeftWidth: 6,
    borderLeftColor: colors.primaryGreen,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  alertMessage: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  alertButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  alertCancelButton: {
    backgroundColor: colors.greyBorder,
  },
  alertConfirmButton: {
    backgroundColor: colors.primaryGreen,
  },
  alertCancelButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertConfirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AccSettings;