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
import AlertMessage from "./essentials/AlertMessage";

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
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/koncepto.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Koncepto today</Text>
      </View>

      <View style={styles.formContainer}>
        {/* First Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[styles.input, errors.first_name && styles.inputError]}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
            value={first_name}
            onChangeText={(text) => {
              setFName(text);
              if (errors.first_name) setErrors((prev) => ({ ...prev, first_name: "" }));
            }}
          />
          {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
        </View>

        {/* Last Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={[styles.input, errors.last_name && styles.inputError]}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
            value={last_name}
            onChangeText={(text) => {
              setLName(text);
              if (errors.last_name) setErrors((prev) => ({ ...prev, last_name: "" }));
            }}
          />
          {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, errors.cp_no && styles.inputError]}
            placeholder="09XX-XXX-XXXX"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            value={cp_no}
            onChangeText={handlePhoneChange}
            maxLength={13}
          />
          {errors.cp_no && <Text style={styles.errorText}>{errors.cp_no}</Text>}
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerText}>Continue</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom alert */}
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
  container: { 
    flexGrow: 1, 
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: { 
    width: 120, 
    height: 120, 
    marginBottom: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#28a745",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 8,
  },
  input: { 
    width: "100%", 
    height: 56, 
    borderWidth: 1.5, 
    borderColor: "#e1e5e9", 
    borderRadius: 12, 
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
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
  registerButton: { 
    backgroundColor: "#28a745", 
    paddingVertical: 16, 
    borderRadius: 12, 
    width: "100%", 
    alignItems: "center", 
    marginTop: 10,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e1e5e9",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderWidth: 2,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleLogo: { 
    width: 20, 
    height: 20, 
    marginRight: 12 
  },
  googleText: { 
    color: "#333", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: { 
    fontSize: 16, 
    color: "#666" 
  },
  loginLink: { 
    color: "#28a745", 
    fontSize: 16, 
    fontWeight: "700" 
  },
});