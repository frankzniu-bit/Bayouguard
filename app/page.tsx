import Landing from '@/components/landing/Landing';
import { getLandingData } from '@/lib/landing';

export const revalidate = 60;

export default async function Home() {
  const data = await getLandingData();
  return <Landing data={data} />;
}
