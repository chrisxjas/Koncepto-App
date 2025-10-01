import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';

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
};

const CustomOrder = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = route.params;

  const [orderItems, setOrderItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [itemGathered, setItemGathered] = useState(false);

  const [categories, setCategories] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isImagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  const [submittedOrderId, setSubmittedOrderId] = useState(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
          console.warn('Camera or Media Library permissions not granted.');
        }
      }
    })();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/get-categories.php`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error fetching categories:', response.status, response.statusText, errorText);
        setErrorMessage(`Failed to load categories: Server responded with status ${response.status}.`);
        setErrorModalVisible(true);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      } else {
        setErrorMessage(data.message || 'Failed to fetch categories.');
        setErrorModalVisible(true);
      }
    } catch (error) {
      console.error('Network error fetching categories:', error);
      setErrorMessage('Failed to connect to the server to fetch categories. Please check your network connection.');
      setErrorModalVisible(true);
    }
  };

  const pickImage = async (sourceType) => {
    setImagePickerModalVisible(false);
    let result;
    try {
      if (sourceType === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      }

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
        setItemImage(`data:${result.assets[0].mimeType};base64,${base64}`);
      }
    } catch (error) {
      console.error('Image picking or processing error:', error);
      setErrorMessage("Failed to process image. Make sure permissions are granted.");
      setErrorModalVisible(true);
    }
  };

  const addItemToOrder = () => {
    if (!itemName.trim() || !itemQuantity.trim() || !itemUnit.trim() || !itemBrand.trim()) {
      setErrorMessage('Please enter item name, brand, unit, and quantity for the item.');
      setErrorModalVisible(true);
      return;
    }
    if (isNaN(itemQuantity) || parseFloat(itemQuantity) <= 0) {
      setErrorMessage('Quantity must be a positive number.');
      setErrorModalVisible(true);
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: itemName.trim(),
      brand: itemBrand.trim(),
      unit: itemUnit.trim(),
      quantity: parseFloat(itemQuantity),
      description: itemDescription.trim(),
      photo: itemImage,
      gathered: itemGathered,
    };
    setOrderItems([...orderItems, newItem]);
    setItemName('');
    setItemBrand('');
    setItemUnit('');
    setItemQuantity('');
    setItemDescription('');
    setItemImage(null);
    setItemGathered(false);
  };

  const removeItem = (id) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const submitOrder = async () => {
    if (!user || !user.id) {
      setErrorMessage('User not found. Please log in again.');
      setErrorModalVisible(true);
      return;
    }

    if (orderItems.length === 0) {
      setErrorMessage('Your custom order is empty. Please add items before submitting.');
      setErrorModalVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        user_id: user.id,
        items: orderItems.map(item => ({
          name: item.name,
          brand: item.brand,
          unit: item.unit,
          quantity: item.quantity,
          photo: item.image,
          description: item.description,
          gathered: item.gathered ? 1 : 0,
        })),
      };

      console.log('Submitting order:', JSON.stringify(orderData, null, 2));

      const response = await fetch(`${BASE_URL}/check-custom-orders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error during order submission:', response.status, response.statusText, errorText);
        setErrorMessage(`Server error during submission: ${response.status} - ${errorText || 'No response text'}`);
        setErrorModalVisible(true);
        return;
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        setSubmittedOrderId(result.custom_order_id);
        setSuccessModalVisible(true);
        setOrderItems([]);
      } else {
        setErrorMessage(result.message || 'Failed to submit order. Please try again.');
        setErrorModalVisible(true);
      }
    } catch (error) {
      console.error('Network or unexpected error during order submission:', error);
      setErrorMessage('An unexpected error occurred. Please check your network connection and server status.');
      setErrorModalVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItemCard}>
      {item.image && <Image source={{ uri: item.image }} style={styles.orderItemImage} />}
      <View style={styles.orderItemDetails}>
        <Text style={styles.orderItemName}>{item.name}</Text>
        <Text style={styles.orderItemBrand}>Brand: {item.brand}</Text>
        <Text style={styles.orderItemQuantity}>Qty: {item.quantity} {item.unit}</Text>
        {item.description ? <Text style={styles.orderItemNotes}>Desc: {item.description}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
        <Ionicons name="close-circle" size={20} color={colors.errorRed} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Order</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add New Item</Text>
            <TextInput
              style={styles.input}
              placeholder="Item Name (e.g., Bondpaper)"
              placeholderTextColor={colors.textSecondary}
              value={itemName}
              onChangeText={setItemName}
            />
            <TextInput
              style={styles.input}
              placeholder="Brand (e.g., Hard Copy)"
              placeholderTextColor={colors.textSecondary}
              value={itemBrand}
              onChangeText={setItemBrand}
            />
            <View style={styles.quantityUnitContainer}>
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Quantity (e.g., 2)"
                placeholderTextColor={colors.textSecondary}
                value={itemQuantity}
                onChangeText={setItemQuantity}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.unitInput]}
                placeholder="Unit (e.g., ream, box)"
                placeholderTextColor={colors.textSecondary}
                value={itemUnit}
                onChangeText={setItemUnit}
              />
            </View>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
            />
            <TouchableOpacity style={styles.imagePickerButton} onPress={() => setImagePickerModalVisible(true)}>
              {itemImage ? (
                <Image source={{ uri: itemImage }} style={styles.selectedImagePreview} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="camera-outline" size={25} color={colors.textSecondary} />
                  <Text style={styles.imagePickerText}>Insert Sample Photo (Optional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={addItemToOrder}>
              <Ionicons name="add-circle" size={20} color={colors.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.currentOrderTitle}>Your Order ({orderItems.length} items)</Text>
          {orderItems.length === 0 ? (
            <View style={styles.emptyOrderContainer}>
              <Ionicons name="basket-outline" size={40} color={colors.greyBorder} />
              <Text style={styles.emptyOrderText}>No items added yet.</Text>
            </View>
          ) : (
            <FlatList
              data={orderItems}
              renderItem={renderOrderItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.orderList}
            />
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Submit Order</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isImagePickerModalVisible}
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <Pressable style={styles.centeredView} onPress={() => setImagePickerModalVisible(false)}>
          <View style={styles.imagePickerModalView} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Choose Source</Text>
            <TouchableOpacity style={styles.modalOptionButton} onPress={() => pickImage('camera')}>
              <Ionicons name="camera" size={22} color={colors.primaryGreen} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOptionButton} onPress={() => pickImage('library')}>
              <Ionicons name="image" size={22} color={colors.primaryGreen} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOptionButton, styles.modalCancelButton]}
              onPress={() => setImagePickerModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <Pressable style={styles.centeredView} onPress={() => setSuccessModalVisible(false)}>
          <View style={styles.modalView}>
            <Ionicons name="checkmark-circle" size={50} color={colors.primaryGreen} />
            <Text style={styles.modalTitle}>Order Success!</Text>
            <Text style={styles.modalText}>
              Your custom order has been successfully placed.{' '}
              <Text
                style={styles.viewOrderLink}
                onPress={() => {
                  setSuccessModalVisible(false);
                  if (submittedOrderId) {
                    navigation.navigate('ViewCustomOrder', { customOrderId: submittedOrderId, user });
                  }
                }}
              >
                Click here to view
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.navigate('ProductList', { user });
              }}
            >
              <Text style={styles.modalActionButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <Pressable style={styles.centeredView} onPress={() => setErrorModalVisible(false)}>
          <View style={styles.modalView}>
            <Ionicons name="alert-circle" size={50} color={colors.errorRed} />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalText}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalCancelActionButton]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalCancelActionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.lightGreyBackground },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: { position: 'absolute', left: 16, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.white },
  keyboardAvoidingView: { flex: 1 },
  scrollViewContent: { flexGrow: 1, padding: 12, paddingBottom: 80 },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  quantityUnitContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quantityInput: { flex: 1, marginRight: 8 },
  unitInput: { flex: 1 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  imagePickerButton: {
    backgroundColor: colors.lightGreen,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  selectedImagePreview: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 8 },
  imagePickerText: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  addButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  buttonIcon: { marginRight: 4 },
  currentOrderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 15, marginBottom: 12, textAlign: 'center' },
  emptyOrderContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderStyle: 'dashed',
  },
  emptyOrderText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  orderItemImage: { width: 50, height: 50, borderRadius: 6, marginRight: 12, backgroundColor: colors.lightGreen },
  orderItemDetails: { flex: 1 },
  orderItemName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  orderItemBrand: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  orderItemQuantity: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  orderItemNotes: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 1 },
  removeButton: { padding: 3 },
  submitButton: {
    backgroundColor: colors.darkerGreen,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: { backgroundColor: colors.greyBorder },
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: {
    margin: 15,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    maxWidth: 350,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: colors.textPrimary },
  modalText: { marginBottom: 15, textAlign: 'center', fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  modalActionButton: { backgroundColor: colors.primaryGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, minWidth: 100, alignItems: 'center', marginTop: 8 },
  modalActionButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  modalCancelActionButton: { backgroundColor: colors.greyBorder },
  modalCancelActionButtonText: { color: colors.textPrimary },
  imagePickerModalView: {
    margin: 15,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '75%',
    maxWidth: 280,
  },
  modalOptionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, width: '100%', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.greyBorder },
  modalOptionText: { fontSize: 16, color: colors.textPrimary, marginLeft: 8 },
  modalCancelButton: { borderBottomWidth: 0, marginTop: 8 },
  modalCancelButtonText: { fontSize: 16, color: colors.errorRed, fontWeight: 'bold' },
  viewOrderLink: { color: colors.primaryGreen, fontWeight: 'bold', textDecorationLine: 'underline' },
});

export default CustomOrder;
