// DIYsection.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { BASE_URL } from '../config';
import GetCaptions from './essentials/getCaptions';

const DIYsection = ({ navigation, route }) => {
  const { user } = route.params;

  const [videos, setVideos] = useState([]);
  const [products, setProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/get-diy-videos.php`);
      const data = await res.json();
      setVideos(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch videos.');
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  };

  const fetchMaterials = async (video) => {
    const videoId = video.videoId;
    if (products[videoId]) return;

    setLoadingProducts(prev => ({ ...prev, [videoId]: true }));

    try {
      const text = await GetCaptions(videoId, video.description);

      let res = await fetch(`${BASE_URL}/get-diy-materials.php?text=${encodeURIComponent(text)}`);
      let materials = await res.json();

      if (!materials || materials.length === 0) {
        const fallbackRes = await fetch(`${BASE_URL}/get-diy-materials.php?random=true`);
        materials = await fallbackRes.json();
      }

      // Add default quantity & product_id
      materials = materials.map(p => ({ ...p, quantity: 1, product_id: p.id }));

      setProducts(prev => ({ ...prev, [videoId]: materials }));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch materials for this video.');
    } finally {
      setLoadingProducts(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleOrderItems = (videoId) => {
    const selectedItems = products[videoId];
    if (!selectedItems || selectedItems.length === 0) {
      Alert.alert('No products found for this tutorial');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to place an order.');
      return;
    }

    navigation.navigate('PlaceRequest', {
      selectedItems,
      total: selectedItems.reduce((sum, i) => sum + parseFloat(i.price), 0),
      user,
    });
  };

  const renderVideo = ({ item }) => (
    <View style={styles.videoContainer}>
      <Text style={styles.videoTitle}>{item.title}</Text>
      <YoutubePlayer height={220} play={false} videoId={item.videoId} />

      <TouchableOpacity
        onPress={() => fetchMaterials(item)}
        style={styles.showMaterialsBtnWrapper}
      >
        <Text style={styles.showMaterialsBtn}>
          {loadingProducts[item.videoId] ? 'Loading Materials...' : 'Show Materials'}
        </Text>
      </TouchableOpacity>

      {products[item.videoId] && products[item.videoId].length > 0 && (
        <View style={styles.materialsContainer}>
          {products[item.videoId].map((p) => (
            <View key={p.id} style={styles.productRow}>
              <Image
                source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${p.image}` }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.productName}</Text>
                <Text style={styles.productPrice}>
                  ₱ {parseFloat(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() => handleOrderItems(item.videoId)}
          >
            <Text style={styles.orderBtnText}>Order These Items</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with logo */}
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>DIY Tutorials</Text>
      </View>

      <FlatList
        data={videos}
        keyExtractor={item => item.videoId}
        renderItem={renderVideo}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default DIYsection;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F8F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  logo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  container: { padding: 10, paddingBottom: 20 },
  videoContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 3,
  },
  videoTitle: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  showMaterialsBtnWrapper: { marginVertical: 5 },
  showMaterialsBtn: { color: 'green', fontWeight: 'bold' },
  materialsContainer: { marginTop: 10 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 5,
  },
  productImage: { width: 50, height: 50, marginRight: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc' },
  productInfo: { flex: 1 },
  productName: { fontWeight: 'bold' },
  productPrice: { color: 'green', marginTop: 2 },
  orderBtn: { backgroundColor: 'green', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontWeight: 'bold' },
});
