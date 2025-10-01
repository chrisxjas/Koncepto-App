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
  Pressable,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { BASE_URL } from '../config';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Define colors in a shared object for consistency
const colors = {
  primaryGreen: '#4CAF50', // A vibrant green
  darkerGreen: '#388E3C', // A slightly darker green for active states/accents
  lightGreen: '#F0F8F0', // Very light green for backgrounds
  accentGreen: '#8BC34A', // Another shade of green if needed
  textPrimary: '#333333', // Dark text for readability
  textSecondary: '#666666', // Lighter text for secondary info
  white: '#FFFFFF',
  greyBorder: '#DDDDDD', // Light grey for borders and lines
  lightGreyBackground: '#FAFAFA', // General light background
  errorRed: '#e53935', // For prices and errors, or special alerts
  bubbleSent: '#DCF8C6', // Light green for sent messages
  bubbleReceived: '#FFFFFF', // White for received messages
};

// Constants for layout calculations
const BOTTOM_NAV_HEIGHT = 70; // Explicit height from your bottomNav styles
// Manually calculate the header offset based on the styles
const HEADER_HEIGHT = Platform.OS === 'android' ? 30 + 15 : 50 + 15; // paddingTop + paddingBottom
const CHAT_PARTNER_INFO_HEIGHT = 12 * 2 + 5; // paddingVertical * 2 + marginBottom for the prompt text
const FIXED_CONTENT_HEIGHT = HEADER_HEIGHT + CHAT_PARTNER_INFO_HEIGHT;

export default function MessageScreen() {
  const [messagesData, setMessagesData] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [activeTab, setActiveTab] = useState('Message');
  // We no longer need this dynamic state
  // const [headerOffset, setHeaderOffset] = useState(0);

  const navigation = useNavigation();
  const route = useRoute();
  const user = route.params?.user;

  const flatListRef = useRef(null);

  // --- API Calls ---

  const fetchMessages = useCallback(async () => {
    try {
      if (!user?.id) {
        console.warn('User ID is missing, cannot fetch messages.');
        return;
      }
      const response = await fetch(`${BASE_URL}/get-messages.php?user_id=${user.id}`);
      const json = await response.json();
      if (json.success) {
        setMessagesData(json.messages);
      } else {
        console.error('API Error fetching messages:', json.message);
        Alert.alert('Error', json.message || 'Failed to load messages from server.');
      }
    } catch (error) {
      console.error('Network or parsing error fetching messages:', error);
      Alert.alert('Error', 'Failed to connect to server to load messages.');
    }
  }, [user?.id]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user?.id) return;

    const trimmedMessage = message.trim();
    const newMessage = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      message: trimmedMessage,
      time: 'Now', // Display 'Now' for optimistic message
      type: 'sent',
    };

    setMessagesData(prevMessages => [...prevMessages, newMessage]);
    setMessage(''); // Clear input immediately

    try {
      const response = await fetch(`${BASE_URL}/send-message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          message: trimmedMessage,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchMessages(); // Re-fetch to get server-assigned ID and timestamp
      } else {
        console.error('Failed to send message:', result.message);
        Alert.alert('Error', result.message || 'Failed to send message.');
        setMessagesData(prevMessages => prevMessages.filter(msg => msg.id !== newMessage.id)); // Revert optimistic update
      }
    } catch (error) {
      console.error('Network error sending message:', error);
      Alert.alert('Error', 'Unable to connect to server. Please try again.');
      setMessagesData(prevMessages => prevMessages.filter(msg => msg.id !== newMessage.id)); // Revert optimistic update
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          onPress: () => setSelectedMessageId(null),
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/delete-message.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
              });
              const result = await response.json();
              if (result.success) {
                fetchMessages();
                Alert.alert('Success', 'Message deleted.');
              } else {
                Alert.alert('Error', result.message || 'Failed to delete message.');
              }
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Unable to connect to server.');
            } finally {
              setSelectedMessageId(null);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // --- Effects ---

  useEffect(() => {
    fetchMessages();
    setActiveTab('Message');

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 50); // Small delay for smoother scroll after keyboard shows
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (messagesData.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messagesData]);

  // --- Handlers ---

  const handleCopy = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied to Clipboard');
    setSelectedMessageId(null);
  };

  const dismissKeyboardAndOptions = () => {
    setSelectedMessageId(null);
    Keyboard.dismiss();
  };

  // --- Render Functions ---

  const renderMessage = ({ item }) => {
    const isSent = item.type === 'sent';
    const isSelected = selectedMessageId === item.id;

    return (
      <Pressable
        onLongPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setSelectedMessageId(item.id);
        }}
        onPress={() => isSelected && setSelectedMessageId(null)}
        style={styles.messageWrapper}
      >
        <View style={[styles.messageContainer, isSent ? styles.sent : styles.received]}>
          {!isSent && (
            <View style={styles.avatar}>
              <Ionicons name="person-circle" size={36} color={colors.textSecondary} />
            </View>
          )}
          <View style={[styles.bubble, isSent ? styles.bubbleSentStyle : styles.bubbleReceivedStyle]}>
            <Text style={styles.messageText}>{item.message}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        </View>

        {isSelected && (
          <View style={[styles.optionsContainer, isSent ? styles.optionsSent : styles.optionsReceived]}>
            <TouchableOpacity onPress={() => handleCopy(item.message)} style={styles.optionButton}>
              <Ionicons name="copy-outline" size={16} color={colors.white} />
              <Text style={styles.optionButtonText}>Copy</Text>
            </TouchableOpacity>
            {isSent && (
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.optionButton}>
                <Ionicons name="trash-outline" size={16} color={colors.white} />
                <Text style={styles.optionButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.fullScreenWrapper}>
      {/* Header */}
      <View
        style={styles.header}
        // Removed the onLayout handler
      >
        <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
          <Ionicons name="arrow-back" size={28} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Settings', 'Settings functionality to be added.')}>
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Chat Partner Info / Sub-Nav */}
      <View
        style={styles.chatPartnerInfo}
        // Removed the onLayout handler
      >
        <Text style={styles.chatPartnerName}>Koncepto Admin</Text>
        <Text
          style={styles.chatbotPrompt}
          onPress={() => navigation.navigate('ChatBot', { user })}
        >
          The admin might not be online now. For immediate concerns, you can{' '}
          <Text style={{ color: colors.primaryGreen, fontWeight: 'bold' }}>chat with our chatbot.</Text>
        </Text>
      </View>

      {/* Main content area (FlatList and Input), managed by KeyboardAvoidingView */}
      {/* The KeyboardAvoidingView now wraps only the content that needs to move */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer} // This style makes KAV take remaining space
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Use the pre-calculated fixed height for the offset
        keyboardVerticalOffset={FIXED_CONTENT_HEIGHT}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboardAndOptions}>
          {/* This wrapper ensures FlatList takes space and pushes input to bottom */}
          <View style={styles.chatContentWrapper}>
            {/* Chat Area */}
            <FlatList
              ref={flatListRef}
              data={messagesData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatAreaContent}
              onScrollBeginDrag={dismissKeyboardAndOptions}
            />

            {/* Message Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                multiline={true}
                maxHeight={100}
                onFocus={() => {
                  setTimeout(() => {
                    if (flatListRef.current) {
                      flatListRef.current.scrollToEnd({ animated: true });
                    }
                  }, 50);
                }}
              />
              <TouchableOpacity
                style={[styles.sendButton, !message.trim() && { opacity: 0.5 }]}
                onPress={handleSendMessage}
                disabled={!message.trim()}
              >
                <Ionicons name="send" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // This wrapper takes the whole screen and hosts all main sections
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    paddingHorizontal: 16,
    paddingBottom: 15,
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Platform.OS === 'android' ? 30 : 50,
    bottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 40,
    resizeMode: 'contain',
  },

  // Chat Partner Info / Sub-Nav
  chatPartnerInfo: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.greyBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatPartnerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  chatbotPrompt: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // KeyboardAvoidingView Container
  keyboardAvoidingContainer: {
    flex: 1, // Takes all available vertical space between header/chatInfo and bottomNav
    // Important: We remove the `flex: 1` from the chatContentWrapper so that the KeyboardAvoidingView can properly resize its inner content.
  },

  // This wrapper lives inside KeyboardAvoidingView and manages FlatList & InputArea layout
  chatContentWrapper: {
    flex: 1, // Allows it to grow and fill KAV space
  },

  // Chat Area (FlatList contentContainerStyle)
  chatAreaContent: {
    flexGrow: 1, // Ensures content can scroll if it's smaller than the view
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10, // A small buffer at the bottom
  },
  messageWrapper: {
    marginBottom: 5,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  received: {
    justifyContent: 'flex-start',
  },
  sent: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  bubbleReceivedStyle: {
    backgroundColor: colors.bubbleReceived,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleSentStyle: {
    backgroundColor: colors.bubbleSent,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  messageText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  timeText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
  },

  // Message Options (Copy/Delete)
  optionsContainer: {
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: colors.darkerGreen,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  optionsSent: {
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  optionsReceived: {
    alignSelf: 'flex-start',
    marginLeft: 50,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 2,
  },
  optionButtonText: {
    color: colors.white,
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },

  // Input Area Styles
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.greyBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    backgroundColor: colors.lightGreyBackground,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primaryGreen,
    marginLeft: 10,
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : 2,
  },
});