import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC<RouteProps> = ({ component: Component, ...rest }) => {
  const { currentUser, loading } = useAuth();

  if (!Component) return null;

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <p>Memuat... ⏳</p>
            </div>
          );
        }
        return currentUser ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        );
      }}
    />
  );
};

export default ProtectedRoute;
