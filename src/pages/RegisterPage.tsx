import React, { useState } from 'react';
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
  IonRouterLink,
} from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const history = useHistory();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password minimal 6 karakter ya');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      history.push('/chats');
    } catch (err: any) {
      setError(err.message || 'Gagal daftar. Coba lagi ya.');
    }
    setLoading(false);
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>🏃‍♂️ Daftar</h1>
            <IonText color="medium">
              <p>Bikin akun baru buat gabung</p>
            </IonText>
          </div>

          <IonCard>
            <IonCardContent>
              <form onSubmit={handleSubmit}>
                <IonItem>
                  <IonLabel position="stacked">Nama Lengkap</IonLabel>
                  <IonInput
                    value={displayName}
                    onIonChange={(e) => setDisplayName(e.detail.value!)}
                    required
                    placeholder="Nama kamu"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    type="email"
                    value={email}
                    onIonChange={(e) => setEmail(e.detail.value!)}
                    required
                    placeholder="nama@email.com"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={password}
                    onIonChange={(e) => setPassword(e.detail.value!)}
                    required
                    placeholder="Minimal 6 karakter"
                  />
                </IonItem>

                {error && (
                  <IonText color="danger">
                    <p style={{ fontSize: 14, margin: '8px 0' }}>😅 {error}</p>
                  </IonText>
                )}

                <IonButton expand="block" type="submit" disabled={loading} className="ion-margin-top">
                  {loading ? 'Mendaftar...' : 'Daftar'}
                </IonButton>
              </form>

              <IonText>
                <p style={{ textAlign: 'center', marginTop: 16 }}>
                  Sudah punya akun?{' '}
                  <IonRouterLink routerLink="/login">Masuk</IonRouterLink>
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>

          <IonText color="medium" style={{ textAlign: 'center', fontSize: 12 }}>
            <p>✨ Daftar dulu, langsung chat! ✨</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RegisterPage;
