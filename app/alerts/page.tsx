import type { Metadata } from 'next';
import AlertsView from '@/components/pages/AlertsView';

export const metadata: Metadata = { title: 'Flood alerts — BayouGuard' };

export default function AlertsPage({ searchParams }: { searchParams: { address?: string } }) {
  return <AlertsView initialAddress={searchParams.address?.slice(0, 200)} />;
}
