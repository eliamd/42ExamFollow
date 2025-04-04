'use client';

import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';

export default function AuthError() {
  const { login } = useAuth();

  return (
    <div className="page-container">
      <div className="error-container">
        <h1 className="error-title">Erreur d'Authentification</h1>
        <p className="error-description">
          Une erreur s'est produite lors de l'authentification avec l'API 42.
        </p>
        <p className="error-detail">
          Veuillez vérifier que les variables d'environnement suivantes sont correctement configurées:
        </p>
        <ul className="error-list">
          <li>NEXT_PUBLIC_42_CLIENT_ID</li>
          <li>NEXT_PUBLIC_42_CLIENT_SECRET</li>
          <li>NEXT_PUBLIC_42_REDIRECT_URI</li>
          <li>NEXT_PUBLIC_DOMAIN</li>
        </ul>
        <div className="error-actions">
          <button onClick={login} className="btn btn-primary">
            Réessayer la connexion
          </button>
          <Link href="/" className="btn btn-secondary">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
