import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ authStatus, children }) => {
  if (authStatus === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p className="helper">Checking your session...</p>
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
