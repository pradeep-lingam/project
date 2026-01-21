import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Extracts text from a given image file using Google ML Kit.
/// Returns a single concatenated string of all recognized text.
Future<String> extractTextFromImage(File imageFile) async {
  // 1. Initialize the TextRecognizer (script: Latin for English/Indo-European)
  // For specific Indian scripts (Devanagari, etc.), use TextRecognitionScript.devanagari if supported
  // or the default script often handles common characters well.
  final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

  try {
    // 2. Create an InputImage object from the file path
    final inputImage = InputImage.fromFile(imageFile);

    // 3. Process the image
    final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);

    // 4. Return the text property which contains the full recognized string
    return recognizedText.text;
  } catch (e) {
    throw Exception('OCR Failed: $e');
  } finally {
    // 5. Always close the recognizer to release native resources
    await textRecognizer.close();
  }
}
