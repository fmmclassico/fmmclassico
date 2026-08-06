import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function normalizeReturnUrl(value) {
  if (!value) return '/';

  try {
    const parsed = new URL(value, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch (_) {
    const asString = String(value || '').trim();
    if (!asString) return '/';
    return asString.startsWith('/') ? asString : `/${asString.replace(/^\/+/, '')}`;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const finishAuth = async () => {
      try {
        const authError = searchParams.get('error_description') || searchParams.get('error');
        if (authError) {
          throw new Error(authError);
        }

        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const returnUrl = normalizeReturnUrl(
          searchParams.get('returnUrl') ||
          sessionStorage.getItem('redirectAfterLogin') ||
          '/'
        );

        try {
          sessionStorage.removeItem('redirectAfterLogin');
        } catch (_) {
          // ignore
        }

        if (active) {
          navigate(returnUrl, { replace: true });
        }
      } catch (err) {
        console.error('Auth callback failed:', err);
        if (active) {
          setError(err?.message || 'Unable to complete sign in.');
        }
      }
    };

    finishAuth();

    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A2E60]" />
        <h1 className="text-lg font-semibold text-slate-900">Finishing sign in</h1>
        <p className="text-sm text-slate-500">
          {error || 'Please wait while we connect your account and return you to the app.'}
        </p>
      </div>
    </div>
  );
}
