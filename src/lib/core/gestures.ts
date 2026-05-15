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
	if (!landmarks || landmarks.length !== 2) return false;

	const getDist = (p1: NormalizedLandmark, p2: NormalizedLandmark) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

	const isPinchNoseHand = (hand: NormalizedLandmark[]) => {
		const wrist = hand[0];
		const pinchDist = getDist(hand[4], hand[8]); // Thumb tip to Index tip
		
		// Are fingers curled into a fist? (Middle and Ring tips closer to wrist than their MCP joints)
		const middleCurled = getDist(hand[12], wrist) < getDist(hand[9], wrist) + 0.05;
		const ringCurled = getDist(hand[16], wrist) < getDist(hand[13], wrist) + 0.05;
		
		// Forgiving check: Distance is small (pinching nose) OR hand is a fist (covering mouth)
		return pinchDist < 0.15 || (middleCurled && ringCurled);
	};

	const isShooingGunHand = (hand: NormalizedLandmark[]) => {
		const wrist = hand[0];

		// Index and Thumb must be extended (tip further from wrist than their base joints)
		const indexExtended = getDist(hand[8], wrist) > getDist(hand[5], wrist);
		const thumbExtended = getDist(hand[4], wrist) > getDist(hand[2], wrist);
		
		// The spread between thumb and index must be wide (not a pinch)
		const spread = getDist(hand[4], hand[8]);

		// This generously accepts both a "Gun" shape and a "Flat Shooing" shape
		return indexExtended && thumbExtended && spread > 0.12;
	};

	const hand0 = landmarks[0];
	const hand1 = landmarks[1];

	const match1 = isPinchNoseHand(hand0) && isShooingGunHand(hand1);
	const match2 = isPinchNoseHand(hand1) && isShooingGunHand(hand0);

	return match1 || match2;
}
