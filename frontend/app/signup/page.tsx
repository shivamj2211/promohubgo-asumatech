'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { getRouteForStep } from '@/config/onboardingFlow'

export default function Signup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    countryCode: '+91',
    userType: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  // We no longer have a separate email verification step. Instead we sign up the user
  // immediately and then allow them to claim a unique username. These flags track
  // whether the signup API call is in progress and whether the user is on the
  // username claim page.
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [isClaimingUsername, setIsClaimingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    phone: false,
    username: false,
  })
  const [phoneValidationError, setPhoneValidationError] = useState('')
  const [passwordValidationError, setPasswordValidationError] = useState('')
  const [emailValidationError, setEmailValidationError] = useState('')
  const [usernameValidationError, setUsernameValidationError] = useState('')

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regex.test(email)) {
      setEmailValidationError('Please enter a valid email address (e.g., you@gmail.com)')
    } else {
      setEmailValidationError('')
    }
  }

  const validatePhone = (phone: string, countryCode: string) => {
    const digits = phone.replace(/\D/g, '')
    // India specific: +91 -> 10 digits
    if (countryCode === '+91') {
      if (digits.length !== 10) {
        setPhoneValidationError('For India (+91) phone number must be exactly 10 digits')
        return
      }
    } else {
      // Generic rule: allow 6-15 digits for other countries
      if (digits.length < 6 || digits.length > 15) {
        setPhoneValidationError('Please enter a valid phone number (6-15 digits)')
        return
      }
    }

    setPhoneValidationError('')
  }

  const formatPhoneForCountry = (countryCode: string, digits: string) => {
    const d = digits.replace(/\D/g, '')
    if (!d) return ''
    if (countryCode === '+91') {
      // Format as XXX-XXX-XXXX for display
      const part1 = d.slice(0, 3)
      const part2 = d.slice(3, 6)
      const part3 = d.slice(6, 10)
      if (d.length <= 3) return part1
      if (d.length <= 6) return `${part1}-${part2}`
      return `${part1}-${part2}-${part3}`
    }
    // Generic grouping: groups of 3 then remaining
    return d.replace(/(\d{3})(?=\d)/g, '$1-')
  }

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@])[A-Za-z\d@]{8,14}$/
    if (!regex.test(pwd)) {
      setPasswordValidationError('Password must be 8-14 characters, include at least one uppercase letter, one number, and only @ as special character. No spaces allowed.')
    } else {
      setPasswordValidationError('')
    }
  }

  const validateUsername = (usr: string) => {
    if (usr.length < 6 || usr.length > 18) {
      setUsernameValidationError('Username must be between 6 and 18 characters long.')
    } else {
      setUsernameValidationError('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'password') {
      validatePassword(value)
    }
    if (name === 'email') {
      validateEmail(value)
    }
    if (name === 'phone') {
      // keep only digits in phone field
      const digits = value.replace(/\D/g, '')
      // validate on each change but final validation on blur
      validatePhone(digits, (formData.countryCode as string) || '+91')
      setFormData(prev => ({ ...prev, [name]: digits }))
      return
    }
    if (name === 'countryCode') {
      // when country changes, re-validate existing phone
      setFormData(prev => ({ ...prev, [name]: value }))
      validatePhone(formData.phone, value)
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleCreateAccount = async () => {
    // Trigger signup via backend. Validate phone formatting to only digits
    setApiError(null)
    setIsSigningUp(true)
    try {
      // Prepare payload for signup. Map the userType (seller/buyer) to role required by backend
      const role = formData.userType || ''
      const payload = {
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        country_code: formData.countryCode || undefined,
        role,
      }
      await apiFetch('/api/auth/signup-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      // On success, allow user to claim username
      setIsClaimingUsername(true)
    } catch (err: any) {
      setApiError(err.message || 'Signup failed')
    } finally {
      setIsSigningUp(false)
    }
  }

  // removed handleVerifyEmail: no separate email verification step

  const handleClaimUsername = async () => {
    // User has typed a username; make API call to set username and then redirect
    if (!username) return
    setApiError(null)
    try {
      await apiFetch('/api/me/username', {
        method: 'PATCH',
        body: JSON.stringify({ username }),
      })
      // After setting username, redirect user based on their selected role
      const roleValue =
        formData.userType === 'buyer' || formData.userType === 'brand'
          ? 'BRAND'
          : formData.userType
          ? 'INFLUENCER'
          : null
      const nextRoute = getRouteForStep(roleValue as any, 1)
      router.push(nextRoute)
    } catch (err: any) {
      setApiError(err.message || 'Unable to save username')
    }
  }


  const passwordsMatch = formData.password === formData.confirmPassword && formData.password.length > 0
  const passwordMatchError = formData.confirmPassword.length > 0 && !passwordsMatch
  
  // Validation checks
  const nameError = touched.name && !formData.name
  const emailError = touched.email && !formData.email
  const passwordRequiredError = touched.password && !formData.password
  const confirmPasswordError = touched.confirmPassword && !formData.confirmPassword
  const phoneError = touched.phone && !formData.phone

  // Effect: when user is on the username claim screen and has entered a valid length
  // username, check availability via backend. Debounced to reduce calls.
  useEffect(() => {
    if (!isClaimingUsername) return
    // Only check for usernames of length >= 6
    if (!username || username.length < 6) {
      setUsernameAvailable(null)
      return
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const data = await apiFetch(`/api/auth/username-check?username=${encodeURIComponent(username)}`, {
          method: 'GET',
        })
        setUsernameAvailable(!!data.available)
      } catch (err) {
        setUsernameAvailable(false)
      } finally {
        setCheckingUsername(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [isClaimingUsername, username])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              promoHubgo
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {!isClaimingUsername ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
              <p className="text-gray-600 mb-6">Join promoHubgo and start collaborating</p>
              {apiError && (
                <p className="text-red-500 text-sm mb-4">{apiError}</p>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur('name')}
                placeholder="John Doe"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  nameError
                    ? 'border-red-500 focus:ring-red-600'
                    : 'border-gray-300 focus:ring-indigo-600'
                }`}
              />
              {nameError && (
                <p className="text-red-500 text-sm mt-1">Full name is required</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => {
                  handleBlur('email')
                  validateEmail(formData.email)
                }}
                placeholder="you@gmail.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-red-500 focus:ring-red-600'
                    : 'border-gray-300 focus:ring-indigo-600'
                }`}
              />
              <p className="text-gray-500 text-xs mt-1">Example: you@gmail.com or you@domain.com</p>
              {emailError && (
                <p className="text-red-500 text-sm mt-1">Email is required</p>
              )}
              {emailValidationError && (
                <p className="text-red-500 text-sm mt-1">{emailValidationError}</p>
              )}
            </div>

            {/* Phone with country code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
              <div className="flex gap-2">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="+91">India (+91)</option>
                  <option value="+1">USA (+1)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+61">Australia (+61)</option>
                </select>

                <input
                  type="text"
                  name="phone"
                  value={formatPhoneForCountry(formData.countryCode, formData.phone)}
                  onChange={handleChange}
                  onBlur={() => {
                    handleBlur('phone')
                    validatePhone(formData.phone, formData.countryCode)
                  }}
                  placeholder={formData.countryCode === '+91' ? '123-456-7890' : '123-456-7890'}
                  maxLength={formData.countryCode === '+91' ? 12 : 20}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    phoneError || phoneValidationError
                      ? 'border-red-500 focus:ring-red-600'
                      : 'border-gray-300 focus:ring-indigo-600'
                  }`}
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">Include country code from the selector. For India enter 10 digits.</p>
              {phoneError && (
                <p className="text-red-500 text-sm mt-1">Phone number is required</p>
              )}
              {phoneValidationError && (
                <p className="text-red-500 text-sm mt-1">{phoneValidationError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">-- Select option --</option>
                <option value="buyer">Brand (Looking for Influencers)</option>
                <option value="seller">Influencer (Offering Services)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 pr-10 ${
                    passwordRequiredError || passwordValidationError
                      ? 'border-red-500 focus:ring-red-600'
                      : 'border-gray-300 focus:ring-indigo-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordRequiredError && (
                <p className="text-red-500 text-sm mt-1">Password is required</p>
              )}
              {passwordValidationError && (
                <p className="text-red-500 text-sm mt-1">{passwordValidationError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 pr-10 ${
                    confirmPasswordError || passwordMatchError
                      ? 'border-red-500 focus:ring-red-600'
                      : 'border-gray-300 focus:ring-indigo-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-red-500 text-sm mt-1">Confirm password is required</p>
              )}
              {passwordMatchError && (
                <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded border-gray-300 cursor-pointer" 
              />
              <label className="ml-2 text-sm text-gray-600 cursor-pointer">
                I agree to the{' '}
                <Link href="#" className="text-indigo-600 hover:text-indigo-700">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-indigo-600 hover:text-indigo-700">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isSigningUp ||
                !passwordsMatch ||
                !formData.name ||
                !formData.email ||
                !formData.phone ||
                !formData.userType ||
                !!phoneValidationError ||
                !!emailValidationError ||
                !termsAccepted
              }
              onClick={handleCreateAccount}
            >
              {isSigningUp ? 'Creating Account...' : 'Create Account'}
            </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                </div>
              </div>

              {/* OAuth */}
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#1f2937"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#1f2937"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#1f2937"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#1f2937"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              </svg>
              Google
              </button>

              {/* Footer */}
              <p className="text-center text-gray-600 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          ) : isClaimingUsername ? (
            <>
              {/* Back Button */}
              <button 
                onClick={() => setIsClaimingUsername(false)}
                className="block md:hidden mb-8 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Personalized Greeting */}
              <p className="text-gray-600 text-lg mb-6">Hi, {formData.name} 👋</p>

              {/* Reserve Profile Link Screen */}
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Reserve Your Profile Link</h1>
              <p className="text-gray-600 text-lg mb-10 leading-relaxed">
                Choose a unique handle to create your personal shareable link. Anyone with this link can view your profile instantly.
              </p>

              {/* Your public handle label */}
              <div className="mb-4">
                <p className="text-gray-900 font-semibold text-sm">Your public handle</p>
              </div>

              {/* Username Input */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center border border-gray-300 rounded-2xl overflow-hidden bg-white px-0">
                  <span className="px-6 py-4 text-gray-600 font-medium text-lg">yourapp.com/</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                      setUsername(val)
                      validateUsername(val)
                    }}
                    onBlur={() => validateUsername(username)}
                    placeholder="your_name"
                    className="flex-1 py-4 outline-none bg-transparent text-gray-900 placeholder-gray-400 text-lg pr-4"
                  />
                </div>

                {/* Helper Text */}
                <p className="text-gray-600 text-sm">
                  Use only letters, numbers, and underscores. You can&apos;t change this later.
                </p>
                {usernameValidationError && (
                  <p className="text-red-500 text-sm mt-1">{usernameValidationError}</p>
                )}

                {/* Availability Indicator */}
                {username && username.length >= 6 && !usernameValidationError && (
                  <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-500'}`}>
                    {checkingUsername
                      ? 'Checking availability...'
                      : usernameAvailable
                      ? 'Handle is available'
                      : 'Handle is already taken'}
                  </p>
                )}

                {/* Live preview */}
                {username.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-6">
                    <p className="text-gray-600 text-sm mb-1">Profile link preview:</p>
                    <p className="text-gray-900 font-medium text-base">yourapp.com/<span className="font-semibold">{username}</span></p>
                  </div>
                )}
              </div>

              {/* Lock in my handle Button */}
              <Button
                onClick={handleClaimUsername}
                disabled={
                  username.length < 6 ||
                  !!usernameValidationError ||
                  usernameAvailable === false ||
                  checkingUsername
                }
                className="w-full py-4 bg-gray-900 text-white font-semibold text-lg rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Lock in my handle
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
