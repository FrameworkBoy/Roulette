import React, { useRef, useCallback } from 'react';
import { Modal, View, Pressable, Text, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Colors } from '../constants/colors';
import { useInactivity } from '../context/InactivityContext';
import { scale, W } from '../utils/responsive';

type Props = {
  visible: boolean;
  source: number;
  onClose: () => void;
};

export default function VideoModal({ visible, source, onClose }: Props) {
  const videoRef = useRef<Video>(null);
  const inactivity = useInactivity();

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      inactivity.pause();
    } else {
      inactivity.resume();
    }

    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0);
    }
  }, [inactivity]);

  const handleClose = async () => {
    await videoRef.current?.pauseAsync();
    inactivity.resume();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Video
            ref={videoRef}
            source={source}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls
            onPlaybackStatusUpdate={handleStatus}
          />

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            onPress={handleClose}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  container: {
    width: '100%',
    maxWidth: W * 0.9,
    gap: scale(16),
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: scale(12),
    backgroundColor: '#000',
  },
  closeButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(50),
    paddingVertical: scale(20),
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 6,
  },
  closeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: scale(18),
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
