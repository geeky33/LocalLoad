import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Button, Card, Field, Screen, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthStackParamList } from '../navigation/types';
import { errorMessage } from '../services/api';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address');
    if (!password) return setError('Enter your password');
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Pressable onPress={() => navigation.goBack()}>
          <T color={colors.primary}>‹ Back</T>
        </Pressable>
        <T variant="title">Welcome back</T>
        <T variant="small">Log in to report crowds and get route alerts.</T>
        <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" onSubmitEditing={submit} />
        {error && (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <T color={colors.danger}>{error}</T>
          </Card>
        )}
        <Button title="Log in" onPress={submit} loading={busy} />
        <Button title="New here? Create an account" variant="ghost" onPress={() => navigation.replace('Signup')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
