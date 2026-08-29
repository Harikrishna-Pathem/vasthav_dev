import 'package:dio/dio.dart';
import 'environment.dart';

Dio createApiClient() => Dio(BaseOptions(baseUrl: Environment.apiBaseUrl, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 15)))
  ..interceptors.add(InterceptorsWrapper(onError: (error, handler) => handler.reject(error)));
