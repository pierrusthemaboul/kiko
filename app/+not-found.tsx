// app/+not-found.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Page non trouvée</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020817' },
  text: { fontSize: 20, color: '#FFCC00' },
});
