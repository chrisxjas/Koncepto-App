import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import AlertMessage from "./essentials/AlertMessage"; // ✅ your reusable alert

WebBrowser.maybeCompleteAuthSession();

export default function CreateAccount({ navigation }) {
  const [first_name, setFName] = useState("");
  const [last_name, setLName] = useState("");
  const [cp_no, setCpNo] = useState("");
  const [errors, setErrors] = useState({});

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "653056599587-v2l95ngti2pui0319tc1tl4ioa1rt95e.apps.googleusercontent.com",
    androidClientId: "653056599587-v2l95ngti2pui0319tc1tl4ioa1rt95e.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      showAlert("Google Sign-In Success", "Account created with Google!");
      setTimeout(() => navigation.replace("Home"), 1000);
    }
  }, [response]);

  // Format phone number with dashes: 09**-***-****
  const formatPhoneNumber = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (text) => {
    setCpNo(formatPhoneNumber(text));
    if (errors.cp_no) setErrors((prev) => ({ ...prev, cp_no: "" }));
  };

  // Format name: capitalize first letter of each word
  const formatName = (name) => {
    return name
      .trim()
      .split(" ")
      .filter((w) => w.length > 0)
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleRegister = () => {
    const newErrors = {};
    if (!first_name.trim()) newErrors.first_name = "First Name is required";
    if (!last_name.trim()) newErrors.last_name = "Last Name is required";

    const rawNumber = cp_no.replace(/\D/g, "");
    if (rawNumber.length !== 11) newErrors.cp_no = "Valid contact number is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Format names properly
    const formattedFirstName = formatName(first_name);
    const formattedLastName = formatName(last_name);

    navigation.navigate("AccountCredentials", {
      first_name: formattedFirstName,
      last_name: formattedLastName,
      cp_no: rawNumber,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("../assets/koncepto.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={[styles.input, errors.first_name && styles.inputError]}
        placeholder="First Name"
        value={first_name}
        onChangeText={(text) => {
          setFName(text);
          if (errors.first_name) setErrors((prev) => ({ ...prev, first_name: "" }));
        }}
      />
      {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}

      <TextInput
        style={[styles.input, errors.last_name && styles.inputError]}
        placeholder="Last Name"
        value={last_name}
        onChangeText={(text) => {
          setLName(text);
          if (errors.last_name) setErrors((prev) => ({ ...prev, last_name: "" }));
        }}
      />
      {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={[styles.input, errors.cp_no && styles.inputError]}
        placeholder="09**-***-****"
        keyboardType="number-pad"
        value={cp_no}
        onChangeText={handlePhoneChange}
        maxLength={13}
      />
      {errors.cp_no && <Text style={styles.errorText}>{errors.cp_no}</Text>}

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>Register</Text>
      </TouchableOpacity>

      <View style={styles.orContainer}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={styles.googleButton}
        disabled={!request}
        onPress={() => promptAsync()}
      >
        <Image source={require("../assets/google.png")} style={styles.googleLogo} />
        <Text style={styles.googleText}>Sign up with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginHighlight}>Login</Text>
        </Text>
      </TouchableOpacity>

      {/* ✅ Custom alert */}
      <AlertMessage
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f8f9fa" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#28a745" },
  label: { fontSize: 15, fontWeight: "300", color: "#333", marginBottom: 6, alignSelf: "flex-start" },
  input: { width: "100%", height: 50, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, backgroundColor: "#fff" },
  inputError: { borderColor: "red" },
  errorText: { color: "red", fontSize: 12, marginBottom: 8, alignSelf: "flex-start" },
  registerButton: { backgroundColor: "#28a745", paddingVertical: 15, borderRadius: 8, width: "100%", alignItems: "center", marginTop: 10 },
  registerText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  orContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20, width: "100%" },
  line: { flex: 1, height: 1, backgroundColor: "#ccc" },
  orText: { marginHorizontal: 10, fontSize: 14, color: "#666" },
  googleButton: { backgroundColor: "#FFFFFF", justifyContent: "center", flexDirection: "row", borderColor: "#28a745", borderWidth: 2, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", width: "100%" },
  googleLogo: { width: 20, height: 20, marginRight: 10 },
  googleText: { color: "#28a745", fontSize: 16, fontWeight: "600" },
  loginLink: { marginTop: 20 },
  loginText: { fontSize: 14, color: "#555" },
  loginHighlight: { color: "#28a745", fontWeight: "bold" },
  logo: { width: 100, height: 100, marginBottom: 15 },
});
