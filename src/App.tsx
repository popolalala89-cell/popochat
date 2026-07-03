import React, { useState, useEffect } from 'react';
import { Route, Redirect, Switch, useHistory } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonTabs,
  IonToast,
  IonAlert,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbles, person, megaphone, settings } from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme */
import './theme/variables.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatListPage from './pages/ChatListPage';
import ChatDetailPage from './pages/ChatDetailPage';
import ChatNewPage from './pages/NewChatPage';
import BroadcastPage from './pages/BroadcastPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useFCM } from './hooks/useFCM';
import { useNotificationPermission } from './hooks/useNotificationPermission';
import { useToastNotifications, registerShowToast } from './hooks/useToastNotifications';

function AppRoutes() {
  useFCM();
  const { currentUser, userData, loading } = useAuth();
  const history = useHistory();

  const [toastMsg, setToastMsg] = useState('');
  const [toastGroupId, setToastGroupId] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  // Register fungsi toast biar bisa dipanggil dari hook
  React.useEffect(() => {
    registerShowToast((msg, sender, groupId) => {
      setToastMsg(`${sender}: ${msg}`);
      setToastGroupId(groupId);
      setToastOpen(true);
    });
  }, []);

  useToastNotifications();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Memuat... ⏳</p>
      </div>
    );
  }

  return (
    <IonReactRouter>
      <Switch>
        {/* Jika sudah login, redirect dari /login dan /register */}
        <Route exact path="/login" render={() =>
          currentUser ? <Redirect to="/chats" /> : <LoginPage />
        } />
        <Route exact path="/register" render={() =>
          currentUser ? <Redirect to="/chats" /> : <RegisterPage />
        } />

        {/* Chat detail — tanpa tab bar */}
        <ProtectedRoute exact path="/chat/:id" component={ChatDetailPage} />

        {/* New chat — tanpa tab bar */}
        <ProtectedRoute exact path="/new-chat" component={ChatNewPage} />

        {/* Halaman dengan tab bar */}
        <Route path="/" render={() => (
          <IonTabs>
            <IonRouterOutlet>
              <ProtectedRoute exact path="/chats" component={ChatListPage} />
              <ProtectedRoute exact path="/broadcast" component={BroadcastPage} />
              <ProtectedRoute exact path="/profile" component={ProfilePage} />
              <ProtectedRoute exact path="/admin" component={AdminPage} />
              <ProtectedRoute exact path="/" component={ChatListPage} />
            </IonRouterOutlet>

            <IonTabBar slot="bottom">
              <IonTabButton tab="chats" href="/chats">
                <IonIcon icon={chatbubbles} />
                <IonLabel>Chat</IonLabel>
              </IonTabButton>
              <IonTabButton tab="broadcast" href="/broadcast">
                <IonIcon icon={megaphone} />
                <IonLabel>Broadcast</IonLabel>
              </IonTabButton>
              {userData?.role === 'admin' && (
              <IonTabButton tab="admin" href="/admin">
                <IonIcon icon={settings} />
                <IonLabel>Admin</IonLabel>
              </IonTabButton>
              )}
              <IonTabButton tab="profile" href="/profile">
                <IonIcon icon={person} />
                <IonLabel>Profil</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        )} />
      </Switch>

      <IonToast
        isOpen={toastOpen}
        message={toastMsg}
        duration={4500}
        position="top"
        color="primary"
        buttons={[
          {
            text: 'Buka',
            handler: () => {
              if (toastGroupId) history.push(`/chat/${toastGroupId}`);
            },
          },
        ]}
        onDidDismiss={() => setToastOpen(false)}
      />
    </IonReactRouter>
  );
}

const App: React.FC = () => {
  const { status, needsSettings } = useNotificationPermission();
  const [settingsAlert, setSettingsAlert] = useState(false);

  useEffect(() => {
    if (needsSettings) {
      // Kasih delay biar render dulu
      const t = setTimeout(() => setSettingsAlert(true), 1500);
      return () => clearTimeout(t);
    }
  }, [needsSettings]);

  return (
  <IonApp>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>

    <IonAlert
      isOpen={settingsAlert}
      header={'⚠️ Izin Notifikasi'}
      message={'Notifikasi sudah pernah ditolak. Aktifkan manual: Settings → Apps → Chat Internal → Notifications → Izinkan.'}
      buttons={[
        { text: 'Tutup', role: 'cancel' },
      ]}
      onDidDismiss={() => setSettingsAlert(false)}
    />
  </IonApp>
  );
};

export default App;
