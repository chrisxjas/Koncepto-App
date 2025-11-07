import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';
import Refresh from './essentials/refresh';

const screenWidth = Dimensions.get('window').width;

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#F0F8F0',
  accentGreen: '#8BC34A',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  greyBorder: '#DDDDDD',
  lightGreyBackground: '#FAFAFA',
  errorRed: '#e53935',
  gold: '#FFD700',
};

export default function Points() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = route.params;

  const [balance, setBalance] = useState(0);
  const [earnedPointsHistory, setEarnedPointsHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('earned');
  
  // Modal states
  const [exchangeModalVisible, setExchangeModalVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [exchanging, setExchanging] = useState(false);

  const fetchPointsData = useCallback(async () => {
    if (!user || !user.id) {
      console.warn("User object or user ID not available in Points screen.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/get-user-points.php?user_id=${user.id}`);
      const resJson = await response.json();

      if (resJson.success) {
        setBalance(resJson.balance || 0);
        setEarnedPointsHistory(resJson.earned_points || []);
      } else {
        Alert.alert('Error', resJson.message || 'Failed to fetch points data.');
      }
    } catch (error) {
      console.error('Error fetching points data:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, [user]);

  const fetchRewards = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/get-rewards.php`);
      const resJson = await response.json();

      if (resJson.success) {
        setRewards(resJson.rewards || []);
      } else {
        Alert.alert('Error', resJson.message || 'Failed to fetch rewards.');
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPointsData(), fetchRewards()]);
    setLoading(false);
  }, [fetchPointsData, fetchRewards]);

  useEffect(() => {
    fetchAllData();
    const unsubscribeFocus = navigation.addListener('focus', fetchAllData);
    return unsubscribeFocus;
  }, [fetchAllData, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const openExchangeModal = (reward) => {
    if (balance < reward.required_points) {
      Alert.alert('Insufficient Points', 'You do not have enough points to claim this reward.');
      return;
    }
    if (reward.stock <= 0) {
      Alert.alert('Out of Stock', 'This reward is currently out of stock.');
      return;
    }
    
    setSelectedReward(reward);
    setRecipientName('');
    setAddress('');
    setPhoneNumber('');
    setNote('');
    setExchangeModalVisible(true);
  };

  const handleExchangeReward = async () => {
    if (!selectedReward) return;
    
    if (!recipientName.trim() || !address.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please provide recipient name, address, and phone number.');
      return;
    }

    setExchanging(true);
    try {
      const response = await fetch(`${BASE_URL}/exchange-reward.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          reward_id: selectedReward.id,
          required_points: selectedReward.required_points,
          recipient_name: recipientName.trim(),
          address: address.trim(),
          phone_number: phoneNumber.trim(),
          note: note.trim(),
        }),
      });
      
      const resJson = await response.json();

      if (resJson.success) {
        Alert.alert('Success', resJson.message);
        setExchangeModalVisible(false);
        setSelectedReward(null);
        setRecipientName('');
        setAddress('');
        setPhoneNumber('');
        setNote('');
        fetchAllData(); // Refresh data
      } else {
        Alert.alert('Error', resJson.message || 'Failed to exchange reward.');
      }
    } catch (error) {
      console.error('Error exchanging reward:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setExchanging(false);
    }
  };

  const renderEarnedPointItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listIconContainer}>
        <Image
          source={require('../assets/kpoints.png')}
          style={{ width: 24, height: 24, resizeMode: 'contain' }}
        />
      </View>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.product_name}</Text>
        <Text style={styles.listItemSubtitle}>Date: {item.order_date}</Text>
      </View>
      <Text style={styles.pointsAmount}>+{item.points_earned}</Text>
    </View>
  );

  const renderRewardItem = ({ item }) => (
    <View style={styles.rewardItem}>
      <Image
        source={{ uri: `${BASE_URL.replace('/api', '')}/../storage/${item.image}` }}
        style={styles.rewardImage}
        onError={(e) => console.log('Reward Image Load Error:', e.nativeEvent.error)}
      />
      <View style={styles.rewardDetails}>
        <Text style={styles.rewardName}>{item.reward_name}</Text>
        <Text style={styles.rewardDescription}>{item.description}</Text>
        <Text style={styles.rewardPoints}>
          <Ionicons name="medal" size={16} color={colors.gold} /> {item.required_points} points required
        </Text>
        <Text style={styles.rewardStock}>Stock: {item.stock}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.exchangeButton,
          (balance < item.required_points || item.stock <= 0) && styles.exchangeButtonDisabled,
        ]}
        onPress={() => openExchangeModal(item)}
        disabled={balance < item.required_points || item.stock <= 0}
      >
        <Text style={styles.exchangeButtonText}>Exchange</Text>
      </TouchableOpacity>
    </View>
  );

  // Combine both tabs into one data array for FlatList
  const combinedData =
    activeTab === 'earned' ? earnedPointsHistory : rewards;

  const renderItem = activeTab === 'earned' ? renderEarnedPointItem : renderRewardItem;

  return (
    <View style={styles.container}>
      {/* Refresh modal */}
      <Refresh visible={loading} title="Loading Points" subtitle="Please wait..." />

      {/* Exchange Reward Modal */}
      <Modal
        visible={exchangeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !exchanging && setExchangeModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exchange Reward</Text>
              <TouchableOpacity 
                onPress={() => !exchanging && setExchangeModalVisible(false)}
                disabled={exchanging}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedReward && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.rewardSummary}>
                  <Image
                    source={{ uri: `${BASE_URL.replace('/api', '')}/../storage/${selectedReward.image}` }}
                    style={styles.modalRewardImage}
                  />
                  <View style={styles.rewardSummaryText}>
                    <Text style={styles.rewardSummaryName}>{selectedReward.reward_name}</Text>
                    <Text style={styles.rewardSummaryPoints}>
                      Cost: {selectedReward.required_points} points
                    </Text>
                    <Text style={styles.rewardSummaryBalance}>
                      Your balance: {balance} points
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Recipient's Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter recipient's full name"
                    value={recipientName}
                    onChangeText={setRecipientName}
                    editable={!exchanging}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Delivery Address *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter complete delivery address"
                    value={address}
                    onChangeText={setAddress}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!exchanging}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter phone number for delivery"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    editable={!exchanging}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Additional Note (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Any special instructions or notes..."
                    value={note}
                    onChangeText={setNote}
                    multiline={true}
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!exchanging}
                  />
                </View>

                <View style={styles.noteContainer}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.noteText}>
                    Thanks! Please wait for Koncepto to review this. It will take no more than 24 hours to process.
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, exchanging && styles.buttonDisabled]}
                onPress={() => setExchangeModalVisible(false)}
                disabled={exchanging}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!recipientName.trim() || !address.trim() || !phoneNumber.trim() || exchanging) && styles.buttonDisabled
                ]}
                onPress={handleExchangeReward}
                disabled={!recipientName.trim() || !address.trim() || !phoneNumber.trim() || exchanging}
              >
                <Text style={styles.confirmButtonText}>
                  {exchanging ? 'Processing...' : 'Confirm Exchange'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rest of your component remains the same */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Points</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        ListHeaderComponent={
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Your Current Points Balance:</Text>
              <View style={styles.balanceDisplay}>
                <Image
                  source={require('../assets/kpoints.png')}
                  style={[styles.balanceIcon, { width: 30, height: 30, resizeMode: 'contain', marginRight: 10 }]}
                />
                <Text style={styles.balanceAmount}>{balance}</Text>
              </View>
              <Text style={styles.balanceInfo}>Keep buying to earn more points!</Text>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'earned' && styles.activeTabButton]}
                onPress={() => setActiveTab('earned')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'earned' && styles.activeTabButtonText]}>
                  Earned Points
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'rewards' && styles.activeTabButton]}
                onPress={() => setActiveTab('rewards')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'rewards' && styles.activeTabButtonText]}>
                  Exchange Rewards
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>
              {activeTab === 'earned' ? 'Points History' : 'Available Rewards'}
            </Text>

            {combinedData.length === 0 && (
              <Text style={styles.emptyMessage}>
                {activeTab === 'earned'
                  ? 'No points earned yet. Start your order now!'
                  : 'No rewards available at the moment.'}
              </Text>
            )}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primaryGreen]}
          />
        }
        contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.footerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="person-outline" size={20} color={colors.white} />
          <Text style={styles.footerButtonText}>Back to Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => navigation.navigate('ProductList', { user })}
        >
          <Ionicons name="basket-outline" size={20} color={colors.white} />
          <Text style={styles.footerButtonText}>Buy More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Add these new styles to your existing styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGreyBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  backButton: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerRight: { width: 24 },
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: { fontSize: 16, color: colors.textSecondary, marginBottom: 10, fontWeight: '500' },
  balanceDisplay: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  balanceIcon: { marginRight: 10 },
  balanceAmount: { fontSize: 38, fontWeight: 'bold', color: colors.gold },
  balanceInfo: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: { borderBottomColor: colors.primaryGreen, backgroundColor: colors.lightGreen },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  activeTabButtonText: { color: colors.primaryGreen },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 10, marginLeft: 5 },
  emptyMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 30, paddingHorizontal: 20 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1.5,
  },
  listIconContainer: { marginRight: 15, width: 30, alignItems: 'center' },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  listItemSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pointsAmount: { fontSize: 18, fontWeight: 'bold', color: colors.primaryGreen },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1.5,
  },
  rewardImage: { width: 70, height: 70, borderRadius: 10, marginRight: 15, backgroundColor: colors.lightGreyBackground },
  rewardDetails: { flex: 1 },
  rewardName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  rewardDescription: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
  rewardPoints: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary, flexDirection: 'row', alignItems: 'center' },
  rewardStock: { fontSize: 12, color: colors.textSecondary, marginTop: 5 },
  exchangeButton: { backgroundColor: colors.primaryGreen, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginLeft: 10, justifyContent: 'center' },
  exchangeButtonDisabled: { backgroundColor: colors.greyBorder },
  exchangeButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.darkerGreen,
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  footerButton: { alignItems: 'center', padding: 5 },
  footerButtonText: { color: colors.white, fontSize: 11, marginTop: 4, fontWeight: '600' },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 20,
    maxHeight: '70%',
  },
  rewardSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.lightGreen,
    borderRadius: 10,
  },
  modalRewardImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  rewardSummaryText: {
    flex: 1,
  },
  rewardSummaryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  rewardSummaryPoints: {
    fontSize: 14,
    color: colors.primaryGreen,
    fontWeight: '600',
    marginBottom: 2,
  },
  rewardSummaryBalance: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.lightGreen,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.greyBorder,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.primaryGreen,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});