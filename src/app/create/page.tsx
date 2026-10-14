import CreateView from "@/components/create/CreateView";
import { PageHeader } from "@/components/list";

export default function CreatePage() {
  return (
    <>
      <PageHeader title="create" hint="scegli canzone e core, rifinisci il look, poi premi ready" />
      <CreateView />
    </>
  );
}
