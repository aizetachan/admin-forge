import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, updateDoc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { Github, Loader2, LogOut, Check, X, Key, MoreHorizontal, Trash2, ShieldOff, XCircle, Shield, Fingerprint, Calendar, Database, Pencil, Save, Link2, Settings, Zap, Users as UsersIcon, Copy, Layout } from 'lucide-react';
import LandingTab from './LandingTab';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Master admin email — the account that gets auto-provisioned as master_admin
const MASTER_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'santiago.fernandez@nakamateam.com';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing App...');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState<'users' | 'plans' | 'landing'>('users');
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [plansEdit, setPlansEdit] = useState<Record<string, any> | null>(null);
  const [savingPlans, setSavingPlans] = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'master_admin') {
      const q = collection(db, 'users');
      const unsubscribeUsers = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort: pending first, then by creation date
        usersData.sort((a: any, b: any) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        setUsers(usersData);
      });
      return () => unsubscribeUsers();
    }
  }, [profile?.role]);

  // Listen to /plans collection
  useEffect(() => {
    if (profile?.role === 'master_admin') {
      const plansRef = collection(db, 'plans');
      const unsub = onSnapshot(plansRef, (snapshot) => {
        const data: Record<string, any> = {};
        snapshot.docs.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
        setPlans(data);
      });
      return () => unsub();
    }
  }, [profile?.role]);



  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      // Clean up any previous profile listener before setting up a new one
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(currUser);
      if (currUser) {
        setLoadingText('Fetching Master Profile...');
        const userEmail = currUser.email || currUser.providerData?.[0]?.email || null;
        console.log('[AdminForge] Auth detected, UID:', currUser.uid, 'Email:', userEmail);

        let q;
        if (userEmail) {
          // ALWAYS search by email first to consolidate identity across OAuth providers
          q = query(collection(db, 'users'), where('email', '==', userEmail));
        } else {
          // Fall back to querying by UID if no email is available
          q = query(collection(db, 'users'), where('uid', '==', currUser.uid));
        }

        unsubscribeProfile = onSnapshot(q, async (querySnapshot) => {
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            console.log('[AdminForge] Profile loaded:', { role: data.role, status: data.status, id: userDoc.id });
            setProfile(data);
            setLoading(false);

            // If it's the master email but doesn't have the role, promote it automatically
            if (userEmail === MASTER_EMAIL && data.role !== 'master_admin') {
              console.log('[AdminForge] Promoting existing consolidated profile to master_admin');
              await updateDoc(doc(db, 'users', userDoc.id), { role: 'master_admin' });
            }
          } else {
            // No profile document found — auto-provision if master email
            if (userEmail === MASTER_EMAIL) {
              console.log('[AdminForge] Master email detected with no profile. Auto-creating master_admin document...');
              try {
                await setDoc(doc(db, 'users', currUser.uid), {
                  uid: currUser.uid,
                  email: userEmail,
                  name: 'Master Admin',
                  role: 'master_admin',
                  status: 'approved',
                  authProvider: 'google',
                  createdAt: serverTimestamp(),
                  lastLoginAt: serverTimestamp()
                });
                console.log('[AdminForge] master_admin document created. onSnapshot will fire again.');
                // Don't set loading=false here — onSnapshot will fire again with the new doc
              } catch (writeErr: any) {
                console.error('[AdminForge] Failed to auto-create master profile:', writeErr);
                setError('Failed to create master profile: ' + writeErr.message);
                setLoading(false);
              }
            } else {
              console.warn('[AdminForge] No profile document found for email/uid:', userEmail || currUser.uid);
              setProfile(null);
              setLoading(false);
            }
          }
        }, (err) => {
          console.error('[AdminForge] Firestore Profile Listener Error:', err.code, err.message);
          setError('Profile load failed: ' + err.message);
          setProfile(null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setLoadingText('Authenticating Credentials...');
    setError('');

    // Safety timeout to prevent infinite hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please check your browser extensions or network.");
    }, 15000);

    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setLoadingText('Login successful. Waiting for profile...');
      } catch (err: any) {
        // If user doesn't exist AND it's the master email, create it
        if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && email === 'santiago.fernandez@nakamateam.com') {
          setLoadingText('Creating Master Account...');
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          setLoadingText('Saving Profile to Firestore...');
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            email,
            name: 'Master Admin',
            role: 'master_admin',
            status: 'approved',
            authProvider: 'password',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
          setLoadingText('Profile saved. Waiting for sync...');
        } else {
          throw err;
        }
      }

      // If login succeeded, we should ensure the loader turns off gracefully 
      // in case onAuthStateChanged was already fired.
      setTimeout(() => setLoading(false), 3000);

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Invalid credentials');
      setLoading(false);
    } finally {
      clearTimeout(safetyTimer);
    }
  };

  const handleLogin = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError('');
    try {
      const authProvider = provider === 'github' ? new GithubAuthProvider() : new GoogleAuthProvider();
      await signInWithPopup(auth, authProvider);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to authenticate');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleUpdateUserStatus = async (uid: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (err) {
      console.error("Failed to update user status", err);
    }
  };

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'user' | 'guest') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.error("Failed to update user role", err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this user and ALL their data? This action cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setMenuOpenId(null);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Failed to delete user. Check console for details.');
    }
  };

  const formatTimestamp = (ts: Timestamp | any) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString();
  };

  const startEditing = (u: any) => {
    setEditMode(true);
    setPlanDropdownOpen(false);
    setEditData({
      name: u.name || '',
      email: u.email || '',
      company: u.company || '',
      role: u.role || 'user',
      status: u.status || 'pending',
      plan: u.plan || 'free',
    });
  };

  const cancelEditing = () => {
    setEditMode(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setSavingEdit(true);
    try {
      const updates: Record<string, any> = {};
      if (editData.name !== (selectedUser.name || '')) updates.name = editData.name;
      if (editData.email !== (selectedUser.email || '')) updates.email = editData.email;
      if (editData.company !== (selectedUser.company || '')) updates.company = editData.company;
      if (editData.role !== (selectedUser.role || 'user')) updates.role = editData.role;
      if (editData.status !== (selectedUser.status || 'pending')) updates.status = editData.status;
      if (editData.plan && editData.plan !== (selectedUser.plan || 'free')) updates.plan = editData.plan;
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', selectedUser.id), updates);
      }
      setEditMode(false);
      setEditData({});
    } catch (err) {
      console.error('Failed to save user edits', err);
      alert('Failed to save changes. Check console for details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Plans management ──
  const FEATURE_LABELS: Record<string, string> = {
    repos: 'Repos conectados',
    componentsPerRepo: 'Componentes / repo',
    aiMessages: 'AI mensajes / mes',
    aiGenerations: 'AI generaciones / mes',
    exportCode: 'Exportar código',
    teamMembers: 'Miembros de equipo',
    prioritySupport: 'Soporte prioritario',
  };

  const CAPABILITY_LABELS: Record<string, string> = {
    visualEditor: 'Editor visual',
    aiChat: 'AI Chat',
    aiGeneration: 'Generación AI',
    exportCode: 'Exportar código',
    gitSync: 'Git Sync',
    teamCollab: 'Colaboración equipo',
    customTokens: 'Design Tokens',
    advancedInspect: 'Inspector avanzado',
  };

  const PLAN_ORDER = ['free', 'pro', 'team', 'enterprise'];

  const DEFAULT_PLANS: Record<string, any> = {
    free: { name: 'Free', tier: 1, priceMonthly: 0, priceYearly: 0, stripePriceIdMonthly: null, stripePriceIdYearly: null, trialDays: 0, features: { repos: { enabled: true, limit: 1 }, componentsPerRepo: { enabled: true, limit: 20 }, aiMessages: { enabled: false, limit: 0 }, aiGenerations: { enabled: false, limit: 0 }, exportCode: { enabled: true, limit: 99999999 }, teamMembers: { enabled: true, limit: 1 }, prioritySupport: { enabled: false, limit: 0 } }, capabilities: { visualEditor: true, aiChat: false, aiGeneration: false, exportCode: true, gitSync: true, teamCollab: false, customTokens: true, advancedInspect: false } },
    pro: { name: 'Pro', tier: 2, priceMonthly: 1200, priceYearly: 11500, stripeProductId: 'prod_U2BH4X9kkP5KQm', stripePriceIdMonthly: 'price_1T46vOKUOwQDnK7n9rc9uNdg', stripePriceIdYearly: 'price_1T46vOKUOwQDnK7nncvzzs8N', trialDays: 7, features: { repos: { enabled: true, limit: 5 }, componentsPerRepo: { enabled: true, limit: 99999999 }, aiMessages: { enabled: true, limit: 200 }, aiGenerations: { enabled: true, limit: 50 }, exportCode: { enabled: true, limit: 99999999 }, teamMembers: { enabled: true, limit: 1 }, prioritySupport: { enabled: false, limit: 0 } }, capabilities: { visualEditor: true, aiChat: true, aiGeneration: true, exportCode: true, gitSync: true, teamCollab: false, customTokens: true, advancedInspect: false } },
    team: { name: 'Ultra', tier: 3, priceMonthly: 2900, priceYearly: 27800, stripeProductId: 'prod_U2BHNMJN46z46g', stripePriceIdMonthly: 'price_1T46vOKUOwQDnK7nkG1nrIk6', stripePriceIdYearly: 'price_1T46vPKUOwQDnK7nZvxZMlxR', trialDays: 0, features: { repos: { enabled: true, limit: 99999999 }, componentsPerRepo: { enabled: true, limit: 99999999 }, aiMessages: { enabled: true, limit: 1000 }, aiGenerations: { enabled: true, limit: 200 }, exportCode: { enabled: true, limit: 99999999 }, teamMembers: { enabled: true, limit: 10 }, prioritySupport: { enabled: true, limit: 99999999 } }, capabilities: { visualEditor: true, aiChat: true, aiGeneration: true, exportCode: true, gitSync: true, teamCollab: true, customTokens: true, advancedInspect: true } },
    enterprise: { name: 'Enterprise', tier: 4, priceMonthly: 0, priceYearly: 0, stripePriceIdMonthly: null, stripePriceIdYearly: null, trialDays: 0, features: { repos: { enabled: true, limit: 99999999 }, componentsPerRepo: { enabled: true, limit: 99999999 }, aiMessages: { enabled: true, limit: 99999999 }, aiGenerations: { enabled: true, limit: 99999999 }, exportCode: { enabled: true, limit: 99999999 }, teamMembers: { enabled: true, limit: 99999999 }, prioritySupport: { enabled: true, limit: 99999999 } }, capabilities: { visualEditor: true, aiChat: true, aiGeneration: true, exportCode: true, gitSync: true, teamCollab: true, customTokens: true, advancedInspect: true } },
  };

  const seedPlans = async () => {
    setSavingPlans(true);
    try {
      for (const [id, data] of Object.entries(DEFAULT_PLANS)) {
        await setDoc(doc(db, 'plans', id), data);
      }
    } catch (err) {
      console.error('Failed to seed plans', err);
      alert('Failed to seed plans. Check console.');
    } finally {
      setSavingPlans(false);
    }
  };

  const startEditingPlans = () => {
    // Deep clone plans for editing
    setPlansEdit(JSON.parse(JSON.stringify(plans)));
  };

  const cancelEditingPlans = () => {
    setPlansEdit(null);
  };

  const savePlans = async () => {
    if (!plansEdit) return;
    setSavingPlans(true);
    try {
      for (const [id, data] of Object.entries(plansEdit)) {
        const { id: _, ...rest } = data;
        await setDoc(doc(db, 'plans', id), rest);
      }
      setPlansEdit(null);
    } catch (err) {
      console.error('Failed to save plans', err);
      alert('Failed to save plans. Check console.');
    } finally {
      setSavingPlans(false);
    }
  };

  const updatePlanFeature = (planId: string, featureKey: string, field: 'enabled' | 'limit', value: any) => {
    if (!plansEdit) return;
    setPlansEdit(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[planId] = { ...updated[planId] };
      updated[planId].features = { ...updated[planId].features };
      updated[planId].features[featureKey] = { ...updated[planId].features[featureKey], [field]: value };
      return updated;
    });
  };

  const updatePlanCapability = (planId: string, capKey: string, value: boolean) => {
    if (!plansEdit) return;
    setPlansEdit(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[planId] = { ...updated[planId] };
      updated[planId].capabilities = { ...updated[planId].capabilities, [capKey]: value };
      return updated;
    });
  };

  const formatLimit = (n: number) => n >= 99999999 ? '∞' : n.toLocaleString();

  const PLAN_DISPLAY_NAMES: Record<string, string> = { free: 'Free', pro: 'Pro', team: 'Ultra', enterprise: 'Enterprise' };
  const displayPlanName = (planId: string) => PLAN_DISPLAY_NAMES[planId] || plans[planId]?.name || planId;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-400 text-xs font-mono">{loadingText}</p>
      </div>
    );
  }

  // If completely unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M77.7041 15.4326C79.9132 15.4326 81.7041 17.2235 81.7041 19.4326V26.5176C81.7039 37.4554 73.3073 46.4294 62.6084 47.3516C61.6462 56.9437 53.5497 64.4326 43.7041 64.4326H38.6455C37.8806 74.2247 29.6926 81.9326 19.7041 81.9326H17.7041C16.6685 81.9326 15.8172 81.1453 15.7148 80.1367L15.7041 79.9326C15.7041 79.7996 15.7063 79.6666 15.709 79.5342C15.7073 79.5005 15.7041 79.4667 15.7041 79.4326V37.4326C15.7041 25.2824 25.5538 15.4326 37.7041 15.4326H77.7041ZM34.6279 64.4434C27.0068 64.7219 20.7898 70.5022 19.832 77.9307L20.0908 77.9277C27.6894 77.7354 33.8828 71.8921 34.6279 64.4434ZM37.7041 47.4326C27.763 47.4326 19.7041 55.4915 19.7041 65.4326V68.1006C23.2674 63.4397 28.8841 60.4326 35.2041 60.4326H43.7041C51.3101 60.4326 57.5934 54.7712 58.5713 47.4326H37.7041ZM37.7041 19.4326C27.763 19.4326 19.7041 27.4915 19.7041 37.4326V52.7812C23.6855 47.1269 30.2631 43.4326 37.7041 43.4326H60.7041C60.7181 43.4326 60.7321 43.4343 60.7461 43.4346C60.7604 43.4343 60.7747 43.4326 60.7891 43.4326C70.1308 43.4325 77.7039 35.8593 77.7041 26.5176V19.4326H37.7041Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-zinc-400 text-center text-sm mb-6">Sign in with an authorized Master Admin account to manage UI Forge.</p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 text-xs px-3 py-2 rounded mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="w-full space-y-4 mb-6">
            <div>
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2.5 rounded focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2.5 rounded focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded transition-colors"
            >
              <Key className="w-4 h-4" />
              Login with Email
            </button>
          </form>

          <div className="w-full relative flex items-center justify-center mb-6">
            <div className="w-full h-px bg-zinc-800 absolute top-1/2 left-0 -translate-y-1/2"></div>
            <span className="bg-zinc-900 px-3 text-xs text-zinc-500 relative z-10">OR</span>
          </div>

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={() => handleLogin('google')}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-zinc-900 font-medium py-2.5 px-4 rounded transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleLogin('github')}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 px-4 rounded transition-colors"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access Guard
  if (!profile || profile?.role !== 'master_admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">
            This portal is restricted to Master Administrators.{' '}
            {profile ? <>Your current role is <strong>{profile.role || 'unknown'}</strong>.</> : <>No profile found for UID: <code className="text-xs text-zinc-500">{user?.uid}</code></>}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-white" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M77.7041 15.4326C79.9132 15.4326 81.7041 17.2235 81.7041 19.4326V26.5176C81.7039 37.4554 73.3073 46.4294 62.6084 47.3516C61.6462 56.9437 53.5497 64.4326 43.7041 64.4326H38.6455C37.8806 74.2247 29.6926 81.9326 19.7041 81.9326H17.7041C16.6685 81.9326 15.8172 81.1453 15.7148 80.1367L15.7041 79.9326C15.7041 79.7996 15.7063 79.6666 15.709 79.5342C15.7073 79.5005 15.7041 79.4667 15.7041 79.4326V37.4326C15.7041 25.2824 25.5538 15.4326 37.7041 15.4326H77.7041ZM34.6279 64.4434C27.0068 64.7219 20.7898 70.5022 19.832 77.9307L20.0908 77.9277C27.6894 77.7354 33.8828 71.8921 34.6279 64.4434ZM37.7041 47.4326C27.763 47.4326 19.7041 55.4915 19.7041 65.4326V68.1006C23.2674 63.4397 28.8841 60.4326 35.2041 60.4326H43.7041C51.3101 60.4326 57.5934 54.7712 58.5713 47.4326H37.7041ZM37.7041 19.4326C27.763 19.4326 19.7041 27.4915 19.7041 37.4326V52.7812C23.6855 47.1269 30.2631 43.4326 37.7041 43.4326H60.7041C60.7181 43.4326 60.7321 43.4343 60.7461 43.4346C60.7604 43.4343 60.7747 43.4326 60.7891 43.4326C70.1308 43.4325 77.7039 35.8593 77.7041 26.5176V19.4326H37.7041Z" fill="currentColor" />
          </svg>
          <span className="font-bold text-lg tracking-wide">Admin Forge</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={profile?.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-700" />
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{profile?.name}</span>
              <span className="text-[10px] text-green-400 uppercase tracking-wider">{profile?.role}</span>
            </div>
          </div>
          <div className="w-px h-6 bg-zinc-800 mx-2"></div>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-white p-2" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto w-full px-8 flex gap-1">
          <button
            onClick={() => setCurrentPage('users')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentPage === 'users' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <UsersIcon className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setCurrentPage('plans')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentPage === 'plans' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <Zap className="w-4 h-4" /> Plans
          </button>
          <button
            onClick={() => setCurrentPage('landing')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${currentPage === 'landing' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <Layout className="w-4 h-4" /> Landing
          </button>
        </div>
      </div>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {/* ── USERS PAGE ── */}
        {currentPage === 'users' && (
          <>
            <h2 className="text-2xl font-bold mb-6">User Management</h2>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h3 className="font-medium text-zinc-200">Registered Users</h3>
                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full font-mono">{users.length}</span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider bg-zinc-950/30">
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || 'U'}&background=random`} alt="User Avatar" className="w-10 h-10 rounded-full bg-zinc-800" />
                          <div>
                            <p className="font-medium text-white">{u.name || 'Unknown'}</p>
                            <p className="text-xs text-zinc-500">{u.email || <span className="opacity-50 font-mono text-[10px]">uid:{u.uid?.substring(0, 8) || u.id?.substring(0, 8)}</span>}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === 'master_admin' ? (
                          <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-mono">{u.role}</span>
                        ) : (
                          <select
                            value={u.role === 'free' ? 'guest' : (u.role || 'user')}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value as 'admin' | 'user' | 'guest')}
                            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 outline-none focus:border-blue-500"
                          >
                            <option value="guest">guest</option>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.plan && u.plan !== 'free' ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded capitalize">
                                {u.plan}
                              </span>
                              {u.planStatus === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>}
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{u.planPeriod || 'monthly'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 border rounded-md font-medium uppercase ${u.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          u.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                          {u.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 min-h-[33px]">
                          {u.role !== 'master_admin' && u.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="text-green-500 hover:text-white hover:bg-green-600 transition-colors text-xs border border-green-500/30 px-2 py-1.5 rounded-md flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => handleUpdateUserStatus(u.id, 'rejected')} className="text-red-500 hover:text-white hover:bg-red-600 transition-colors text-xs border border-red-500/30 px-2 py-1.5 rounded-md flex items-center gap-1">
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {u.role !== 'master_admin' && u.status === 'approved' && (
                            <button onClick={() => handleUpdateUserStatus(u.id, 'rejected')} className="text-zinc-500 hover:text-red-400 transition-colors text-xs px-2 py-1.5 rounded-md hover:bg-zinc-800">
                              Revoke Access
                            </button>
                          )}
                          {u.role !== 'master_admin' && u.status === 'rejected' && (
                            <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="text-zinc-500 hover:text-green-400 transition-colors text-xs px-2 py-1.5 rounded-md hover:bg-zinc-800">
                              Restore Access
                            </button>
                          )}
                        </div>
                      </td>
                      {/* 3-dot menu column */}
                      <td className="px-2 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {u.role !== 'master_admin' && (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                              className="text-zinc-500 hover:text-white p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                              title="More options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {menuOpenId === u.id && (
                              <>
                                {/* Invisible backdrop to close menu on outside click */}
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/40 py-1 text-left">
                                  {u.status === 'approved' && (
                                    <button
                                      onClick={() => { handleUpdateUserStatus(u.id, 'rejected'); setMenuOpenId(null); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-orange-400 transition-colors"
                                    >
                                      <ShieldOff className="w-3.5 h-3.5" /> Revoke Access
                                    </button>
                                  )}
                                  {u.status === 'rejected' && (
                                    <button
                                      onClick={() => { handleUpdateUserStatus(u.id, 'approved'); setMenuOpenId(null); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-green-400 transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Restore Access
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { handleDeleteUser(u.id); setMenuOpenId(null); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete User
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 text-sm">
                        No users found in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── User Detail Modal ── */}
            {selectedUser && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setSelectedUser(null)}
              >
                <div
                  className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg max-h-[85vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between p-6 pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedUser.avatarUrl || `https://ui-avatars.com/api/?name=${selectedUser.name || 'U'}&background=random&size=128`}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full border-2 border-zinc-700"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedUser.name || 'Unknown'}</h3>
                        <p className="text-sm text-zinc-400">{selectedUser.email || <span className="font-mono text-xs opacity-50">uid:{selectedUser.uid || selectedUser.id}</span>}</p>
                        {/* Plan badge */}
                        <div className="relative mt-1.5">
                          <button
                            onClick={() => { if (editMode) setPlanDropdownOpen(!planDropdownOpen); }}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border transition-all ${(selectedUser.plan || 'free') === 'free' ? 'text-zinc-300 bg-zinc-800 border-zinc-700' :
                              (editData.plan || selectedUser.plan) === 'pro' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                (editData.plan || selectedUser.plan) === 'team' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                  'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              } ${editMode ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}`}
                          >
                            <Zap className="w-2.5 h-2.5" />
                            {displayPlanName(editData.plan || selectedUser.plan || 'free')}
                          </button>
                          {/* Dropdown */}
                          {planDropdownOpen && editMode && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setPlanDropdownOpen(false)} />
                              <div className="absolute left-0 top-full mt-1 z-50 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/40 py-1">
                                {PLAN_ORDER.map(planId => {
                                  const planData = plans[planId];
                                  if (!planData) return null;
                                  const isActive = (editData.plan || selectedUser.plan || 'free') === planId;
                                  return (
                                    <button
                                      key={planId}
                                      onClick={() => {
                                        setEditData(d => ({ ...d, plan: planId }));
                                        setPlanDropdownOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${isActive ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                    >
                                      <span className={`w-2 h-2 rounded-full ${planId === 'free' ? 'bg-zinc-500' :
                                        planId === 'pro' ? 'bg-blue-500' :
                                          planId === 'team' ? 'bg-purple-500' :
                                            'bg-amber-500'
                                        }`} />
                                      {displayPlanName(planId)}
                                      {isActive && <Check className="w-3 h-3 ml-auto text-emerald-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={cancelEditing}
                            className="text-zinc-500 hover:text-white p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-md hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            title="Save changes"
                          >
                            {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(selectedUser)}
                          className="text-zinc-500 hover:text-white p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedUser(null); cancelEditing(); }}
                        className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-5">
                    {/* Status & Role */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Access</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <span className="text-xs text-zinc-400">Role</span>
                          {editMode && selectedUser.role !== 'master_admin' ? (
                            <select
                              value={editData.role === 'free' ? 'guest' : (editData.role || 'user')}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 transition-colors"
                            >
                              <option value="guest">guest</option>
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${selectedUser.role === 'master_admin' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                              selectedUser.role === 'admin' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                'text-zinc-300 bg-zinc-700/50 border-zinc-700'
                              }`}>
                              {selectedUser.role === 'free' ? 'guest' : (selectedUser.role || 'user')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <span className="text-xs text-zinc-400">Status</span>
                          {editMode && selectedUser.role !== 'master_admin' ? (
                            <select
                              value={editData.status}
                              onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 transition-colors"
                            >
                              <option value="pending">pending</option>
                              <option value="approved">approved</option>
                              <option value="rejected">rejected</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border ${selectedUser.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                              selectedUser.status === 'rejected' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                'text-orange-400 bg-orange-500/10 border-orange-500/20'
                              }`}>
                              {selectedUser.status || 'pending'}
                            </span>
                          )}
                        </div>
                        {selectedUser.authProvider && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Auth Provider</span>
                            <span className="text-xs text-white font-medium">{selectedUser.authProvider}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identity */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Fingerprint className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Identity</h3>
                      </div>
                      <div className="space-y-2">
                        {editMode && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Name</span>
                            <input
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 transition-colors w-[220px] text-right"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <span className="text-xs text-zinc-400">UID</span>
                          <span className="text-[11px] text-zinc-300 font-mono truncate max-w-[250px]">{selectedUser.uid || selectedUser.id}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <span className="text-xs text-zinc-400">Email</span>
                          {editMode ? (
                            <input
                              value={editData.email}
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 transition-colors w-[220px] text-right"
                            />
                          ) : (
                            <span className="text-xs text-white font-medium">{selectedUser.email}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <span className="text-xs text-zinc-400">Company</span>
                          {editMode ? (
                            <input
                              value={editData.company}
                              onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                              placeholder="—"
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500 transition-colors w-[220px] text-right placeholder:text-zinc-600"
                            />
                          ) : (
                            <span className="text-xs text-white font-medium">{selectedUser.company || '—'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Activity */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Activity</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedUser.createdAt && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Created</span>
                            <span className="text-xs text-zinc-300">{formatTimestamp(selectedUser.createdAt)}</span>
                          </div>
                        )}
                        {selectedUser.lastLoginAt && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Last Login</span>
                            <span className="text-xs text-zinc-300">{formatTimestamp(selectedUser.lastLoginAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connected Accounts */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Connected Accounts</h3>
                      </div>
                      <div className="space-y-2">
                        {/* Google */}
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <GoogleIcon className="w-4 h-4" />
                            <span className="text-xs text-white font-medium">Google</span>
                          </div>
                          {selectedUser.connectedProviders?.some((p: any) => p.provider === 'google') ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full font-medium">
                              Not connected
                            </span>
                          )}
                        </div>

                        {/* GitHub */}
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <Github className="w-4 h-4 text-zinc-300" />
                            <span className="text-xs text-white font-medium">GitHub</span>
                          </div>
                          {selectedUser.connectedProviders?.some((p: any) => p.provider === 'github') ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full font-medium">
                              Not connected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subscription */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-3.5 h-3.5 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subscription</h3>
                      </div>
                      <div className="space-y-2">
                        {/* Plan Status */}
                        {selectedUser.planStatus && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Status</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${selectedUser.planStatus === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                              selectedUser.planStatus === 'trialing' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                selectedUser.planStatus === 'past_due' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                  'text-zinc-400 bg-zinc-800 border-zinc-700'
                              }`}>
                              {selectedUser.planStatus}
                            </span>
                          </div>
                        )}
                        {/* Plan Period */}
                        {selectedUser.planPeriod && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400">Billing Period</span>
                            <span className="text-[10px] text-zinc-300 font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                              {selectedUser.planPeriod}
                            </span>
                          </div>
                        )}
                        {/* Stripe Subscription ID */}
                        {selectedUser.stripeSubscriptionId && (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                            <span className="text-xs text-zinc-400 shrink-0">Stripe Sub ID</span>
                            <div className="flex items-center gap-2 overflow-hidden ml-4">
                              <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[150px]" title={selectedUser.stripeSubscriptionId}>
                                {selectedUser.stripeSubscriptionId}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(selectedUser.stripeSubscriptionId!);
                                  // Optional: Add a brief flash/toast effect here
                                }}
                                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-700 rounded transition-colors"
                                title="Copy ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Usage */}
                        {selectedUser.usage && Object.keys(plans).length > 0 && (() => {
                          const userPlan = plans[selectedUser.plan || 'free'];
                          if (!userPlan) return null;
                          const usageItems = [
                            { key: 'aiMessages', label: 'AI Messages' },
                            { key: 'aiGenerations', label: 'AI Generations' },
                            { key: 'repos', label: 'Repos' },
                          ];
                          return usageItems.map(({ key, label }) => {
                            const used = selectedUser.usage?.[key] || 0;
                            const limit = selectedUser.featureOverrides?.[key]?.limit ?? userPlan.features?.[key]?.limit ?? 0;
                            if (limit === 0) return null;
                            const pct = limit >= 99999999 ? 0 : Math.min(100, (used / limit) * 100);
                            return (
                              <div key={key} className="px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-zinc-400">{label}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">{used} / {formatLimit(limit)}</span>
                                </div>
                                {limit < 99999999 && (
                                  <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Extra fields (anything not already shown) */}
                    {(() => {
                      const knownKeys = new Set(['id', 'uid', 'email', 'name', 'role', 'status', 'avatarUrl', 'authProvider', 'createdAt', 'lastLoginAt', 'connectedProviders', 'company', 'plan', 'planPeriod', 'planStatus', 'planExpiresAt', 'trialEndsAt', 'stripeCustomerId', 'stripeSubscriptionId', 'featureOverrides', 'usage']);
                      const extraFields = Object.entries(selectedUser).filter(([key]) => !knownKeys.has(key));
                      if (extraFields.length === 0) return null;
                      return (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Database className="w-3.5 h-3.5 text-zinc-500" />
                            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Additional Data</h3>
                          </div>
                          <div className="space-y-2">
                            {extraFields.map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                <span className="text-xs text-zinc-400">{key}</span>
                                <span className="text-xs text-zinc-300 font-mono truncate max-w-[250px]">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer actions */}
                  {selectedUser.role !== 'master_admin' && (
                    <div className="p-6 pt-2 border-t border-zinc-800 flex items-center gap-2 justify-end">
                      {selectedUser.status === 'approved' && (
                        <button
                          onClick={() => { handleUpdateUserStatus(selectedUser.id, 'rejected'); setSelectedUser(null); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Revoke Access
                        </button>
                      )}
                      {selectedUser.status === 'rejected' && (
                        <button
                          onClick={() => { handleUpdateUserStatus(selectedUser.id, 'approved'); setSelectedUser(null); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Restore Access
                        </button>
                      )}
                      {selectedUser.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { handleUpdateUserStatus(selectedUser.id, 'approved'); setSelectedUser(null); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => { handleUpdateUserStatus(selectedUser.id, 'rejected'); setSelectedUser(null); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete User
                      </button>
                    </div>
                  )}


                </div>
              </div>
            )}
          </>
        )}

        {/* ── PLANS PAGE ── */}
        {currentPage === 'plans' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Subscription Plans</h2>
              <div className="flex items-center gap-2">
                {plansEdit ? (
                  <>
                    <button onClick={cancelEditingPlans} className="text-zinc-400 hover:text-white text-xs px-3 py-2 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors">
                      Cancel
                    </button>
                    <button onClick={savePlans} disabled={savingPlans} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50">
                      {savingPlans ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    {Object.keys(plans).length === 0 && (
                      <button onClick={seedPlans} disabled={savingPlans} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
                        {savingPlans ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Seed Default Plans
                      </button>
                    )}
                    {Object.keys(plans).length > 0 && (
                      <button onClick={seedPlans} disabled={savingPlans} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50" title="Re-seed plans with latest defaults (Stripe IDs)">
                        {savingPlans ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Re-seed
                      </button>
                    )}
                    {Object.keys(plans).length > 0 && (
                      <button onClick={startEditingPlans} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit Plans
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {Object.keys(plans).length === 0 && !savingPlans ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <Zap className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No plans configured yet.</p>
                <p className="text-zinc-600 text-xs mt-1">Click "Seed Default Plans" to create the initial tiers.</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                  <Settings className="w-4 h-4 text-zinc-500" />
                  <h3 className="font-medium text-zinc-200">Feature Toggle Matrix</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider bg-zinc-950/30">
                        <th className="px-6 py-3 font-medium w-48">Feature</th>
                        {PLAN_ORDER.filter(p => (plansEdit || plans)[p]).map(planId => (
                          <th key={planId} className="px-4 py-3 font-medium text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${planId === 'free' ? 'text-zinc-300 bg-zinc-800 border-zinc-700' :
                              planId === 'pro' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                planId === 'team' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                  'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              }`}>
                              {displayPlanName(planId)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-sm">
                      {Object.entries(FEATURE_LABELS).map(([featureKey, label]) => (
                        <tr key={featureKey} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-3 text-zinc-300 text-xs font-medium">{label}</td>
                          {PLAN_ORDER.filter(p => (plansEdit || plans)[p]).map(planId => {
                            const source = plansEdit || plans;
                            const feat = source[planId]?.features?.[featureKey];
                            if (!feat) return <td key={planId} className="px-4 py-3 text-center text-zinc-600">—</td>;
                            return (
                              <td key={planId} className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {plansEdit ? (
                                    <>
                                      <input
                                        type="checkbox"
                                        checked={feat.enabled}
                                        onChange={(e) => updatePlanFeature(planId, featureKey, 'enabled', e.target.checked)}
                                        className="accent-blue-500 w-3.5 h-3.5"
                                      />
                                      <input
                                        type="number"
                                        value={feat.limit}
                                        onChange={(e) => updatePlanFeature(planId, featureKey, 'limit', parseInt(e.target.value) || 0)}
                                        className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 w-20 text-center outline-none focus:border-blue-500"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${feat.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
                                        }`}>
                                        {feat.enabled ? '✓' : '✕'}
                                      </span>
                                      <span className="text-xs text-zinc-400 font-mono">{formatLimit(feat.limit)}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Plan pricing row */}
                <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-950/20">
                  <div className="grid gap-4" style={{ gridTemplateColumns: `12rem repeat(${PLAN_ORDER.filter(p => (plansEdit || plans)[p]).length}, 1fr)` }}>
                    <span className="text-xs text-zinc-500 font-medium flex items-center">Monthly Price</span>
                    {PLAN_ORDER.filter(p => (plansEdit || plans)[p]).map(planId => {
                      const plan = (plansEdit || plans)[planId];
                      return (
                        <div key={planId} className="text-center">
                          <span className="text-sm font-bold text-white">
                            {plan?.priceMonthly === 0 ? 'Free' : `$${(plan?.priceMonthly / 100).toFixed(0)}/mo`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Capabilities table */}
                <div className="border-t border-zinc-800">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                    <Shield className="w-4 h-4 text-zinc-500" />
                    <h3 className="font-medium text-zinc-200">Platform Capabilities</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider bg-zinc-950/30">
                          <th className="px-6 py-3 font-medium w-48">Capability</th>
                          {PLAN_ORDER.filter(p => (plansEdit || plans)[p]).map(planId => (
                            <th key={planId} className="px-4 py-3 font-medium text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${planId === 'free' ? 'text-zinc-300 bg-zinc-800 border-zinc-700' :
                                planId === 'pro' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                  planId === 'team' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                    'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                }`}>
                                {displayPlanName(planId)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-sm">
                        {Object.entries(CAPABILITY_LABELS).map(([capKey, label]) => (
                          <tr key={capKey} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-6 py-3 text-zinc-300 text-xs font-medium">{label}</td>
                            {PLAN_ORDER.filter(p => (plansEdit || plans)[p]).map(planId => {
                              const source = plansEdit || plans;
                              const enabled = source[planId]?.capabilities?.[capKey] ?? false;
                              return (
                                <td key={planId} className="px-4 py-3 text-center">
                                  {plansEdit ? (
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(e) => updatePlanCapability(planId, capKey, e.target.checked)}
                                      className="accent-blue-500 w-3.5 h-3.5"
                                    />
                                  ) : (
                                    <span className={`text-xs ${enabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                      {enabled ? '✓' : '✗'}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── LANDING PAGE ── */}
        {currentPage === 'landing' && (
          <LandingTab db={db} profile={profile} />
        )}

      </main>
    </div >
  );
}

export default App;
