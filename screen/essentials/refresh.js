// refresh.js
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Modal } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';

// --- Global Constants ---
const BRAND_COLOR = '#56AB2F';
const LIGHT_COLOR = 'rgba(86, 171, 47, 0.4)';

// --- Helper Component: Spinner ---
const Spinner = ({ size = 32, color = BRAND_COLOR, strokeWidth = 4 }) => {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.25" strokeWidth={strokeWidth} />
                <Path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill={color} fillOpacity="0.75" />
            </Svg>
        </Animated.View>
    );
};

// --- Helper Component: LoadingDots ---
const Dot = ({ animation, delay }) => {
    const colorInterpolate = animation.interpolate({
        inputRange: [0, 0.4, 0.6, 1],
        outputRange: [LIGHT_COLOR, BRAND_COLOR, BRAND_COLOR, LIGHT_COLOR],
    });

    const delayedAnimation = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [delay, 1 + delay],
        extrapolate: 'clamp',
    });

    return (
        <Animated.Text style={[
            loadingDotsStyles.dot,
            {
                color: colorInterpolate,
                opacity: delayedAnimation.interpolate({
                    inputRange: [0.1, 0.5, 0.9],
                    outputRange: [0.4, 1, 0.4],
                }),
                transform: [{
                    scale: delayedAnimation.interpolate({
                        inputRange: [0.1, 0.5, 0.9],
                        outputRange: [0.9, 1.1, 0.9],
                    })
                }]
            }
        ]}>
            •
        </Animated.Text>
    );
};

const LoadingDots = ({ title }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    return (
        <View style={loadingDotsStyles.container}>
            <Text style={loadingDotsStyles.text}>{title}</Text>
            <View style={loadingDotsStyles.dotsWrapper}>
                <Dot animation={animatedValue} delay={0} />
                <Dot animation={animatedValue} delay={0.15} />
                <Dot animation={animatedValue} delay={0.3} />
            </View>
        </View>
    );
};

const loadingDotsStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    text: {
        color: BRAND_COLOR,
        fontWeight: 'bold',
        fontSize: 18,
        marginRight: 4,
    },
    dotsWrapper: {
        flexDirection: 'row',
    },
    dot: {
        fontSize: 24,
        lineHeight: 18,
        paddingHorizontal: 1,
    },
});

// --- Main Component: Refresh ---
const Refresh = ({ visible, title = 'Loading', subtitle = '' }) => {
    if (!visible) return null;

    return (
        <Modal 
            transparent={true} 
            animationType="fade" 
            visible={visible}
            onRequestClose={() => { /* Prevent user from closing it */ }}
        >
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Spinner size={32} color={BRAND_COLOR} />
                    
                    <View style={styles.textContainer}>
                        <LoadingDots title={title} /> 
                        {subtitle ? <Text style={styles.subText}>{subtitle}</Text> : null}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        padding: 30,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 300,
    },
    textContainer: {
        marginLeft: 15,
        justifyContent: 'center',
    },
    subText: {
        color: 'gray',
        fontSize: 12,
        marginTop: 2,
    },
});

export default Refresh;
