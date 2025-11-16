import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

interface CallScreenProps {
  callType: "audio" | "video";
  callStatus: "calling" | "incoming" | "active" | "connecting";
  isCaller: boolean;
  partnerName: string;
  partnerAvatar?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onSwitchCamera?: () => void;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  callType,
  callStatus,
  isCaller,
  partnerName,
  partnerAvatar,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  isMuted = false,
  isVideoEnabled = true,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (callStatus === "active") {
      // Start call timer
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  useEffect(() => {
    // Pulse animation for calling status
    if (callStatus === "calling" || callStatus === "incoming") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [callStatus, pulseAnim]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (callStatus === "incoming") return "Incoming call...";
    if (callStatus === "calling") return "Calling...";
    if (callStatus === "connecting") return "Connecting...";
    if (callStatus === "active") return formatDuration(callDuration);
    return "";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderVideoCall = () => {
    return (
      <View style={styles.videoContainer}>
        {/* Remote Video Placeholder (Full Screen) */}
        <View style={styles.remoteVideoPlaceholder}>
          <View style={styles.avatarLarge}>
            {partnerAvatar ? (
              <Image
                source={{ uri: partnerAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials(partnerName)}</Text>
            )}
          </View>
          {callStatus === "connecting" || callStatus === "calling" ? (
            <Text style={styles.connectingText}>
              {callStatus === "connecting" ? "Connecting..." : "Ringing..."}
            </Text>
          ) : null}
        </View>

        {/* Local Video Placeholder (Small Preview) */}
        {isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            <View style={[styles.avatarLarge, styles.localVideoPreview]}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Top Info Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <Text style={styles.partnerNameTop}>{partnerName}</Text>
            <Text style={styles.statusTextTop}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {callStatus === "incoming" ? (
            <View style={styles.incomingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={onDecline}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={onAccept}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeActions}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isMuted && styles.controlButtonActive,
                ]}
                onPress={onToggleMute}
              >
                <Ionicons
                  name={isMuted ? "mic-off" : "mic"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  !isVideoEnabled && styles.controlButtonActive,
                ]}
                onPress={onToggleVideo}
              >
                <Ionicons
                  name={isVideoEnabled ? "videocam" : "videocam-off"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={onSwitchCamera}
              >
                <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.endButton]}
                onPress={onEnd}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderAudioCall = () => {
    return (
      <View style={styles.audioContainer}>
        {/* Gradient Background */}
        <View style={styles.gradientBackground} />

        {/* Partner Avatar with Pulse */}
        <View style={styles.audioContent}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.avatarLarge}>
              {partnerAvatar ? (
                <Image
                  source={{ uri: partnerAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(partnerName)}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Partner Info */}
          <Text style={styles.partnerName}>{partnerName}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {callStatus === "incoming" ? (
            <View style={styles.incomingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={onDecline}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={onAccept}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeActions}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isMuted && styles.controlButtonActive,
                ]}
                onPress={onToggleMute}
              >
                <Ionicons
                  name={isMuted ? "mic-off" : "mic"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.endButton]}
                onPress={onEnd}
              >
                <Ionicons name="call" size={30} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.controlButton}>
                {/* Spacer for symmetry */}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {callType === "video" ? renderVideoCall() : renderAudioCall()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#1B2148",
  },
  audioContainer: {
    flex: 1,
    backgroundColor: "#0D4C73",
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D4C73",
  },
  remoteVideo: {
    width: width,
    height: height,
    backgroundColor: "#1B2148",
  },
  remoteVideoPlaceholder: {
    width: width,
    height: height,
    backgroundColor: "#1B2148",
    justifyContent: "center",
    alignItems: "center",
  },
  localVideoContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#1B2148",
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  topBarContent: {
    alignItems: "center",
  },
  partnerNameTop: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statusTextTop: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  audioContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  avatarContainer: {
    marginBottom: 40,
  },
  avatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  partnerName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  statusText: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 50 : 40,
    paddingHorizontal: 20,
  },
  incomingActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  activeActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  acceptButton: {
    backgroundColor: "#25D366",
  },
  declineButton: {
    backgroundColor: "#EF4444",
    transform: [{ rotate: "135deg" }],
  },
  endButton: {
    backgroundColor: "#EF4444",
    transform: [{ rotate: "135deg" }],
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  connectingText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 20,
    textAlign: "center",
  },
  localVideoPreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
});
