import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoachMeter } from '../components/Crowd';
import { Button, Row, T } from '../components/ui';
import { LINE_COLORS, space } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { AuthStackParamList } from '../navigation/types';

export default function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(0)).current;

  // A little train gliding along the three line colours.
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(slide, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [slide]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space.xl, justifyContent: 'space-between' }}>
      <View style={{ marginTop: 60, gap: space.md }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="train" size={34} color="#fff" />
        </View>
        <T variant="title" style={{ fontSize: 40 }}>
          LocalLoad
        </T>
        <T variant="h2" color={colors.muted} style={{ fontWeight: '600' }}>
          Know your train. Beat the rush.
        </T>

        <View style={{ marginTop: space.xl, gap: 10 }}>
          {(['western', 'central', 'harbour'] as const).map((l, i) => (
            <View key={l} style={{ height: 6, borderRadius: 3, backgroundColor: LINE_COLORS[l], opacity: 0.25 + i * 0.2 }} />
          ))}
          <Animated.View
            style={{
              position: 'absolute',
              top: -6,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }],
            }}
          >
            <Ionicons name="train" size={18} color={colors.primary} />
          </Animated.View>
        </View>

        <View style={{ marginTop: space.xl, gap: space.md }}>
          {[
            ['navigate-circle-outline', 'Follow trains live on a map (simulated demo)'],
            ['people-outline', 'Crowd levels verified by 5+ commuters'],
            ['notifications-outline', 'Alerts for your daily route'],
          ].map(([icon, text]) => (
            <Row key={text} style={{ gap: space.md }}>
              <Ionicons name={icon as any} size={22} color={colors.primary} />
              <T>{text}</T>
            </Row>
          ))}
          <Row style={{ gap: space.md }}>
            <CoachMeter level="green" />
            <CoachMeter level="yellow" />
            <CoachMeter level="red" />
          </Row>
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <Button title="Create account" onPress={() => navigation.navigate('Signup')} />
        <Button title="I already have an account" variant="ghost" onPress={() => navigation.navigate('Login')} />
        <T variant="small" style={{ textAlign: 'center' }}>
          Train positions and timetables in LocalLoad are simulated for demonstration.
        </T>
      </View>
    </SafeAreaView>
  );
}
