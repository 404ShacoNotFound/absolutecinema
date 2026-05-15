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

	return handsValid === 2;
}
