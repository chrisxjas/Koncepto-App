import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { BASE_URL } from "../config";
import { Ionicons } from "@expo/vector-icons";
import AlertMessage from "./essentials/AlertMessage";

export default function AccountCredentials({ navigation, route }) {
  const { first_name, last_name, cp_no } = route.params;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Verification state
  const [serverCode, setServerCode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle"); // idle | codeSent | verifying | verified

  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (verificationStatus === "codeSent") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [verificationStatus]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => {
    const regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  // Send verification code
  const handleSendCode = async () => {
    if (!email.trim() || !validateEmail(email)) {
      setEmailError("Enter valid email first");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/send-verification.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (result.success) {
        setServerCode(result.code.toString());
        setVerificationStatus("codeSent");
        showAlert("Verification Sent", "Check your email for the code.");
      } else {
        showAlert("Error", result.message || "Failed to send code.");
      }

      
    } catch (error) {
      console.error("Verification error:", error);
      showAlert("Error", "Server error. Try again later.");
    }
  };

  // Verify code
  const handleVerifyCode = () => {
    if (!userCode.trim()) {
      setEmailError("Enter the code sent to your email");
      return;
    }
    setVerificationStatus("verifying");
    setTimeout(() => {
      if (userCode === serverCode) {
        setVerificationStatus("verified");
        setEmailError("");
        showAlert("Success", "Email verified successfully!");
      } else {
        setVerificationStatus("codeSent");
        setEmailError("Invalid verification code");
      }
    }, 1500);
  };

  // Register only when verified
  const handleRegister = async () => {
    setPasswordError("");
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters with letters, numbers, and symbols"
      );
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/register.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          cp_no,
          email,
          password,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showAlert("Success", "Account created successfully!");
        setTimeout(() => navigation.navigate("Login"), 1000);
      } else {
        showAlert("Error", result.message || "Account creation failed.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      showAlert("Error", "Server error. Try again later.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Image
              source={require("../assets/koncepto.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Account Credentials</Text>
            <Text style={styles.subtitle}>
              Set your email and password to complete registration
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Email Section */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[
                    styles.input, 
                    emailError && styles.inputError, 
                    { flex: 1 }
                  ]}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setUserCode("");
                    setEmailError("");
                    if (verificationStatus === "verified") {
                      setVerificationStatus("idle");
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {verificationStatus === "idle" || verificationStatus === "codeSent" ? (
                  <Animated.View
                    style={{
                      transform: [{ scale: verificationStatus === "codeSent" ? scaleAnim : 1 }],
                    }}
                  >
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={verificationStatus === "idle" ? handleSendCode : handleVerifyCode}
                    >
                      <Text style={styles.actionText}>
                        {verificationStatus === "idle" ? "Send Code" : "Verify"}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : verificationStatus === "verifying" ? (
                  <ActivityIndicator size="small" color="#28a745" />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                )}
              </View>
              
              {verificationStatus === "codeSent" && (
                <View style={styles.verificationContainer}>
                  <TextInput
                    style={[styles.input, emailError && styles.inputError]}
                    placeholder="Enter verification code"
                    placeholderTextColor="#999"
                    value={userCode}
                    onChangeText={setUserCode}
                    keyboardType="number-pad"
                  />
                </View>
              )}
              
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : (
                <Text style={styles.helperText}>
                  We'll send a verification code to this email
                </Text>
              )}
            </View>

            {/* Password Section */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.passwordContainer, 
                passwordError && styles.inputError
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a secure password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : (
                <Text style={styles.helperText}>
                  Minimum 8 characters with letters, numbers, and symbols
                </Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton, 
                verificationStatus !== "verified" && styles.registerButtonDisabled
              ]}
              onPress={handleRegister}
              disabled={verificationStatus !== "verified"}
            >
              <Text style={styles.registerText}>
                Complete Registration
              </Text>
            </TouchableOpacity>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, styles.progressDotCompleted]} />
                <Text style={styles.progressText}>Personal Info</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot, 
                  verificationStatus === "verified" ? styles.progressDotCompleted : styles.progressDotCurrent
                ]} />
                <Text style={styles.progressText}>Credentials</Text>
              </View>
            </View>
          </View>

          {/* Custom Alert */}
          <AlertMessage
            visible={alertVisible}
            title={alertTitle}
            message={alertMessage}
            onClose={() => setAlertVisible(false)}
          />

          <StatusBar style="auto" />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#ffffff",
  },
  inner: { 
    flex: 1, 
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: { 
    width: 100, 
    height: 100, 
    marginBottom: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#28a745",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    paddingHorizontal: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 4,
  },
  inputError: {
    borderColor: "#dc3545",
    backgroundColor: "#fdf2f2",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    marginTop: 6,
    fontWeight: "500",
  },
  helperText: {
    color: "#666",
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
  actionButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 80,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  verificationContainer: {
    marginTop: 12,
  },
  registerButton: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    backgroundColor: "#ccc",
    shadowColor: "#ccc",
  },
  registerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: "center",
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  progressDotCompleted: {
    backgroundColor: "#28a745",
  },
  progressDotCurrent: {
    backgroundColor: "#28a745",
    borderWidth: 2,
    borderColor: "#28a745",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e1e5e9",
    marginHorizontal: 10,
    maxWidth: 60,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});