<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { VisionEngine } from '$lib/core/VisionEngine.svelte';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	
	const engine = new VisionEngine();

	let hasStarted = $state(false);

	function startSystem() {
		hasStarted = true;
		// Proactive cache loading to prevent buffering on first trigger
		fetch('/absolute-cinema.mp4');
		fetch('/scuba-cat.mp4');
		engine.initialize(videoElement, canvasElement);
	}

	onDestroy(() => {
		engine.destroy();
	});
</script>

<svelte:head>
	<link rel="preload" as="video" href="/absolute-cinema.mp4" type="video/mp4" />
	<link rel="preload" as="video" href="/scuba-cat.mp4" type="video/mp4" />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-black font-sans selection:bg-black selection:text-white overflow-hidden relative border-8 border-black">
	
	<!-- Header -->
	<header class="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
		<div>
			<h1 class="text-4xl font-black uppercase tracking-tighter text-black" style="text-shadow: 3px 3px 0px rgba(0,0,0,0.2);">
				Absolute Cinema
			</h1>
			<p class="text-sm text-black font-bold mt-1 uppercase tracking-widest bg-yellow-300 inline-block px-2 border-2 border-black border-dashed">
				Gesture Recognition
			</p>
		</div>

		<!-- Status Badge -->
		<div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
			{#if !hasStarted}
				<div class="w-3 h-3 rounded-full bg-black animate-pulse"></div>
				<span class="text-sm font-black uppercase tracking-wider">Standby</span>
			{:else if engine.error}
				<div class="w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-black"></div>
				<span class="text-sm font-black uppercase tracking-wider text-red-600">Error</span>
			{:else if engine.isReady}
				<div class="w-3 h-3 rounded-full bg-green-400 animate-pulse border-2 border-black"></div>
				<span class="text-sm font-black uppercase tracking-wider">System Ready</span>
			{:else}
				<div class="w-3 h-3 rounded-full bg-yellow-400 animate-pulse border-2 border-black"></div>
				<span class="text-sm font-black uppercase tracking-wider">Initializing...</span>
			{/if}
		</div>
	</header>

	<!-- Main Stage -->
	<!-- Background uses a subtle dot pattern to give a comic book vibe -->
	<main class="relative w-full h-screen flex items-center justify-center p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')]">
		<!-- Camera Feed Container -->
		<div class="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black bg-white">
			
			<!-- Video element (Mirrored horizontally) -->
			<video 
				bind:this={videoElement}
				class="absolute inset-0 w-full h-full object-cover -scale-x-100"
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
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-30">
					<button 
						onclick={startSystem}
						class="px-8 py-4 bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl font-black uppercase text-2xl tracking-wide transition-all cursor-pointer"
					>
						START CAMERA
					</button>
					<p class="mt-6 text-black font-bold text-sm text-center max-w-sm uppercase bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						Clicking this unlocks audio playback and allows the AI engine to access your camera.
					</p>
				</div>
			{/if}

			<!-- Loading Overlay -->
			{#if hasStarted && !engine.isReady && !engine.error}
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20">
					<div class="w-16 h-16 border-8 border-gray-200 border-t-black rounded-full animate-spin"></div>
					<p class="mt-4 text-black font-black uppercase tracking-widest bg-yellow-300 px-4 py-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Loading Vision Models...</p>
				</div>
			{/if}

			<!-- Error Overlay -->
			{#if engine.error}
				<div class="absolute inset-0 flex flex-col items-center justify-center bg-red-100 z-20 text-center p-8">
					<svg class="w-20 h-20 text-red-600 mb-4 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="none" stroke="black" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
					<p class="text-black font-black uppercase text-lg max-w-md bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">{engine.error}</p>
				</div>
			{/if}
		</div>
	</main>

	<!-- The Absolute Cinema Overlay -->
	{#if engine.isAbsoluteCinema}
		<!-- Simple Darkening Overlay -->
		<div class="absolute inset-0 bg-black/80 z-40" transition:fade></div>
		
		<!-- MP4 Container -->
		<div 
			class="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto"
			transition:scale="{{ start: 0.8, duration: 400, opacity: 0 }}"
		>
			<!-- svelte-ignore a11y_media_has_caption -->
			<video 
				src="/absolute-cinema.mp4" 
				autoplay
				playsinline
				onended={() => { engine.isAbsoluteCinema = false; engine.startCooldown(2000); }}
				class="w-full max-w-4xl rounded-2xl shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] border-8 border-black bg-black"
			></video>
		</div>
	{/if}

	<!-- The Scuba Cat Overlay -->
	{#if engine.isScubaCat}
		<!-- Simple Darkening Overlay -->
		<div class="absolute inset-0 bg-black/80 z-40" transition:fade></div>
		
		<!-- MP4 Container -->
		<div 
			class="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto"
			transition:scale="{{ start: 0.8, duration: 400, opacity: 0 }}"
		>
			<!-- svelte-ignore a11y_media_has_caption -->
			<video 
				src="/scuba-cat.mp4" 
				autoplay
				playsinline
				onended={() => { engine.isScubaCat = false; engine.startCooldown(2000); }}
				class="w-full max-w-4xl rounded-2xl shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] border-8 border-black bg-black"
			></video>
		</div>
	{/if}

	<!-- Version Marker -->
	<div class="fixed bottom-2 right-2 text-xs text-gray-500 font-mono font-bold z-50 mix-blend-difference pointer-events-none">
		v2.8
	</div>
</div>
