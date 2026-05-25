import { createFileRoute } from '@tanstack/react-router';
import { ResponderQuestionario } from '@/features/responder/ResponderQuestionario';

function ResponderPage() {
  const { linkPublico } = Route.useParams();
  return <ResponderQuestionario linkPublico={linkPublico} />;
}

export const Route = createFileRoute('/responder/$linkPublico')({ component: ResponderPage });