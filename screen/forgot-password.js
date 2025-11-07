import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  Modal, Alert, Image // Added Image to imports
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL } from '../config';
import Loading from './essentials/loading';

// Enhanced fetch with timeout
const fetchWithTimeout = async (url, options, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [newPassModalVisible, setNewPassModalVisible] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      return Alert.alert('Error', 'Email is required');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }

    setLoading(true);
    console.log('Sending OTP request to:', `${BASE_URL}/forgot-password.php`);
    
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/forgot-password.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, action: 'send_otp' }),
      });

      console.log('Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const text = await res.text();
      console.log('Raw response:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }
      
      setLoading(false);

      if (result.success) {
        Alert.alert('Success', result.message || 'Verification code sent to your email.', [
          { 
            text: 'OK', 
            onPress: () => {
              setOtpModalVisible(true);
              setOtp(''); // Clear previous OTP
            }
          },
        ]);
        
        // Log OTP for development (remove in production)
        if (result.debug_otp) {
          console.log('DEBUG OTP:', result.debug_otp);
          Alert.alert('Development Info', `OTP for testing: ${result.debug_otp}`);
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to send verification code');
      }
    } catch (error) {
      setLoading(false);
      console.error('Send OTP error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert('Error', 'Request timeout. Please check your connection and try again.');
      } else if (error.message.includes('Network request failed')) {
        Alert.alert('Error', 'Cannot connect to server. Please check your internet connection and server URL.');
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    }
  };

  const verifyOtp = async () => {
  if (!otp) {
    return Alert.alert('Error', 'OTP is required');
  }
  
  if (otp.length !== 6) {
    return Alert.alert('Error', 'OTP must be 6 digits');
  }

  setLoading(true);
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/forgot-password.php`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, otp, action: 'verify_otp' }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    setLoading(false);

    if (result.success) {
      // Auto-login after OTP verification (Skip scenario)
      Alert.alert('Success', 'Verification successful! Logging you in...', [
        { 
          text: 'OK', 
          onPress: () => {
            setOtpModalVisible(false);
            // Navigate directly to ProductList with user data
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProductList', params: { user: result.user } }],
            });
          }
        },
      ]);
    } else {
      Alert.alert('Error', result.message || 'Invalid OTP');
    }
  } catch (error) {
    setLoading(false);
    console.error('Verify OTP error:', error);
    
    if (error.name === 'AbortError') {
      Alert.alert('Error', 'Request timeout. Please try again.');
    } else {
      Alert.alert('Error', 'Cannot connect to server. Please check your connection.');
    }
  }
};

const resetPassword = async () => {
  if (newPassword && newPassword.length < 6) {
    return Alert.alert('Error', 'Password must be at least 6 characters long');
  }

  setLoading(true);
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/forgot-password.php`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        new_password: newPassword, 
        otp, // Include OTP for verification
        action: 'reset_password' 
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    setLoading(false);

    if (result.success && result.user) {
      setNewPassModalVisible(false);
      Alert.alert('Success', newPassword ? 'Password updated successfully!' : 'Process completed successfully.', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate to ProductList after password reset
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProductList', params: { user: result.user } }],
            });
          }
        }
      ]);
    } else {
      Alert.alert('Error', result.message || 'Failed to reset password');
    }
  } catch (error) {
    setLoading(false);
    console.error('Reset password error:', error);
    
    if (error.name === 'AbortError') {
      Alert.alert('Error', 'Request timeout. Please try again.');
    } else {
      Alert.alert('Error', 'Cannot connect to server. Please check your connection.');
    }
  }
};

  const handleResendOtp = () => {
    setOtp('');
    sendOtp();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address to receive a verification code
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            textAlign="center"
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>

          {loading && <Loading size={60} />}

          {/* OTP Modal */}
          <Modal 
            visible={otpModalVisible} 
            transparent 
            animationType="slide"
            onRequestClose={() => setOtpModalVisible(false)}
          >
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Enter Verification Code</Text>
                <Text style={styles.modalSubtitle}>
                  Enter the 6-digit code sent to {email}
                </Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  textAlign="center"
                  autoFocus
                />
                
                <TouchableOpacity 
                  style={[styles.button, loading && styles.buttonDisabled]} 
                  onPress={verifyOtp}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={loading}
                >
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setOtpModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* New Password Modal */}
          <Modal 
            visible={newPassModalVisible} 
            transparent 
            animationType="slide"
            onRequestClose={() => setNewPassModalVisible(false)}
          >
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Set New Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your new password (optional)
                </Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="New Password (optional)"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  textAlign="center"
                />
                
                <Text style={styles.passwordHint}>
                  Leave blank if you don't want to change your password
                </Text>
                
                <TouchableOpacity 
                  style={[styles.button, loading && styles.buttonDisabled]} 
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Updating...' : 'Continue'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => { 
                    // Skip password change and auto-login
                    setNewPassModalVisible(false);
                    // Call resetPassword with empty password to trigger auto-login
                    setNewPassword('');
                    resetPassword();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <StatusBar style="auto" />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 30, 
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  logo: { 
    width: 120, 
    height: 120, 
    marginBottom: 20, 
    resizeMode: 'contain' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center', 
    color: '#333' 
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    color: '#333',
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16, 
    textAlign: 'center' 
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    marginTop: 5,
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  backLink: { 
    color: '#4CAF50', 
    marginTop: 15, 
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  resendLink: {
    color: '#4CAF50',
    marginVertical: 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackground: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContainer: { 
    width: '85%', 
    padding: 25, 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    alignItems: 'center' 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center', 
    color: '#333' 
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
    lineHeight: 18,
  },
  passwordHint: {
    fontSize: 12,
    marginBottom: 15,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
});