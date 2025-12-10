import { useState, useCallback } from 'react';
import axiosInstance from '../components/axiosInstance';

/**
 * Hook for making API requests with automatic retry on failure
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms for exponential backoff (default: 1000)
 */
export function useApiWithRetry(maxRetries = 3, baseDelay = 1000) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    /**
     * Sleep for a specified time
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Calculate exponential backoff delay
     * @param {number} attempt - Current attempt number (0-indexed)
     * @returns {number} Delay in milliseconds
     */
    const getBackoffDelay = (attempt) => {
        // Exponential backoff: baseDelay * 2^attempt
        // With jitter to avoid thundering herd
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
        return exponentialDelay + jitter;
    };

    /**
     * Determine if error is retryable
     * @param {Error} err - The error object
     * @returns {boolean} Whether the request should be retried
     */
    const isRetryableError = (err) => {
        // Don't retry on auth errors (will be handled by interceptor)
        if (err.response?.status === 401 || err.response?.status === 403) {
            return false;
        }

        // Don't retry on client errors (except 429 - rate limit)
        if (err.response?.status >= 400 && err.response?.status < 500 && err.response?.status !== 429) {
            return false;
        }

        // Retry on network errors, timeouts, server errors (5xx), and rate limits (429)
        return (
            !err.response || // Network error
            err.code === 'ECONNABORTED' || // Timeout
            err.response.status >= 500 || // Server error
            err.response.status === 429 // Rate limit
        );
    };

    /**
     * Make an API request with automatic retry
     * @param {Function} requestFn - Function that returns a promise (axios request)
     * @param {Object} options - Options for retry behavior
     * @param {AbortSignal} options.signal - AbortSignal for cancellation
     * @param {Function} options.onRetry - Callback called before each retry
     * @returns {Promise} The API response
     */
    const makeRequest = useCallback(async (requestFn, options = {}) => {
        const { signal, onRetry } = options;
        
        setLoading(true);
        setError(null);
        setRetryCount(0);

        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            // Check if request was cancelled
            if (signal?.aborted) {
                const cancelError = new Error('Request cancelled');
                cancelError.name = 'CanceledError';
                throw cancelError;
            }

            try {
                const response = await requestFn(signal);
                setLoading(false);
                setRetryCount(0);
                return response;
            } catch (err) {
                lastError = err;

                // Don't retry if request was cancelled
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                    throw err;
                }

                // Check if this error is retryable
                if (!isRetryableError(err)) {
                    setError(err);
                    setLoading(false);
                    throw err;
                }

                // If this was the last attempt, throw the error
                if (attempt === maxRetries) {
                    setError(err);
                    setLoading(false);
                    throw err;
                }

                // Calculate backoff delay and wait
                const delay = getBackoffDelay(attempt);
                console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`);
                
                setRetryCount(attempt + 1);
                
                // Call onRetry callback if provided
                if (onRetry) {
                    onRetry(attempt + 1, delay);
                }

                await sleep(delay);
            }
        }

        // This should never be reached, but just in case
        setLoading(false);
        throw lastError;
    }, [maxRetries, baseDelay]);

    return {
        makeRequest,
        loading,
        error,
        retryCount,
        setError
    };
}

/**
 * Convenience wrapper for GET requests with retry
 */
export function useGetWithRetry(url, config = {}, retryOptions = {}) {
    const { makeRequest, ...state } = useApiWithRetry(
        retryOptions.maxRetries,
        retryOptions.baseDelay
    );

    const get = useCallback((signal) => {
        return makeRequest(
            (abortSignal) => axiosInstance.get(url, { ...config, signal: abortSignal }),
            { signal, ...retryOptions }
        );
    }, [url, config, makeRequest, retryOptions]);

    return { get, ...state };
}

/**
 * Convenience wrapper for POST requests with retry
 */
export function usePostWithRetry(url, retryOptions = {}) {
    const { makeRequest, ...state } = useApiWithRetry(
        retryOptions.maxRetries,
        retryOptions.baseDelay
    );

    const post = useCallback((data, config = {}, signal) => {
        return makeRequest(
            (abortSignal) => axiosInstance.post(url, data, { ...config, signal: abortSignal }),
            { signal, ...retryOptions }
        );
    }, [url, makeRequest, retryOptions]);

    return { post, ...state };
}
