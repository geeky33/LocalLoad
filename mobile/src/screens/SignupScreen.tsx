import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Button, Card, Field, Screen, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthStackParamList } from '../navigation/types';
import { errorMessage } from '../services/api';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Signup'>) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name';
    if (!EMAIL.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 6) e.password = 'Use at least 6 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setServerError(null);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setServerError(errorMessage(err));
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
        <T variant="title">Create account</T>
        <T variant="small">Join commuters sharing live crowd info.</T>
        <Field label="Full name" icon="person-outline" value={form.name} onChangeText={set('name')} error={errors.name} placeholder="Aarav Shah" />
        <Field label="Email" icon="mail-outline" value={form.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" icon="lock-closed-outline" value={form.password} onChangeText={set('password')} error={errors.password} secureTextEntry placeholder="At least 6 characters" />
        <Field label="Confirm password" icon="lock-closed-outline" value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} secureTextEntry placeholder="Repeat password" />
        {serverError && (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <T color={colors.danger}>{serverError}</T>
          </Card>
        )}
        <Button title="Sign up" onPress={submit} loading={busy} />
        <Button title="Already registered? Log in" variant="ghost" onPress={() => navigation.replace('Login')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
