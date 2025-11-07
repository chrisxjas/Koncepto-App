import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BASE_URL } from "../config";

export default function Notification() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = route.params;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications for user:', user.id);
      const response = await fetch(`${BASE_URL}/get_notifications.php?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Notifications response:', data);
      
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        console.warn('Failed to fetch notifications:', data.message);
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async () => {
    try {
      const response = await fetch(`${BASE_URL}/mark_as_read.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Notifications marked as read');
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    
    // Optional: Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark as read when component mounts and notifications are loaded
  useEffect(() => {
    if (notifications.length > 0) {
      markAsRead();
    }
  }, [notifications]);

  const handleNotificationPress = (notification) => {
    navigation.navigate('Message', { user });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#E8F5E9" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={50} color="#999" />
            <Text style={styles.noData}>No notifications yet.</Text>
            <Text style={styles.noDataSubtitle}>When you get notifications, they'll appear here.</Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNotificationPress(item)}
              style={styles.notificationItem}
            >
              <View
                style={[
                  styles.card,
                  { 
                    backgroundColor: item.is_read == 0 ? "#C8E6C9" : "#fff",
                    borderLeftWidth: 4,
                    borderLeftColor: item.is_read == 0 ? "#4CAF50" : "transparent"
                  },
                ]}
              >
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
                {item.is_read == 0 && (
                  <View style={styles.unreadIndicator}>
                    <Text style={styles.unreadText}>New</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    height: 70,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "bold" 
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  notificationItem: {
    marginBottom: 10,
  },
  card: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: "relative",
  },
  message: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  noData: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "500",
  },
  noDataSubtitle: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 5,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  unreadIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});