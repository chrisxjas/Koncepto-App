import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Image,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Animated,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../config';
import Refresh from './essentials/refresh';
import AlertMessage from './essentials/AlertMessage';

const STATUS_OPTIONS = ["pending", "confirmed", "to deliver", "delivered"];

const ViewCustomOrder = ({ route }) => {
    const navigation = useNavigation();
    const user = route.params?.user;
    const userId = user?.id;

    const [customOrders, setCustomOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("pending");
    const [statusCounts, setStatusCounts] = useState({
        pending: 0,
        confirmed: 0,
        "to deliver": 0,
        delivered: 0,
    });

    // Animated values per status
    const badgeScale = useRef({
        pending: new Animated.Value(1),
        confirmed: new Animated.Value(1),
        "to deliver": new Animated.Value(1),
        delivered: new Animated.Value(1),
    }).current;

    const animateBadge = (status) => {
        Animated.sequence([
            Animated.timing(badgeScale[status], { toValue: 1.4, duration: 150, useNativeDriver: true }),
            Animated.timing(badgeScale[status], { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
    };

    // Alert modal state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const showAlert = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
    };

    // Fetch orders from backend
    const fetchCustomOrders = async (status = selectedStatus) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                `${BASE_URL}/get-custom-order.php`,
                { user_id: userId },
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data?.success) {
                const orders = (response.data.orders || []).map(order => ({
                    ...order,
                    status: order.status?.trim().toLowerCase(),
                }));

                const filteredOrders = orders.filter(order => order.status === status);
                setCustomOrders(filteredOrders);

                // Count orders per status
                const counts = { pending: 0, confirmed: 0, "to deliver": 0, delivered: 0 };
                orders.forEach(order => {
                    if (counts[order.status] !== undefined) counts[order.status]++;
                });

                // Animate badges if count changed
                STATUS_OPTIONS.forEach(s => {
                    if (counts[s] !== statusCounts[s]) animateBadge(s);
                });

                setStatusCounts(counts);
            } else {
                setError("Failed to fetch custom orders.");
                setCustomOrders([]);
                setStatusCounts({ pending: 0, confirmed: 0, "to deliver": 0, delivered: 0 });
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setError('User information missing. Cannot fetch orders.');
            return;
        }
        fetchCustomOrders();
    }, [userId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCustomOrders();
    };

    const cancelOrder = (orderId) => {
        setAlertTitle("Cancel Order");
        setAlertVisible(true);

        setAlertMessage(
            <View>
                <Text>Do you want to undo this order?</Text>
                <View style={{ flexDirection: 'row', marginTop: 15 }}>
                    <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: '#ccc', marginRight: 10 }]}
                        onPress={() => setAlertVisible(false)}
                    >
                        <Text style={[styles.modalButtonText, { color: '#000' }]}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: '#2e7d32' }]}
                        onPress={async () => {
                            try {
                                const response = await axios.post(
                                    `${BASE_URL}/get-custom-order.php`,
                                    { delete_order_id: orderId }
                                );
                                if (response.data.success) {
                                    setAlertTitle("Success");
                                    setAlertMessage("Order has been cancelled.");
                                    fetchCustomOrders();
                                } else {
                                    setAlertTitle("Error");
                                    setAlertMessage(response.data.message || "Failed to cancel order.");
                                }
                            } catch (error) {
                                setAlertTitle("Error");
                                setAlertMessage("Something went wrong. Please try again.");
                            }
                        }}
                    >
                        <Text style={styles.modalButtonText}>Yes</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    };

    const renderOrderItem = (item, index) => (
        <View key={item.item_id?.toString() || index.toString()} style={styles.itemCard}>
            {item.photo ? (
                <Image
                    source={{ uri: `${BASE_URL.replace('/api', '')}/../storage/custom-orders/${item.photo}` }}
                    style={styles.itemImage}
                    resizeMode="cover"
                    onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
                />
            ) : (
                <View style={[styles.itemImage, styles.iconContainer]}>
                    <Ionicons name="image-outline" size={30} color="#777" />
                </View>
            )}
            <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{item.item_name || 'N/A'}</Text>
                <Text style={styles.itemText}><Text style={styles.label}>Brand:</Text> {item.brand || 'N/A'}</Text>
                <Text style={styles.itemText}><Text style={styles.label}>Quantity:</Text> {item.quantity || 'N/A'} {item.unit || ''}</Text>

                {selectedStatus !== "pending" && (
                    <>
                        <Text style={styles.itemText}><Text style={styles.label}>Price:</Text> ₱{parseFloat(item.price || 0).toFixed(2)}</Text>
                        <Text style={styles.itemTotalPrice}><Text style={styles.label}>Total:</Text> ₱{parseFloat(item.total_price || 0).toFixed(2)}</Text>
                    </>
                )}

                {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                        <Text style={styles.label}>Desc:</Text> {item.description}
                    </Text>
                )}
                <Text style={styles.itemText}><Text style={styles.label}>Created:</Text> {formatDate(item.item_created_at)}</Text>
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading && !refreshing) return <Refresh visible={true} title="Loading Orders..." />;

        if (error || customOrders.length === 0) {
            return (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" colors={['#4CAF50']} />}
                    contentContainerStyle={styles.centeredContent}
                >
                    {error ? (
                        <>
                            <Ionicons name="alert-circle-outline" size={50} color="#D32F2F" />
                            <Text style={styles.errorText}>Error: {error}</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="archive-outline" size={50} color="#777" />
                            <Text style={styles.noOrdersText}>No items yet here</Text>
                        </>
                    )}
                    <Text style={styles.refreshText}>Pull down to refresh</Text>
                </ScrollView>
            );
        }

        return (
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" colors={['#4CAF50']} />}
            >
                {customOrders.map((order) => (
                    <View key={order.order_id?.toString()} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                            <Text style={styles.orderTitle}>Order Code: {order.order_code || 'N/A'}</Text>
                            <Text style={styles.orderDate}>Placed: {formatDate(order.order_created_at)}</Text>
                        </View>

                        <View style={styles.itemsContainer}>
                            <Text style={styles.itemsSectionTitle}>Order Items</Text>
                            {order.items && order.items.length > 0
                                ? order.items.map((item, index) => renderOrderItem(item, index))
                                : <Text style={styles.noItemsText}>No items found for this order.</Text>
                            }
                        </View>

                        {selectedStatus === "pending" && (
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => cancelOrder(order.order_id)}
                            >
                                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                                <Text style={styles.cancelButtonText}>Cancel Order</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Custom Orders</Text>
                <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.filterBar}>
                {STATUS_OPTIONS.map(status => (
                    <TouchableOpacity
                        key={status}
                        style={[styles.filterButton, selectedStatus === status && styles.filterButtonActive]}
                        onPress={() => {
                            setSelectedStatus(status);
                            fetchCustomOrders(status);
                        }}
                    >
                        <Text style={[styles.filterButtonText, selectedStatus === status && styles.filterButtonTextActive]}>
                            {status.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </Text>
                        {statusCounts[status] > 0 && (
                            <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale[status] }] }]}>
                                <Text style={styles.badgeText}>{statusCounts[status]}</Text>
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.contentArea}>
                {renderContent()}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>© Koncepto App 2025</Text>
            </View>

            <AlertMessage
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#e8f5e9' },
    customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2e7d32', paddingVertical: 18, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#1b5e20', borderBottomLeftRadius: 15, borderBottomRightRadius: 15, elevation: 5 },
    backButton: { padding: 5 },
    backButtonPlaceholder: { width: 34 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    filterBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#c8e6c9', paddingVertical: 8 },
    filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2e7d32', position: 'relative' },
    filterButtonActive: { backgroundColor: '#2e7d32' },
    filterButtonText: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
    filterButtonTextActive: { color: '#fff' },
    badge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    contentArea: { flex: 1, backgroundColor: '#e8f5e9' },
    scrollContainer: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 20 },
    centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 20 },
    errorText: { color: '#D32F2F', fontSize: 16, textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
    refreshText: { marginTop: 5, fontSize: 14, color: '#777', textAlign: 'center' },
    noOrdersText: { fontSize: 16, fontStyle: 'italic', color: '#777', marginTop: 10 },
    orderCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#c8e6c9', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
    orderHeader: { borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 10, marginBottom: 10 },
    orderTitle: { fontSize: 20, fontWeight: 'bold', color: '#1b5e20' },
    orderDate: { fontSize: 14, color: '#666', marginTop: 4 },
    itemsContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
    itemsSectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
    itemCard: { flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#d4edda', alignItems: 'center' },
    itemImage: { width: 70, height: 70, borderRadius: 5, marginRight: 10, backgroundColor: '#eee' },
    itemDetails: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    itemText: { fontSize: 13, color: '#555', marginBottom: 2 },
    itemTotalPrice: { fontSize: 14, fontWeight: 'bold', color: '#1b5e20', marginTop: 5 },
    itemDescription: { fontSize: 12, color: '#777', fontStyle: 'italic', marginTop: 5 },
    label: { fontWeight: 'bold', color: '#1b5e20' },
    noItemsText: { fontSize: 14, fontStyle: 'italic', color: '#999', textAlign: 'center', paddingVertical: 10 },
    cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 8, backgroundColor: '#d32f2f', borderRadius: 6 },
    cancelButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
    footer: { backgroundColor: '#2e7d32', paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1b5e20', elevation: 5 },
    footerText: { color: '#fff', fontSize: 14 },

    // Extra styles for modal buttons
    modalButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default ViewCustomOrder;
