import 'package:dio/dio.dart';

class ChatService {
  final Dio _dio = Dio();
  // Use 10.0.2.2 for Android Emulator to access localhost of the host machine.
  final String _baseUrl = 'http://10.0.2.2:8000'; 

  /// Sends text to the backend for phonetic transliteration (Roman -> Indic).
  Future<String> transliterateText(String text, String langCode) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/transliterate',
        data: {
          "text": text,
          "target_lang_code": langCode,
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data['result'];
      } else {
        // Fail silently for transliteration to avoid disrupting typing
        return text;
      }
    } catch (e) {
      print("Transliteration Error: $e");
      return text;
    }
  }

  /// Sends text to the backend for translation.
  Future<String> translateText(String text, String sourceLang, String targetLang) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/translate/text',
        data: {
          "text": text,
          "source_lang": sourceLang,
          "target_lang": targetLang,
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data['translated_text'];
      } else {
        throw Exception('Failed to translate text: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        throw Exception('Server error: ${e.response?.data}');
      } else {
        throw Exception('Connection error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }
}
