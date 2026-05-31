import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import LoginScreen from "./components/LoginScreen";
import Admin from "./Admin";

function Gate() {
  const { isAuthed } = useAuth();
  return isAuthed ? <Admin /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
