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
		createNode('Header').open = true;
		{
			beginDetails();

			read(4);
			createNode('NEXT', stringValue());

			read(4);
			const version = stringValue();
			createNode('VERSION', version);

			read(1);
			createNode('NUM_BANKS', decimalValue(), 'Number of 16k Banks to Load: 0-112');

			read(1);
			createNode('LOAD_SCREENS', bitsValue(), 'Loading-screen blocks in file');
			const loadScrDescr = convertLineBreaks(`
128 = no palette block, 64 = "flags 2" in V1.3 part of header define screen, 16 = Hi-Colour, 8 = Hi-Res, 4 = Lo-Res, 2 = ULA, 1 = Layer2

The loader does use common banks to load the graphics into, and show it from, i.e. bank5 for all ULA related modes and banks 9,10 and 11 for Layer2 graphics (loading these banks afterwards as regular bank will thus replace the shown data on screen).

Only Layer2, Tilemap and Lo-Res screens expect the palette block (unless +128 flag set). While one can include multiple screen data in single file (setting up all relevant bits), the recommended/expected usage is to have only one type of screen in NEX file.`);
			addDescription(loadScrDescr);

			beginDetails();
			createDescription(loadScrDescr);
			createNode('No palette block', bitValue(7), 'Bit 7');
			createNode('flags 2', bitValue(6), 'Bit 6');
			createNode('Unused', bitValue(7), 'Bit 5');
			createNode('Hi-Colour', bitValue(4), 'Bit 4');
			createNode('Hi-Res', bitValue(3), 'Bit 3');
			createNode('Lo-Res', bitValue(2), 'Bit 2');
			createNode('ULA', bitValue(1), 'Bit 1');
			createNode('Layer 2', bitValue(0), 'Bit 0');
			//createLine('');
			//createLine(loadScrDescr);
			endDetails();


			read(1);
			createNode('BORDER_COLOR', zxColorValue(), 'Border Color: 0-7');
			addHoverValue(decimalValue());

			read(2);
			createNode('SP', hex0xValue(), 'Stack pointer');
			addHoverValue(decimalValue());

			read(2);
			createNode('PC', hex0xValue(), 'Program counter');
			addDescription("0 = don't run, just load");
			addHoverValue(decimalValue());

			read(2);
			createNode('NUM_FILES', decimalValue(), 'Number of extra files');
			addDescription("Obsolete");

			read(112);
			createNode('BANKS', banksValue(), 'Array of included banks');
			let descr = 'byte flag (0/1) of 16k banks included in the file - this array is in regular order 0..111, i.e. bank5 in file will set 1 to header byte at offset 18+5 = 23, but the 16kiB of data for bank 5 are first in the file (order of bank data in file is: 5,2,0,1,3,4,6,7,8,9,10,...,111)';
			addDescription(descr);
			beginDetails();
			createDescription(descr);
			lastSize = 0;
			for (let i = 0; i < 112; i++) {
				read(1);
				createNode('Bank'+i, decimalValue());
			}
			endDetails();

			read(1);
			createNode('LOAD_BAR', decimalValue(), 'Layer2 "loading bar"');
			addDescription('0 = OFF, 1 = ON(works only in combination with Layer2 screen data) ');

			read(1);
			createNode('LOAD_COLOR', decimalValue(), '"Loading bar" color');
			addDescription('"Loading bar" color (0..255) (for 640x256x4 mode the byte defines pixels pair)');

			read(1);
			createNode('LOAD_DELAY', decimalValue(), 'Loading delay per bank');
			addDescription('Loading delay per bank (0..255 amount of frames), 0 = no delay');

			read(1);
			createNode('START_DELAY', decimalValue(), 'Start delay');
			addDescription('Start delay (0..255 amount of frames), 0 = no delay');

			read(1);
			createNode('PRESERVE_NEXT_REGS', decimalValue(), 'Preserve Next-Registers');
			addDescription('Preserve current Next-Registers values (0 = reset machine state, 1 = preserve)');

			read(3);
			createNode('CORE_VERSION', coreVersionValue(), 'Required core version');
			beginDetails();
			createDescription('Required core version, three bytes 0..15 "major", 0..15 "minor", 0..255 "subminor" version numbers. (core version is checked only when reported machine-ID is 10 = "Next", on other machine or emulator=8 the latest loaders will skip the check)');
			lastSize = 0;
			read(1);
			createNode('MAJOR', decimalValue());
			read(1);
			createNode('MINOR', decimalValue());
			read(1);
			createNode('SUB_MINOR', decimalValue());
			endDetails();


			read(1);
			createNode('HIRES_COLOR', bitsValue(), 'Timex HiRes 512x192 mode color');
			addDescription(`Timex HiRes 512x192 mode color, encoded as for port 255 = bits 5-3. I.e. values 0, 8, 16, .., 56 (0..7 * 8)
When screens 320x256x8 or 640x256x4 are used, this byte is re-used as palette offset for Layer 2 mode, values 0..15`);

			read(1);
			createNode('ENTRY_BANK', decimalValue(), 'Bank to be mapped into slot 3');
			addDescription('Entry bank = bank to be mapped into slot 3 (0xC000..0xFFFF address space), the "Program Counter" (header offset +14) and "File handle address" (header offset +140) are used by NEX loader after the mapping is set (The default ZX128 has bank 0 mapped after reset, which makes zero value nice default).');

			read(2);
			createNode('FILE_HANDLE_ADDR', hexValue(), 'File handle address');
			addDescription('0 = NEX file is closed by the loader, 1..0x3FFF values (1 recommended) = NEX loader keeps NEX file open and does pass the file handle in BC register, 0x4000..0xFFFF values (for 0xC000..0xFFFF see also "Entry bank") = NEX loader keeps NEX file open and the file handle is written into memory at the desired address.');
			addHoverValue(decimalValue());
			// End of version 1.2 header

			if (version >= "V1.2") {
				read(1);
				createNode('EXPBUS_ENABLE', decimalValue(), 'Enable Expansion Bus');
				addDescription('0 = disable Expansion Bus by setting top four bits of Expansion Bus Enable Register ($80) to 0, 1 = do nothing (does apply only to cores 3.0.5+)');

				read(1);
				createNode('HAS_CHECKSUM', decimalValue());
				addDescription('1 = Has checksum value, checksum algorithm is CRC-32C (Castagnoli), value itself is at the very end of the header block');

				read(4);
				createNode('BANKS_OFFSET', hexValue(), 'File offset of first bank data');
				addDescription('File offset of first bank data (when loader is parsing known version, it should know where the banks start without this value, but it may use it for extra check whether the parsing of optional blocks between header and first bank was done correctly for files V1.3+, or it may even try to partially-load unknown future versions of NEX files by skipping unknown blocks between header and banks data, although that may lead to unexpected state for the app)');
				addHoverValue(decimalValue());

				read(2);
				createNode('CLI_BUFFER_ADDR', decimalValue(), 'CLI buffer address');
				addDescription('CLI buffer address (after "Entry bank" is paged in), 0 = no buffer');

				read(2);
				createNode('CLI_BUFFER_SIZE', decimalValue(), 'CLI buffer size');
				addDescription('When address and size are provided, the original argument line passed to NEX loader will be copied to defined buffer (and truncated to "size", shorter string may be zero/colon/enter terminated as any other BASIC line) and register DE is set to the buffer address. The maximum size is 2048 bytes (longer lines can be probably salvaged from Bank 5 memory if the NEX file is not loading that bank and the app code search for the original line on its own).');

				read(1);
				createNode('LOAD_SCREENS_2', decimalValue(), 'Loading screen flags 2 ');
				addDescription(`When first flag has bit6 +64 set (+128 no-palette is valid for new cases too, other old bits should be NOT mixed with new modes):
1 = Layer 2 320x256x8bpp, blocks: [512B palette +] 81920B data
2 = Layer 2 640x256x4bpp, blocks: [512B palette +] 81920B data
 (HiRes color value 0..15 is used as L2 palette offset - does apply to two new Layer 2 modes)
 For Layer 2 banks 9,10,11,12,13 are used to display the loading screen.
3 = Tilemode screen, block: [512B palette] (plus four configuration bytes in header at offset 154)
 Tilemap data are stored in regular (!) bank 5 - no specialized data block is used.`);

				read(1);
				createNode('HAS_COPPER_CODE', decimalValue(), 'Inclusion of copper code');
				addDescription('1 = Has copper code block, extra 2048B block after last screen data block, which will be set to Copper and the copper will be started with %01 control code (reset CPC to 0, and start). This can be used for example as "loading screen animation" feature (be aware the timing of load may vary greatly).');

				read(4);
				createNode('TILE_SCR_CONFIG', decimalValue(), 'Tilemode screen configuration');
				addDescription('When Tilemode screen: four bytes array, values to set NextRegs: $6B, $6C, $6E, $6F');

				read(1);
				createNode('BIG_L2_BAR_POSY', decimalValue(), 'Loading bar y-position');
				addDescription('When Layer 2 320x256 or 640x256 screen + loading bar: loading bar Y position (bar is 2px tall, so 254 is very bottom)');

				read(349);
				createNode('RESERVED');
				addDescription('Reserved for future extensions, set to zero in older versions of file format.');
				addDelayedParsing(() => {
					read(349);
					createMemDump();
				});

				read(4);
				createNode('CRC32C', decimalValue(), 'Optional checksum');
				addDescription('Optional CRC-32C (Castagnoli) - is calculated by checksumming (initial value is zero) file content from offset 512 (after this field) till end of file, including the optional custom binary appended after regular NEX file. And then continuing with checksumming the first 508 bytes of the header (stopping ahead of this field). This is intended for PC tools working with NEX files, or extra check tool running on Next, but not for regular loading of NEX files (value is stored as "uint32_t" in little-endian way).');
			}
		}

/*
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

