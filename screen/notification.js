import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
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

  const markAsRead = async (notificationId = null) => {
    try {
      const payload = notificationId 
        ? { user_id: user.id, notification_id: notificationId }
        : { user_id: user.id };

      const response = await fetch(`${BASE_URL}/mark_as_read.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Notification marked as read');
          // Update local state to reflect read status
          if (notificationId) {
            setNotifications(prev => prev.map(notif => 
              notif.id === notificationId ? { ...notif, is_read: 1 } : notif
            ));
          } else {
            // Mark all as read
            setNotifications(prev => prev.map(notif => ({ ...notif, is_read: 1 })));
          }
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markSingleAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${BASE_URL}/mark_single_as_read.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user.id, 
          notification_id: notificationId 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Single notification marked as read');
          // Update local state to reflect read status
          setNotifications(prev => prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: 1 } : notif
          ));
        }
      }
    } catch (error) {
      console.error("Error marking single as read:", error);
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

  // REMOVED: Auto-mark all as read when component mounts

  const handleNotificationPress = async (notification) => {
    // Check if it's a message-related notification
    const isMessageRelated = notification.message?.toLowerCase().includes('message') || 
                            notification.message?.toLowerCase().includes('chat') ||
                            notification.type === 'message';

    if (isMessageRelated) {
      // Mark as read first, then navigate
      if (notification.is_read == 0) {
        await markSingleAsRead(notification.id);
      }
      // Navigate to message screen for message-related notifications
      navigation.navigate('Message', { user });
    } else {
      // For non-message notifications, mark as read and show the content
      if (notification.is_read == 0) {
        await markSingleAsRead(notification.id);
      }
      
      // Show notification content in an alert
      Alert.alert(
        "Notification",
        notification.message,
        [{ text: "OK" }]
      );
    }
  };

  const handleMarkAllAsRead = () => {
    if (notifications.some(notif => notif.is_read == 0)) {
      markAsRead();
      Alert.alert("Success", "All notifications marked as read");
    } else {
      Alert.alert("Info", "All notifications are already read");
    }
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
        <TouchableOpacity onPress={handleMarkAllAsRead}>
          <Text style={styles.markAllReadText}>Mark All Read</Text>
        </TouchableOpacity>
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
                {/* Show type indicator */}
                <View style={styles.typeIndicator}>
                  <Text style={styles.typeText}>
                    {item.message?.toLowerCase().includes('message') || 
                     item.message?.toLowerCase().includes('chat') ? 
                     "Message" : "Notification"}
                  </Text>
                </View>
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
  markAllReadText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    marginTop: 4,
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
  typeIndicator: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    color: "#666",
    fontSize: 10,
    fontWeight: "500",
  },
});