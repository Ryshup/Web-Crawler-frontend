import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@utils/logger';

class OCRApiClient {
  private client: AxiosInstance;
  private controllers: Map<string, AbortController> = new Map();

  constructor() {
    // OCR Backend runs on port 8001
    this.client = axios.create({
      baseURL: 'https://yfb6l6xrf1.execute-api.us-east-1.amazonaws.com/extractdoc',
      timeout: 60000, // OCR processing might take longer
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      req => {
        const startTime = Date.now();
        logger.apiRequest(req.method?.toUpperCase() || 'UNKNOWN', req.url || 'unknown', {
          data: req.data,
          headers: req.headers,
          startTime,
        });
        return req;
      },
      error => {
        logger.apiError('UNKNOWN', 'unknown', error, { interceptor: 'request' });
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      res => {
        const startTime = (res.config as unknown as { startTime?: number }).startTime || Date.now();
        const duration = Date.now() - startTime;
        logger.apiResponse(
          res.config.method?.toUpperCase() || 'UNKNOWN',
          res.config.url || 'unknown',
          res.status,
          duration,
          {
            data: res.data,
            headers: res.headers,
          },
        );
        return res;
      },
      (error: AxiosError) => {
        const startTime =
          (error.config as unknown as { startTime?: number })?.startTime || Date.now();
        const duration = Date.now() - startTime;
        logger.apiError(
          error.config?.method?.toUpperCase() || 'UNKNOWN',
          error.config?.url || 'unknown',
          error,
          {
            status: error.response?.status,
            data: error.response?.data,
            duration,
          },
        );
        return Promise.reject(error);
      },
    );
  }

  public getClient() {
    return this.client;
  }

  /**
   * Create an AbortController for a cancellable request.
   */
  public createAbortController(key: string): AbortController {
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  /**
   * Cancel a pending request by key.
   */
  public cancelRequest(key: string) {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Cancel all pending requests.
   */
  public cancelAllRequests() {
    this.controllers.forEach(controller => {
      controller.abort();
    });
    this.controllers.clear();
  }
}

const ocrApiClientManager = new OCRApiClient();
export const ocrApiClient = ocrApiClientManager.getClient();
export { ocrApiClientManager };
