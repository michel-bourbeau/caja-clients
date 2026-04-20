import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function FeatureNotAvailablePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-md mx-auto flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Module Non Disponible</h1>
          <p className="text-slate-600 mb-6">
            Ce module n'est pas activé pour votre tenant. Contactez votre administrateur pour l'activer.
          </p>
          <Link href="/dashboard">
            <Button className="w-full bg-blue-600">Retour au Dashboard</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
