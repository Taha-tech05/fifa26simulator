import { MatchScreen } from "@/components/MatchScreen";

export default function MatchPage({ params }: { params: { id: string } }) {
  return <MatchScreen matchId={Number(params.id)} />;
}
