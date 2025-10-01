import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';
import AlertMessage from './essentials/AlertMessage'; // ✅ correct import (default)

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
  red: '#E53935',
  gold: '#FFD700',
};

const ProductDetail = ({ route, navigation }) => {
  const { product, user } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [showAllFeedbacks, setShowAllFeedbacks] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // ✅ state for AlertMessage
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, [product?.id]);

  // Start heartbeat animation if ArtMat === "Yes"
  useEffect(() => {
    if (product?.ArtMat === 'Yes') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [product?.ArtMat]);

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMsg(message);
    setAlertVisible(true);
  };

  const fetchFeedbacks = () => {
    if (!product?.id) return;

    fetch(`${BASE_URL}/get-feedbacks.php?product_id=${product.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const updated = data.data.map(fb => ({
            ...fb,
            user_liked_this_feedback: false,
            like: fb.likes || 0,
          }));
          setFeedbacks(updated);
        } else {
          setFeedbacks([]);
          showAlert('Error', data.message || 'Failed to load feedbacks.');
        }
      })
      .catch(err => {
        console.error('Fetch feedbacks error:', err);
        setFeedbacks([]);
        showAlert('Error', 'Network error while loading feedbacks.');
      });
  };

  const handleLikeToggle = (feedbackId, currentLikeCount, hasUserLiked) => {
    setFeedbacks(prev =>
      prev.map(fb =>
        fb.id === feedbackId
          ? {
              ...fb,
              like: hasUserLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1,
              user_liked_this_feedback: !hasUserLiked,
            }
          : fb
      )
    );

    fetch(`${BASE_URL}/toggle-feedback-like.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback_id: feedbackId,
        user_id: user.id,
        action: hasUserLiked ? 'unlike' : 'like',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          showAlert('Error', data.message || 'Failed to update like status.');
          // Revert UI change if failed
          setFeedbacks(prev =>
            prev.map(fb =>
              fb.id === feedbackId
                ? {
                    ...fb,
                    like: hasUserLiked ? currentLikeCount : Math.max(0, currentLikeCount - 1),
                    user_liked_this_feedback: hasUserLiked,
                  }
                : fb
            )
          );
        }
      })
      .catch(err => {
        console.error('Toggle like error:', err);
        showAlert('Error', 'Network error while updating like status.');
        setFeedbacks(prev =>
          prev.map(fb =>
            fb.id === feedbackId
              ? {
                  ...fb,
                  like: hasUserLiked ? currentLikeCount : Math.max(0, currentLikeCount - 1),
                  user_liked_this_feedback: hasUserLiked,
                }
              : fb
          )
        );
      });
  };

  const handleAddToCart = () => {
    if (!user?.id || !product?.id) {
      showAlert('Error', 'Missing user or product info. Please log in again.');
      return;
    }

    const payload = { user_id: user.id, product_id: product.id, quantity: Number(quantity), replace: false };

    fetch(`${BASE_URL}/add-to-cart.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShowModal(false);
          showAlert('Success', 'Item added to cart!');
          navigation.navigate('Carts', { user });
        } else {
          showAlert('Error', data.message || 'Failed to add to cart.');
        }
      })
      .catch(err => {
        console.error('Add to cart error:', err);
        showAlert('Error', 'Network error. Please try again.');
      });
  };

  const handleBuyNow = () => {
    if (!user?.id || !product?.id) {
      showAlert('Error', 'Missing user or product info. Please log in again.');
      return;
    }

    navigation.navigate('PlaceRequest', {
      user,
      selectedItems: [
        {
          product_id: product.id,
          productName: product.productName,
          price: parseFloat(product.price),
          image: product.image,
          quantity,
        },
      ],
      total: quantity * parseFloat(product.price),
    });
    setShowModal(false);
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Product details not available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Product Details Card */}
        <View style={styles.productDetailsCard}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: `${BASE_URL.replace(/\/$/, '')}/../storage/${product.image}` }}
              style={styles.image}
            />
            {product.ArtMat === 'Yes' && (
              <Animated.Image
                source={require('../assets/DIY_Logo.png')}
                style={[styles.diyBadge, { transform: [{ scale: pulseAnim }] }]}
              />
            )}
          </View>

          <Text style={styles.name}>{product.productName}</Text>
          <Text style={styles.brand}>{product.brandName}</Text>
          <Text style={styles.description}>{product.description || 'No description available.'}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₱{' '}
              {parseFloat(product.price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Ratings Section */}
        <View style={styles.ratingsSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.ratingsTitle}>Ratings & Feedback</Text>
            {feedbacks.length > 1 && (
              <TouchableOpacity onPress={() => setShowAllFeedbacks(!showAllFeedbacks)}>
                <Text style={styles.showMoreBtn}>{showAllFeedbacks ? 'Show less' : 'Show more'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.separator} />

          {feedbacks.length === 0 && <Text style={styles.noFeedback}>No feedback yet for this product.</Text>}

          {(showAllFeedbacks ? feedbacks : feedbacks.slice(0, 1)).map((fb, index) => (
            <View key={fb.id || index} style={styles.feedbackItem}>
              <Text style={styles.feedbackName}>{fb.user_name}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Ionicons
                    key={i}
                    name={i <= fb.star ? 'star' : 'star-outline'}
                    size={14}
                    color={colors.gold}
                  />
                ))}
              </View>
              <Text style={styles.feedbackText}>{fb.feedback}</Text>
              <TouchableOpacity
                style={styles.likeRow}
                onPress={() => handleLikeToggle(fb.id, fb.like || 0, fb.user_liked_this_feedback)}
              >
                <Ionicons
                  name={fb.user_liked_this_feedback ? 'heart' : 'heart-outline'}
                  size={14}
                  color={colors.red}
                />
                <Text style={styles.likeCount}>{fb.like || 0}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Buttons */}
      <View style={styles.fixedButtons}>
        <TouchableOpacity style={styles.btnAdd} onPress={() => { setIsBuyNow(false); setShowModal(true); }}>
          <Text style={styles.btnText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBuy} onPress={() => { setIsBuyNow(true); setShowModal(true); }}>
          <Text style={styles.btnText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* Quantity Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalFullWidthBar}>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.squareBtn} onPress={() => setQuantity(prev => Math.max(1, prev - 1))}>
                <Ionicons name="remove" size={18} color={colors.primaryGreen} />
              </TouchableOpacity>
              <Text style={styles.qty}>{quantity}</Text>
              <TouchableOpacity style={styles.squareBtn} onPress={() => setQuantity(prev => prev + 1)}>
                <Ionicons name="add" size={18} color={colors.primaryGreen} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                isBuyNow ? handleBuyNow() : handleAddToCart();
              }}
            >
              <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 14 }}>Confirm</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ✅ Custom Alert */}
      <AlertMessage
        visible={alertVisible}
        title={alertTitle}
        message={alertMsg}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

export default ProductDetail;


// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGreyBackground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.greyBorder },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  scrollViewContent: { paddingBottom: 100 },
  productDetailsCard: { backgroundColor: colors.white, marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, marginBottom: 10 },
  image: { width: '100%', height: 250, resizeMode: 'contain', marginBottom: 15, borderRadius: 8, backgroundColor: colors.lightGreyBackground },
  diyBadge: { position: 'absolute', top: 10, right: 10, width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.white },
  name: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 5 },
  brand: { fontSize: 16, color: colors.textSecondary, marginBottom: 10 },
  description: { fontSize: 14, color: colors.textPrimary, lineHeight: 20, marginBottom: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  price: { fontSize: 22, fontWeight: 'bold', color: colors.darkerGreen },
  ratingsSection: { backgroundColor: colors.white, marginHorizontal: 15, marginTop: 10, padding: 15, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, marginBottom: 15 },
  separator: { borderBottomWidth: 1, borderColor: colors.greyBorder, marginVertical: 10 },
  ratingsTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  noFeedback: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', paddingVertical: 10 },
  feedbackItem: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.greyBorder },
  feedbackName: { fontWeight: '600', color: colors.textPrimary, marginBottom: 3, fontSize: 14 },
  showMoreBtn: { color: colors.primaryGreen, fontSize: 13, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', marginBottom: 5, gap: 2 },
  feedbackText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  likeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
  likeCount: { marginLeft: 4, fontSize: 12, color: colors.textSecondary },
  fixedButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.white, borderTopLeftRadius: 15, borderTopRightRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
  btnAdd: { backgroundColor: colors.accentGreen, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, flex: 1, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  btnBuy: { backgroundColor: colors.primaryGreen, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { textAlign: 'center', color: colors.white, fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalFullWidthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, paddingVertical: 15, paddingHorizontal: 20, width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 10 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  squareBtn: { width: 36, height: 36, borderWidth: 1, borderColor: colors.primaryGreen, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  confirmBtn: { backgroundColor: colors.primaryGreen, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  qty: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
});
