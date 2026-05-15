import axios, { AxiosResponse, AxiosError } from 'axios'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<any>) => {
    const msg =
      error.response?.data?.error?.message
      || error.response?.data?.detail?.message
      || error.response?.data?.detail
      || error.response?.data?.message
      || error.message
      || 'Unknown error'
    // Preserve the full error object so catch blocks can inspect .response if needed,
    // but also attach the parsed message for easy display.
    ;(error as any).parsedMessage = msg
    return Promise.reject(error)
  }
)
