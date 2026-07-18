import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  showHelper: boolean;
  onToggleHelper: () => void;
  onInputFocus: () => void;
  bottomInset: number;
}

// Owns the text state so keystrokes never re-render ChatScreen or its FlatList.
function ChatInputBar({ onSend, disabled, showHelper, onToggleHelper, onInputFocus, bottomInset }: Props) {
  const [text, setText] = useState('');

  const handleSendPress = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View style={[styles.inputBar, { paddingBottom: bottomInset || 8 }]}>
      <TouchableOpacity
        style={styles.helperButton}
        onPress={onToggleHelper}
        disabled={disabled}
      >
        <Text style={[styles.helperButtonText, showHelper && styles.helperButtonActive]}>
          {showHelper ? '✕' : '+'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="พิมพ์ข้อความ..."
        placeholderTextColor="#94a3b8"
        multiline
        maxLength={2000}
        editable={!disabled}
        onFocus={onInputFocus}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!text.trim() || disabled) && styles.sendButtonDisabled,
        ]}
        onPress={handleSendPress}
        disabled={!text.trim() || disabled}
      >
        {disabled ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendButtonText}>ส่ง</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default memo(ChatInputBar);

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  helperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  helperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  helperButtonActive: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
