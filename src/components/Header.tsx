import { Package } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Package className="w-8 h-8" />
        <h1 className="text-2xl font-bold tracking-tight">Logistics Request Tracker</h1>
      </div>
    </header>
  );
}
