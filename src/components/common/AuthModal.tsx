import React from 'react';
import { LoginPage } from '../auth/LoginPage';
import { useAuthStore } from '../../store/authStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen } = useAuthStore();
  if (!isAuthModalOpen) return null;
  return <LoginPage />;
};
