import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

const BOT_QUESTIONS = [
  { q: 'How do I place an order?', a: 'To place an order, add items to your cart and tap the checkout button. Then follow the steps to complete your request.', keywords: ['order', 'place order', 'buy', 'checkout'] },
  { q: 'How can I view my order status?', a: 'Go to the Orders section from the bottom navigation to see the status of all your requests.', keywords: ['order status', 'view order', 'track', 'status'] },
  { q: 'Can I cancel my order?', a: 'You can cancel your order if it is still pending. Go to your Orders, select the order, and tap Cancel.', keywords: ['cancel', 'cancel order', 'remove order'] },
  { q: 'How do I pay for my order?', a: 'You can pay using GCash or Cash on Delivery. Select your preferred payment method during checkout.', keywords: ['pay', 'payment', 'gcash', 'cash on delivery'] },
  { q: 'Where can I upload my GCash payment proof?', a: 'After selecting GCash as your payment method, you will be prompted to upload your payment proof before submitting your order.', keywords: ['gcash', 'payment proof', 'upload proof'] },
  { q: 'How do I contact the seller?', a: 'You can use the in-app messaging feature to contact the seller directly from your order details.', keywords: ['contact seller', 'message seller', 'seller'] },
  { q: 'How do I edit my cart?', a: 'Go to the Cart section, where you can add, remove, or change the quantity of items before checking out.', keywords: ['edit cart', 'cart', 'change cart', 'remove from cart'] },
  { q: 'What should I do if I received the wrong item?', a: 'Please contact support through the app or message the seller directly to resolve the issue.', keywords: ['wrong item', 'incorrect item', 'received wrong'] },
  { q: 'How do I update my delivery address?', a: 'You can update your delivery address in your Profile settings before placing an order.', keywords: ['update address', 'delivery address', 'change address'] },
  { q: 'How do I get help with my order?', a: 'For any concerns, use the Help section in the app or chat with our support team for assistance.', keywords: ['help', 'support', 'assistance', 'problem'] },
];

function getBotReply(userMessage) {
  const msg = userMessage.trim().toLowerCase();
  const found = BOT_QUESTIONS.find(({ keywords }) =>
    keywords.some(keyword => msg.includes(keyword))
  );
  if (found) return found.a;
  return "Sorry, I didn't understand that. Please try asking another question or choose from the suggestions below.";
}

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi! I am KonceptoBot. How can I help you today? You can tap a question below or type your own.',
      time: 'Now',
    },
  ]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef();
  const timeoutRef = useRef(); // <------ ✅ THIS FIXES YOUR PROBLEM
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSend = (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: text.trim(),
      time: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    timeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      const botReply = getBotReply(text);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          type: 'bot',
          text: botReply,
          time: 'Now',
        },
      ]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 600);
  };

  const handleSuggestion = (q) => {
    handleSend(q);
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageRow,
        item.type === 'user' ? styles.rowUser : styles.rowBot,
      ]}
    >
      {item.type === 'bot' && (
        <View style={styles.avatarBot}>
          <Ionicons name="chatbubbles" size={26} color={styles.colors.primaryGreen} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          item.type === 'user' ? styles.bubbleUser : styles.bubbleBot,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      {item.type === 'user' && (
        <View style={styles.avatarUser}>
          <Ionicons name="person-circle" size={26} color={styles.colors.darkerGreen} />
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>KonceptoBot</Text>
            <View style={styles.logoPlaceholder} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={[styles.chatArea, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestHeader}>
              <Text style={styles.suggestTitle}>Quick Questions:</Text>
              <TouchableOpacity onPress={() => setShowSuggestions(v => !v)}>
                <Ionicons
                  name={showSuggestions ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={24}
                  color={styles.colors.primaryGreen}
                />
              </TouchableOpacity>
            </View>
            {showSuggestions && (
              <View style={styles.suggestList}>
                {BOT_QUESTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.q}
                    style={styles.suggestBtn}
                    onPress={() => handleSuggestion(item.q)}
                  >
                    <Text style={styles.suggestText}>{item.q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputArea}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor={styles.colors.textSecondary}
              style={styles.input}
              onSubmitEditing={() => handleSend(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSend(input)}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  colors: {
    primaryGreen: '#4CAF50',
    darkerGreen: '#388E3C',
    lightGreen: '#E8F5E9',
    accentGreen: '#8BC34A',
    textPrimary: '#333333',
    textSecondary: '#666666',
    white: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: -24,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
  },
  chatArea: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  rowBot: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
  avatarBot: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 3,
    elevation: 2,
  },
  avatarUser: {
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 3,
    elevation: 2,
  },
  bubble: {
    maxWidth: '78%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 2,
    elevation: 1,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: 'rgba(179, 229, 179, 0.7)',
    borderTopRightRadius: 6,
  },
  messageText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  timeText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'right',
    marginTop: 6,
  },
  suggestionsContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suggestTitle: {
    fontSize: 14,
    color: '#388E3C',
    fontWeight: 'bold',
  },
  suggestList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8BC34A',
    elevation: 1,
  },
  suggestText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  inputArea: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
    color: '#333333',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
