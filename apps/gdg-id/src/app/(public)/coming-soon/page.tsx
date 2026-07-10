import type { Metadata } from 'next';
import ComingSoon from '@/components/ComingSoon/ComingSoon';

export const metadata: Metadata = {
  title: 'Coming Soon – GDG-HAU Digital ID Platform',
  description: 'Gyro is working hard behind the scenes! New features are coming soon to the GDG-HAU Digital ID Platform.',
  openGraph: {
    title: 'Coming Soon – GDG-HAU Digital ID Platform',
    description: 'Gyro is working hard behind the scenes! New features are coming soon.',
  }
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
