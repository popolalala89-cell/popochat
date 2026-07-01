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
} from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const history = useHistory();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      history.push('/chats');
    } catch (err: any) {
      setError(err.message || 'Gagal login. Coba lagi ya.');
    }
    setLoading(false);
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
            </IonCardContent>
          </IonCard>

          <IonText color="medium" style={{ textAlign: 'center', fontSize: 12 }}>
            <p>Ups, pesan nyangkut? Coba lagi ya 😄</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
