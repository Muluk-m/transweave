import { ProjectAiSettingsPage } from "./client-page";

export function generateStaticParams() {
  return [{ projectId: '_' }];
}

export default function Page() {
  return <ProjectAiSettingsPage />;
}
