import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Added
import { BASE_URL } from '../config';

export default function MyProfile({ route, navigation }) {
  const { user } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpNo, setCpNo] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    fetch(`${BASE_URL}/get-profile.php?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.user);
        } else {
          Alert.alert('Error', data.message);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to fetch profile.');
      })
      .finally(() => setLoading(false));
  };

  const openEditModal = () => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setCpNo(profile.cp_no);
    setModalVisible(true);
  };

  const handleSaveProfile = () => {
    fetch(`${BASE_URL}/update-profile.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        cp_no: cpNo,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchProfile();
          setModalVisible(false);
          Alert.alert('Success', 'Profile updated.');
        } else {
          Alert.alert('Error', data.message);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to update profile.');
      });
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user'); // ✅ Clear saved login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // ✅ Navigate to Login screen
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.cover}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileContainer}>
        {profile.profilepic ? (
          <Image
            source={{ uri: `${BASE_URL}/uploads/${profile.profilepic}` }}
            style={styles.profilePic}
          />
        ) : (
          <Ionicons name="person-circle-outline" size={120} color="gray" style={styles.profilePic} />
        )}

        <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
      </View>

      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardNumber}>{profile.orders?.total ?? 0}</Text>
          <Text style={styles.dashboardLabel}>Total Orders</Text>
        </View>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardNumber}>{profile.orders?.pending ?? 0}</Text>
          <Text style={styles.dashboardLabel}>Pending</Text>
        </View>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardNumber}>{profile.orders?.completed ?? 0}</Text>
          <Text style={styles.dashboardLabel}>Completed</Text>
        </View>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardNumber}>{profile.orders?.to_rate ?? 0}</Text>
          <Text style={styles.dashboardLabel}>To Rate</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Contact Number</Text>
        <Text style={styles.infoText}>{profile.cp_no ?? 'No Contact Number'}</Text>

        <Text style={styles.infoLabel}>Role</Text>
        <Text style={styles.infoText}>{profile.role}</Text>

        <Text style={styles.infoLabel}>Member Since</Text>
        <Text style={styles.infoText}>{profile.created_at?.split(' ')[0] ?? 'Unknown'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ccc' }]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={[styles.buttonText, { color: '#333' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
            <TextInput style={styles.input} value={cpNo} onChangeText={setCpNo} placeholder="Contact No." />

            <TouchableOpacity style={styles.actionButton} onPress={handleSaveProfile}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ccc' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { paddingVertical: 30 }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 }}>
              Are you sure you want to log out?
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
              <Text style={styles.buttonText}>Yes, Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ccc' }]}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={[styles.buttonText, { color: '#333' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  cover: { height: 180, backgroundColor: '#4CAF50', borderBottomRightRadius: 100, position: 'relative' },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  profileContainer: { alignItems: 'center', marginTop: -70, marginBottom: 20 },
  profilePic: { width: 130, height: 130, borderRadius: 65, borderWidth: 5, borderColor: 'white', backgroundColor: '#eee' },
  name: { marginTop: 10, fontSize: 22, fontWeight: 'bold', color: '#333' },
  dashboardContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginVertical: 20 },
  dashboardBox: { width: '40%', backgroundColor: '#fff', paddingVertical: 20, marginVertical: 10, borderRadius: 10, alignItems: 'center', elevation: 3 },
  dashboardNumber: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  dashboardLabel: { color: '#333', fontSize: 14 },
  infoSection: { backgroundColor: '#fff', padding: 20, marginHorizontal: 20, borderRadius: 10, marginTop: 10, elevation: 4 },
  infoLabel: { fontWeight: 'bold', color: '#4CAF50', marginTop: 15, marginBottom: 2 },
  infoText: { fontSize: 16, color: '#555' },
  buttonContainer: { marginHorizontal: 20, marginVertical: 20 },
  actionButton: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { width: '80%', padding: 20, backgroundColor: '#fff', borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, borderRadius: 5 },
});
