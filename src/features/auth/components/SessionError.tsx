import Button from "../../../components/common/Button";
import { useAuth } from "../context/AuthContext";

export const SessionError = () => {
  const { refreshUser } = useAuth();
  return <div className="auth-loading"><div className="auth-card"><h1>Impossible de vérifier votre session</h1><p className="auth-subtitle" role="alert">Le service est momentanément indisponible. Réessayez dans un instant.</p><Button onClick={() => void refreshUser()}>Réessayer</Button></div></div>;
};
