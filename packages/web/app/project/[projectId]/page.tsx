import { ProjectPage } from "./client-page";

export function generateStaticParams() {
  return [{ projectId: '_' }];
}

export default function Page() {
  return <ProjectPage />;
}
