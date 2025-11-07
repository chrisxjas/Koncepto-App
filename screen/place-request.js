import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  FlatList, ScrollView, SafeAreaView, Dimensions, Modal,
  Linking, BackHandler, RefreshControl, TextInput, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';

import AlertMessage from './essentials/AlertMessage';
import Refresh from './essentials/refresh';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const colors = {
  primaryGreen: '#4CAF50',
  darkerGreen: '#388E3C',
  lightGreen: '#F0F8F0',
  accentGreen: '#8BC344',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  greyBorder: '#DDDDDD',
  lightGreyBackground: '#FAFAFA',
  errorRed: '#e53935',
};

const PlaceRequest = ({ route, navigation }) => {
  const { user, selectedItems = [], total = 0, onCheckoutSuccess, fromScreen = 'ProductList' } = route.params || {};

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [userLocation, setUserLocation] = useState({ address: '', cp_no: user?.cp_no || '' });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocationObj, setSelectedLocationObj] = useState(null);
  const [scanningRef, setScanningRef] = useState(false);
  const [extractedRefCode, setExtractedRefCode] = useState(null);
  const [showManualRefModal, setShowManualRefModal] = useState(false);
  const [manualRefCode, setManualRefCode] = useState('');
  const [uploadedImageUri, setUploadedImageUri] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const orderBelowMinimum = total < 150;
  const orderExceedsLimit = total > 3000;
  const initialPaymentAmount = (total * 0.3).toFixed(2);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate(fromScreen === 'Carts' ? 'Carts' : 'ProductList', { user });
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation, fromScreen, user])
  );

  // Load selected or saved location
  useEffect(() => {
    if (route?.params?.selectedLocation) {
      const loc = route.params.selectedLocation;
      setSelectedLocationObj(loc);
      setUserLocation({
        address: loc.address || 'No address',
        cp_no: loc.cp_no || user?.cp_no || '',
      });
      AsyncStorage.setItem('selected_location_id', loc.id.toString()).catch(() => {});
    } else {
      loadSavedOrDefaultLocation();
    }
  }, [route?.params?.selectedLocation]);

  const loadSavedOrDefaultLocation = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const savedId = await AsyncStorage.getItem('selected_location_id');
      if (savedId) {
        const loc = await fetchLocationById(parseInt(savedId, 10), user.id);
        if (loc) {
          setSelectedLocationObj(loc);
          setUserLocation({ address: loc.address || 'No address', cp_no: loc.cp_no || user.cp_no || '' });
          setRefreshing(false);
          return;
        }
      }

      const firstLoc = await fetchFirstLocationForUser(user.id);
      if (firstLoc) {
        setSelectedLocationObj(firstLoc);
        setUserLocation({ address: firstLoc.address || 'No address', cp_no: firstLoc.cp_no || user.cp_no || '' });
      } else {
        setUserLocation({ address: 'No address saved yet.', cp_no: user.cp_no || 'No contact number saved' });
        setSelectedLocationObj(null);
      }
    } catch (err) {
      console.error(err);
      setUserLocation({ address: 'No address saved yet.', cp_no: user?.cp_no || 'No contact number saved' });
      setSelectedLocationObj(null);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchFirstLocationForUser = async (userId) => {
    try {
      const res = await fetch(`${BASE_URL}/get-user-location.php?user_id=${userId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.locations) && json.locations.length > 0) {
        return json.locations[0];
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const fetchLocationById = async (locId, userId) => {
    try {
      const res = await fetch(`${BASE_URL}/get-user-location.php?user_id=${userId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.locations)) {
        return json.locations.find(l => String(l.id) === String(locId)) || null;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const fetchUserLocation = useCallback(() => {
    loadSavedOrDefaultLocation();
  }, [user?.id]);

  // OCR Function to extract reference number - FIXED: Use 'Ref_code' consistently
  const extractReferenceNumber = async (imageUri) => {
    setScanningRef(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type
      });

      const response = await fetch(`${BASE_URL}/extract-reference.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      
      // FIXED: Use 'Ref_code' instead of 'ref_code'
      if (result.success && result.Ref_code) {
        setExtractedRefCode(result.Ref_code);
        setScanningRef(false);
        showAlert('Reference Detected', `Reference number: ${result.Ref_code} has been detected successfully.`);
        return result.Ref_code;
      } else if (result.message === 'no_reference_detected') {
        setScanningRef(false);
        setUploadedImageUri(imageUri);
        setShowManualRefModal(true);
        return null;
      } else {
        setScanningRef(false);
        showAlert('Scanning Failed', 'Could not detect a reference number. Please enter it manually.');
        setUploadedImageUri(imageUri);
        setShowManualRefModal(true);
        return null;
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setScanningRef(false);
      showAlert('Scanning Error', 'Failed to process the image. Please enter the reference number manually.');
      setUploadedImageUri(imageUri);
      setShowManualRefModal(true);
      return null;
    }
  };

  // Handle manual reference number submission
  const handleManualRefSubmit = () => {
    if (!manualRefCode.trim()) {
      showAlert('Error', 'Please enter a reference number.');
      return;
    }

    // Basic validation for reference number
    if (manualRefCode.length < 8 || manualRefCode.length > 20) {
      showAlert('Invalid Reference', 'Reference number should be between 8-20 characters.');
      return;
    }

    setExtractedRefCode(manualRefCode.trim());
    setShowManualRefModal(false);
    setManualRefCode('');
    showAlert('Reference Saved', `Reference number: ${manualRefCode.trim()} has been saved.`);
  };

  // Updated Image picker with portrait cropping and full-screen preview
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Camera roll permission is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4], // ✅ Portrait orientation (3:4 ratio)
      quality: 0.9, // Higher quality for better OCR
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setPaymentProof(imageUri);
      setExtractedRefCode(null);
      
      // Show full-screen preview before OCR
      setShowImagePreview(true);
      setPreviewImageUri(imageUri);
    }
  };

  // Handle image confirmation for OCR processing
  const handleImageConfirm = async () => {
    setShowImagePreview(false);
    if (previewImageUri) {
      // Automatically extract reference number from the confirmed image
      await extractReferenceNumber(previewImageUri);
    }
  };

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleGCashCheckout = async (isInitialPayment = false) => {
    if (!selectedItems || selectedItems.length === 0) {
      showAlert('Error', 'No items selected for checkout.');
      return;
    }

    try {
      const checkoutAmount = isInitialPayment ? (total * 0.3) : total;
      const payload = {
        user_id: user.id,
        amount: parseFloat(checkoutAmount.toFixed(2)),
        payment_method: 'gcash',
        items: selectedItems.map(item => ({ product_id: item.product_id, quantity: item.quantity, price: parseFloat(item.price) })),
      };

      const res = await fetch(`${BASE_URL}/create_checkout.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.checkout_url) {
        Linking.openURL(data.checkout_url);
      } else {
        console.log('PayMongo error response:', data);
        showAlert('Error', data.message || 'Unable to create GCash checkout.');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error', 'Something went wrong while creating checkout.');
    }
  };

  // FIXED: handlePlaceRequest with consistent 'Ref_code' naming
  const handlePlaceRequest = async (isInitialPayment = false) => {
    if (!selectedPayment) { 
      showAlert('Error', 'Please select a payment method.'); 
      return; 
    }
    
    if ((selectedPayment === 'GCash' || (isInitialPayment && selectedPayment === 'GCash')) && !paymentProof) {
      showAlert('Error', 'Please upload your payment proof.');
      return;
    }

    if ((selectedPayment === 'GCash' || (isInitialPayment && selectedPayment === 'GCash')) && !extractedRefCode) {
      showAlert('Invalid Payment Proof', 'Reference number is required for GCash payments.');
      return;
    }

    if (!selectedLocationObj) {
      showAlert('No location', 'Please select a shipping address before placing the request.');
      return;
    }

    setRefreshing(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('total_price', total);
      formData.append('payment_method', selectedPayment);
      formData.append('order_date', new Date().toISOString().split('T')[0]);
      formData.append('ship_date', '2025-07-25');
      formData.append('is_initial_payment', isInitialPayment ? 1 : 0);
      formData.append('items', JSON.stringify(selectedItems.map(item => ({ product_id: item.product_id, quantity: item.quantity, price: item.price }))));
      formData.append('location_id', selectedLocationObj.id);
      
      // ✅ FIXED: Use 'Ref_code' (capital R) to match database column
      if (extractedRefCode) {
        formData.append('Ref_code', extractedRefCode);
      }

      if (paymentProof) {
        const filename = paymentProof.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('payment_proof', { uri: paymentProof, name: filename, type });
      }

      console.log('Sending payment request with Ref_code:', extractedRefCode);

      const response = await fetch(`${BASE_URL}/place-request.php`, { 
        method: 'POST', 
        body: formData 
      });
      const result = await response.json();

      console.log('Server response:', result);

      if (result.success) {
        showAlert('Success', 'Your request has been placed!');
        if (onCheckoutSuccess) onCheckoutSuccess();
        navigation.navigate(result.screen === 'to-confirm' ? 'ToConfirm' : 'ToPay', { user });
      } else {
        showAlert('Error', result.message || 'Failed to place request.');
      }
    } catch (error) {
      console.error('Request error:', error);
      showAlert('Error', 'Something went wrong while placing the request. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${item.image}` }} style={styles.productImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.itemPrice}>
          ₱ {parseFloat(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Refresh visible={refreshing || scanningRef} title={scanningRef ? "Scanning Reference Number..." : "Loading..."} />

      <ScrollView
        contentContainerStyle={styles.scrollableContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUserLocation} />}
      >
        <AlertMessage visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate(fromScreen === 'Carts' ? 'Carts' : 'ProductList', { user })} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
          </View>
        </View>

        {/* Shipping Address */}
        <View style={[styles.card, { marginTop: 15 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.sectionHeading}>Shipping Address</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditLocation', { user, selectedItems, total, onCheckoutSuccess, fromScreen })}>
              <Ionicons name="create-outline" size={20} color={colors.primaryGreen} />
            </TouchableOpacity>
          </View>
          <Text style={styles.shippingTextBold}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.shippingText}>{userLocation.address}</Text>
          <Text style={styles.shippingText}>Contact: {userLocation.cp_no}</Text>
        </View>

        {/* Order Summary */}
        <View style={[styles.card, styles.orderSummarySection]}>
          <View style={styles.row}>
            <Ionicons name="cart-outline" size={18} color={colors.primaryGreen} />
            <Text style={styles.sectionHeading}>Order Summary</Text>
          </View>
          <FlatList
            data={selectedItems}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyListText}>No items in your order.</Text>}
          />
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.fixedBottomContainer}>
        <View style={styles.fixedBottomContent}>
          <View style={styles.row}>
            <Ionicons name="wallet-outline" size={18} color={colors.primaryGreen} />
            <Text style={styles.paymentSectionHeading}>Select Payment Method</Text>
          </View>

          {/* Payment Options */}
          <TouchableOpacity style={[styles.paymentOption, selectedPayment === 'Cash' && styles.selected]} onPress={() => setSelectedPayment('Cash')} disabled={orderExceedsLimit}>
            <FontAwesome5 name="money-bill-wave" size={20} color={colors.darkerGreen} />
            <Text style={styles.paymentText}>Cash on Delivery</Text>
            <Ionicons name={selectedPayment === 'Cash' ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.darkerGreen} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.paymentOption, selectedPayment === 'GCash' && styles.selected]} onPress={() => setSelectedPayment('GCash')}>
            <FontAwesome5 name="google-wallet" size={20} color={colors.darkerGreen} />
            <Text style={styles.paymentText}>GCash (via PayMongo)</Text>
            <Ionicons name={selectedPayment === 'GCash' ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.darkerGreen} />
          </TouchableOpacity>

          {selectedPayment === 'GCash' && (
            <>
              <TouchableOpacity style={[styles.placeButton, { marginTop: 10 }]} onPress={handleGCashCheckout}>
                <Text style={styles.placeButtonText}>PAY WITH GCASH</Text>
              </TouchableOpacity>

              {/* Payment proof upload */}
              <TouchableOpacity 
                style={[styles.placeButton, { marginTop: 10, backgroundColor: scanningRef ? '#999' : '#777' }]} 
                onPress={pickImage}
                disabled={scanningRef}
              >
                <Text style={styles.placeButtonText}>
                  {scanningRef ? 'Scanning...' : paymentProof ? 'Change Payment Proof' : 'Upload Payment Proof'}
                </Text>
              </TouchableOpacity>
              
              {paymentProof && (
                <View style={styles.refNoContainer}>
                  <Text style={styles.refNoLabel}>Payment Proof: Selected</Text>
                  {extractedRefCode ? (
                    <Text style={styles.refNoSuccess}>Reference: {extractedRefCode}</Text>
                  ) : (
                    <Text style={styles.refNoError}>No reference number detected</Text>
                  )}
                </View>
              )}
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Order Total:</Text>
            <Text style={styles.totalText}>
              ₱ {parseFloat(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {orderBelowMinimum && (
            <Text style={{ color: colors.errorRed, marginBottom: 10 }}>
              Minimum order amount is ₱150. Please add more items.
            </Text>
          )}

          {!orderExceedsLimit ? (
            <TouchableOpacity 
              style={[
                styles.placeButton, 
                (orderBelowMinimum || (selectedPayment === 'GCash' && !extractedRefCode)) && { backgroundColor: '#ccc' }
              ]} 
              onPress={() => handlePlaceRequest(false)} 
              disabled={orderBelowMinimum || (selectedPayment === 'GCash' && !extractedRefCode)}
            >
              <Text style={styles.placeButtonText}>PLACE REQUEST</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.placeButton, { backgroundColor: colors.accentGreen }]} onPress={() => setShowInitialModal(true)}>
              <Text style={styles.placeButtonText}>PAY INITIAL PAYMENT (30%)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manual Reference Number Modal */}
      <Modal visible={showManualRefModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Reference Number</Text>
            <Text style={styles.modalSubtitle}>
              We couldn't automatically detect the reference number from your GCash receipt. 
              Please enter it manually below.
            </Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter GCash reference number"
              value={manualRefCode}
              onChangeText={setManualRefCode}
              autoCapitalize="characters"
              maxLength={20}
            />
            
            <Text style={styles.helperText}>
              Look for "Ref No." or "Reference" on your GCash receipt
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowManualRefModal(false);
                  setManualRefCode('');
                  setPaymentProof(null);
                  setExtractedRefCode(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleManualRefSubmit}
                disabled={!manualRefCode.trim()}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Initial Payment Modal */}
      <Modal visible={showInitialModal} animationType="slide" transparent={true} onRequestClose={() => setShowInitialModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Initial Payment Required</Text>
            <Text style={{ marginBottom: 10 }}>Your total exceeds ₱3000. Please pay 30% upfront: ₱{initialPaymentAmount}</Text>

            <TouchableOpacity style={[styles.paymentOption, selectedPayment === 'GCash' && styles.selected]} onPress={() => setSelectedPayment('GCash')}>
              <FontAwesome5 name="google-wallet" size={20} color={colors.darkerGreen} />
              <Text style={styles.paymentText}>GCash</Text>
              <Ionicons name={selectedPayment === 'GCash' ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.darkerGreen} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.placeButton, { marginTop: 15 }]} onPress={() => handlePlaceRequest(true)}>
              <Text style={styles.placeButtonText}>SUBMIT INITIAL PAYMENT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowInitialModal(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.errorRed }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Preview Modal */}
      <Modal visible={showImagePreview} animationType="fade" transparent={true}>
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowImagePreview(false);
                setPreviewImageUri(null);
                setPaymentProof(null);
              }}
            >
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Payment Proof Preview</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView 
            style={styles.imagePreviewContainer}
            maximumZoomScale={3.0}
            minimumZoomScale={1.0}
            contentContainerStyle={styles.scrollViewContent}
          >
            <Image 
              source={{ uri: previewImageUri }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>
          
          <View style={styles.previewFooter}>
            <TouchableOpacity 
              style={[styles.previewButton, styles.cancelPreviewButton]}
              onPress={() => {
                setShowImagePreview(false);
                setPreviewImageUri(null);
                setPaymentProof(null);
              }}
            >
              <Text style={styles.cancelPreviewButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.previewButton, styles.confirmPreviewButton]}
              onPress={handleImageConfirm}
            >
              <Text style={styles.confirmPreviewButtonText}>Use This Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Updated Styles with full-screen image preview
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryGreen, paddingVertical: 12, paddingHorizontal: 10 },
  card: { backgroundColor: colors.white, padding: 15, borderRadius: 10, marginHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: colors.greyBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  backButton: { marginRight: 10 },
  logoContainer: { flex: 1, alignItems: 'center' },
  logo: { width: 100, height: 30, resizeMode: 'contain' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionHeading: { fontWeight: 'bold', marginLeft: 5, color: colors.textPrimary },
  shippingTextBold: { fontWeight: 'bold', fontSize: 15, marginTop: 5 },
  shippingText: { color: colors.textSecondary },
  orderSummarySection: { backgroundColor: colors.lightGreyBackground, borderRadius: 8 },
  scrollableContent: { paddingBottom: 150 },
  itemContainer: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.greyBorder },
  productImage: { width: 60, height: 60, borderRadius: 5, marginRight: 10 },
  itemInfo: { justifyContent: 'center' },
  itemName: { fontWeight: 'bold', color: colors.textPrimary },
  itemPrice: { color: colors.primaryGreen, fontWeight: '600' },
  itemQty: { color: colors.textSecondary },
  emptyListText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
  fixedBottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.greyBorder },
  fixedBottomContent: { padding: 15 },
  paymentSectionHeading: { fontWeight: 'bold', marginLeft: 5, color: colors.textPrimary },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: colors.greyBorder, borderRadius: 8, marginVertical: 5, justifyContent: 'space-between' },
  selected: { borderColor: colors.primaryGreen, backgroundColor: colors.lightGreen },
  paymentText: { flex: 1, marginLeft: 10, color: colors.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  totalLabel: { fontWeight: 'bold', color: colors.textPrimary },
  totalText: { fontWeight: 'bold', color: colors.primaryGreen },
  placeButton: { backgroundColor: colors.primaryGreen, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  placeButtonText: { color: colors.white, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: colors.white, padding: 20, borderRadius: 10, width: '85%', maxHeight: '80%' },
  refNoContainer: { marginTop: 5, padding: 8, backgroundColor: colors.lightGreen, borderRadius: 5 },
  refNoLabel: { fontSize: 12, color: colors.textSecondary },
  refNoSuccess: { fontSize: 12, color: colors.primaryGreen, fontWeight: 'bold', marginTop: 2 },
  refNoError: { fontSize: 12, color: colors.errorRed, marginTop: 2 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 15, textAlign: 'center' },
  textInput: { borderWidth: 1, borderColor: colors.greyBorder, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  helperText: { fontSize: 12, color: colors.textSecondary, marginBottom: 15, textAlign: 'center' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: colors.greyBorder },
  submitButton: { backgroundColor: colors.primaryGreen },
  cancelButtonText: { color: colors.textPrimary, fontWeight: 'bold' },
  submitButtonText: { color: colors.white, fontWeight: 'bold' },
  
  // Full-screen image preview styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  fullScreenModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    padding: 5,
  },
  previewTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 30, // To balance the header layout
  },
  imagePreviewContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderTopColor: colors.greyBorder,
  },
  previewButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelPreviewButton: {
    backgroundColor: colors.errorRed,
  },
  confirmPreviewButton: {
    backgroundColor: colors.primaryGreen,
  },
  cancelPreviewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmPreviewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PlaceRequest;