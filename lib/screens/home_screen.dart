import 'dart:async';
import 'package:flutter/material.dart';
import '../services/chat_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Controllers and Services
  final TextEditingController _textController = TextEditingController();
  final ChatService _chatService = ChatService();
  
  // State Variables
  Timer? _debounce;
  String _selectedLangCode = 'hi'; // Default to Hindi
  List<String> _suggestions = [];
  String _currentInputWord = "";
  bool _isLoading = false;

  // Language Mapping (ISO codes compatible with ai4bharat backend)
  final Map<String, String> _languages = {
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
  };

  @override
  void dispose() {
    _textController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  /// Calls the backend API to get transliteration suggestions
  Future<void> fetchTransliteration(String text, String lang) async {
    if (text.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      // Calls the existing service method which hits http://10.0.2.2:8000/transliterate
      final result = await _chatService.transliterateText(text, lang);
      
      if (mounted) {
        setState(() {
          // The backend currently returns a single string result. 
          // If the backend supported multiple candidates, we would map them here.
          _suggestions = [result]; 
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("API Error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Triggered whenever the text field changes
  void _onTextChanged(String text) {
    // 1. Get the word currently being typed based on cursor position
    final selection = _textController.selection;
    if (selection.baseOffset == -1) return;

    final end = selection.baseOffset;
    if (end == 0) {
      setState(() => _suggestions = []);
      return;
    }

    // Find the start of the current word (look back for space)
    int start = end - 1;
    while (start >= 0 && text[start] != ' ' && text[start] != '\n') {
      start--;
    }
    start++; // Move forward to the first character of the word

    // Extract the word
    String currentWord = text.substring(start, end);

    if (currentWord.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }

    _currentInputWord = currentWord;

    // 2. Debounce Logic: Wait 300ms before calling API
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      fetchTransliteration(_currentInputWord, _selectedLangCode);
    });
  }

  /// Replaces the typed phonetic word with the selected Indic script suggestion
  void _applySuggestion(String suggestion) {
    final text = _textController.text;
    final selection = _textController.selection;

    if (selection.baseOffset < 0) return;

    final end = selection.baseOffset;
    // Recalculate start index to be safe
    int start = end - 1;
    while (start >= 0 && text[start] != ' ' && text[start] != '\n') {
      start--;
    }
    start++;

    // Replace the range
    final newText = text.replaceRange(start, end, suggestion);

    // Update controller and move cursor to end of inserted word
    _textController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + suggestion.length),
    );

    // Clear suggestions after selection
    setState(() {
      _suggestions = [];
      _currentInputWord = "";
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Indic Transliteration"),
        backgroundColor: Colors.indigo,
        elevation: 0,
      ),
      backgroundColor: Colors.grey[50],
      body: Column(
        children: [
          // 1. Language Selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                const Text("Target Language:", style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(width: 16),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _languages.entries
                            .firstWhere((e) => e.value == _selectedLangCode, 
                                orElse: () => _languages.entries.first)
                            .key,
                        isExpanded: true,
                        items: _languages.keys.map((String key) {
                          return DropdownMenuItem<String>(
                            value: key,
                            child: Text(key),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          if (newValue != null) {
                            setState(() {
                              _selectedLangCode = _languages[newValue]!;
                            });
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          const Divider(height: 1),

          // 2. Main Text Input
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                controller: _textController,
                onChanged: _onTextChanged,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                style: const TextStyle(fontSize: 18, height: 1.5),
                decoration: InputDecoration(
                  hintText: "Start typing in English (e.g., 'namaste')...",
                  hintStyle: TextStyle(color: Colors.grey[400]),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),

          // 3. Suggestion Bar (Conditional)
          if (_suggestions.isNotEmpty || _isLoading)
            Container(
              height: 60,
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    offset: const Offset(0, -2),
                    blurRadius: 5,
                  )
                ],
              ),
              child: _isLoading
                  ? const Center(
                      child: SizedBox(
                        width: 20, 
                        height: 20, 
                        child: CircularProgressIndicator(strokeWidth: 2)
                      )
                    )
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        return ActionChip(
                          backgroundColor: Colors.indigo.withOpacity(0.1),
                          label: Text(
                            _suggestions[index],
                            style: const TextStyle(
                              color: Colors.indigo,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          onPressed: () => _applySuggestion(_suggestions[index]),
                        );
                      },
                    ),
            ),
        ],
      ),
    );
  }
}
