
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/chat_provider.dart';
import '../services/chat_service.dart';
import '../widgets/mic_button.dart';
import '../utils/ocr_helper.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({Key? key}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  final ChatService _chatService = ChatService(); // Direct instance for IME logic
  
  String _sourceLang = 'Hindi'; // Default source is Hindi (user types phonetic English)
  String _targetLang = 'English';
  
  // Transliteration State
  bool _isTransliterationEnabled = true;
  String _lastWord = "";

  // Mapping Language names to ISO codes for ai4bharat
  final Map<String, String> _langCodes = {
    'Hindi': 'hi',
    'Bengali': 'bn',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Punjabi': 'pa',
    'Urdu': 'ur',
    'English': 'en',
  };

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 100,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  // --- Transliteration Logic (IME) ---
  void _onTextChanged(String value) {
    if (!_isTransliterationEnabled || value.isEmpty) return;
    if (_langCodes[_sourceLang] == 'en') return; // Don't transliterate English

    // Check if the last character typed is a space
    if (value.endsWith(' ')) {
      _handleTransliteration(value);
    }
  }

  Future<void> _handleTransliteration(String currentText) async {
    // 1. Extract the last word before the space
    List<String> words = currentText.trimRight().split(' ');
    if (words.isEmpty) return;
    
    String wordToTransliterate = words.last;
    
    // Avoid re-transliterating if logic fires multiple times or for empty words
    if (wordToTransliterate.isEmpty) return;

    try {
      // 2. Call Backend
      String langCode = _langCodes[_sourceLang] ?? 'hi';
      String convertedWord = await _chatService.transliterateText(wordToTransliterate, langCode);

      // 3. Replace text in controller maintaining cursor position
      if (convertedWord != wordToTransliterate) {
        String newText = currentText.substring(0, currentText.length - wordToTransliterate.length - 1) + convertedWord + " ";
        
        // This is a naive replacement that assumes the user is typing at the end.
        // For a robust IME, we would use _textController.selection to find the exact replacement range.
        
        // Better approach using Selection:
        final selection = _textController.selection;
        final textBeforeSelection = currentText.substring(0, selection.baseOffset);
        
        // If we are just typing linearly:
        _textController.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(offset: newText.length),
        );
      }
    } catch (e) {
      // Ignore errors to keep typing smooth
    }
  }

  // --- Image OCR ---
  Future<void> _handleImageOCR() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.gallery);
      if (photo == null) return;

      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Processing image text...')),
      );

      final String extractedText = await extractTextFromImage(File(photo.path));

      if (extractedText.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No text found in image.')),
        );
        return;
      }

      setState(() {
        _textController.text = extractedText;
      });
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = Provider.of<ChatProvider>(context);
    final langList = _langCodes.keys.toList();

    WidgetsBinding.instance.addPostFrameCallback((_) {
       if (chatProvider.messages.isNotEmpty) {
         _scrollToBottom();
       }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bharat languages'),
        backgroundColor: Colors.indigo,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => chatProvider.clearMessages(),
          )
        ],
      ),
      backgroundColor: Colors.grey[100],
      body: Column(
        children: [
          // Language & Mode Selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Source Language Dropdown
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Source (You type)", style: TextStyle(fontSize: 10, color: Colors.grey)),
                          DropdownButton<String>(
                            value: _sourceLang,
                            isExpanded: true,
                            underline: Container(),
                            style: const TextStyle(color: Colors.indigo, fontWeight: FontWeight.bold),
                            items: langList.map((String value) {
                              return DropdownMenuItem<String>(value: value, child: Text(value));
                            }).toList(),
                            onChanged: (val) => setState(() => _sourceLang = val!),
                          ),
                        ],
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8.0),
                      child: Icon(Icons.arrow_forward, color: Colors.grey),
                    ),
                    // Target Language Dropdown
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Target (AI translates)", style: TextStyle(fontSize: 10, color: Colors.grey)),
                          DropdownButton<String>(
                            value: _targetLang,
                            isExpanded: true,
                            underline: Container(),
                            style: const TextStyle(color: Colors.indigo, fontWeight: FontWeight.bold),
                            items: langList.map((String value) {
                              return DropdownMenuItem<String>(value: value, child: Text(value));
                            }).toList(),
                            onChanged: (val) => setState(() => _targetLang = val!),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(),
                // Transliteration Toggle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.keyboard, size: 20, color: _isTransliterationEnabled ? Colors.indigo : Colors.grey),
                        const SizedBox(width: 8),
                        Text(
                          "Transliteration (A→अ)",
                          style: TextStyle(
                            color: _isTransliterationEnabled ? Colors.indigo : Colors.grey[700],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Switch(
                      value: _isTransliterationEnabled,
                      activeColor: Colors.indigo,
                      onChanged: (val) {
                        setState(() => _isTransliterationEnabled = val);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(val ? "Phonetic typing enabled for $_sourceLang" : "Standard keyboard enabled"),
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Chat Area
          Expanded(
            child: chatProvider.messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.translate, size: 64, color: Colors.indigo.withOpacity(0.2)),
                        const SizedBox(height: 16),
                        Text(
                          'Type "namaste" + Space → "नमस्ते"',
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: chatProvider.messages.length,
                    itemBuilder: (context, index) {
                      final msg = chatProvider.messages[index];
                      return _buildMessageBubble(msg);
                    },
                  ),
          ),

          if (chatProvider.isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: LinearProgressIndicator(backgroundColor: Colors.transparent),
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  spreadRadius: 1,
                  blurRadius: 5,
                  offset: const Offset(0, -1),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.camera_alt_outlined, color: Colors.indigo),
                  onPressed: _handleImageOCR,
                ),
                MicButton(
                  onTextRecognized: (text) {
                    setState(() {
                      // If transliteration is ON, we assume voice input is also in source lang
                      // but typically STT returns script directly. 
                      _textController.text = text;
                    });
                  },
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _textController,
                    onChanged: _onTextChanged, // Hook for IME
                    decoration: InputDecoration(
                      hintText: _isTransliterationEnabled 
                          ? 'Typing $_sourceLang phonetically...' 
                          : 'Type a message...',
                      fillColor: Colors.grey[100],
                      filled: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(chatProvider),
                  ),
                ),
                const SizedBox(width: 8),
                FloatingActionButton(
                  mini: true,
                  onPressed: chatProvider.isLoading ? null : () => _sendMessage(chatProvider),
                  backgroundColor: chatProvider.isLoading ? Colors.grey : Colors.indigo,
                  elevation: 2,
                  child: const Icon(Icons.send, color: Colors.white, size: 20),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage(ChatProvider provider) {
    if (_textController.text.trim().isEmpty) return;
    
    provider.sendMessage(
      _textController.text,
      _sourceLang,
      _targetLang,
    );
    _textController.clear();
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    return Align(
      alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: msg.isUser ? Colors.indigo[600] : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: msg.isUser ? const Radius.circular(16) : const Radius.circular(0),
            bottomRight: msg.isUser ? const Radius.circular(0) : const Radius.circular(16),
          ),
          boxShadow: [
            if (!msg.isUser)
              BoxShadow(
                color: Colors.grey.withOpacity(0.1),
                blurRadius: 3,
                offset: const Offset(0, 1),
              )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              msg.text,
              style: TextStyle(
                color: msg.isUser ? Colors.white : Colors.black87,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "${msg.timestamp.hour}:${msg.timestamp.minute.toString().padLeft(2, '0')}",
                  style: TextStyle(
                    color: msg.isUser ? Colors.white70 : Colors.grey[500],
                    fontSize: 10,
                  ),
                ),
                if (!msg.isUser) ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: msg.text));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Copied to clipboard"),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Icon(
                      Icons.copy,
                      size: 14,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
