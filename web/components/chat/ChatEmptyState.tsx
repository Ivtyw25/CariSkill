import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatEmptyState() {
    const router = useRouter();

    return (
        <div className="flex-1 z-10 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <Compass className="w-16 h-16 text-yellow-500 mb-6 opacity-80" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Chat</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
                Something went wrong generating your custom path. Please head over to the prompt page to restart.
            </p>
            <button
                onClick={() => router.push('/setup')}
                className="bg-[#FFD900] hover:bg-yellow-400 text-black font-semibold rounded-2xl px-8 py-4 shadow-[0_4px_15px_rgba(255,215,0,0.3)] border border-black transition-transform active:scale-95"
            >
                Back to Setup
            </button>
        </div>
    );
}
