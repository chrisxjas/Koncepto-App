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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { BASE_URL } from '../config';
import GetCaptions from './essentials/getCaptions';

const DIYsection = ({ navigation, route }) => {
  const { user } = route.params;

  const [videos, setVideos] = useState([]);
  const [products, setProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedVideos, setExpandedVideos] = useState({});
  const [selectedItems, setSelectedItems] = useState({});

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/get-diy-videos.php`);
      const data = await res.json();
      setVideos(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch videos.');
    } finally {
      setLoading(false);
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

  const toggleMaterials = (videoId) => {
    setExpandedVideos(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));

    // If expanding and materials haven't been loaded yet, fetch them
    if (!expandedVideos[videoId] && !products[videoId]) {
      const video = videos.find(v => v.videoId === videoId);
      if (video) {
        fetchMaterials(video);
      }
    }
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

      // Add default quantity & product_id, and initialize as selected
      materials = materials.map(p => ({ 
        ...p, 
        quantity: 1, 
        product_id: p.id,
        isSelected: true // Default all items to selected
      }));

      setProducts(prev => ({ ...prev, [videoId]: materials }));
      
      // Initialize selected items for this video
      setSelectedItems(prev => ({
        ...prev,
        [videoId]: materials
      }));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch materials for this video.');
    } finally {
      setLoadingProducts(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const toggleItemSelection = (videoId, productId) => {
    setSelectedItems(prev => {
      const currentItems = prev[videoId] || [];
      const updatedItems = currentItems.map(item =>
        item.id === productId 
          ? { ...item, isSelected: !item.isSelected }
          : item
      );
      
      return {
        ...prev,
        [videoId]: updatedItems
      };
    });
  };

  const selectAllItems = (videoId) => {
    setSelectedItems(prev => {
      const currentItems = prev[videoId] || [];
      const updatedItems = currentItems.map(item => ({
        ...item,
        isSelected: true
      }));
      
      return {
        ...prev,
        [videoId]: updatedItems
      };
    });
  };

  const deselectAllItems = (videoId) => {
    setSelectedItems(prev => {
      const currentItems = prev[videoId] || [];
      const updatedItems = currentItems.map(item => ({
        ...item,
        isSelected: false
      }));
      
      return {
        ...prev,
        [videoId]: updatedItems
      };
    });
  };

  const handleOrderItems = (videoId) => {
    const allItems = selectedItems[videoId] || [];
    const selectedItemsToOrder = allItems.filter(item => item.isSelected);
    
    if (selectedItemsToOrder.length === 0) {
      Alert.alert('No items selected', 'Please select at least one item to order.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to place an order.');
      return;
    }

    navigation.navigate('PlaceRequest', {
      selectedItems: selectedItemsToOrder,
      total: selectedItemsToOrder.reduce((sum, i) => sum + parseFloat(i.price), 0),
      user,
    });
  };

  const getSelectedCount = (videoId) => {
    const items = selectedItems[videoId] || [];
    return items.filter(item => item.isSelected).length;
  };

  const getTotalItems = (videoId) => {
    return selectedItems[videoId]?.length || 0;
  };

  const renderVideo = ({ item, index }) => (
    <View style={styles.videoContainer}>
      <View style={styles.videoHeader}>
        <View style={styles.videoNumber}>
          <Text style={styles.videoNumberText}>#{index + 1}</Text>
        </View>
        <Text style={styles.videoTitle}>{item.title}</Text>
      </View>
      
      <View style={styles.youtubeContainer}>
        <YoutubePlayer 
          height={200} 
          play={false} 
          videoId={item.videoId}
          webViewStyle={styles.youtubePlayer}
        />
      </View>

      {item.description && (
        <Text style={styles.videoDescription} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => toggleMaterials(item.videoId)}
        style={[
          styles.showMaterialsBtn,
          loadingProducts[item.videoId] && styles.showMaterialsBtnDisabled
        ]}
        disabled={loadingProducts[item.videoId]}
      >
        {loadingProducts[item.videoId] ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons 
            name={expandedVideos[item.videoId] ? "chevron-up" : "cube-outline"} 
            size={18} 
            color="#FFFFFF" 
          />
        )}
        <Text style={styles.showMaterialsBtnText}>
          {loadingProducts[item.videoId] 
            ? 'Loading Materials...' 
            : expandedVideos[item.videoId] 
              ? 'Hide Materials' 
              : 'Show Materials'
          }
        </Text>
      </TouchableOpacity>

      {expandedVideos[item.videoId] && products[item.videoId] && (
        <View style={styles.materialsContainer}>
          <View style={styles.materialsHeader}>
            <Ionicons name="list" size={20} color="#4CAF50" />
            <Text style={styles.materialsTitle}>
              Required Materials ({getSelectedCount(item.videoId)}/{getTotalItems(item.videoId)} selected)
            </Text>
          </View>

          {/* Select All / Deselect All Buttons */}
          <View style={styles.bulkActions}>
            <TouchableOpacity 
              onPress={() => selectAllItems(item.videoId)}
              style={styles.bulkActionBtn}
            >
              <Ionicons name="checkbox" size={16} color="#4CAF50" />
              <Text style={styles.bulkActionText}>Select All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => deselectAllItems(item.videoId)}
              style={styles.bulkActionBtn}
            >
              <Ionicons name="square-outline" size={16} color="#666" />
              <Text style={styles.bulkActionText}>Deselect All</Text>
            </TouchableOpacity>
          </View>
          
          {(selectedItems[item.videoId] || []).map((p) => (
            <View key={p.id} style={[
              styles.productRow,
              !p.isSelected && styles.productRowDeselected
            ]}>
              <TouchableOpacity 
                onPress={() => toggleItemSelection(item.videoId, p.id)}
                style={styles.checkbox}
              >
                <Ionicons 
                  name={p.isSelected ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={p.isSelected ? "#4CAF50" : "#666"} 
                />
              </TouchableOpacity>
              
              <Image
                source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${p.image}` }}
                style={styles.productImage}
                onError={() => console.log('Image failed to load')}
              />
              
              <View style={styles.productInfo}>
                <Text style={[
                  styles.productName,
                  !p.isSelected && styles.productNameDeselected
                ]} numberOfLines={2}>
                  {p.productName}
                </Text>
                <Text style={[
                  styles.productPrice,
                  !p.isSelected && styles.productPriceDeselected
                ]}>
                  ₱{parseFloat(p.price).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            style={[
              styles.orderBtn,
              getSelectedCount(item.videoId) === 0 && styles.orderBtnDisabled
            ]}
            onPress={() => handleOrderItems(item.videoId)}
            disabled={getSelectedCount(item.videoId) === 0}
          >
            <Ionicons name="cart" size={20} color="#FFFFFF" />
            <Text style={styles.orderBtnText}>
              Order Selected ({getSelectedCount(item.videoId)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DIY Tutorials</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading tutorials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with back button and logo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.headerTitle}>DIY Tutorials</Text>
        </View>
        
        <View style={styles.headerPlaceholder} />
      </View>

      {videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Tutorials Available</Text>
          <Text style={styles.emptySubtitle}>Check back later for new DIY tutorials</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.videoId}
          renderItem={renderVideo}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#4CAF50"]}
              tintColor="#4CAF50"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default DIYsection;

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: { 
    width: 32, 
    height: 32, 
    resizeMode: 'contain', 
    marginRight: 10 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  container: { 
    padding: 16, 
    paddingBottom: 20 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoContainer: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoNumber: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  videoNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoTitle: { 
    fontWeight: 'bold', 
    fontSize: 16, 
    color: '#333333',
    flex: 1,
    lineHeight: 20,
  },
  youtubeContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  youtubePlayer: {
    borderRadius: 8,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  showMaterialsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  showMaterialsBtnDisabled: {
    backgroundColor: '#A5D6A7',
  },
  showMaterialsBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  materialsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  materialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bulkActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productRowDeselected: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  checkbox: {
    padding: 4,
    marginRight: 8,
  },
  productImage: { 
    width: 50, 
    height: 50, 
    marginRight: 12, 
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  productInfo: { 
    flex: 1 
  },
  productName: { 
    fontWeight: '600', 
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  productNameDeselected: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  productPrice: { 
    color: '#4CAF50', 
    fontWeight: 'bold',
    fontSize: 14,
  },
  productPriceDeselected: {
    color: '#999999',
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  orderBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  orderBtnText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});