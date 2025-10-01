import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const LoadingDots = ({ color = '#56AB2F', size = 10, style }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = (animatedValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 1, duration: 400, useNativeDriver: true, delay }),
          Animated.timing(animatedValue, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 200);
    const anim3 = createAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.dot, { backgroundColor: color, width: size, height: size, opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, width: size, height: size, opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, width: size, height: size, opacity: dot3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { borderRadius: 50 },
});

export default LoadingDots;
