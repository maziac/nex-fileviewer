declare var dataBuffer: number[];
declare var lastOffset: number;
declare var lastNode: any;




/**
 * Returns the right bank for an index.
 *  5,2,0,1,3,4,6,7,8,9,10,...,111.
 * @returns the bank number 0-111.
 */
function getMemBankPermutation(i: number): number {
	if (i >= 6)
		return i;
	return [5, 2, 0, 1, 3, 4][i];
}


/**
 * Is called if the user opens the details of for the ULA screen.
 * Decodes the image data
 */
function htmlUlaScreen() {
	// Image
	try {
		// Check size
		if (lastOffset + UlaScreen.SCREEN_SIZE > dataBuffer.length)
			throw Error();
		// Convert image
		const ulaScreen = new UlaScreen(dataBuffer, lastOffset);
		const imgBuffer = ulaScreen.getUlaScreen();
		// Create gif
		const base64String = arrayBufferToBase64(imgBuffer);
		// Add to html
		lastNode.innerHTML += '<img width="500px" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Return a ZX color value.
 */
function zxColorValue() {
	const val = getValue();
	switch (val) {
		case 0: return "BLACK";
		case 0: return "BLUE";
		case 0: return "RED";
		case 0: return "MAGENTA";
		case 0: return "GREEN";
		case 0: return "CYAN";
		case 0: return "YELLOW";
		case 0: return "WHITE";
	}
	return "UNKNOWN";
}


/**
 * @returns The core version number.
 */
function coreVersionValue(): string {
	const charOffset = '0'.charCodeAt(0);
	let s = String.fromCharCode(charOffset + dataBuffer[lastOffset]) + '.';
	s += String.fromCharCode(charOffset + dataBuffer[lastOffset + 1]) + '.';
	s += String.fromCharCode(charOffset + dataBuffer[lastOffset + 2]);
	return s;
}


/**
 * @returns The included banks. If string gets too long '...' is returned instead.
 */
function banksValue(): string {
	let s = '';
	for (let i = 0; i < lastSize; i++) {
		const val = dataBuffer[lastOffset + i];
		if (val == 1) {
			s += i + ' ';
			if (s.length > 15)
				return '...';
		}
	}
	return s;
}


/**
 * Creates a palette from dataBuffer.
 * 512 bytes are converted to 256 palette entries each in the format:
 * RRRGGGBB  P000000B
 * With P being the priority bit for Layer 2.
 */
function createPalette() {
	let html = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		// Loop given size
		for (let i = 0; i < lastSize; i += 2) {
			// Get value
			const iOffset = lastOffset + i;	// For indexing
			const iRelOffset = i / 2;	// For display
			const val0 = dataBuffer[iOffset];
			const val1 = dataBuffer[iOffset + 1];
			// Decode to RGB
			const red = val0 >> 5;
			const green = (val0 >> 2) & 0b111;
			const blue = ((val0 << 1) & 0b110) + (val1 & 0b1);
			const priority = val1 >> 7;

			// Start of row
			const iOffsetHex = getHexString(iOffset, 4);
			const val = 256 * val1 + val0;
			const bitsString = convertBitsToString(val, 2);
			html += `<div class="mem_dump">
					<div class="indent mem_offset" title = "Offset\nHex: ${iOffsetHex}">${iOffset}</div>
				<div class="mem_rel_offset"> [${iRelOffset}]</div>`;

			// Hex values
			const valHex = getHexString(val, 4);
			const hoverText = 'Bin: P000_000B_RRRG_GGBB = ' + bitsString;
			html += '<div class="mem_byte" title="' + hoverText + '">0x' + valHex + ':</div>';

			// RGB values
			html += '<div class="mem_byte">R=' + red + ',</div>';
			html += '<div class="mem_byte">G=' + green + ',</div>';
			html += '<div class="mem_byte">B=' + blue + ',</div>';
			html += '<div class="mem_byte">P=' + priority + '</div>';

			// As color
			const colorHex = getHexString(red * 32, 2) + getHexString(green * 32, 2) + getHexString(blue * 32, 2)
			html += '<div class="mem_byte" style="background:#'+colorHex+'" title="#'+colorHex+'">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>';

			// Close
			html += '</div>';
		}
	}
	catch (e) {
		// Close
		html += '</div>';
		// Error while parsing
		html += '<div class="error indent">Error while parsing.</div>';
	}

	// Append
	lastNode.innerHTML += html;
}

