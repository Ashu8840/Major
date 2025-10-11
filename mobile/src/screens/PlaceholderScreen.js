import PropTypes from "prop-types";
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function PlaceholderScreen({ route, navigation }) {
  const { title = "Coming Soon", target = "" } = route.params || {};

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtitle}>
        Mobile implementation for `{target}` is not available yet. This screen
        confirms navigation wiring and will be replaced with the real feature.
      </Text>
    </View>
  );
}

PlaceholderScreen.propTypes = {
  navigation: PropTypes.shape({
    setOptions: PropTypes.func,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      title: PropTypes.string,
      target: PropTypes.string,
    }),
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
  },
});
