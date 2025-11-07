import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function About() {
  const navigation = useNavigation();

  const handleTerms = () => {
    // ✅ Later you can navigate to TermsScreen
    navigation.navigate("Terms");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#E8F5E9" }}>
      {/* ✅ HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Koncepto</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ✅ MAIN CONTENT */}
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appName}>Koncepto</Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        <Text style={styles.sectionTitle}>About Koncepto Business</Text>
        <Text style={styles.paragraph}>
          Koncepto is a modern business platform that provides a seamless
          ordering and supply management experience for schools, offices, and
          organizations. It connects customers and suppliers in one efficient
          system, making it easier to browse, order, and manage essential
          products anytime and anywhere.
        </Text>

        <Text style={styles.paragraph}>
          Our platform aims to support businesses and institutions by offering
          a convenient, transparent, and organized way to handle bulk orders,
          track transactions, and ensure timely deliveries — all through a
          secure digital environment. Koncepto values simplicity, reliability,
          and customer satisfaction in every transaction.
        </Text>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          To empower businesses and customers by providing a smart and trusted
          digital platform that simplifies order management and promotes
          efficient operations.
        </Text>

        <Text style={styles.sectionTitle}>Core Features</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Centralized order management</Text>
          <Text style={styles.listItem}>• Real-time order tracking</Text>
          <Text style={styles.listItem}>• Flexible payment options</Text>
          <Text style={styles.listItem}>• Secure digital transactions</Text>
          <Text style={styles.listItem}>• Reliable customer support</Text>
        </View>

        <Text style={styles.sectionTitle}>Our Commitment</Text>
        <Text style={styles.paragraph}>
          Koncepto is committed to maintaining the highest standards of service,
          ensuring every client experiences a smooth, reliable, and professional
          business process. We value your trust and continue to improve our
          platform to meet your evolving needs.{" "}
          <Text style={{ fontWeight: "600", color: "#4CAF50" }}>
            To learn more, you may read our Terms and Conditions below.
          </Text>
        </Text>

        {/* ✅ BUTTON */}
        <TouchableOpacity style={styles.button} onPress={handleTerms}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color="#fff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.buttonText}>See Terms and Conditions</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2025 Koncepto Business. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    height: Platform.OS === "ios" ? 90 : 70,
    paddingTop: Platform.OS === "ios" ? 40 : 0,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#388E3C",
    textAlign: "center",
  },
  version: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    textAlign: "justify",
  },
  list: {
    marginTop: 4,
    paddingLeft: 10,
  },
  listItem: {
    fontSize: 15,
    color: "#444",
    marginVertical: 2,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    marginTop: 24,
    alignSelf: "center",
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  footer: {
    marginTop: 30,
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    fontStyle: "italic",
  },
});
