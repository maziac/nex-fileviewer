declare var acquireVsCodeApi: any;
declare var document: any;
declare var window: any;
declare var ImageConvert: any;
declare var UlaScreen: any;

declare var dataBuffer: number[];
declare var lastOffset: number;
declare var lastNode: any;



/**
 * The main program which starts the decoding.
 * Must implement the parseRoot function.
 */


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



//---- Parse the data (root level) --------
function parseRoot() {
	lastNode = document.getElementById("div_root");

	const htmlContent = lastNode.innerHTML;

	// Meta info
	let html = '<div>ZX NEX File.</div>';
	const length = dataBuffer.length;
	html += '<div><b>Length:</b> ' + length + '</div>';
	html += '<br>';
	lastNode.innerHTML = html;
	// End of meta info

	// Header
	{
		createNode('Header');
		{
			beginDetails();

			read(4);
			createNode('Next', stringValue());

			read(4);
			createNode('Version', stringValue());

			read(1);
			createNode('NUMBANKS', decimalValue(), 'Number of 16k Banks to Load: 0-112');

			read(1);
			createNode('LOADSCR', hexValue(), 'Loading-screen blocks in file');
			const loadScrDescr = convertLineBreaks(`
128 = no palette block, 64 = "flags 2" in V1.3 part of header define screen, 16 = Hi-Colour, 8 = Hi-Res, 4 = Lo-Res, 2 = ULA, 1 = Layer2

The loader does use common banks to load the graphics into, and show it from, i.e. bank5 for all ULA related modes and banks 9,10 and 11 for Layer2 graphics (loading these banks afterwards as regular bank will thus replace the shown data on screen).

Only Layer2, Tilemap and Lo-Res screens expect the palette block (unless +128 flag set). While one can include multiple screen data in single file (setting up all relevant bits), the recommended/expected usage is to have only one type of screen in NEX file.`);
			addDescription(loadScrDescr);

			beginDetails();
			createLine('No palette block', bitValue(7));
			createLine('flags 2', bitValue(6));
			createLine('Unused', bitValue(7));
			createLine('Hi-Colour', bitValue(4));
			createLine('Hi-Res', bitValue(3));
			createLine('Lo-Res', bitValue(2));
			createLine('ULA', bitValue(1));
			createLine('Layer 2', bitValue(0));
			//createLine('');
			createLine(loadScrDescr);
			endDetails();


			read(1);
			createNode('BORDERCOL', zxColorValue(), 'Border Color: 0-7');
			addHoverValue(decimalValue());

			read(2);
			createNode('SP', hexValue(), 'Stack pointer');
			addHoverValue(decimalValue());
		}

		/*
		lastNode = htmlDetails("Header");


		// Read all header info directly.
		htmlString('NEXT', 4);
		htmlString('Version', 4);

		let userRoles = new Map([
			[1, 'admin']
		]);

		htmlData('RAMREQ', 1, [[0, '768k'], [1, '1792k']]);
		htmlData('RAMREQ', 1, value => {
			switch (value) {
				case 0: return '768k';
				case 1: return '1792k';
				default: return 'Unknown';
			}
		});


		readValue(1);
		createNode('NUMBANKS', decimalValue());
		addHoverTitle('Number of 16k Banks to Load: 0-112');

		readValue(1);
		htmlData('LOADSCR', decimalValue());
		addHoverTitle(`Loading-screen blocks in file (bit-flags):
128 = no palette block, 64 = "flags 2" in V1.3 part of header define screen, 16 = Hi-Colour, 8 = Hi-Res, 4 = Lo-Res, 2 = ULA, 1 = Layer2

The loader does use common banks to load the graphics into, and show it from, i.e. bank5 for all ULA related modes and banks 9,10 and 11 for Layer2 graphics (loading these banks afterwards as regular bank will thus replace the shown data on screen).

Only Layer2, Tilemap and Lo-Res screens expect the palette block (unless +128 flag set). While one can include multiple screen data in single file (setting up all relevant bits), the recommended/expected usage is to have only one type of screen in NEX file.`);

		beginDetails();
		htmlData('No palette block', bitValue(0x80));
		htmlData('flags 2', bitValue(0x40));
		htmlData('Unused', bitValue(0x20));
		htmlData('Hi-Colour', bitValue(0x10));
		htmlData('Hi-Res', bitValue(0x08));
		htmlData('Lo-Res', bitValue(0x04));
		htmlData('ULA', bitValue(0x02));
		htmlData('Layer 2', bitValue(0x01));
		endDetails();

		readData(1);
		htmlData('BORDERCOL', colorValue(), 'dec');
		addHoverTitle('Border Colour: 0-7');
		addHoverValue(decimalValue());

		readData(2);
		htmlData('SP', hexValue());
		addHoverTitle('Stack pointer');
		addHoverValue('decimalValue');

		html('SP');
		html('PC');
		html('NUMFILES');
		html('BANKS');
		html('LOADBAR');
		html('LOADCOL');
		html('LOADDEL');
		html('STARTDEL');
		html('DONTRESETNEXTREGS');
		html('CORE_MAJOR');
		html('CORE_MINOR');
		html('CORE_SUBMINOR');
		html('HIRESCOL');
		html('ENTRYBANK');
		html('FILEHANDLEADDR');
		html('EXPBUSDISABLE');
*/

		/*
		htmlMemDump(512);
		// Restore parseNode
		lastNode = lastNode.parentNode;
	}


	// Header
	htmlDetails("Headerb", 512, () => {
		htmlMemDump(512);
	});

	// Header
	htmlDetails("Headerc", 512, () => {
		htmlMemDump(512);
	});

	// Header
	htmlDetails("Header", 512, () => {
		htmlMemDump(512);
	});

	// Header
	htmlDetails("Header", 512, () => {
		htmlMemDump(512);
	});

	// Header
	htmlDetails("Header", 512, () => {
		htmlMemDump(512);
	});

	// Header
	htmlDetails("Header", 512, () => {
		htmlMemDump(512);
	});

	// Get registers
	htmlByte("I");
	htmlWord("HL'");
	htmlWord("DE'");
	htmlWord("BC'");
	htmlWord("AF'");
	htmlWord("HL");
	htmlWord("DE");
	htmlWord("BC");
	htmlWord("IY");
	htmlWord("IX");
	htmlByte("Interrupt");
	htmlByte("R");
	htmlWord("AF");

	const sp = readData(2);
	htmlTitleValue("SP", sp, 2);

	htmlByte("IM");
	htmlByte("Border");


	// ZX48K
	const mem4000 =
	htmlDetails("4000-7FFF", 0x4000, () => {
		const index = lastOffset;	// Save
		// Details as picture
		const screen =
		htmlDetails("Screen", 0x4000, () => {
			htmlUlaScreen();
		});
		// Details as mem dump
		lastOffset = index;	// Restore
		htmlDetails("Memory Dump", 0x4000, () => {
			htmlMemDump(0x4000, 0x4000);
		});
		// Open screen by default
		screen.open = true;
	});
	htmlDetails("8000-BFFF", 0x4000, () => {
		htmlMemDump(0x4000, 0x8000);
	});
	htmlDetails("C000-FFFF", 0x4000, () => {
		htmlMemDump(0x4000, 0xC000);
	});

	// Open the loading screen
	mem4000.open = true;
*/
	}
}

