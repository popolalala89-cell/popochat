import React from 'react';
import { Route } from 'react-router-dom';
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
import { chatbubbles, person, megaphone } from 'ionicons/icons';

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

import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatListPage from './pages/ChatListPage';
import ChatDetailPage from './pages/ChatDetailPage';
import BroadcastPage from './pages/BroadcastPage';
import ProfilePage from './pages/ProfilePage';

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <AuthProvider>
        {/* Public routes — no tabs */}
        <Route exact path="/login" component={LoginPage} />
        <Route exact path="/register" component={RegisterPage} />

        {/* Chat detail — no tabs */}
        <Route exact path="/chat/:id" component={ChatDetailPage} />

        {/* Tabbed routes */}
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/chats" component={ChatListPage} />
            <Route exact path="/broadcast" component={BroadcastPage} />
            <Route exact path="/profile" component={ProfilePage} />
            <Route exact path="/" component={ChatListPage} />
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
            <IonTabButton tab="profile" href="/profile">
              <IonIcon icon={person} />
              <IonLabel>Profil</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </AuthProvider>
    </IonReactRouter>
  </IonApp>
);

export default App;
