import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../lib/storage';

interface SignedUrlState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

export function useSignedUrl(path: string | null | undefined): SignedUrlState {
  const [state, setState] = useState<SignedUrlState>({
    url: null,
    loading: Boolean(path),
    error: null,
  });

  useEffect(() => {
    if (!path) {
      setState({ url: null, loading: false, error: null });
      return;
    }
    let active = true;
    setState((current) => ({ url: current.url, loading: true, error: null }));
    void getAttachmentUrl(path)
      .then((url) => {
        if (active) setState({ url, loading: false, error: null });
      })
      .catch(() => {
        if (active) setState({ url: null, loading: false, error: 'Unable to load attachment.' });
      });
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
