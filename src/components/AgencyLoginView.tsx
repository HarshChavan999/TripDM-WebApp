import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthInstance, getDbInstance } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { 
  Building2, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  UserPlus, 
  X,
  Store,
  ShieldAlert
} from 'lucide-react';

interface AgencyLoginViewProps {
  pendingApproval?: boolean;
  pendingEmail?: string;
}

export default function AgencyLoginView({ pendingApproval = false, pendingEmail = '' }: AgencyLoginViewProps) {
  const { signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register Fields
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [businessLocation, setBusinessLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [operatingFromHome, setOperatingFromHome] = useState(false);
  const [operatingFromOffice, setOperatingFromOffice] = useState(false);
  const [officeAddress, setOfficeAddress] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  
  // Files
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredCompany, setRegisteredCompany] = useState('');

  // Not Registered Modal State (When Google or Email account is not an agency)
  const [showNotRegisteredModal, setShowNotRegisteredModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('agency_not_reg_modal') === 'true';
    }
    return false;
  });
  const [notRegisteredEmail, setNotRegisteredEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('agency_not_reg_email') || '';
    }
    return '';
  });
  const [notRegisteredName, setNotRegisteredName] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('agency_not_reg_name') || '';
    }
    return '';
  });

  // Pending Approval Modal State
  const [showPendingModal, setShowPendingModal] = useState(pendingApproval);
  const [pendingModalEmail, setPendingModalEmail] = useState(pendingEmail);

  useEffect(() => {
    if (pendingApproval) {
      setShowPendingModal(true);
      if (pendingEmail) setPendingModalEmail(pendingEmail);
    }
  }, [pendingApproval, pendingEmail]);

  const closeNotRegisteredModal = (goToRegister = false) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('agency_not_reg_modal');
      sessionStorage.removeItem('agency_not_reg_email');
      sessionStorage.removeItem('agency_not_reg_name');
    }
    setShowNotRegisteredModal(false);
    if (goToRegister) {
      setActiveTab('signup');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (signIn) {
        await signIn(email, password);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Login failed';
      const lower = errMsg.toLowerCase();
      if (lower.includes('pending approval')) {
        setPendingModalEmail(email);
        setShowPendingModal(true);
      } else if (
        lower.includes('no account found') ||
        lower.includes('does not exist') ||
        lower.includes('removed by admin') ||
        lower.includes('user-not-found')
      ) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('agency_not_reg_modal', 'true');
          sessionStorage.setItem('agency_not_reg_email', email);
        }
        setNotRegisteredEmail(email);
        setShowNotRegisteredModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!declarationChecked) {
      setError('Please accept the declaration to proceed with registration.');
      return;
    }

    if (!phone || !businessLocation || !fullAddress || !agencyDescription || !refundPolicy) {
      setError('Please fill in all required fields.');
      return;
    }

    if (operatingFromOffice && !officeAddress) {
      setError('Please provide office address when operating from office.');
      return;
    }

    setLoading(true);
    try {
      let uploadedLogoUrl = '';
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('category', 'logos');
        formData.append('userId', 'temp_' + Date.now());
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedLogoUrl = uploadData.url || '';
        }
      }

      const agencyData = {
        name: contactPersonName,
        companyName,
        phone: `${countryCode} ${phone}`,
        contactNumber: `${countryCode} ${phone}`,
        businessLocation,
        fullAddress,
        agencyDescription,
        refundPolicy,
        operatingFromHome,
        operatingFromOffice,
        officeAddress: operatingFromOffice ? officeAddress : '',
      };

      const submittedEmail = email.toLowerCase().trim();
      const submittedCompany = companyName;

      const res = await fetch('/api/auth/register-agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: submittedEmail,
          password,
          agencyData,
          logoUrl: uploadedLogoUrl || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error || 'Registration failed. Please try again.');
      }

      setRegisteredEmail(submittedEmail);
      setRegisteredCompany(submittedCompany);
      setShowSuccessModal(true);

      // Clear input fields
      setCompanyName('');
      setContactPersonName('');
      setPhone('');
      setBusinessLocation('');
      setFullAddress('');
      setAgencyDescription('');
      setRefundPolicy('');
      setOfficeAddress('');
      setOperatingFromHome(false);
      setOperatingFromOffice(false);
      setPassword('');
      setConfirmPassword('');
      setLogoFile(null);
      setDeclarationChecked(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      const authInstance = getAuthInstance();
      const dbInstance = getDbInstance();

      if (!authInstance || !dbInstance) {
        throw new Error('Authentication services are currently initializing. Please try again in a moment.');
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Open Google Sign-In popup
      const userCredential = await signInWithPopup(authInstance, provider);
      const googleUser = userCredential.user;
      const gEmail = (googleUser.email || '').toLowerCase().trim();
      const gName = googleUser.displayName || '';

      // Check Firestore users collection to see if this account is registered as an agency
      let agencyDocData: any = null;
      let agencyDocId: string | null = null;

      // 1. Check direct UID doc
      const directDocRef = doc(dbInstance, 'users', googleUser.uid);
      const directDocSnap = await getDoc(directDocRef);

      if (directDocSnap.exists()) {
        agencyDocData = directDocSnap.data();
        agencyDocId = directDocSnap.id;
      } else {
        // 2. Query by email or authEmail in case of different UID
        const q1 = query(collection(dbInstance, 'users'), where('email', '==', gEmail));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          agencyDocData = snap1.docs[0].data();
          agencyDocId = snap1.docs[0].id;
        } else {
          const q2 = query(collection(dbInstance, 'users'), where('authEmail', '==', gEmail));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            agencyDocData = snap2.docs[0].data();
            agencyDocId = snap2.docs[0].id;
          }
        }
      }

      const isAgency = agencyDocData && (agencyDocData.role === 'agency' || agencyDocData.role === 'admin');

      // CASE A: User is NOT registered as an agency
      if (!isAgency) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('agency_not_reg_modal', 'true');
          sessionStorage.setItem('agency_not_reg_email', gEmail);
          sessionStorage.setItem('agency_not_reg_name', gName);
        }

        setNotRegisteredEmail(gEmail);
        setNotRegisteredName(gName);

        // Pre-fill fields for registration
        setEmail(gEmail);
        if (gName && !contactPersonName) {
          setContactPersonName(gName);
        }

        setShowNotRegisteredModal(true);
        setLoading(false);

        // Sign out immediately so they don't linger in auth state
        await firebaseSignOut(authInstance).catch(() => {});
        return;
      }

      // CASE B: User is registered as an agency, but is PENDING ADMIN APPROVAL
      if (agencyDocData.role === 'agency' && !agencyDocData.approved) {
        // Sign out immediately
        await firebaseSignOut(authInstance).catch(() => {});

        setPendingModalEmail(gEmail || agencyDocData.email || '');
        setShowPendingModal(true);
        setLoading(false);
        return;
      }

      // CASE C: User is an APPROVED agency or Admin
      if (agencyDocId) {
        await updateDoc(doc(dbInstance, 'users', agencyDocId), {
          isOnline: true,
          authEmail: gEmail,
        }).catch(() => {});
      }

      // Successful login! AuthContext listener will update state and open dashboard
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed popup, do nothing
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:flex lg:h-screen lg:overflow-hidden">
      {/* Left side - Hero Image Banner */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black overflow-hidden h-full">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80" 
          alt="Travel" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center p-12 text-white">
          <img 
            src="/tripdm-logo.png" 
            alt="TripDM" 
            className="h-24 sm:h-28 w-auto object-contain mb-8 self-center drop-shadow-md" 
          />
          <h1 className="text-5xl font-bold mb-6 leading-tight">Grow Your Travel Business</h1>
          <p className="text-xl opacity-90 max-w-lg leading-relaxed">Join thousands of agencies connecting directly with travelers to provide unforgettable experiences.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col py-12 px-6 sm:px-12 xl:px-20 lg:h-screen lg:overflow-y-scroll">
        <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center lg:text-left mb-8">
            <div className="lg:hidden flex justify-center mb-6">
               <img src="/tripdm-logo.png" alt="TripDM" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 text-orange-500">
              <Building2 className="h-8 w-8" />
              <h2 className="text-3xl font-bold text-gray-900">Agency Portal</h2>
            </div>
            <p className="text-gray-500 mt-2">Sign in or register to manage your listings and bookings</p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'login' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'signup' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Register Agency
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 rounded-sm border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-sm transition-all shadow-sm mt-6 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Please wait...' : 'Login & Continue'}
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-sm px-4 py-3.5 hover:bg-gray-50 transition-all font-semibold text-gray-700 cursor-pointer disabled:opacity-50"
              >
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">G</div>
                Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agency Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    placeholder="e.g. Acme Tours & Travels"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    placeholder="agency@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                  <div className="flex gap-2">
                    <select 
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-20 border border-gray-200 rounded-sm px-2 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-white"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 min-w-0"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Location (City/State) *</label>
                <input
                  type="text"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  placeholder="e.g. Mumbai, Maharashtra"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Business Address *</label>
                <textarea
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  placeholder="Complete office or business address"
                  required
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">Operating Setup</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={operatingFromHome}
                      onChange={(e) => setOperatingFromHome(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 cursor-pointer" 
                    />
                    <span className="text-sm text-gray-700">Operating from Home</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={operatingFromOffice}
                      onChange={(e) => setOperatingFromOffice(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 cursor-pointer" 
                    />
                    <span className="text-sm text-gray-700">Operating from Office</span>
                  </label>
                </div>
                {operatingFromOffice && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Address *</label>
                    <textarea
                      value={officeAddress}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                      placeholder="Detailed physical office address"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Description *</label>
                <textarea
                  value={agencyDescription}
                  onChange={(e) => setAgencyDescription(e.target.value)}
                  placeholder="Tell us about your agency, your specialties, and travel experience..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Refund Policy *</label>
                <textarea
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  placeholder="State your general refund and cancellation terms..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Logo (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-sm p-4 text-center hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLogoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-orange-500">Click to upload logo</span>
                    <span className="text-xs text-gray-500 mt-1">{logoFile ? logoFile.name : 'PNG, JPG up to 5MB'}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-sm border border-orange-200 mt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-orange-500 rounded border-orange-300 focus:ring-orange-500 cursor-pointer" 
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    I declare that all information provided is true and accurate. I understand that my agency account will be pending approval from the admin before I can start listing packages. I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-sm transition-all shadow-sm mt-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Submitting Registration...' : 'Submit Agency Registration'}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* MODAL 1: "NOT REGISTERED AS AGENCY" RECTANGULAR ENTERPRISE MODAL */}
      {showNotRegisteredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-none sm:rounded-sm max-w-lg w-full shadow-2xl border border-gray-300 overflow-hidden text-left relative">
            
            {/* Top Close Button */}
            <button 
              type="button"
              onClick={() => closeNotRegisteredModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Centered TripDM Logo (No Black Background) */}
              <div className="text-center pt-2">
                <img 
                  src="/tripdm-logo.png" 
                  alt="TripDM" 
                  className="h-16 sm:h-20 w-auto object-contain mx-auto mb-4 drop-shadow-sm" 
                />
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Agency Account Not Found
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  The Google account <strong className="text-gray-900">{notRegisteredEmail || 'you selected'}</strong> is not registered as an agency partner yet.
                </p>
              </div>

              {/* Application Details Summary (Rectangular Table) */}
              <div className="bg-gray-50 border border-gray-200 p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Selected Account:</span>
                  <span className="font-semibold text-gray-900">{notRegisteredEmail || 'Google Account'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Account Status:</span>
                  <span className="font-bold text-amber-600 uppercase tracking-wide text-[11px]">Unregistered Agency</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Portal Access:</span>
                  <span className="font-semibold text-gray-800">Registration Required</span>
                </div>
              </div>

              {/* Verification Steps (Clean Rectangular List) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 border-b border-gray-200 pb-1.5">
                  How to Join TripDM Partner Network
                </h4>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Complete Registration:</strong> Fill in your agency details, location, and operating setup.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Admin Approval:</strong> Our platform administrators verify and approve your agency profile.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Publish Packages:</strong> Log in anytime to list itineraries, manage inquiries, and chat directly with travelers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeNotRegisteredModal(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-none sm:rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Fill Agency Registration Form</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => closeNotRegisteredModal(false)}
                  className="w-full py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer text-center"
                >
                  Back to Login
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: "REGISTRATION PENDING APPROVAL" RECTANGULAR ENTERPRISE MODAL */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-none sm:rounded-sm max-w-lg w-full shadow-2xl border border-gray-300 overflow-hidden text-left relative">
            
            {/* Top Close Button */}
            <button 
              type="button"
              onClick={() => setShowPendingModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Centered TripDM Logo (No Black Background) */}
              <div className="text-center pt-2">
                <img 
                  src="/tripdm-logo.png" 
                  alt="TripDM" 
                  className="h-16 sm:h-20 w-auto object-contain mx-auto mb-4 drop-shadow-sm" 
                />
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Application Under Review
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your agency registration is currently being verified by our platform administrators.
                </p>
              </div>

              {/* Application Details Summary (Rectangular Table) */}
              <div className="bg-gray-50 border border-gray-200 p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Registered Email:</span>
                  <span className="font-semibold text-gray-900">{pendingModalEmail}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Current Status:</span>
                  <span className="font-bold text-amber-600 uppercase tracking-wide text-[11px]">Pending Approval</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Estimated Review Time:</span>
                  <span className="font-medium text-gray-700">2–4 Business Hours</span>
                </div>
              </div>

              {/* Verification Steps (Clean Rectangular List) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 border-b border-gray-200 pb-1.5">
                  Approval & Activation Status
                </h4>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Admin Review in Progress:</strong> We are validating your agency documentation and business profile.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Official Approval Email:</strong> You will receive a confirmation email at <span className="text-gray-900 font-semibold">{pendingModalEmail}</span> once approved.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Instant Access:</strong> After approval, log in immediately to list packages and start connecting with travelers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-6 rounded-none sm:rounded-sm shadow-sm transition-all cursor-pointer text-sm"
                >
                  Understood
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: "REGISTRATION SUCCESSFUL" RECTANGULAR ENTERPRISE MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-none sm:rounded-sm max-w-lg w-full shadow-2xl border border-gray-300 overflow-hidden text-left relative">
            
            {/* Top Close Button */}
            <button 
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                setActiveTab('login');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Centered TripDM Logo (No Black Background) */}
              <div className="text-center pt-2">
                <img 
                  src="/tripdm-logo.png" 
                  alt="TripDM" 
                  className="h-16 sm:h-20 w-auto object-contain mx-auto mb-4 drop-shadow-sm" 
                />
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Registration Successful
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Thank you for applying to join the TripDM Partner Network, <strong className="text-gray-900">{registeredCompany || 'Partner'}</strong>.
                </p>
              </div>

              {/* Application Details Summary (Rectangular Table) */}
              <div className="bg-gray-50 border border-gray-200 p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Agency Company:</span>
                  <span className="font-bold text-gray-900">{registeredCompany || 'Travel Agency'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Registered Email:</span>
                  <span className="font-semibold text-gray-900">{registeredEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Application Status:</span>
                  <span className="font-bold text-amber-600 uppercase tracking-wide text-[11px]">Under Admin Review</span>
                </div>
              </div>

              {/* Verification Steps (Clean Rectangular List) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 border-b border-gray-200 pb-1.5">
                  Next Steps & Verification
                </h4>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Admin Verification:</strong> Our platform administrators are currently reviewing your agency details and credentials.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Official Approval Email:</strong> You will receive an official approval email at <span className="text-gray-900 font-semibold">{registeredEmail}</span> once approved.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-none bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div className="flex-1">
                      <strong className="text-gray-900">Access Dashboard:</strong> Once approved, you can log in immediately to publish travel packages and chat directly with travelers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button (Solid Rectangular CTA) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setActiveTab('login');
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-none sm:rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
