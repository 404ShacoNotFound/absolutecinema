import { FilesetResolver, HandLandmarker, type HandLandmarkerResult, FaceLandmarker, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { isAbsoluteCinemaPose, isScubaCatPose } from './gestures';

export class VisionEngine {
	// Reactive states
	isReady = $state(false);
	isAbsoluteCinema = $state(false);
	public isScubaCat = $state(false);
	error = $state<string | null>(null);

	// Internal references
	private landmarker: HandLandmarker | null = null;
	private faceLandmarker: FaceLandmarker | null = null;
	private stream: MediaStream | null = null;
	private videoElement: HTMLVideoElement | null = null;
	private canvasElement: HTMLCanvasElement | null = null;
	private canvasCtx: CanvasRenderingContext2D | null = null;
	
	private animationFrameId: number | null = null;
	private lastVideoTime = -1;

	// Debounce mechanics
	private consecutivePoseFrames = 0;
	private readonly REQUIRED_FRAMES = 3; // Reduced from 5 to 3 for better responsiveness on slow/dark webcams
	public isCooldown = $state(false);
	private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

	public startCooldown(ms: number = 2000) {
		this.isCooldown = true;
		if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
		this.cooldownTimer = setTimeout(() => {
			this.isCooldown = false;
		}, ms);
	}

	async initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
		this.videoElement = video;
		this.canvasElement = canvas;
		this.canvasCtx = canvas.getContext('2d');

		try {
			// 1. Load MediaPipe WASM binaries
			const vision = await FilesetResolver.forVisionTasks(
				'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
			);

			this.landmarker = await HandLandmarker.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
					delegate: 'GPU'
				},
				runningMode: 'VIDEO',
				numHands: 2,
				minHandDetectionConfidence: 0.4, // Lowered for noisy/dark webcams
				minHandPresenceConfidence: 0.4,
				minTrackingConfidence: 0.4
			});

			this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
					delegate: 'GPU'
				},
				runningMode: 'VIDEO',
				numFaces: 1,
				minFaceDetectionConfidence: 0.4,
				minFacePresenceConfidence: 0.4,
				minTrackingConfidence: 0.4
			});

			// 3. Start Webcam
			try {
				this.stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
				});
			} catch (fallbackError) {
				// Fallback for virtual webcams or devices that don't support facingMode/constraints
				this.stream = await navigator.mediaDevices.getUserMedia({
					video: true
				});
			}
			this.videoElement.srcObject = this.stream;
			this.videoElement.play();

			// 4. Wait for video to be ready before starting inference loop
			this.videoElement.addEventListener('loadeddata', () => {
				this.isReady = true;
				this.startInferenceLoop();
			});

		} catch (err) {
			console.error("VisionEngine Error:", err);
			this.error = "Could not initialize AI Engine or access webcam. Please ensure permissions are granted.";
		}
	}

	private startInferenceLoop = () => {
		if (!this.videoElement || !this.landmarker || !this.faceLandmarker || !this.canvasCtx || !this.canvasElement) return;

		const startTimeMs = performance.now();
		
		// Only run inference if there's a new video frame
		if (this.lastVideoTime !== this.videoElement.currentTime) {
			this.lastVideoTime = this.videoElement.currentTime;
			
			const handResults = this.landmarker.detectForVideo(this.videoElement, startTimeMs);
			const faceResults = this.faceLandmarker.detectForVideo(this.videoElement, startTimeMs);
			
			// Process results
			this.processResults(handResults, faceResults);
			this.drawOverlay(handResults); // We only draw hands for the UI
		}

		// Continue the loop
		this.animationFrameId = requestAnimationFrame(this.startInferenceLoop);
	}

	private processResults(handResults: HandLandmarkerResult, faceResults: FaceLandmarkerResult) {
		if (handResults.landmarks && handResults.landmarks.length > 0) {
			if (isAbsoluteCinemaPose(handResults.landmarks)) {
				this.consecutivePoseFrames++;
				if (this.consecutivePoseFrames >= this.REQUIRED_FRAMES) {
					this.triggerAbsoluteCinema();
				}
			} else if (isScubaCatPose(handResults.landmarks, faceResults.faceLandmarks)) {
				this.consecutivePoseFrames++;
				if (this.consecutivePoseFrames >= this.REQUIRED_FRAMES) {
					this.triggerScubaCat();
				}
			} else {
				this.consecutivePoseFrames = 0;
			}
		} else {
			this.consecutivePoseFrames = 0;
		}
	}

	private triggerAbsoluteCinema() {
		if (this.isAbsoluteCinema || this.isScubaCat || this.isCooldown) return; // Wait until video finishes and cooldown clears
		this.isAbsoluteCinema = true;
	}

	private triggerScubaCat() {
		if (this.isAbsoluteCinema || this.isScubaCat || this.isCooldown) return; // Wait until video finishes and cooldown clears
		this.isScubaCat = true;
	}

	private drawOverlay(results: HandLandmarkerResult) {
		if (!this.canvasCtx || !this.canvasElement || !this.videoElement) return;

		// Match canvas size to video size
		this.canvasElement.width = this.videoElement.videoWidth;
		this.canvasElement.height = this.videoElement.videoHeight;

		this.canvasCtx.save();
		this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

		// Mirror the canvas so it matches the mirrored video
		this.canvasCtx.translate(this.canvasElement.width, 0);
		this.canvasCtx.scale(-1, 1);

		if (results.landmarks) {
			for (const landmarks of results.landmarks) {
				// Draw the connections (bones)
				this.canvasCtx.strokeStyle = '#000000'; // Black
				this.canvasCtx.lineWidth = 6;
				
				// A simplified skeleton drawing logic
				const drawLine = (startIdx: number, endIdx: number) => {
					if (!this.canvasCtx || !this.canvasElement) return;
					const start = landmarks[startIdx];
					const end = landmarks[endIdx];
					this.canvasCtx.beginPath();
					this.canvasCtx.moveTo(start.x * this.canvasElement.width, start.y * this.canvasElement.height);
					this.canvasCtx.lineTo(end.x * this.canvasElement.width, end.y * this.canvasElement.height);
					this.canvasCtx.stroke();
				};

				// Thumb
				drawLine(0, 1); drawLine(1, 2); drawLine(2, 3); drawLine(3, 4);
				// Index
				drawLine(0, 5); drawLine(5, 6); drawLine(6, 7); drawLine(7, 8);
				// Middle
				drawLine(0, 9); drawLine(9, 10); drawLine(10, 11); drawLine(11, 12);
				// Ring
				drawLine(0, 13); drawLine(13, 14); drawLine(14, 15); drawLine(15, 16);
				// Pinky
				drawLine(0, 17); drawLine(17, 18); drawLine(18, 19); drawLine(19, 20);

				// Draw nodes (joints)
				for (const landmark of landmarks) {
					this.canvasCtx.fillStyle = '#ffffff'; // White inner
					this.canvasCtx.beginPath();
					this.canvasCtx.arc(
						landmark.x * this.canvasElement.width,
						landmark.y * this.canvasElement.height,
						8,
						0,
						2 * Math.PI
					);
					this.canvasCtx.fill();
					
					// Black border for cartoon effect
					this.canvasCtx.lineWidth = 3;
					this.canvasCtx.strokeStyle = '#000000';
					this.canvasCtx.stroke();
				}
			}
		}
		this.canvasCtx.restore();
	}

	destroy() {
		// Clean up memory and hardware
		if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
		if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
		
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
		}
		
		if (this.landmarker) {
			this.landmarker.close();
		}

		if (this.faceLandmarker) {
			this.faceLandmarker.close();
		}
	}
}
