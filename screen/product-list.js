import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  FlatList,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../config";

const { width } = Dimensions.get("window");

const colors = {
  primaryGreen: "#4CAF50",
  darkerGreen: "#388E3C",
  lightGreen: "#F0F8F0",
  accentGreen: "#8BC34A",
  textPrimary: "#333333",
  textSecondary: "#666666",
  white: "#FFFFFF",
  greyBorder: "#DDDDDD",
  lightGreyBackground: "#FAFAFA",
  errorRed: "#e53935",
};

const ProductList = ({ route }) => {
  const navigation = useNavigation();
  const { user } = route.params;

  const [activeTab, setActiveTab] = useState("Home");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupedProducts, setGroupedProducts] = useState({});
  const [craftProducts, setCraftProducts] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  // DIY badge heartbeat animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
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
  }, []);

  // DIY Logo shake + zoom animation every 3s
  const diyAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.timing(diyAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(diyAnim, {
          toValue: -1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(diyAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ]).start(() => loop());
    };
    loop();
  }, []);

  const shakeAndZoom = {
    transform: [
      {
        scale: diyAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [1.1, 1, 1.1],
        }),
      },
      {
        rotate: diyAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: ["-5deg", "5deg"],
        }),
      },
    ],
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const fuzzyMatch = (text, query) => {
    const q = query.toLowerCase().trim().split(/\s+/);
    const t = text.toLowerCase();
    return q.every((word) => t.includes(word));
  };

  const groupByCategory = (prods, cats, categoryFilter, search) => {
    const grouped = {};
    cats.forEach((cat) => {
      if (cat.id === null) return;
      let filtered = prods.filter((p) => p.category_id === cat.id.toString());
      if (categoryFilter !== null && cat.id !== categoryFilter) filtered = [];
      if (search.trim() !== "")
        filtered = filtered.filter((p) => fuzzyMatch(p.productName, search));
      grouped[cat.categoryName] = filtered;
    });
    return grouped;
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCraftProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0 && categories.length > 0) {
      setGroupedProducts(
        groupByCategory(products, categories, selectedCategory, searchQuery)
      );
    }
  }, [products, categories, selectedCategory, searchQuery]);

  const fetchProducts = () => {
    fetch(`${BASE_URL}/get-products.php`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProducts(data.products);
      })
      .catch((err) => console.error("Product fetch error:", err))
      .finally(() => setLoading(false));
  };

  const fetchCategories = () => {
    fetch(`${BASE_URL}/get-categories.php`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories([{ id: null, categoryName: "All" }, ...data.categories]);
        }
      })
      .catch((err) => console.error("Category fetch error:", err));
  };

  const fetchCraftProducts = () => {
    fetch(`${BASE_URL}/fetch-artmat.php`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCraftProducts(data.data);
      })
      .catch((err) => console.error("Craft fetch error:", err));
  };

  const applyFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowFilter(false);
  };

  const renderSmallProductCard = ({ item }) => (
    <TouchableOpacity
      style={styles.smallCard}
      onPress={() =>
        navigation.navigate("ProductDetail", { product: item, user })
      }
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri: `${BASE_URL.replace(/\/$/, "")}/../storage/${item.image}`,
          }}
          style={styles.smallImage}
        />
        {item.ArtMat === "Yes" && (
          <Animated.View
            style={[styles.diyBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <Image
              source={require("../assets/DIY_Logo.png")}
              style={styles.diyLogo}
            />
          </Animated.View>
        )}
      </View>
      <Text style={styles.smallName} numberOfLines={1}>
        {item.productName}
      </Text>
      <Text style={styles.smallPrice}>
        ₱{" "}
        {parseFloat(item.price).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
    </TouchableOpacity>
  );

  const AutoScrollFlatList = ({ data }) => {
    const listRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const isTouching = useRef(false);
    const resumeTimeout = useRef(null);

    const startAutoScroll = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollX, {
            toValue: data.length * 112 - width + 32,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(scrollX, {
            toValue: 0,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    useEffect(() => {
      if (data.length === 0) return;
      startAutoScroll();
    }, [data]);

    useEffect(() => {
      const listenerId = scrollX.addListener(({ value }) => {
        listRef.current?.scrollToOffset({ offset: value, animated: false });
      });
      return () => scrollX.removeListener(listenerId);
    }, []);

    const handleTouchStart = () => {
      isTouching.current = true;
      scrollX.stopAnimation();
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
      resumeTimeout.current = setTimeout(() => {
        if (!isTouching.current) startAutoScroll();
      }, 4000);
    };

    return (
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderSmallProductCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScrollBeginDrag={handleTouchStart}
        onScrollEndDrag={handleTouchEnd}
      />
    );
  };

  const renderCraftSection = () => {
    if (selectedCategory !== null) return null;
    const filteredCrafts = craftProducts.filter((p) =>
      fuzzyMatch(p.productName, searchQuery)
    );
    if (filteredCrafts.length === 0) return null;

    return (
      <View style={{ marginBottom: 20 }}>
        <View style={styles.categoryHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Animated.Image
              source={require("../assets/DIY_Logo.png")}
              style={[{ width: 20, height: 20, resizeMode: "contain" }, shakeAndZoom]}
            />
            <Text style={[styles.categoryTitle, { marginLeft: 6 }]}>
              DIY Craft Items
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("DIYsection", { user })}
          >
            <Text style={styles.seeMore}>Watch and Follow</Text>
          </TouchableOpacity>
        </View>
        <AutoScrollFlatList data={filteredCrafts.slice(0, 5)} />
      </View>
    );
  };

  const renderCategorySection = (categoryName, items) => {
    if (items.length === 0) return null;
    const isExpanded = expandedCategories[categoryName] || false;
    const displayItems = isExpanded ? items : items.slice(0, 5);

    return (
      <View key={categoryName} style={{ marginBottom: 20 }}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{categoryName}</Text>
          <TouchableOpacity onPress={() => toggleCategory(categoryName)}>
            <Text style={styles.seeMore}>
              {isExpanded ? "Show less" : "See more"}
            </Text>
          </TouchableOpacity>
        </View>
        {isExpanded ? (
          <FlatList
            data={displayItems}
            renderItem={renderSmallProductCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{
              justifyContent: "space-between",
              paddingHorizontal: 16,
            }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <AutoScrollFlatList data={displayItems} />
        )}
      </View>
    );
  };

  const renderExploreSection = () => {
    if (products.length === 0 || selectedCategory !== null) return null;
    return (
      <View style={{ marginBottom: 30 }}>
        <Text style={styles.exploreTitle}>Explore</Text>
        <FlatList
          data={products}
          renderItem={renderSmallProductCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const sectionData = [
    { key: "craft", render: renderCraftSection },
    ...Object.entries(groupedProducts).map(([name, items]) => ({
      key: name,
      render: () => renderCategorySection(name, items),
    })),
    { key: "explore", render: renderExploreSection },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </View>

      {/* Search + Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilter(true)}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilter(false)}
        >
          <View style={styles.filterBox}>
            <Text style={styles.filterTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => (item.id ?? "all").toString()}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  onPress={() => applyFilter(cat.id)}
                  style={styles.filterOptionButton}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCategory === cat.id && styles.selectedFilterOption,
                    ]}
                  >
                    {cat.categoryName}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowFilter(false)}
              style={styles.closeFilterButton}
            >
              <Text style={styles.closeFilterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Product Sections */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primaryGreen}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={sectionData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => item.render()}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                No products found matching your criteria.
              </Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate("CustomOrder", { user })}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => setActiveTab("Home")}
          style={styles.navButton}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeTab === "Home" ? colors.white : "#B0E0A0"}
          />
          <Text
            style={[styles.navLabel, activeTab === "Home" && styles.activeNavLabel]}
          >
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("Message");
            navigation.navigate("Message", { user });
          }}
          style={styles.navButton}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={24}
            color={activeTab === "Message" ? colors.white : "#B0E0A0"}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "Message" && styles.activeNavLabel,
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("Carts");
            navigation.navigate("Carts", { user });
          }}
          style={styles.navButton}
        >
          <Ionicons
            name="cart"
            size={24}
            color={activeTab === "Carts" ? colors.white : "#B0E0A0"}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "Carts" && styles.activeNavLabel,
            ]}
          >
            Cart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("Profile");
            navigation.navigate("Profile", { user });
          }}
          style={styles.navButton}
        >
          <Ionicons
            name="person"
            size={24}
            color={activeTab === "Profile" ? colors.white : "#B0E0A0"}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "Profile" && styles.activeNavLabel,
            ]}
          >
            Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductList;

// ======= STYLES =======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGreyBackground },
  header: {
    backgroundColor: colors.primaryGreen,
    paddingTop: Platform.OS === "android" ? 30 : 50,
    paddingBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  logo: { width: 150, height: 50, resizeMode: "contain" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 10,
    marginTop: -20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGreyBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: colors.textPrimary },
  filterButton: {
    backgroundColor: colors.primaryGreen,
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 10,
  },
  categoryTitle: { fontSize: 14, fontWeight: "400", color: colors.textPrimary },
  seeMore: { fontSize: 12, color: colors.primaryGreen },
  smallCard: {
    width: 100,
    marginBottom: 16,
    marginRight: 12,
    alignItems: "center",
  },
  imageWrapper: { position: "relative" },
  smallImage: {
    width: 90,
    height: 90,
    borderRadius: 6,
    marginBottom: 5,
    resizeMode: "contain",
  },
  diyBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 3,
    elevation: 5,
  },
  diyLogo: { width: 25, height: 25, borderRadius: 20, resizeMode: "contain" },
  smallName: {
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: "center",
  },
  smallPrice: { fontSize: 12, fontWeight: "600", color: colors.errorRed },
  exploreTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textPrimary,
    marginLeft: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    paddingBottom: 4,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyListText: { fontSize: 16, color: colors.textSecondary },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: colors.darkerGreen,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  navButton: {
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navLabel: {
    color: "#B0E0A0",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  activeNavLabel: { color: colors.white, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  filterBox: {
    backgroundColor: colors.white,
    marginHorizontal: 30,
    borderRadius: 15,
    padding: 25,
    elevation: 10,
    width: "80%",
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: colors.textPrimary,
    textAlign: "center",
  },
  filterOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  filterOptionText: { fontSize: 16, color: colors.textSecondary },
  selectedFilterOption: { fontWeight: "bold", color: colors.primaryGreen },
  closeFilterButton: {
    marginTop: 20,
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeFilterButtonText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  fabButton: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: colors.primaryGreen,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 10,
  },
});
