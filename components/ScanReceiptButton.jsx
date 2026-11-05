'use client';

import { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { setPendingCameraPhoto } from '@/lib/cameraBridge';

/** Opens the camera; the photo is handed to the AI assistant to read the receipt. */
export default function ScanReceiptButton({ className = '', children, ...rest }) {
  const inputRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleCaptured = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow capturing the same file again
    await setPendingCameraPhoto(file);
    if (pathname !== '/assistant') router.push('/assistant?attachCamera=true');
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleCaptured}
      />
      <button type="button" onClick={() => inputRef.current?.click()} className={className} {...rest}>
        {children}
      </button>
    </>
  );
}
