import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Github, Loader2, LogOut, Check, X, Key } from 'lucide-react';

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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing App...');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        setLoadingText('Fetching Master Profile...');
        // Fetch profile
        const docRef = doc(db, 'users', currUser.uid);

        // Listen to the document instead of a one-time fetch to solve the race condition
        // where the Auth triggers before the Firestore document is fully written by the login handler.
        const unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);
          } else {
            // Profile might not be created yet if they just registered.
            // We'll rely on the snapshot firing again when it is created.
          }
          setLoading(false);
        }, (err) => {
          console.error("Firestore Profile Listener Error:", err);
          setError("Profile load failed: " + err.message);
          setProfile(null);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
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

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.error("Failed to update user role", err);
    }
  };

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
              onClick={() => handleLogin('github')}
              className="w-full flex items-center justify-center gap-3 bg-zinc-100 hover:bg-white text-zinc-900 font-medium py-2.5 px-4 rounded transition-colors"
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
  if (profile?.role !== 'master_admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">
            This portal is restricted to Master Administrators. Your current role is <strong>{profile?.role || 'user'}</strong>.
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

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
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
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || 'U'}&background=random`} alt="User Avatar" className="w-10 h-10 rounded-full bg-zinc-800" />
                      <div>
                        <p className="font-medium text-white">{u.name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'master_admin' ? (
                      <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-mono">{u.role}</span>
                    ) : (
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value as 'admin' | 'user')}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 outline-none focus:border-blue-500"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
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
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2 h-full min-h-[73px]">
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
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 text-sm">
                    No users found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;
