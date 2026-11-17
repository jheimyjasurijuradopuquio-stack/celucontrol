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
  loginAsRole: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string, registerData?: { displayName: string; role: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthConfigured: boolean;
}

export const ROLE_CREDENTIALS: Record<UserRole, { email: string; pass: string; displayName: string }> = {
  admin: {
    email: 'admin@donbrasa.pe',
    pass: 'Admin2026!',
    displayName: 'Carlos Vega (Administrador)'
  },
  mozo: {
    email: 'mozo@donbrasa.pe',
    pass: 'Mozo2026!',
    displayName: 'Juan Pérez (Mozo Salón)'
  },
  cocina: {
    email: 'cocina@donbrasa.pe',
    pass: 'Cocina2026!',
    displayName: 'Chef Marco (Cocina & Brasas)'
  },
  cajero: {
    email: 'cajero@donbrasa.pe',
    pass: 'Cajero2026!',
    displayName: 'María Silva (Cajera Principal)'
  }
};

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
          // Consultar perfil y rol en Firestore
          const userDocRef = doc(db, 'usuarios', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: data.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
              role: (data.role as UserRole) || 'mozo',
              active: true
            });
          } else {
            // Mapear rol a partir del correo si el documento aún no existe
            const email = (fbUser.email || '').toLowerCase();
            let role: UserRole = 'mozo';
            if (email.includes('admin')) role = 'admin';
            else if (email.includes('cocina')) role = 'cocina';
            else if (email.includes('caja')) role = 'cajero';

            const nuevoUsuario: AppUser = {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || email.split('@')[0],
              role,
              active: true
            };

            // Intentar persistir perfil en Firestore
            try {
              await setDoc(userDocRef, nuevoUsuario, { merge: true });
            } catch (e) {
              console.warn('No se pudo guardar perfil inicial en usuarios:', e);
            }

            setUser(nuevoUsuario);
          }
        } catch (err) {
          console.error('Error al recuperar perfil de usuario:', err);
          // Fallback con datos del token Firebase Auth
          const email = (fbUser.email || '').toLowerCase();
          let role: UserRole = 'mozo';
          if (email.includes('admin')) role = 'admin';
          else if (email.includes('cocina')) role = 'cocina';
          else if (email.includes('caja')) role = 'cajero';

          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || email.split('@')[0],
            role,
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

  // Autenticación Real por Rol con Firebase Auth
  const loginAsRole = async (role: UserRole) => {
    setAuthError(null);
    const creds = ROLE_CREDENTIALS[role];

    try {
      // 1. Intentar iniciar sesión real en Firebase Auth
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, creds.email, creds.pass);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/configuration-not-found') {
          setIsAuthConfigured(false);
          setAuthError(
            'Firebase Authentication no está habilitado en tu consola. Ve a Firebase Console > Build > Authentication > Comenzar > Habilitar Correo/Contraseña.'
          );
          throw signInErr;
        }

        // Si el usuario no existe, crearlo automáticamente en Firebase Auth
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential' ||
          signInErr.code === 'auth/invalid-email'
        ) {
          try {
            credential = await createUserWithEmailAndPassword(auth, creds.email, creds.pass);
            await updateProfile(credential.user, { displayName: creds.displayName });
          } catch (createErr: any) {
            if (createErr.code === 'auth/configuration-not-found') {
              setIsAuthConfigured(false);
              setAuthError(
                'Firebase Authentication no está habilitado en tu consola. Ve a Firebase Console > Build > Authentication > Comenzar > Habilitar Correo/Contraseña.'
              );
              throw createErr;
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }

      // 2. Registrar/Actualizar rol en la colección 'usuarios' de Firestore
      if (credential?.user) {
        const userDocRef = doc(db, 'usuarios', credential.user.uid);
        const appUserData: AppUser = {
          id: credential.user.uid,
          email: creds.email,
          displayName: creds.displayName,
          role,
          active: true
        };
        try {
          await setDoc(userDocRef, appUserData, { merge: true });
        } catch (dbErr) {
          console.warn('Nota de permisos Firestore al guardar perfil de usuario:', dbErr);
        }
        setUser(appUserData);
      }
    } catch (err: any) {
      console.error('Error autenticando con Firebase Auth:', err);
      if (!authError) {
        setAuthError(err.message || 'Error al autenticar en Firebase Auth.');
      }
      throw err;
    }
  };

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

        // Protección estricta contra auto-elevación a administrador
        let safeRole: UserRole = registerData.role;
        if (safeRole === 'admin' && email.toLowerCase() !== 'admin@donbrasa.pe') {
          safeRole = 'mozo';
        }

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
        // Inicio de sesión
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      if (err.code === 'auth/configuration-not-found') {
        setIsAuthConfigured(false);
        setAuthError(
          'Firebase Authentication no está habilitado en tu consola. Ve a Firebase Console > Build > Authentication > Comenzar > Habilitar Correo/Contraseña.'
        );
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setAuthError('Correo o contraseña incorrectos. Verifica tus credenciales o regístrate.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Ese correo ya está registrado. Inicia sesión directamente.');
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loginAsRole,
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
