export interface SendSMSResult {
  success: boolean
  messageSid?: string
  error?: string
  status?: string
}

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  phoneNumber: string
}
