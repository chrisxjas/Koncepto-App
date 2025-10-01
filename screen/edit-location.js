import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AlertMessage from './essentials/AlertMessage';

export default function EditLocation({ navigation, route }) {
  const { user, selectedItems, total, onCheckoutSuccess } = route.params;

  const [locations, setLocations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const headerGreen = '#4CAF50';

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) fetchLocations(user.id);
    }, [user?.id])
  );

  const fetchLocations = async (uid) => {
    try {
      const response = await fetch(`${BASE_URL}/get-user-location.php?user_id=${uid}`);
      const json = await response.json();
      if (json.success) {
        setLocations(json.locations);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error(error);
      AlertMessage('Error', 'Failed to fetch locations.');
    }
  };

  const requestPermissionAndOpen = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AlertMessage('Permission Required', 'Location permission is needed to set your address.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      if (loc) {
        reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      }

      setSelectedCoords(null);
      setSelectedAddress('');
      setModalVisible(true);
    } catch (err) {
      console.error(err);
      AlertMessage('Error', 'Unable to request location permission.');
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const addrObj = geocode[0];

        const city = addrObj.city || addrObj.subregion || '';
        const region = addrObj.region || '';

        setSelectedCoords({ latitude, longitude });

        const addr = [
          addrObj.name,
          addrObj.street,
          addrObj.subLocality,
          city,
          region,
          addrObj.country,
        ]
          .filter(Boolean)
          .join(', ');

        setSelectedAddress(addr);

        if (
          !city.toLowerCase().includes('nasugbu') ||
          !region.toLowerCase().includes('batangas')
        ) {
          AlertMessage('Invalid Location', 'Please select a location within Nasugbu, Batangas.');
        }
      }
    } catch (e) {
      console.error(e);
      AlertMessage('Error', 'Failed to get address from coordinates.');
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    reverseGeocode(latitude, longitude);
  };

  const saveLocation = async () => {
    if (!selectedCoords || !selectedAddress) {
      AlertMessage('Error', 'Please select a valid location in Nasugbu, Batangas.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('user_id', String(user.id));
      formData.append('latitude', String(selectedCoords.latitude));
      formData.append('longitude', String(selectedCoords.longitude));
      formData.append('address', String(selectedAddress));

      const response = await fetch(`${BASE_URL}/add-user-location.php`, {
        method: 'POST',
        body: formData,
      });

      const text = await response.text();
      console.log('Server Response:', text);

      let json;
      try {
        json = JSON.parse(text.trim());
      } catch (e) {
        throw new Error('Invalid JSON response: ' + text);
      }

      if (json.success) {
        setModalVisible(false);
        setSelectedCoords(null);
        setSelectedAddress('');
        await fetchLocations(user.id);

        const newLocation = json.new_location_id || null;
        if (newLocation) setSelectedLocationId(newLocation);
      } else {
        AlertMessage('Error', json.message || 'Failed to add location.');
      }
    } catch (error) {
      console.error(error);
      AlertMessage('Error', 'Unable to save location.');
    }
  };

  const deleteLocation = async (id) => {
    try {
      console.log("Deleting location ID:", id);

      const response = await fetch(`${BASE_URL}/delete-user-location.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, user_id: user.id }), // send JSON
      });

      const text = await response.text();
      console.log("Delete Raw Response:", text);

      if (!text) {
        AlertMessage("Error", "Empty response from server.");
        return;
      }

      let json;
      try {
        json = JSON.parse(text.trim());
      } catch (e) {
        console.error("Parse Error:", e, "Raw:", text);
        AlertMessage("Error", "Invalid server response.");
        return;
      }

      if (json.success) {
        // update UI by refetching
        fetchLocations(user.id);
      } else {
        AlertMessage("Error", json.message || "Failed to delete location.");
      }
    } catch (error) {
      console.error(error);
      AlertMessage("Error", "Unable to delete location.");
    }
  };


  const handleSelectLocation = (id) => {
    setSelectedLocationId(id);
  };

  const handleUseLocation = async () => {
    if (!selectedLocationId) {
      AlertMessage('Select Location', 'Please choose a location first.');
      return;
    }

    const selectedLocation = locations.find((loc) => loc.id === selectedLocationId);
    await AsyncStorage.setItem('selected_location_id', selectedLocationId.toString());
    navigation.navigate('PlaceRequest', {
      user,
      selectedItems,
      total,
      onCheckoutSuccess,
      selectedLocation,
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.locationWrapper}>
      <View
        style={[
          styles.locationItem,
          {
            borderColor: headerGreen,
            backgroundColor: selectedLocationId === item.id ? '#E8F5E9' : '#fff',
          },
        ]}
      >
        {/* Delete (X) button inside the box */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteLocation(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="red" />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          onPress={() => handleSelectLocation(item.id)}
        >
          <View style={[styles.radioOuter, { borderColor: headerGreen }]}>
            {selectedLocationId === item.id && (
              <View style={[styles.radioInner, { backgroundColor: headerGreen }]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationText}>{item.address}</Text>
            <Text style={styles.coordText}>📍 {item.latitude}, {item.longitude}</Text>
            {item.cp_no && <Text style={styles.coordText}>📞 {item.cp_no}</Text>}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerGreen }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <View style={{ width: 28 }} />
      </View>

      {/* Add Location Button */}
      <View style={styles.addLocationWrapper}>
        <TouchableOpacity
          style={[styles.addLocationButton, { borderColor: headerGreen }]}
          onPress={requestPermissionAndOpen}
        >
          <Text style={[styles.addLocationText, { color: headerGreen }]}>Add Location</Text>
        </TouchableOpacity>
      </View>

      {/* Locations List */}
      {locations.length > 0 ? (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
          No saved locations yet.
        </Text>
      )}

      {/* Use Location Button */}
      <TouchableOpacity
        style={[styles.useButton, { backgroundColor: headerGreen }]}
        onPress={handleUseLocation}
      >
        <Text style={styles.useButtonText}>Use Location</Text>
      </TouchableOpacity>

      {/* Add Location Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 14.0729,
              longitude: 120.6325,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            minZoomLevel={14}
            maxZoomLevel={18}
            onPress={handleMapPress}
          >
            {selectedCoords && <Marker coordinate={selectedCoords} />}
          </MapView>

          <TextInput
            style={styles.input}
            placeholder="Selected Address"
            value={selectedAddress}
            onChangeText={setSelectedAddress}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: headerGreen }]}
            onPress={saveLocation}
          >
            <Text style={styles.saveButtonText}>Add Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  logo: { width: 50, height: 50, resizeMode: 'contain' },
  addLocationWrapper: { paddingHorizontal: 15, marginTop: 10, marginBottom: 10 },
  addLocationButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addLocationText: { fontSize: 16, fontWeight: '600' },
  list: { paddingHorizontal: 15 },
  locationWrapper: {
    marginBottom: 12,
  },
  locationItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  locationText: { fontSize: 16, fontWeight: '500', color: '#333' },
  coordText: { fontSize: 13, color: '#555', marginTop: 2 },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
  },
  useButton: {
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, padding: 10, backgroundColor: '#fff' },
  map: { flex: 1, marginBottom: 10, borderRadius: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveButton: { padding: 15, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#333', fontSize: 15 },
});
