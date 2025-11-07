import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  LayoutAnimation,
  UIManager,
  Pressable,
  Modal,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BASE_URL } from '../config';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#E8F5E9',
  accentGreen: '#8BC34A',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  errorRed: '#e53935',
  bubbleSent: '#DCF8C6',
  bubbleReceived: '#FFFFFF',
  dateSeparatorBg: '#E0E0E0',
  onlineGreen: '#4CAF50',
  checkmarkGray: '#666666',
  checkmarkGreen: '#4CAF50',
};

export default function MessageScreen() {
  const [messagesData, setMessagesData] = useState([]);
  const [renderItems, setRenderItems] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [pushNotificationEnabled, setPushNotificationEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');

  const navigation = useNavigation();
  const route = useRoute();
  const user = route.params?.user;
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);

  // Load notification settings from storage
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const savedSetting = await AsyncStorage.getItem(`notification_${user.id}`);
      if (savedSetting !== null) {
        setPushNotificationEnabled(JSON.parse(savedSetting));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (value) => {
    try {
      await AsyncStorage.setItem(`notification_${user.id}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      // Send token to server
      if (token && user?.id) {
        sendPushTokenToServer(token);
      }
    });

    // Listen for notifications when app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Navigate to messages when notification is tapped
      navigation.navigate('Message', { user });
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [user]);

  const sendPushTokenToServer = async (token) => {
    try {
      await fetch(`${BASE_URL}/update_push_token.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          push_token: token
        }),
      });
    } catch (error) {
      console.error('Error sending push token:', error);
    }
  };

  // Helper: format Manila time (12-hour) - FIXED VERSION
  const formatManilaTime = (dateString) => {
    try {
      // Handle both ISO format and MySQL datetime format
      const date = new Date(dateString.includes(' ') ? dateString.replace(' ', 'T') : dateString);
      
      if (isNaN(date.getTime())) {
        return new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
      }
      
      // Convert to Manila time
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch {
      return new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    }
  };

  // Parse date safely
  const parseDateSafely = (dateString) => {
    if (!dateString) return new Date();
    try {
      const date = new Date(dateString.includes(' ') ? dateString.replace(' ', 'T') : dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  };

  // Fetch messages from server
  const fetchMessages = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`${BASE_URL}/get-messages.php?user_id=${user.id}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.messages)) {
        const sorted = json.messages
          .map((m) => ({ ...m }))
          .sort((a, b) => {
            const ta = a.created_at ? parseDateSafely(a.created_at).getTime() : 0;
            const tb = b.created_at ? parseDateSafely(b.created_at).getTime() : 0;
            return ta - tb;
          });
        setMessagesData(sorted);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 4500);
    return () => clearInterval(pollingRef.current);
  }, [fetchMessages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    const d = parseDateSafely(isoDate + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const buildRenderItems = (messages) => {
    const items = [];
    let lastDate = null;
    messages.forEach((m) => {
      const msgDate = m.created_at ? m.created_at.split(' ')[0] : null;
      if (msgDate && msgDate !== lastDate) {
        items.push({
          id: `date-${msgDate}`,
          type: 'date',
          displayDate: formatDisplayDate(msgDate),
        });
        lastDate = msgDate;
      }
      items.push({ ...m, uiType: 'message' });
    });
    return items;
  };

  useEffect(() => {
    const items = buildRenderItems(messagesData);
    setRenderItems(items);
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch (e) {}
    }, 120);
  }, [messagesData]);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
      if (!res || res.canceled) return;
      const fileData = res.assets?.[0] || res;
      setFile({
        uri: fileData.uri,
        name: fileData.name || 'file',
        mimeType: fileData.mimeType || 'application/octet-stream',
      });
    } catch (err) {
      console.error('pickFile error', err);
      Alert.alert('Error', 'Unable to pick file.');
    }
  };

  const handleSendMessage = async () => {
    if (editingId) {
      if (!editingText.trim()) return Alert.alert('Validation', 'Message cannot be empty.');
      try {
        const res = await fetch(`${BASE_URL}/edit-message.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, message_id: editingId, new_message: editingText }),
        });
        const json = await res.json();
        if (json.success) {
          setEditingId(null);
          setEditingText('');
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          await fetchMessages();
        } else {
          Alert.alert('Edit failed', json.message || 'Unable to edit message.');
        }
      } catch (err) {
        console.error('Edit error', err);
        Alert.alert('Error', 'Failed to edit message.');
      }
      return;
    }

    if (!message.trim() && !file) return;

    const tmpId = `tmp-${Date.now()}`;
    const now = new Date();
    const manilaTime = formatManilaTime(now.toISOString()); // Use the same formatting for consistency
    const createdAtLocal = now.toISOString();
    const optimisticMessage = {
      id: tmpId,
      sender_id: user.id,
      receiver_id: 1,
      sender: 'You',
      message: message,
      attachment: file ? file.uri : null,
      original_name: file?.name || null,
      created_at: createdAtLocal,
      updated_at: createdAtLocal,
      time: manilaTime,
      date: createdAtLocal.split('T')[0],
      pending: true,
      is_read: 0,
    };

    setMessagesData((prev) => {
      const merged = [...prev, optimisticMessage];
      return merged.sort((a, b) => parseDateSafely(a.created_at).getTime() - parseDateSafely(b.created_at).getTime());
    });

    setMessage('');

    const formData = new FormData();
    formData.append('sender_id', String(user.id));
    formData.append('message', optimisticMessage.message || '');

    if (file) {
      formData.append('attachment', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });
    }

    try {
      const resp = await fetch(`${BASE_URL}/send-message.php`, {
        method: 'POST',
        body: formData,
      });
      const result = await resp.json();
      if (result.success) {
        await fetchMessages();
        setFile(null);
      } else {
        setMessagesData((prev) => prev.filter((m) => m.id !== tmpId));
        Alert.alert('Send failed', result.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Send error', err);
      setMessagesData((prev) => prev.filter((m) => m.id !== tmpId));
      Alert.alert('Network Error', 'Failed to connect to server.');
    }
  };

  const handleCopy = async (text) => {
    await Clipboard.setStringAsync(text || '');
    closeActionModal();
    Alert.alert('Copied', 'Message copied to clipboard.');
  };

  const handleDeleteForMe = async (id) => {
    try {
      await fetch(`${BASE_URL}/delete-message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, message_id: id }),
      });
      closeActionModal();
      await fetchMessages();
    } catch (err) {
      console.error('Delete error', err);
      Alert.alert('Error', 'Failed to delete message.');
    }
  };

  const canEditMessage = (msg) => {
    if (!msg || msg.sender_id !== user.id || !msg.created_at) return false;
    try {
      const sent = parseDateSafely(msg.created_at);
      return (Date.now() - sent.getTime()) / 1000 <= 180;
    } catch {
      return false;
    }
  };

  const openActionModal = (m) => {
    setSelectedMessage(m);
    setActionModalVisible(true);
  };

  const closeActionModal = () => {
    setSelectedMessage(null);
    setActionModalVisible(false);
  };

  const renderAttachment = (item) => {
    if (!item.attachment) return null;

    const isLocal = /^(file|content):\/\//i.test(String(item.attachment));
    let fileUrl = item.attachment;

    if (!isLocal) {
        if (/^https?:\/\//i.test(item.attachment)) {
            fileUrl = item.attachment;
        } else {
            // For paths like 'chat_attachments/file_xyz.jpg' stored in database
            fileUrl = `${BASE_URL.replace(/\/$/, '')}/../storage/${String(item.attachment)}`;
        }
    }

      const name = item.original_name || fileUrl;
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);

      if (isImage) {
          return (
              <TouchableOpacity onPress={() => {
                  Alert.alert('Image', 'Tap to view full image');
              }}>
                  <Image 
                      source={{ uri: fileUrl }} 
                      style={styles.attachmentImage} 
                      resizeMode="cover"
                      onError={(error) => {
                          console.log('Image loading error - URL:', fileUrl);
                      }}
                  />
              </TouchableOpacity>
          );
      }

      return (
          <TouchableOpacity style={styles.fileBox}>
              <Ionicons name="document-text-outline" size={18} color={colors.darkerGreen} />
              <Text numberOfLines={1} style={styles.fileText}>{name}</Text>
          </TouchableOpacity>
      );
  };

  const renderCheckmark = (isRead) => {
    return (
      <View style={styles.checkmarkContainer}>
        <Ionicons 
          name={isRead ? "checkmark-done" : "checkmark"} 
          size={14} 
          color={isRead ? colors.checkmarkGreen : colors.checkmarkGray} 
        />
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{item.displayDate}</Text>
          </View>
        </View>
      );
    }

    const isSent = item.sender_id === user.id;
    // Always use the actual created_at timestamp for time display
    const displayTime = formatManilaTime(item.created_at);

    return (
      <View style={[styles.messageRow, { justifyContent: isSent ? 'flex-end' : 'flex-start' }]}>
        {!isSent && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={colors.white} />
            </View>
          </View>
        )}
        
        <Pressable onLongPress={() => openActionModal(item)}>
          <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
            {item.message ? <Text style={styles.messageText}>{item.message}</Text> : null}
            {renderAttachment(item)}
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{displayTime}</Text>
              {item.pending ? (
                <Text style={[styles.timeText, { marginLeft: 6, color: colors.textSecondary }]}>Sending…</Text>
              ) : (item.updated_at && item.updated_at !== item.created_at) ? (
                <Text style={[styles.timeText, { marginLeft: 6 }]}>• edited</Text>
              ) : null}
              {isSent && !item.pending && renderCheckmark(item.is_read)}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const keyExtractor = (item) => (item.id ? String(item.id) : Math.random().toString());

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleNotificationToggle = (value) => {
    setPushNotificationEnabled(value);
    saveNotificationSettings(value);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.lightGreen }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setEditingId(null); setEditingText(''); }}>
          <View style={[styles.container, { marginBottom: keyboardHeight }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <View style={styles.userAvatarContainer}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={20} color={colors.white} />
                  </View>
                  <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Koncepto Admin</Text>
                  <Text style={styles.userStatus}>Online</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={renderItems}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[styles.chatContainer, { paddingBottom: 14 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryGreen]} />}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <Modal visible={actionModalVisible} transparent animationType="slide">
              <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHandle} />
                  <TouchableOpacity style={styles.modalOption} onPress={() => selectedMessage && handleCopy(selectedMessage.message)}>
                    <Ionicons name="copy-outline" size={20} color={colors.primaryGreen} />
                    <Text style={styles.modalText}>Copy</Text>
                  </TouchableOpacity>

                  {canEditMessage(selectedMessage) && (
                    <TouchableOpacity style={styles.modalOption} onPress={() => {
                      setEditingId(selectedMessage.id);
                      setEditingText(selectedMessage.message || '');
                      closeActionModal();
                    }}>
                      <Ionicons name="create-outline" size={20} color={colors.primaryGreen} />
                      <Text style={styles.modalText}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.modalOption} onPress={() => selectedMessage && handleDeleteForMe(selectedMessage.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.errorRed} />
                    <Text style={[styles.modalText, { color: colors.errorRed }]}>Delete for me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalCancel} onPress={closeActionModal}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Modal>

            <Modal visible={settingsModalVisible} transparent animationType="slide">
              <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.settingsModal}>
                  <View style={styles.settingsHeader}>
                    <Text style={styles.settingsTitle}>Settings</Text>
                    <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                      <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Ionicons name="notifications-outline" size={22} color={colors.primaryGreen} />
                      <Text style={styles.settingText}>Push Notification</Text>
                    </View>
                    <Switch
                      value={pushNotificationEnabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={{ false: '#767577', true: colors.lightGreen }}
                      thumbColor={pushNotificationEnabled ? colors.primaryGreen : '#f4f3f4'}
                    />
                  </View>
                  
                  <Text style={styles.settingDescription}>
                    {pushNotificationEnabled 
                      ? "You will receive notifications when admin sends new messages."
                      : "You will not receive notifications for new messages."
                    }
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.settingsCloseButton}
                    onPress={() => setSettingsModalVisible(false)}
                  >
                    <Text style={styles.settingsCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Modal>

            {file && (
              <View style={[styles.previewBox, { marginBottom: 6 }]}>
                <Text numberOfLines={1} style={styles.previewText}>{file.name}</Text>
                <TouchableOpacity onPress={() => setFile(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.errorRed} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.inputContainer, { marginBottom: keyboardHeight ? 10 : 0 }]}>
              <TouchableOpacity onPress={pickFile}>
                <Ionicons name="attach" size={26} color={colors.primaryGreen} style={{ marginHorizontal: 6 }} />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder={editingId ? 'Edit message...' : 'Type a message...'}
                placeholderTextColor={colors.textSecondary}
                value={editingId ? editingText : message}
                onChangeText={editingId ? setEditingText : setMessage}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />

              <TouchableOpacity
                style={[styles.sendButton, !(editingId ? editingText.trim() : message.trim() || file) && { opacity: 0.5 }]}
                disabled={!(editingId ? editingText.trim() : message.trim() || file)}
                onPress={handleSendMessage}
              >
                <Ionicons name={editingId ? 'save' : 'send'} size={22} color={colors.white} />
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity onPress={() => { setEditingId(null); setEditingText(''); }} style={styles.cancelEditButton}>
                  <Text style={{ color: colors.primaryGreen }}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Push notification registration function
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;

  return token;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkerGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.onlineGreen,
    borderWidth: 2,
    borderColor: colors.white,
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userStatus: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.9,
  },
  chatContainer: { paddingVertical: 12, paddingHorizontal: 10, flexGrow: 1 },
  messageRow: { 
    flexDirection: 'row', 
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '78%',
    minWidth: 90,
    minHeight: 40,
    padding: 10,
    borderRadius: 15,
    flexShrink: 1,
  },
  bubbleSent: { 
    backgroundColor: colors.bubbleSent, 
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  bubbleReceived: { 
    backgroundColor: colors.bubbleReceived, 
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  messageText: { 
    color: colors.textPrimary, 
    fontSize: 15, 
    lineHeight: 20, 
    flexWrap: 'wrap' 
  },
  timeRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    marginTop: 6 
  },
  timeText: { 
    fontSize: 11, 
    color: colors.textSecondary 
  },
  checkmarkContainer: {
    marginLeft: 6,
  },
  attachmentImage: { 
    width: 160, 
    height: 160, 
    borderRadius: 8, 
    marginTop: 6, 
    alignSelf: 'center' 
  },
  fileBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.lightGreen, 
    padding: 8, 
    borderRadius: 8, 
    marginTop: 6 
  },
  fileText: { 
    marginLeft: 6, 
    fontSize: 13, 
    color: colors.textPrimary, 
    maxWidth: 200 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#ddd',
    marginHorizontal: 10,
    borderRadius: 25,
    marginBottom: 10,
  },
  input: { 
    flex: 1, 
    backgroundColor: colors.lightGreen, 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    maxHeight: 120, 
    color: colors.textPrimary,
    fontSize: 15,
  },
  sendButton: { 
    backgroundColor: colors.primaryGreen, 
    borderRadius: 25, 
    padding: 10, 
    marginLeft: 8 
  },
  cancelEditButton: { 
    paddingHorizontal: 6 
  },
  previewBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F3F3', 
    paddingHorizontal: 10, 
    paddingVertical: 6,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  previewText: { 
    flex: 1, 
    color: colors.textPrimary, 
    marginRight: 8 
  },
  dateSeparatorContainer: { 
    alignItems: 'center', 
    marginVertical: 8 
  },
  dateSeparator: { 
    backgroundColor: colors.dateSeparatorBg, 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  dateSeparatorText: { 
    color: colors.textPrimary, 
    fontSize: 12 
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.35)' 
  },
  modalSheet: { 
    backgroundColor: colors.white, 
    paddingTop: 10, 
    paddingBottom: 20, 
    borderTopLeftRadius: 14, 
    borderTopRightRadius: 14 
  },
  modalHandle: { 
    width: 38, 
    height: 4, 
    backgroundColor: '#ccc', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 8 
  },
  modalOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 14 
  },
  modalText: { 
    fontSize: 16, 
    marginLeft: 12, 
    color: colors.textPrimary 
  },
  modalCancel: { 
    paddingVertical: 14, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    fontSize: 16, 
    color: colors.primaryGreen, 
    fontWeight: '600' 
  },
  settingsModal: {
    backgroundColor: colors.white,
    margin: 20,
    borderRadius: 14,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  settingsCloseButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  settingsCloseText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});