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
import AlertMessage from "./essentials/AlertMessage"; // ✅ import custom alert

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
      setPasswordError("Required");
      return;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Min 8 chars, must include letters, numbers, and symbols"
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Image
            source={require("../assets/koncepto.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Set Email and Password</Text>

          <View style={styles.emailRow}>
            <TextInput
              style={[styles.input, emailError && styles.inputError, { flex: 1 }]}
              placeholder="Email"
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
              <Ionicons name="checkmark-circle" size={24} color="green" />
            )}
          </View>

          {verificationStatus === "codeSent" && (
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Enter verification code"
              value={userCode}
              onChangeText={setUserCode}
              keyboardType="number-pad"
            />
          )}
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={[styles.passwordContainer, passwordError && styles.inputError]}>
            <TextInput
              style={[styles.passwordInput, { flex: 1 }]}
              placeholder="Enter Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="green"
                style={{ paddingHorizontal: 6 }}
              />
            </TouchableOpacity>
          </View>
          {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

          <TouchableOpacity
            style={[styles.registerButton, verificationStatus !== "verified" && { backgroundColor: "#ccc" }]}
            onPress={handleRegister}
            disabled={verificationStatus !== "verified"}
          >
            <Text style={styles.registerText}>Register</Text>
          </TouchableOpacity>

          {/* ✅ Custom Alert */}
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
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#fff" },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: "green" },
  errorText: { color: "red", fontSize: 13, marginBottom: 8, marginLeft: 4 },
  emailRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  actionText: { color: "#28a745", marginLeft: 10, fontWeight: "bold", fontSize: 15 },
  input: { height: 45, borderBottomWidth: 1, borderBottomColor: "#999", marginBottom: 15, paddingHorizontal: 10, fontSize: 15 },
  inputError: { borderBottomColor: "red" },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#999", marginBottom: 15 },
  passwordInput: { height: 45, fontSize: 15, paddingHorizontal: 10 },
  registerButton: { backgroundColor: "#28a745", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 20 },
  registerText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
