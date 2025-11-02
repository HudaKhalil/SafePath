"use client";
import { useSearchParams } from "next/navigation";

export default function NavigationPage() {
	const searchParams = useSearchParams();
	const routeName = searchParams.get("name");
	const routeType = searchParams.get("type");
	const routeDistance = searchParams.get("distance");
	const routeTime = searchParams.get("time");
	const routeSafety = searchParams.get("safety");

	return (
		<main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-dark via-primary to-slate-700">
			<div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mt-12">
				<h1 className="text-3xl font-bold text-primary-dark mb-4">Navigation</h1>
				<div className="space-y-2">
					<div className="text-lg font-semibold">{routeName}</div>
					<div className="text-sm text-gray-500 capitalize">Type: {routeType}</div>
					<div className="flex gap-6 mt-4">
						<div>
							<span className="text-blue-600 font-bold text-xl">{routeDistance} km</span>
							<div className="text-xs text-gray-500">Distance</div>
						</div>
						<div>
							<span className="text-blue-600 font-bold text-xl">{routeTime} min</span>
							<div className="text-xs text-gray-500">Duration</div>
						</div>
						<div>
							<span className={`font-bold text-xl ${routeSafety >= 4 ? "text-green-600" : "text-yellow-600"}`}>{routeSafety}</span>
							<div className="text-xs text-gray-500">Safety</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
