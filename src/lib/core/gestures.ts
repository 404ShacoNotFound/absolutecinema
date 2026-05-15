import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Geometric logic to detect the "Absolute Cinema" / "Hands Up" pose.
 * Requires both hands to be visible, wrists below fingertips, and fingers extended.
 */
export function isAbsoluteCinemaPose(landmarks: NormalizedLandmark[][]): boolean {
	// Must detect exactly two hands for this specific pose
	if (!landmarks || landmarks.length !== 2) {
		return false;
	}

	let handsValid = 0;

	for (const hand of landmarks) {
		const wrist = hand[0];
		
		// Finger tips and their corresponding lower joints (PIP/IP) for extension check
		const fingers = [
			{ tip: hand[4], joint: hand[3] },   // Thumb
			{ tip: hand[8], joint: hand[6] },   // Index
			{ tip: hand[12], joint: hand[10] }, // Middle
			{ tip: hand[16], joint: hand[14] }, // Ring
			{ tip: hand[20], joint: hand[18] }  // Pinky
		];

		// 1. Check if all fingers are extended (tip is higher than the joint)
		// Note: In browser canvas/MediaPipe, Y=0 is the top of the screen.
		// So "higher" means a smaller Y value.
		const allFingersExtended = fingers.every(finger => finger.tip.y < finger.joint.y);

		// 2. Check if the hand is raised (wrist is lower than all fingertips)
		const wristIsLowest = fingers.every(finger => wrist.y > finger.tip.y);

		// 3. (Optional but good) Check if hands are generally in the upper half or middle of the screen
		// wrist.y should ideally be < 0.9 to ensure they aren't just resting on a table out of frame.

		if (allFingersExtended && wristIsLowest) {
			handsValid++;
		}
	}

	if (handsValid !== 2) {
		return false;
	}

	// 4. Check alignment (both hands roughly at same height)
	// y coordinates are normalized 0-1, so 0.10 represents 10% of the video height
	const yDiff = Math.abs(landmarks[0][0].y - landmarks[1][0].y);
	if (yDiff > 0.10) {
		return false; // Hands are not aligned closely enough
	}

	// 5. Check if palms are facing forward
	// When hands are raised and palms face forward, thumbs point inward towards each other.
	// This means the distance between the two thumbs should be LESS than the distance between the two pinkies.
	// If the back of the hands are facing the camera, the pinkies point inward, reversing the distance.
	const getDist = (p1: NormalizedLandmark, p2: NormalizedLandmark) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
	
	const thumbDist = getDist(landmarks[0][4], landmarks[1][4]);
	const pinkyDist = getDist(landmarks[0][20], landmarks[1][20]);

	if (thumbDist >= pinkyDist) {
		return false; // Back of hands are facing the camera
	}

	return true;
}

/**
 * Geometric logic to detect the "Scuba Cat" pose.
 * Hand 1: Pinching nose (thumb and index close together).
 * Hand 2: Gun/Shooing shape (thumb extended, index extended, others curled).
 */
export function isScubaCatPose(landmarks: NormalizedLandmark[][]): boolean {
	if (!landmarks || landmarks.length === 0) return false;

	const getDist = (p1: NormalizedLandmark, p2: NormalizedLandmark) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

	const isNoseHoldHand = (hand: NormalizedLandmark[]) => {
		const wrist = hand[0];
		if (wrist.y > 0.8) return false;

		// Use the palm length (wrist to middle finger base) as a scale-invariant benchmark
		const palmLength = getDist(wrist, hand[9]);

		// Calculate straight-line distance from each fingertip to its own base joint (MCP)
		// When fingers are extended, this distance is ~1.0 to 1.2x palmLength.
		// When cupped or in a fist, this distance shrinks significantly.
		const dIndex = getDist(hand[8], hand[5]);
		const dMiddle = getDist(hand[12], hand[9]);
		const dRing = getDist(hand[16], hand[13]);
		const dPinky = getDist(hand[20], hand[17]);

		// A finger is considered curled/cupped if its tip is close to its base
		const indexCurled = dIndex < palmLength * 0.7;
		const middleCurled = dMiddle < palmLength * 0.7;
		const ringCurled = dRing < palmLength * 0.7;
		const pinkyCurled = dPinky < palmLength * 0.7;

		// 1. Is the whole hand cupped over the mouth? (All fingers curled)
		const isCuppedHand = indexCurled && middleCurled && ringCurled && pinkyCurled;

		// 2. Is it a tight nose pinch? (Thumb and Index touching, other fingers curled away)
		const pinchDist = getDist(hand[4], hand[8]); // Thumb tip to Index tip
		const isTightPinch = (pinchDist < palmLength * 0.35) && middleCurled && ringCurled && pinkyCurled;

		// It must mathematically be a curled cup or a tight pinch, not just an open raised hand.
		return isCuppedHand || isTightPinch;
	};

	return landmarks.some(hand => isNoseHoldHand(hand));
}
