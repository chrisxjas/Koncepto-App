import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const BOT_QUESTIONS = [
  { q: 'How do I place an order?', a: 'To place an order, add items to your cart and tap the checkout button. Then follow the steps to complete your request.' },
  { q: 'How can I view my order status?', a: 'Go to the Orders section from the bottom navigation to see the status of all your requests.' },
  { q: 'Can I cancel my order?', a: 'You can cancel your order if it is still pending. Go to your Orders, select the order, and tap Cancel.' },
  { q: 'How do I pay for my order?', a: 'You can pay using GCash or Cash on Delivery. Select your preferred payment method during checkout.' },
  { q: 'Where can I upload my GCash payment proof?', a: 'After selecting GCash as your payment method, you will be prompted to upload your payment proof before submitting your order.' },
  { q: 'How do I contact the seller?', a: 'You can use the in-app messaging feature to contact the seller directly from your order details.' },
  { q: 'How do I edit my cart?', a: 'Go to the Cart section, where you can add, remove, or change the quantity of items before checking out.' },
  { q: 'What should I do if I received the wrong item?', a: 'Please contact support through the app or message the seller directly to resolve the issue.' },
  { q: 'How do I update my delivery address?', a: 'You can update your delivery address in your Profile settings before placing an order.' },
  { q: 'How do I get help with my order?', a: 'For any concerns, use the Help section in the app or chat with our support team for assistance.' },
];

export default function HelpCenter() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Filter FAQs based on search
  const filteredQuestions = BOT_QUESTIONS.filter(item =>
    item.q.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.faqItem}>
      <TouchableOpacity
        onPress={() => setExpanded(expanded === index ? null : index)}
        style={styles.faqQuestionContainer}
      >
        <Text style={styles.faqQuestion}>{item.q}</Text>
        <Ionicons
          name={expanded === index ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={styles.colors.primaryGreen}
        />
      </TouchableOpacity>
      {expanded === index && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{item.a}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={styles.colors.textSecondary} />
        <TextInput
          placeholder="Search help articles..."
          placeholderTextColor={styles.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* FAQ List */}
      <FlatList
        data={filteredQuestions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.faqList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  colors: {
    primaryGreen: '#4CAF50',
    darkerGreen: '#388E3C',
    lightGreen: '#E8F5E9',
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 25,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333333',
  },
  faqList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqQuestionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  faqQuestion: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  faqAnswer: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
});
