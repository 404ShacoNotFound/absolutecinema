<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { VisionEngine } from '$lib/core/VisionEngine.svelte';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	
	const engine = new VisionEngine();

	// We use a manual start button to satisfy browser autoplay policies for unmuted audio
	let hasStarted = $state(false);

	function startSystem() {
		hasStarted = true;
		engine.initialize(videoElement, canvasElement);
	}

	onDestroy(() => {
		engine.destroy();
	});
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-pink-500/30 overflow-hidden relative">
	
	<!-- Header -->
	<header class="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
		<div>
			<h1 class="text-3xl font-black tracking-tighter bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
				Absolute Cinema
			</h1>
			<p class="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest">
				Gesture Recognition Engine
			</p>
		</div>

		<!-- Status Badge -->
		<div class="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800/50 shadow-xl">
			{#if !hasStarted}
				<div class="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
				<span class="text-sm font-semibold text-slate-400">Standby</span>
			{:else if engine.error}
				<div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
				<span class="text-sm font-semibold text-red-400">Error</span>
			{:else if engine.isReady}
				<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
				<span class="text-sm font-semibold text-emerald-400">System Ready</span>
			{:else}
				<div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
				<span class="text-sm font-semibold text-amber-400">Initializing...</span>
			{/if}
		</div>
	</header>

	<!-- Main Stage -->
	<main class="relative w-full h-screen flex items-center justify-center p-8">
		<!-- Camera Feed Container -->
		<div class="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 border border-slate-800/60 bg-slate-900">
			
			<!-- Video element (Mirrored horizontally) -->
			<video 
				bind:this={videoElement}
				class="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-60 mix-blend-screen"
				playsinline 
				muted
				autoplay
			></video>

			<!-- Canvas overlay for hand landmarks -->
			<canvas 
				bind:this={canvasElement}
				class="absolute inset-0 w-full h-full object-cover pointer-events-none"
			></canvas>

			<!-- Start Overlay (To unlock browser audio playback) -->
			{#if !hasStarted}
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-30">
					<button 
						onclick={startSystem}
						class="px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full font-bold text-xl tracking-wide shadow-[0_0_40px_rgba(236,72,153,0.4)] hover:scale-105 hover:shadow-[0_0_60px_rgba(236,72,153,0.6)] transition-all cursor-pointer"
					>
						INITIALIZE SYSTEM
					</button>
					<p class="mt-6 text-slate-400 font-medium text-sm text-center max-w-sm">
						Clicking this button unlocks audio playback and allows the AI engine to access your camera.
					</p>
				</div>
			{/if}

			<!-- Loading Overlay -->
			{#if hasStarted && !engine.isReady && !engine.error}
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
					<div class="w-12 h-12 border-4 border-slate-700 border-t-pink-500 rounded-full animate-spin"></div>
					<p class="mt-4 text-slate-400 font-medium">Loading Vision Models...</p>
				</div>
			{/if}

			<!-- Error Overlay -->
			{#if engine.error}
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-sm z-20 text-center p-8">
					<svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
					<p class="text-red-200 font-medium text-lg max-w-md">{engine.error}</p>
				</div>
			{/if}
			
			<!-- Decorative corners -->
			<div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-pink-500/50 rounded-tl-3xl"></div>
			<div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-violet-500/50 rounded-tr-3xl"></div>
			<div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-pink-500/50 rounded-bl-3xl"></div>
			<div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-500/50 rounded-br-3xl"></div>
		</div>
	</main>

	<!-- The Absolute Cinema Overlay -->
	{#if engine.isAbsoluteCinema}
		<!-- Dynamic Vignette/Darkening -->
		<div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 transition-all duration-500" transition:fade></div>
		
		<!-- MP4 Container -->
		<div 
			class="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto"
			transition:scale="{{ start: 0.8, duration: 400, opacity: 0 }}"
		>
			<video 
				src="/absolute-cinema.mp4" 
				autoplay
				playsinline
				onended={() => { engine.isAbsoluteCinema = false; }}
				class="w-full max-w-4xl rounded-xl shadow-[0_0_150px_rgba(236,72,153,0.4)] drop-shadow-[0_0_50px_rgba(139,92,246,0.6)]"
			></video>
		</div>
	{/if}
</div>
