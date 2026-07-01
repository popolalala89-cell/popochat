import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonTabs,
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
import BroadcastPage from './pages/BroadcastPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useFCM } from './hooks/useFCM';

function AppRoutes() {
  useFCM();
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Memuat... ⏳</p>
      </div>
    );
  }

  return (
    <IonReactRouter>
      {/* Public routes */}
      <Route exact path="/login">
        {currentUser ? <Redirect to="/chats" /> : <LoginPage />}
      </Route>
      <Route exact path="/register">
        {currentUser ? <Redirect to="/chats" /> : <RegisterPage />}
      </Route>

      {/* Chat detail — no tabs (but still guarded) */}
      <ProtectedRoute exact path="/chat/:id" component={ChatDetailPage} />

      {/* Tabbed routes (guarded) */}
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
          <IonTabButton tab="admin" href="/admin">
            <IonIcon icon={settings} />
            <IonLabel>Admin</IonLabel>
          </IonTabButton>
          <IonTabButton tab="profile" href="/profile">
            <IonIcon icon={person} />
            <IonLabel>Profil</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  );
}

const App: React.FC = () => {
  return (
  <IonApp>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </IonApp>
  );
};

export default App;
