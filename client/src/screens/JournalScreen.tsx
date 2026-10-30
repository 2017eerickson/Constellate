import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
import { getCurrentQuestion, submitAnswer, skipQuestion } from '../services/activities';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { moderateScale, verticalScale } from '../styles/scale';
import type { JournalResponse } from '../types';

type ParamList = {
  Journal: { partnershipId: number; partnerName: string };
};

export default function JournalScreen() {
  const route = useRoute<RouteProp<ParamList, 'Journal'>>();
  const { partnershipId, partnerName } = route.params;
  const { user } = useAuth();

  const [journal, setJournal] = useState<JournalResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchQuestion = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCurrentQuestion(partnershipId);
      setJournal(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [partnershipId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await submitAnswer(partnershipId, inputText.trim());
      setJournal(data);
      setInputText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [inputText, partnershipId, submitting]);

  const handleSkip = useCallback(async () => {
    try {
      const data = await skipQuestion(partnershipId);
      setJournal(data);
      setInputText('');
    } catch {
      // silent
    }
  }, [partnershipId]);

  const hasAnswered = journal?.my_answer != null;
  const bothAnswered = journal?.both_answered === true;

  return (
    <View style={styles.container}>
      <Canvas style={styles.bgCanvas}>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H}>
          <LinearGradient
            start={vec(SCREEN_W / 2, 0)}
            end={vec(SCREEN_W / 2, SCREEN_H)}
            colors={[colors.skyPurple, colors.skyDark]}
          />
        </Rect>
      </Canvas>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={moderateScale(90)}
      >
        {/* Question card */}
        {journal && (
          <View style={styles.questionCard}>
            <Text style={styles.categoryLabel}>{journal.question.label.replace('_', ' ')}</Text>
            <Text style={styles.questionText}>{journal.question.question_text}</Text>
            {!hasAnswered && (
              <Pressable testID="journal-skip-button" style={styles.skipButton} onPress={handleSkip}>
                <MaterialCommunityIcons name="skip-next" size={moderateScale(16)} color={colors.starGlow} />
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {journal?.my_answer && (
            <View style={styles.myBubbleRow}>
              <View style={styles.myBubble}>
                <Text style={styles.bubbleText}>{journal.my_answer.answer_text}</Text>
              </View>
              <Text style={styles.bubbleName}>{user?.first_name}</Text>
            </View>
          )}

          {hasAnswered && bothAnswered && journal?.partner_answer && (
            <View style={styles.partnerBubbleRow}>
              <View style={styles.partnerBubble}>
                <Text style={styles.bubbleText}>{journal.partner_answer.answer_text}</Text>
              </View>
              <Text style={styles.bubbleNameLeft}>{partnerName}</Text>
            </View>
          )}

          {hasAnswered && !bothAnswered && (
            <View style={styles.partnerBubbleRow}>
              <View style={[styles.partnerBubble, styles.waitingBubble]}>
                <Text style={styles.waitingText}>Waiting for {partnerName} to answer...</Text>
              </View>
            </View>
          )}

          {bothAnswered && (
            <View style={styles.completedRow}>
              <MaterialCommunityIcons name="star-four-points" size={moderateScale(14)} color={colors.starGlow} />
              <Text style={styles.completedText}>Both answered! New question tomorrow.</Text>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        {!hasAnswered && !loading && (
          <View style={styles.inputBar}>
            <TextInput
              testID="journal-input"
              style={styles.textInput}
              placeholder="Type your answer..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={handleSubmit}
              blurOnSubmit
            />
            <Pressable
              testID="journal-send-button"
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
            >
              <MaterialCommunityIcons
                name="send"
                size={moderateScale(20)}
                color={inputText.trim() ? colors.white : 'rgba(255,255,255,0.3)'}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.skyDark,
  },
  bgCanvas: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_H,
  },
  flex: {
    flex: 1,
  },
  questionCard: {
    marginTop: verticalScale(100),
    marginHorizontal: moderateScale(20),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
  },
  categoryLabel: {
    color: colors.starGlow,
    fontSize: moderateScale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: moderateScale(8),
  },
  questionText: {
    color: colors.white,
    fontSize: moderateScale(18),
    fontWeight: '600',
    lineHeight: moderateScale(26),
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: moderateScale(12),
    gap: moderateScale(4),
  },
  skipText: {
    color: colors.starGlow,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  chatArea: {
    flex: 1,
    marginTop: moderateScale(16),
  },
  chatContent: {
    paddingHorizontal: moderateScale(20),
    paddingBottom: moderateScale(16),
  },
  myBubbleRow: {
    alignItems: 'flex-end',
    marginBottom: moderateScale(12),
  },
  myBubble: {
    backgroundColor: 'rgba(124, 77, 255, 0.3)',
    borderRadius: moderateScale(16),
    borderBottomRightRadius: moderateScale(4),
    padding: moderateScale(14),
    maxWidth: '80%',
  },
  partnerBubbleRow: {
    alignItems: 'flex-start',
    marginBottom: moderateScale(12),
  },
  partnerBubble: {
    backgroundColor: 'rgba(40, 30, 60, 0.8)',
    borderRadius: moderateScale(16),
    borderBottomLeftRadius: moderateScale(4),
    padding: moderateScale(14),
    maxWidth: '80%',
  },
  waitingBubble: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
  },
  bubbleText: {
    color: colors.white,
    fontSize: moderateScale(15),
    lineHeight: moderateScale(22),
  },
  bubbleName: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateScale(11),
    marginTop: moderateScale(4),
    marginRight: moderateScale(4),
  },
  bubbleNameLeft: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateScale(11),
    marginTop: moderateScale(4),
    marginLeft: moderateScale(4),
  },
  waitingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateScale(14),
    fontStyle: 'italic',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    marginTop: moderateScale(8),
  },
  completedText: {
    color: colors.starGlow,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    gap: moderateScale(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: moderateScale(20),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    color: colors.white,
    fontSize: moderateScale(15),
    maxHeight: verticalScale(120),
  },
  sendButton: {
    backgroundColor: colors.soulmateAccent,
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(124, 77, 255, 0.3)',
  },
});
