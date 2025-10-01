import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  Modal, ActivityIndicator, Image, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL } from '../config';
import Loading from './essentials/loading';

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
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send_otp' }),
      });
      const result = await res.json();
      setLoading(false);

      if (result.success) {
        Alert.alert('Success', 'Verification code sent to your email.', [
          { text: 'OK', onPress: () => setOtpModalVisible(true) },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to send code');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Cannot connect to server.');
    }
  };

  const verifyOtp = async () => {
    if (!otp) return Alert.alert('Error', 'OTP is required');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, action: 'verify_otp' }),
      });
      const result = await res.json();
      setLoading(false);

      if (result.success) {
        setOtpModalVisible(false);
        setNewPassModalVisible(true); // open new password modal
      } else {
        Alert.alert('Error', result.message || 'Invalid OTP');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Cannot connect to server.');
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword, action: 'reset_password' }),
      });
      const result = await res.json();
      setLoading(false);

      if (result.success && result.user) {
        setNewPassModalVisible(false);
        Alert.alert('Success', 'Password updated. Logging you in...', [
          { text: 'OK', onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'ProductList', params: { user: result.user } }],
            })
          }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to reset password');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Cannot connect to server.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image
            source={require('../assets/logo.png')} // your logo
            style={styles.logo}
          />
          <Text style={styles.title}>Forgot Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            textAlign="center"
          />
          <TouchableOpacity style={styles.button} onPress={sendOtp}>
            <Text style={styles.buttonText}>Send Code</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: '#4CAF50', marginTop: 15, textAlign: 'center' }}>Back to Login</Text>
          </TouchableOpacity>

          {loading && <Loading size={60} />}

          {/* OTP Modal */}
          <Modal visible={otpModalVisible} transparent animationType="slide">
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Enter OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="OTP"
                  keyboardType="numeric"
                  value={otp}
                  onChangeText={setOtp}
                  textAlign="center"
                />
                <TouchableOpacity style={styles.button} onPress={verifyOtp}>
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#ccc', marginTop: 10 }]}
                  onPress={() => setOtpModalVisible(false)}
                >
                  <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* New Password Modal */}
          <Modal visible={newPassModalVisible} transparent animationType="slide">
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>New Password (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  textAlign="center"
                />
                <TouchableOpacity style={styles.button} onPress={resetPassword}>
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#ccc', marginTop: 10 }]}
                  onPress={() => { setNewPassModalVisible(false); navigation.goBack(); }}
                >
                  <Text style={[styles.buttonText, { color: '#333' }]}>Skip</Text>
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
  container: { flex: 1, justifyContent: 'center', padding: 30, alignItems: 'center' },
  logo: { width: 120, height: 120, marginBottom: 20, resizeMode: 'contain' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  modalBackground: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContainer: { width:'80%', padding:20, backgroundColor:'#fff', borderRadius:10, alignItems:'center' },
  modalTitle: { fontSize:18, fontWeight:'bold', marginBottom:15, textAlign:'center', color:'#333' }
});
