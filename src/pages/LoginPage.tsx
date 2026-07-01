import React, { useState, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardContent,
  IonInput,
  IonButton,
  IonText,
  IonItem,
  IonLabel,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonHeader,
} from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const { login, resetPassword } = useAuth();
  const history = useHistory();

  // Ionic IonInput kadang lambat update state pake onIonChange,
  // jadi pake ref buat baca langsung dari DOM pas submit
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Baca value langsung dari DOM ref (lebih reliable dari state)
    let finalEmail = email;
    let finalPassword = password;
    try {
      const emailEl = await emailRef.current?.getInputElement();
      const passEl = await passwordRef.current?.getInputElement();
      if (emailEl?.value) finalEmail = emailEl.value;
      if (passEl?.value) finalPassword = passEl.value;
    } catch (e) {
      // Fallback ke state kalo ref gagal
    }

    if (!finalEmail || !finalPassword) {
      setError('Isi email dan password dulu ya 😅');
      return;
    }

    setLoading(true);
    try {
      await login(finalEmail, finalPassword);
      history.push('/chats');
    } catch (err: any) {
      const msg = err.message || '';
      // Firebase error kustom biar lebih friendly
      if (msg.includes('user-not-found')) {
        setError('Email belum terdaftar 😅');
      } else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Password salah, coba lagi ya 😅');
      } else if (msg.includes('too-many-requests')) {
        setError('Kebanyakan percobaan, tunggu sebentar ya 🕐');
      } else {
        setError(msg || 'Gagal login. Coba lagi ya.');
      }
    }
    setLoading(false);
  }

  async function handleReset() {
    if (!resetEmail.trim()) {
      setResetError('Masukkan email dulu ya 😅');
      return;
    }
    setResetError('');
    setResetSent(false);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || 'Gagal kirim email reset. Coba lagi.');
    }
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="login-header">
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>💬 Chat Internal</h1>
            <IonText color="medium">
              <p>Hanya untuk anggota internal tim</p>
            </IonText>
          </div>

          <IonCard>
            <IonCardContent>
              <form onSubmit={handleSubmit}>
                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    ref={emailRef}
                    type="email"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value || '')}
                    onIonChange={(e) => setEmail(e.detail.value || '')}
                    required
                    placeholder="nama@email.com"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value || '')}
                    onIonChange={(e) => setPassword(e.detail.value || '')}
                    required
                    placeholder="******"
                  />
                </IonItem>

                {error && (
                  <IonText color="danger">
                    <p style={{ fontSize: 14, margin: '8px 0' }}>😅 {error}</p>
                  </IonText>
                )}

                <IonButton expand="block" type="submit" disabled={loading} className="ion-margin-top">
                  {loading ? 'Masuk...' : 'Masuk'}
                </IonButton>
              </form>

              <IonText>
                <p style={{ textAlign: 'center', marginTop: 16 }}>
                  Belum punya akun?{' '}
                  <a onClick={() => history.push('/register')} style={{ color: 'var(--ion-color-primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Daftar
                  </a>
                </p>
              </IonText>

              {/* Lupa Password */}
              <IonText>
                <p style={{ textAlign: 'center', marginTop: 8, fontSize: 14 }}>
                  <a onClick={() => { setShowResetModal(true); setResetEmail(email); setResetSent(false); setResetError(''); }}
                     style={{ color: 'var(--ion-color-medium)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Lupa Password? 😅
                  </a>
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>

          <IonText color="medium" style={{ textAlign: 'center', fontSize: 12 }}>
            <p>Ups, pesan nyangkut? Coba lagi ya 😄</p>
          </IonText>
        </div>

      {/* Modal Lupa Password */}
      <IonModal isOpen={showResetModal} onDidDismiss={() => setShowResetModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Atur Ulang Password</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowResetModal(false)}>Tutup</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {resetSent ? (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <p style={{ fontSize: 48 }}>📧</p>
              <h3>Cek Email-mu!</h3>
              <IonText color="medium">
                <p>Email reset password udah dikirim ke:</p>
                <p style={{ fontWeight: 600 }}>{resetEmail}</p>
              </IonText>
              <IonText color="medium">
                <p style={{ marginTop: 16 }}>Klik link di email buat bikin password baru.</p>
                <p>Gak terima? Cek folder Spam ya 😅</p>
              </IonText>
              <IonButton expand="block" onClick={() => setShowResetModal(false)} style={{ marginTop: 24 }}>
                Oke, Sip!
              </IonButton>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <IonText>
                <p>Masukin email kamu, nanti dikirim link reset password.</p>
              </IonText>
              <IonItem style={{ marginTop: 16 }}>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={resetEmail}
                  onIonChange={(e) => setResetEmail(e.detail.value || '')}
                  placeholder="nama@email.com"
                />
              </IonItem>

              {resetError && (
                <IonText color="danger">
                  <p style={{ fontSize: 14, margin: '8px 0' }}>😅 {resetError}</p>
                </IonText>
              )}

              <IonButton expand="block" onClick={handleReset} style={{ marginTop: 16 }}>
                Kirim Link Reset
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
