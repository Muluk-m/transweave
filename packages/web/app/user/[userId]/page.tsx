import { UserPage } from "./client-page";

export function generateStaticParams() {
  return [{ userId: '_' }];
}

export default function Page() {
  return <UserPage />;
}
