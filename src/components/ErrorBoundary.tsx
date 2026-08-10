import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, spacing, typography } from '../theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level safety net — without this, any uncaught render-time throw (a
 * corrupted local-storage value, an unexpected native response, etc.) blanks
 * the whole app with no recovery path. "Try again" just resets local state
 * and re-renders; the error itself was almost certainly transient/local
 * (there's no server session to recover), so a fresh render is usually enough.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.warn('[tefillah-lock] Uncaught render error:', error);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>משהו השתבש</Text>
          <Text style={styles.body}>אירעה שגיאה בלתי צפויה. אפשר לנסות שוב.</Text>
          <PrimaryButton label="נסה שוב" onPress={this.handleRetry} style={styles.button} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
  },
  body: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    minWidth: 160,
  },
});
