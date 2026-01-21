import 'package:flutter/material.dart';
import '../services/chat_service.dart';

class ChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
}

class ChatProvider with ChangeNotifier {
  final ChatService _chatService = ChatService();
  
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String _errorMessage = '';

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  /// Sends a message and updates the state with the response.
  Future<void> sendMessage(String text, String sourceLang, String targetLang) async {
    if (text.trim().isEmpty) return;

    // 1. Add User Message immediately
    final userMsgId = DateTime.now().millisecondsSinceEpoch.toString();
    _messages.add(ChatMessage(
      id: userMsgId,
      text: text,
      isUser: true,
      timestamp: DateTime.now(),
    ));
    
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      // 2. Call API
      final translatedText = await _chatService.translateText(text, sourceLang, targetLang);
      
      // 3. Add Bot Message (Translation)
      final botMsgId = "${DateTime.now().millisecondsSinceEpoch}_bot";
      _messages.add(ChatMessage(
        id: botMsgId,
        text: translatedText,
        isUser: false, // Bot/System
        timestamp: DateTime.now(),
      ));
    } catch (e) {
      _errorMessage = e.toString();
      // Optionally add an error message to the chat stream
      _messages.add(ChatMessage(
        id: "${DateTime.now().millisecondsSinceEpoch}_error",
        text: "Error: Could not translate. Please try again.",
        isUser: false,
        timestamp: DateTime.now(),
      ));
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearMessages() {
    _messages.clear();
    notifyListeners();
  }
}
