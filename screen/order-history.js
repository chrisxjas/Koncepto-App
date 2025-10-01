import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';

export default function OrderHistory({ route, navigation }) {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Profile');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrderHistory = async () => {
    try {
      const response = await fetch(`${BASE_URL}/order-history.php?user_id=${user.id}`);
      const resJson = await response.json();
      if (resJson.success && resJson.orders) {
        setOrders(resJson.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.log('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.productName &&
      order.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          placeholder="Search product..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 30 }} />
        ) : filteredOrders.length === 0 ? (
          <Text style={styles.noOrders}>No matching purchases found.</Text>
        ) : (
          filteredOrders.map((order, index) => (
            <View key={index} style={styles.orderCard}>
              <Image
                source={{ uri: `${BASE_URL}/../storage/${order.image}` }}
                style={styles.productImage}
              />
              <View style={styles.detailsContainer}>
                <Text style={styles.status}>Order Success</Text>
                <Text style={styles.orderTitle}>{order.productName}</Text>
                <Text style={styles.orderBrand}>{order.brandName}</Text>
                <Text style={styles.orderDetail}>Date: {formatDate(order.date)}</Text>
                <Text style={styles.orderDetail}>Total: ₱{order.total_price}</Text>

                <TouchableOpacity
                  style={styles.buyAgainButton}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      user,
                      product: {
                        id: order.product_id,
                        productName: order.productName,
                        brandName: order.brandName,
                        price: order.unit_price || order.total_price, // use unit price if available
                        image: order.image,
                        description: order.description,
                      },
                    })
                  }
                >
                  <Text style={styles.buyAgainText}>Buy Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('Home');
            navigation.navigate('ProductList', { user });
          }}
          style={[styles.navButton, activeTab === 'Home' && styles.activeButton]}
        >
          <Ionicons name="home" size={24} color="#fff" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Message');
            navigation.navigate('Message', { user });
          }}
          style={[styles.navButton, activeTab === 'Message' && styles.activeButton]}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Cart');
            navigation.navigate('Carts', { user });
          }}
          style={[styles.navButton, activeTab === 'Cart' && styles.activeButton]}
        >
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.navLabel}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('Profile');
            navigation.navigate('Profile', { user });
          }}
          style={[styles.navButton, activeTab === 'Profile' && styles.activeButton]}
        >
          <Ionicons name="person" size={24} color="#fff" />
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
  },
  content: {
    paddingHorizontal: 16,
  },
  noOrders: {
    textAlign: 'center',
    marginTop: 30,
    color: '#777',
    fontSize: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  detailsContainer: {
    flex: 1,
    position: 'relative',
  },
  status: {
    position: 'absolute',
    top: 0,
    right: 0,
    color: 'green',
    fontStyle: 'italic',
    fontSize: 12,
  },
  orderTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  orderBrand: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  orderDetail: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  buyAgainButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  buyAgainText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#2ba310',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  navLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  activeButton: {
    borderColor: '#fff',
    borderWidth: 2,
  },
});
