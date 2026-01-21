import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class MicButton extends StatefulWidget {
  final Function(String) onTextRecognized;
  final bool isBusy;

  const MicButton({
    Key? key, 
    required this.onTextRecognized,
    this.isBusy = false,
  }) : super(key: key);

  @override
  State<MicButton> createState() => _MicButtonState();
}

class _MicButtonState extends State<MicButton> {
  late stt.SpeechToText _speech;
  bool _isListening = false;
  bool _isAvailable = false;

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _initSpeech();
  }

  /// Initialize the speech engine
  Future<void> _initSpeech() async {
    try {
      // initialize() asks for permission and checks availability
      _isAvailable = await _speech.initialize(
        onStatus: (status) => print('Speech Status: $status'),
        onError: (errorNotification) {
          print('Speech Error: $errorNotification');
          setState(() => _isListening = false);
        },
      );
      if (mounted) setState(() {});
    } catch (e) {
      print("Speech initialization failed: $e");
    }
  }

  /// Start or Stop listening based on current state
  Future<void> _listen() async {
    if (!_isAvailable && !_isListening) {
      // Try initializing again if it failed previously or permissions changed
      await _initSpeech();
      if (!_isAvailable) return;
    }

    if (!_isListening) {
      setState(() => _isListening = true);
      _speech.listen(
        onResult: (val) {
          // This callback runs every time the engine recognizes a word
          widget.onTextRecognized(val.recognizedWords);
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        localeId: "en_IN", // Defaulting to Indian English, can be dynamic
        cancelOnError: true,
        listenMode: stt.ListenMode.dictation,
      );
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: _listen, // Optional: Press and hold style
      onTap: _listen,       // Tap to toggle style
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: _isListening ? Colors.redAccent : Colors.grey[200],
          shape: BoxShape.circle,
        ),
        child: Icon(
          _isListening ? Icons.mic : Icons.mic_none,
          color: _isListening ? Colors.white : Colors.grey[700],
        ),
      ),
    );
  }
}
