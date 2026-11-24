import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { auth, db } from '../firebase.ts';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loginWithEmail: (email: string, pass: string, registerData?: { displayName: string; role: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthConfigured, setIsAuthConfigured] = useState(true);

  const clearAuthError = () => setAuthError(null);

  // Escuchar sesión activa en Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          // El rol se obtiene EXCLUSIVAMENTE del documento de usuario autorizado en Firestore
          const userDocRef = doc(db, 'usuarios', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: data.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Trabajador',
              role: (data.role as UserRole) || 'mozo',
              active: data.active !== false
            });
          } else {
            // Usuario sin documento previo: asignar rol seguro restringido (mozo) sin privilegios de administrador
            const usuarioBase: AppUser = {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trabajador',
              role: 'mozo',
              active: true
            };

            try {
              await setDoc(userDocRef, usuarioBase, { merge: true });
            } catch (e) {
              console.warn('Nota de permisos al crear perfil en usuarios:', e);
            }

            setUser(usuarioBase);
          }
        } catch (err) {
          console.error('Error al recuperar perfil de usuario desde Firestore:', err);
          // En caso de error de red, establecer usuario básico con rol seguro 'mozo'
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trabajador',
            role: 'mozo',
            active: true
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Iniciar sesión o registrarse con correo y contraseña
  const loginWithEmail = async (
    email: string,
    pass: string,
    registerData?: { displayName: string; role: UserRole }
  ) => {
    setAuthError(null);

    try {
      if (registerData) {
        // Registro de usuario nuevo
        const credential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(credential.user, { displayName: registerData.displayName });

        // Protección estricta: un usuario que se registra por su cuenta no puede asignarse rol admin
        const safeRole: UserRole = registerData.role === 'admin' ? 'mozo' : registerData.role;

        const newUser: AppUser = {
          id: credential.user.uid,
          email,
          displayName: registerData.displayName,
          role: safeRole,
          active: true
        };

        try {
          await setDoc(doc(db, 'usuarios', credential.user.uid), newUser, { merge: true });
        } catch (e) {
          console.warn('Error al guardar documento en usuarios:', e);
        }

        setUser(newUser);
      } else {
        // Inicio de sesión normal con correo y contraseña
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      if (err.code === 'auth/configuration-not-found') {
        setIsAuthConfigured(false);
        setAuthError(
          'Firebase Authentication no está habilitado en tu consola. Ve a Firebase Console > Build > Authentication > Comenzar > Habilitar Correo/Contraseña.'
        );
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('Correo o contraseña incorrectos. Verifica tus credenciales.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Ese correo ya está registrado. Inicia sesión con tu contraseña.');
      } else {
        setAuthError(err.message || 'Error al autenticar en Firebase Auth.');
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    setUser(null);
    setFirebaseUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loginWithEmail,
        logout,
        loading,
        authError,
        clearAuthError,
        isAuthConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
