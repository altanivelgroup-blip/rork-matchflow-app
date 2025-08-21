import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface State { hasError: boolean; message?: string }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' };
  }

  componentDidCatch(error: unknown) {
    console.log('[ErrorBoundary] caught', error);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>{this.state.message ?? 'Please try again.'}</Text>
          <TouchableOpacity style={styles.button} onPress={this.reset} accessibilityRole="button">
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: '#FF6B6B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
});