declare var acquireVsCodeApi: any;
declare var document: any;
declare var window: any;
declare var ImageConvert: any;
declare var UlaScreen: any;

const vscode = acquireVsCodeApi();


/**
 * This js script parses a file, does all the decoding and presents the
 * data in the webview.
 * It is done as script inside the webview (opposed to creating a html file in
 * the extension) to allow lazy loading.
 * Large blocks of data are skipped in the initial pass and decoded only
 * when needed. I.e. when the user expands an item.
 */


// The data to parse.
var dataBuffer: number[];

// Index into snaData
var lastOffset: number;

// The last retrieved data value.
var lastValue: number;

// The last retrieved data size.
var lastSize: number;

// The root node for parsing. New objects are appended here.
var lastNode: any;

// The correspondent node for the details.
var lastContentNode: any;

// The last node used for the title.
var lastNameNode: any;

// The last node used for the value.
var lastValueNode: any;

// The last node used for the description.
var lastLongDescriptionNode: any;


/**
 * Convert array to base 64 string.
 */
function arrayBufferToBase64(buffer) {
	var binary = '';
	var bytes = [].slice.call(new Uint8Array(buffer));
	bytes.forEach((b) => binary += String.fromCharCode(b));
	return window.btoa(binary);
};


/**
 * Creates a node and appends it to parseNode.
 * @param name The name of the value. E.g. "SP".
 * @param valString The value to show.
 * @param shortDescription A short description of the entry.
 */
function createNode(name: string, valString = '', shortDescription = '') {
	// Create new node
	const node = document.createElement("DETAILS");
	//node.classList.add("basenode");
	const html = `
<summary>
	<div class="offset">${lastOffset}</div>
	<div class="size">${lastSize}</div>
	<div class="name">${name}</div>
	<div class="value">${valString}</div>
	<details class="description nomarker" >
		<summary><div>${shortDescription}</div></summary>
		<div></div>
</summary>
<div class="indent"></div>
`;
	node.innerHTML = html;

	// Get child objects
	const childrenNode = node.childNodes;
	lastContentNode = childrenNode[3];
	const summary = childrenNode[1];
	const children = summary.childNodes;
	lastNameNode = children[5];
	lastValueNode = children[7];
	const descriptionNode = children[9];
	const descriptionChildren = descriptionNode.childNodes;
	lastLongDescriptionNode = descriptionChildren[3];

	// Append it
	lastNode.appendChild(node);
}


/**
 * Adds a long description.
 * Will be shown when expanded.
 */
function addDescription(longDescription: string) {
	lastLongDescriptionNode.innerHTML = longDescription;
}


/**
 * Converts \n into <br>.
 */
function convertLineBreaks(s: string) {
	return s.replace(/\n/g, '<br>');
}


/**
 * Sets lastNode to it's last child.
 * This begins a details sections.
 * Indents.
 */
function beginDetails() {
	lastNode = lastContentNode;
}


/**
 * Ends a details sections.
 * Sets lastNode to it's parent.
 * Indents.
 */
function endDetails() {
	lastNode = lastNode.parentNode.parentNode;
}


/**
 * Creates a simple line of contents.
 * @param a
 */
function createLine(a: string, b?: string) {
	// Create new node
	const node = document.createElement("DIV");
	if (b) {
		node.classList.add("content");
		const html = `
<div>${a}</div>
<div>${b}</div>
`;
		node.innerHTML = html;
	}
	else {
		// Just one element
		node.innerHTML = a;
	}
	// Append it
	lastNode.appendChild(node);
}




/**
 * Adds a hover text to lastTitleNode.
 * @param hoverTitleString String to show on hover for the title. Can be undefined.
 */
function addHoverTitle(hoverTitleString: string) {
	lastNameNode.title = hoverTitleString;
}


/**
 * Adds a hover text to lastValueNode.
 * @param hoverValueString String to show on hover for the title. Can be undefined.
 */
function addHoverValue(hoverValueString: string) {
	lastValueNode.title = hoverValueString;
}



/**
 * Returns a hex string.
 * @param value The value to convert.
 * @param size The number of digits (e.g. 2 or 4)
 * @returns E.g. "0Fh" or "12FAh"
 */
function getHexString(value: number, size: number): string {
	if (value == undefined)
		return "".padStart(size, '?');
	const s = value.toString(16).toUpperCase().padStart(size, '0');
	return s;
}


/**
 * Converts index into a string that can be used as hover string.
 */
function getIndexHoverString(i: number): string {
	const s = 'Index (hex): ' + getHexString(i, 4) + '\nIndex (dec): ' + i;
	return s;
}



/**
 * Advances the offset (from previous call) and
 * stores the size for reading.
 * @param size The number of bytes to read.
 */
function read(size: number) {
	lastOffset += lastSize;
	lastSize = size;
}


/**
 * Reads the value from the buffer.
 */
function getValue(): number {
	lastValue = dataBuffer[lastOffset];
	let factor = 1;
	for (let i = 1; i < lastSize; i++) {
		factor *= 256;
		lastValue += factor * dataBuffer[lastOffset + i];
	}
	return lastValue;	// TODO: lastValue not required ?
}



/**
 * @returns The value from the dataBuffer as decimal string.
 */
function decimalValue(): string {
	const val = getValue();
	return val.toString();
}


/**
 * @returns The value from the dataBuffer as hex string.
 */
function hexValue(): string {
	const val = getValue();
	return val.toString(16).toUpperCase();
}


/**
 * @param bit The bit to test
 * @returns The bit value (0 or 1) from the dataBuffer as string.
 */
function bitValue(bit: number): string {
	const val = getValue();
	const result = (val & (1 << bit)) ? '1' : '0';
	return result;
}


/**
 * Reads a text of given size.
 * @returns The data as string.
 */
function stringValue(): string {
	let s = '';
	for (let i = 0; i < lastSize; i++) {
		const c = dataBuffer[lastOffset + i];
		s += String.fromCharCode(c);
	}
	return s;
}





/**
 * Is called if the user opens the details of an item.
 * Decodes the data.
 */
function htmlMemDump(size: number, offset = 0) {
	let html = '';
	let prevClose = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		// Loop given size
		for (let i = 0; i < size; i++) {
			const k = i % 16;
			// Get value
			const iIndex = lastOffset + i;	// For indexing
			const iOffset = offset + i;	// For display
			const val = dataBuffer[iIndex];
			const valString = getHexString(val, 2);
			const valIntString = val.toString();

			// Start of row?
			if (k == 0) {
				// Close previous
				html += prevClose;
				prevClose = '</div>';
				// Calc address
				let addrString = getHexString(iOffset, 4);

				// Check for same values
				let l = i + 1
				for (; l < size; l++) {
					if (val != dataBuffer[lastOffset + l])
						break;
				}
				const l16 = l - (l % 16);
				if (l16 > i + 16) {
					// At least 2 complete rows contains same values
					i = l16 - 1;
					const toAddrString = getHexString(offset + i, 4);
					const hoverText = 'Index (dec): ' + iOffset + '-' + (offset + i) + '\nValue (dec): ' + valIntString;
					html += '<div>';
					html += '<span class="indent mem_index">' + addrString + '-' + toAddrString + ':</span>';
					html += '<span> contain all ' + valString + '</span>';
					continue;
				}

				// Afterwards proceed normal
				html += '<div class="mem_dump"> <div class="indent mem_index">' + addrString + ':</div>';
			}

			// Convert to html
			const hoverText = 'Index (hex): ' + getHexString(iOffset, 4) + '\nIndex (dec): ' + iOffset + '\nValue (dec): ' + valIntString;
			html += '<div class="mem_dump_cell" title="' + hoverText + '">' + valString + '&nbsp;</div>';
		}
		// Close
		html += prevClose;
	}
	catch (e) {
		// Close
		html += prevClose;
		// Error while parsing
		html += '<div class="error indent">Error while parsing.</div>';
	}

	// Append
	lastNode.innerHTML += html;
	// Increase index
	lastOffset += size;
}


/**
 * Creates a collapsible summary/details node.
 * @param title The title of the node.
 * @param size The size of the node.
 */
function htmlDetails(title: string, size: number, func?: () => void) {
	// Create new node
	const detailsNode = document.createElement("DETAILS");
	detailsNode.innerHTML = "<summary>" + title + "</summary>";
	// Indent
	detailsNode.classList.add("indent");

	// Set attributes
	detailsNode.setAttribute('data-index', lastOffset.toString());
	//detailsNode.setAttribute('sna-size', size.toString());

	// Increase index
	lastOffset += size;

	// Append it
	lastNode.appendChild(detailsNode);

	// Install listener
	if (func) {
		detailsNode.addEventListener("toggle", function handler(event: any) {
			// Get parse node and index
			lastNode = event.target;
			const indexString = lastNode.getAttribute('data-index');
			lastOffset = parseInt(indexString);
			func();
			this.removeEventListener("toggle", handler);
		});
	}

	// Return
	return detailsNode;
}




//---- Handle messages from vscode extension --------
window.addEventListener('message', event => {
	const message = event.data;

	switch (message.command) {
		case 'setData':
			{
				// Store in global variable
				dataBuffer = message.snaData;
				lastOffset = 0;
				lastSize = 0;
				// Parse
				parseRoot();
			} break;
	}
});

