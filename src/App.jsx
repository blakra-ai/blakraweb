import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from './pages/Home';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#050507' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse" />
          <span className="font-mono text-[8px] tracking-[0.4em] text-foreground/15 uppercase">Initializing</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
           <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </>
  )
}

export default App