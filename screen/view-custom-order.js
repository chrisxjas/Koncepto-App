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
    Dimensions,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../config';
import Refresh from './essentials/refresh';
import AlertMessage from './essentials/AlertMessage';

const { width } = Dimensions.get('window');
const STATUS_OPTIONS = ["pending", "confirmed", "to deliver", "delivered"];

// Koncepto Color Theme
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
    warningOrange: '#FF9800',
    background: '#F8F9FA',
};

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
                <Text style={styles.alertText}>Do you want to undo this order?</Text>
                <View style={styles.alertButtons}>
                    <TouchableOpacity
                        style={[styles.alertButton, styles.alertCancelButton]}
                        onPress={() => setAlertVisible(false)}
                    >
                        <Text style={styles.alertCancelText}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.alertButton, styles.alertConfirmButton]}
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
                        <Text style={styles.alertConfirmText}>Yes</Text>
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return colors.warningOrange;
            case 'confirmed': return colors.primaryGreen;
            case 'to deliver': return colors.accentGreen;
            case 'delivered': return colors.darkerGreen;
            default: return colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'confirmed': return 'checkmark-circle-outline';
            case 'to deliver': return 'cube-outline';
            case 'delivered': return 'checkmark-done-outline';
            default: return 'ellipse-outline';
        }
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
                    <Ionicons name="image-outline" size={30} color={colors.textSecondary} />
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} colors={[colors.primaryGreen]} />}
                    contentContainerStyle={styles.centeredContent}
                >
                    {error ? (
                        <>
                            <Ionicons name="alert-circle-outline" size={60} color={colors.errorRed} />
                            <Text style={styles.errorText}>Error: {error}</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="archive-outline" size={60} color={colors.textSecondary} />
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryGreen} colors={[colors.primaryGreen]} />}
            >
                {customOrders.map((order) => (
                    <View key={order.order_id?.toString()} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                            <View style={styles.orderTitleRow}>
                                <Text style={styles.orderTitle}>Order #{order.order_code || 'N/A'}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                                    <Ionicons name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
                                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                        {order.status?.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
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
                                <Ionicons name="close-circle-outline" size={18} color={colors.white} />
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Custom Orders</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.tabContainer}>
                {STATUS_OPTIONS.map(status => (
                    <TouchableOpacity
                        key={status}
                        style={[styles.tab, selectedStatus === status && styles.activeTab]}
                        onPress={() => {
                            setSelectedStatus(status);
                            fetchCustomOrders(status);
                        }}
                    >
                        <View style={styles.tabContent}>
                            <Ionicons 
                                name={getStatusIcon(status)} 
                                size={16} 
                                color={selectedStatus === status ? colors.white : colors.textSecondary} 
                            />
                            <Text style={[styles.tabText, selectedStatus === status && styles.activeTabText]}>
                                {status.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                            </Text>
                            {statusCounts[status] > 0 && (
                                <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale[status] }] }]}>
                                    <Text style={styles.badgeText}>{statusCounts[status]}</Text>
                                </Animated.View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
                {renderContent()}
            </View>

            {/* Footer */}
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
    safeArea: { 
        flex: 1, 
        backgroundColor: colors.background 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: colors.primaryGreen,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    backButton: { 
        padding: 4 
    },
    headerRight: { 
        width: 32 
    },
    headerTitle: { 
        color: colors.white, 
        fontSize: 20, 
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tabContainer: { 
        flexDirection: 'row', 
        backgroundColor: colors.white, 
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1, 
        borderBottomColor: colors.greyBorder,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tab: { 
        flex: 1, 
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
    activeTab: { 
        backgroundColor: colors.primaryGreen,
        elevation: 2,
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
    },
    tabText: { 
        fontSize: 12, 
        color: colors.textSecondary, 
        fontWeight: '600',
    },
    activeTabText: { 
        color: colors.white, 
        fontWeight: 'bold',
    },
    badge: { 
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: colors.errorRed, 
        borderRadius: 10, 
        minWidth: 18, 
        height: 18, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    badgeText: { 
        color: colors.white, 
        fontSize: 10, 
        fontWeight: 'bold' 
    },
    contentArea: { 
        flex: 1, 
        backgroundColor: colors.background 
    },
    scrollContainer: { 
        flex: 1 
    },
    scrollContent: { 
        padding: 16, 
        paddingBottom: 20 
    },
    centeredContent: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background, 
        padding: 20 
    },
    errorText: { 
        color: colors.errorRed, 
        fontSize: 16, 
        textAlign: 'center', 
        marginTop: 16,
        marginBottom: 10, 
        fontWeight: 'bold' 
    },
    refreshText: { 
        marginTop: 5, 
        fontSize: 14, 
        color: colors.textSecondary, 
        textAlign: 'center' 
    },
    noOrdersText: { 
        fontSize: 16, 
        fontStyle: 'italic', 
        color: colors.textSecondary, 
        marginTop: 16,
        textAlign: 'center',
    },
    orderCard: { 
        backgroundColor: colors.white, 
        borderRadius: 16, 
        padding: 20, 
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.primaryGreen,
    },
    orderHeader: { 
        marginBottom: 16 
    },
    orderTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: colors.textPrimary,
        flex: 1,
    },
    orderDate: { 
        fontSize: 14, 
        color: colors.textSecondary 
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    itemsContainer: { 
        marginTop: 16, 
        paddingTop: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.greyBorder 
    },
    itemsSectionTitle: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: colors.darkerGreen, 
        marginBottom: 12 
    },
    itemCard: { 
        flexDirection: 'row', 
        backgroundColor: colors.lightGreyBackground, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: colors.lightGreen,
        alignItems: 'center' 
    },
    itemImage: { 
        width: 80, 
        height: 80, 
        borderRadius: 8, 
        marginRight: 12, 
        backgroundColor: colors.greyBorder 
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemDetails: { 
        flex: 1 
    },
    itemName: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: colors.textPrimary, 
        marginBottom: 4 
    },
    itemText: { 
        fontSize: 14, 
        color: colors.textSecondary, 
        marginBottom: 2 
    },
    itemTotalPrice: { 
        fontSize: 15, 
        fontWeight: 'bold', 
        color: colors.darkerGreen, 
        marginTop: 4 
    },
    itemDescription: { 
        fontSize: 13, 
        color: colors.textSecondary, 
        fontStyle: 'italic', 
        marginTop: 4 
    },
    label: { 
        fontWeight: 'bold', 
        color: colors.darkerGreen 
    },
    noItemsText: { 
        fontSize: 14, 
        fontStyle: 'italic', 
        color: colors.textSecondary, 
        textAlign: 'center', 
        paddingVertical: 16 
    },
    cancelButton: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 16, 
        paddingVertical: 12, 
        backgroundColor: colors.errorRed, 
        borderRadius: 12,
        elevation: 2,
    },
    cancelButtonText: { 
        color: colors.white, 
        fontWeight: 'bold', 
        marginLeft: 8,
        fontSize: 14,
    },
    footer: { 
        backgroundColor: colors.darkerGreen, 
        paddingVertical: 16, 
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 8,
    },
    footerText: { 
        color: colors.white, 
        fontSize: 14,
        fontWeight: '500',
    },
    // Alert Styles
    alertText: {
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 20,
    },
    alertButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    alertButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    alertCancelButton: {
        backgroundColor: colors.greyBorder,
    },
    alertConfirmButton: {
        backgroundColor: colors.primaryGreen,
    },
    alertCancelText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    alertConfirmText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ViewCustomOrder;