import {assert, getValue, read, createNode, addDetailsParsing, hex0xValue, addHoverValue, addDelayedDetailsParsing, createMemDump, lastOffset, parseInit, dataBuffer, lastNode, stringValue, createDescription, lastSize, lastDescriptionNode, addDescription, decimalValue, bitsValue, bitValue, hexValue, setLastSize} from "./parser";
import {banksValue, coreVersionValue, createCopperDump, createLayer2Screen, createLayer2Screen320, createLayer2Screen640, createLoResScreen, createPalette, createPaletteImage, createPaletteWithOffset, createTimexHiColScreen, createTimexHiResScreen, getPalette, getZxNextDefaultPalette} from "./zxnext";
import {createUlaScreen, getMemBankPermutation, zxColorValue} from './zxspecific';



/**
 * The main program which starts the decoding.
 * Must implement the parseRoot function.
 */



//---- Parse the data (root level) --------
function parseRoot() {
	// Meta info
	let html = '<div>ZX NEX File View.</div>';
	const length = dataBuffer.length;
	html += '<div><b>Length:</b> ' + length + '</div>';
	html += '<br>';
	lastNode.innerHTML = html;
	// End of meta info


	try {
		// Header
		let hasCopperCode;
		let loadScreens;
		let loadScreens2;
		let hiresColor;
		read(512);
		createNode('Header').open = true;
		addDetailsParsing(() => {
			read(4);
			const nextString = stringValue();
			createNode('NEXT', nextString);
			if (nextString != 'Next') {
				// Not a NEX file
				lastDescriptionNode.classList.add('error');
				lastDescriptionNode.textContent = 'Not a NEX file.';
			}

			read(4);
			const version = stringValue();
			let unOfficial;
			if (version == 'V1.3')
				unOfficial = '(unofficial)';
			createNode('VERSION', version, unOfficial);

			read(1);
			const ramRequired = getValue();
			let ramReqValue;
			switch (ramRequired) {
				case 0: ramReqValue = '768k'; break;
				case 1: ramReqValue = '1792k'; break;
				default: ramReqValue = ramRequired.toString();
			}
			createNode('RAM_REQUIRED', ramReqValue, 'The required RAM.');
			addDescription('0 = 768k, 1 = 1792k');
			addHoverValue('Dec: ' + decimalValue());

			read(1);
			createNode('NUM_BANKS', decimalValue(), 'Number of 16k Banks to Load: 0-112');

			read(1);
			loadScreens = getValue();
			createNode('LOAD_SCREENS', bitsValue(), 'Loading-screen blocks in file');
			addDetailsParsing(() => {
				createDescription(`
128 = no palette block, 64 = "flags 2" in V1.3 part of header define screen, 16 = Hi-Colour, 8 = Hi-Res, 4 = Lo-Res, 2 = ULA, 1 = Layer2

The loader does use common banks to load the graphics into, and show it from, i.e. bank5 for all ULA related modes and banks 9,10 and 11 for Layer2 graphics (loading these banks afterwards as regular bank will thus replace the shown data on screen).

Only Layer2, Tilemap and Lo-Res screens expect the palette block (unless +128 flag set). While one can include multiple screen data in single file (setting up all relevant bits), the recommended/expected usage is to have only one type of screen in NEX file.`);
				createNode('No palette block', bitValue(7), 'Bit 7');
				createNode('flags 2', bitValue(6), 'Bit 6');
				createNode('Unused', bitValue(7), 'Bit 5');
				createNode('Hi-Colour', bitValue(4), 'Bit 4');
				createNode('Hi-Res', bitValue(3), 'Bit 3');
				createNode('Lo-Res', bitValue(2), 'Bit 2');
				createNode('ULA', bitValue(1), 'Bit 1');
				createNode('Layer 2', bitValue(0), 'Bit 0');
			});

			read(1);
			createNode('BORDER_COLOR', zxColorValue(), 'Border Color: 0-7');
			addHoverValue('Dec: ' + decimalValue());

			read(2);
			createNode('SP', hex0xValue(), 'Stack pointer');
			addHoverValue('Dec: ' + decimalValue());

			read(2);
			createNode('PC', hex0xValue(), 'Program counter');
			addDescription("0 = don't run, just load");
			addHoverValue('Dec: ' + decimalValue());

			read(2);
			createNode('NUM_FILES', decimalValue(), 'Number of extra files');
			addDescription("Obsolete");

			read(112);
			createNode('BANKS', banksValue(), 'Array of included banks');
			addDetailsParsing(() => {
				createDescription('byte flag (0/1) of 16k banks included in the file - this array is in regular order 0..111, i.e. bank5 in file will set 1 to header byte at offset 18+5 = 23, but the 16kiB of data for bank 5 are first in the file (order of bank data in file is: 5,2,0,1,3,4,6,7,8,9,10,...,111)');
				setLastSize(0);
				for (let i = 0; i < 112; i++) {
					read(1);
					createNode('Bank' + i, decimalValue());
				}
			});

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
			addDetailsParsing(() => {
				createDescription('Required core version, three bytes 0..15 "major", 0..15 "minor", 0..255 "subminor" version numbers. (core version is checked only when reported machine-ID is 10 = "Next", on other machine or emulator=8 the latest loaders will skip the check)');
				//lastSize = 0;
				read(1);
				createNode('MAJOR', decimalValue());
				read(1);
				createNode('MINOR', decimalValue());
				read(1);
				createNode('SUB_MINOR', decimalValue());
			});


			read(1);
			hiresColor = getValue();
			createNode('HIRES_COLOR', bitsValue(), 'Timex HiRes 512x192 mode color');
			addDescription(`Timex HiRes 512x192 mode color, encoded as for port 255 = bits 5-3. I.e. values 0, 8, 16, .., 56 (0..7 * 8)
When screens 320x256x8 or 640x256x4 are used, this byte is re-used as palette offset for Layer 2 mode, values 0..15`);

			read(1);
			createNode('ENTRY_BANK', decimalValue(), 'Bank to be mapped into slot 3');
			addDescription('Entry bank = bank to be mapped into slot 3 (0xC000..0xFFFF address space), the "Program Counter" (header offset +14) and "File handle address" (header offset +140) are used by NEX loader after the mapping is set (The default ZX128 has bank 0 mapped after reset, which makes zero value nice default).');

			read(2);
			createNode('FILE_HANDLE_ADDR', hexValue(), 'File handle address');
			addDescription('0 = NEX file is closed by the loader, 1..0x3FFF values (1 recommended) = NEX loader keeps NEX file open and does pass the file handle in BC register, 0x4000..0xFFFF values (for 0xC000..0xFFFF see also "Entry bank") = NEX loader keeps NEX file open and the file handle is written into memory at the desired address.');
			addHoverValue('Dec: ' + decimalValue());
			// End of version 1.2 header
			assert(lastOffset + lastSize == 142);

			if (version <= "V1.2") {
				// Version 1.0 or 1.1
				const remaining = 512 - 142;
				read(remaining);
				createNode('RESERVED');
				addDescription('Reserved for future extensions.');
				addDelayedDetailsParsing(() => {
					read(remaining);
					createMemDump();
				});
			}
			else {
				// Version 1.3 or bigger
				read(1);
				createNode('EXPBUS_ENABLE', decimalValue(), 'Enable Expansion Bus');
				addDescription('0 = disable Expansion Bus by setting top four bits of Expansion Bus Enable Register ($80) to 0, 1 = do nothing (does apply only to cores 3.0.5+)');

				read(1);
				createNode('HAS_CHECKSUM', decimalValue());
				addDescription('1 = Has checksum value, checksum algorithm is CRC-32C (Castagnoli), value itself is at the very end of the header block');

				read(4);
				createNode('BANKS_OFFSET', hexValue(), 'File offset of first bank data');
				addDescription('File offset of first bank data (when loader is parsing known version, it should know where the banks start without this value, but it may use it for extra check whether the parsing of optional blocks between header and first bank was done correctly for files V1.3+, or it may even try to partially-load unknown future versions of NEX files by skipping unknown blocks between header and banks data, although that may lead to unexpected state for the app)');
				addHoverValue('Dec: ' + decimalValue());

				read(2);
				createNode('CLI_BUFFER_ADDR', decimalValue(), 'CLI buffer address');
				addDescription('CLI buffer address (after "Entry bank" is paged in), 0 = no buffer');

				read(2);
				createNode('CLI_BUFFER_SIZE', decimalValue(), 'CLI buffer size');
				addDescription('When address and size are provided, the original argument line passed to NEX loader will be copied to defined buffer (and truncated to "size", shorter string may be zero/colon/enter terminated as any other BASIC line) and register DE is set to the buffer address. The maximum size is 2048 bytes (longer lines can be probably salvaged from Bank 5 memory if the NEX file is not loading that bank and the app code search for the original line on its own).');

				read(1);
				loadScreens2 = getValue();
				createNode('LOAD_SCREENS_2', decimalValue(), 'Loading screen flags 2 ');
				addDescription(`When first flag has bit6 +64 set (+128 no-palette is valid for new cases too, other old bits should be NOT mixed with new modes):
1 = Layer 2 320x256x8bpp, blocks: [512B palette +] 81920B data
2 = Layer 2 640x256x4bpp, blocks: [512B palette +] 81920B data
 (HiRes color value 0..15 is used as L2 palette offset - does apply to two new Layer 2 modes)
 For Layer 2 banks 9,10,11,12,13 are used to display the loading screen.
3 = Tilemode screen, block: [512B palette] (plus four configuration bytes in header at offset 154)
 Tilemap data are stored in regular (!) bank 5 - no specialized data block is used.`);

				read(1);
				hasCopperCode = getValue();
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
				addDelayedDetailsParsing(() => {
					read(349);
					createMemDump();
				});

				read(4);
				createNode('CRC32C', decimalValue(), 'Optional checksum');
				addDescription('Optional CRC-32C (Castagnoli) - is calculated by checksumming (initial value is zero) file content from offset 512 (after this field) till end of file, including the optional custom binary appended after regular NEX file. And then continuing with checksumming the first 508 bytes of the header (stopping ahead of this field). This is intended for PC tools working with NEX files, or extra check tool running on Next, but not for regular loading of NEX files (value is stored as "uint32_t" in little-endian way).');
			}

			// Check size
			assert(lastOffset == 512);
		});


		// Palette
		let palette;
		if (!(loadScreens & 0b1000_0000)	// Has no-palette not set
			&& (
				(loadScreens & 0b0000_0101)	// Layer2 or LORES is set
				|| (((loadScreens & 0b0100_0000) && loadScreens2 == 3))	// LOADSCR2 is set and loadScreens2 = 3 (Tilemode)
				)
			)
		{
			read(512);
			palette = getPalette();
			createNode('Palette');
			addDetailsParsing(() => {
				createDescription('Optional palette (for Layer2, LoRes or Tilemap screen).\nPalette consists of 512 bytes (256 palette items from index 0), in 9b colour format: first byte is RRRG_GGBB, second byte is P000_000B (P is priority flag for Layer 2 colours).');
				read(512);
				createPaletteImage();
				createNode('As index array');
				addDelayedDetailsParsing(() => {
					read(512);
					createPalette();
				});
			});
		}
		else {
			// Use default palette
			palette = getZxNextDefaultPalette();
		}

		// Layer 2 loading screen
		if (loadScreens & 0b0000_0001) {
			read(49152);
			createNode('LAYER2_LOAD_SCREEN', '', 'Layer 2 loading screen').open = true;
			addDetailsParsing(() => {
				createDescription('Palette consists of 512 bytes (256 palette items from index 0), in 9b color format: first byte is RRRG_GGBB, second byte is P000_000B (P is priority flag for Layer 2 colours).');
				read(49152);
				createLayer2Screen(palette);
				createNode('Memory dump');
				addDelayedDetailsParsing(() => {
					read(49152);
					createMemDump();
				});
			});
		}

		// ULA loading screen
		if (loadScreens & 0b0000_0010) {
			read(6912);
			createNode('ULA_LOAD_SCREEN', '', 'Classic ULA loading screen').open = true;
			addDetailsParsing(() => {
				read(6912);
				createUlaScreen();
				createNode('Memory dump');
				addDelayedDetailsParsing(() => {
					read(6912);
					createMemDump();
				});
			});
		}

		// LoRes loading screen
		if (loadScreens & 0b0000_0100) {
			read(12288);
			createNode('LORES_LOAD_SCREEN', '', 'LoRes (128x96) loading screen').open = true;
			addDetailsParsing(() => {
				createDescription('Palette consists of 512 bytes (256 palette items from index 0), in 9b color format: first byte is RRRG_GGBB, second byte is P000_000B (P is is not used for LoRes).');
				read(12288);
				createLoResScreen(palette);
				createNode('Memory dump');
				addDelayedDetailsParsing(() => {
					read(12288);
					createMemDump();
				});
			});
		}

		// Timex HiRes loading screen
		if (loadScreens & 0b0000_1000) {
			const timexInkColor = (hiresColor >> 2) & 0b111;
			read(12288);
			createNode('HIRES_LOAD_SCREEN', '', 'Timex HiRes (512x192) loading screen').open = true;
			addDetailsParsing(() => {
				createDescription(`The Timex HiRes mode supports only 2 colors.`);
				read(12288);
				createTimexHiResScreen(timexInkColor);
				createNode('Memory dump');
				addDelayedDetailsParsing(() => {
					read(12288);
					createMemDump();
				});
			});
		}

		// Timex HiCol loading screen
		if (loadScreens & 0b0001_0000) {
			read(12288);
			createNode('HICOL_LOAD_SCREEN', '', 'Timex HiCol (8x1) loading screen').open = true;
			addDetailsParsing(() => {
				createDescription(`HiCol modes uses more attributes. I.e. the attribute applies to 1 byte only.`);
				read(12288);
				createTimexHiColScreen();
				createNode('Memory dump');
				addDelayedDetailsParsing(() => {
					read(12288);
					createMemDump();
				});
			});
		}

		// Layer 2 320x256x8 or 640x256x4 loading screen
		if (loadScreens & 0b0100_0000) {
			read(81920);
			// Check which screen
			switch (loadScreens2) {
				case 1:
					// Layer 2 320x256x8bpp, blocks: [512B palette +] 81920B data
					createNode('LAYER2_320_LOAD_SCREEN', '', 'Layer 2 320x256x8bpp, 1 byte per pixel').open = true;
					addDetailsParsing(() => {
						read(81920);
						const palOffset = hiresColor & 0x0F;
						const offsPalette = createPaletteWithOffset(palette, palOffset);
						createLayer2Screen320(offsPalette);
						createNode('Memory dump');
						addDelayedDetailsParsing(() => {
							read(81920);
							createMemDump();
						});
					});
					break;
				case 2:
					// Layer 2 640x256x8bpp, blocks: [512B palette +] 81920B data
					createNode('LAYER2_320_LOAD_SCREEN', '', 'Layer 2 640x256x4bpp, 4 bits per pixel').open = true;
					addDetailsParsing(() => {
						read(81920);
						const palOffset = hiresColor & 0x0F;
						const offsPalette = createPaletteWithOffset(palette, palOffset);
						createLayer2Screen640(offsPalette);
						createNode('Memory dump');
						addDelayedDetailsParsing(() => {
							read(81920);
							createMemDump();
						});
					});
					break;
			}
		}

		// Copper code
		if (hasCopperCode == 1) {
			read(2048);
			createNode('COPPER_CODE', '', 'Copper code for copper loading-effects');
			addDelayedDetailsParsing(() => {
				read(2048);
				createCopperDump();
			});
		}

		// Memory banks
		for (let b = 0; b < 112; b++) {
			// Check byte flag
			const bank = getMemBankPermutation(b);
			const bankEnabled = (dataBuffer[18 + bank] == 1);
			if (!bankEnabled)
				continue;

			// Decode memory bank
			read(16384);
			createNode('BANK' + bank, '', '16k memory bank');
			addDelayedDetailsParsing(() => {
				read(16384);
				createMemDump();
			});
		}

		// Optional data
		const remainingLength = dataBuffer.length - lastOffset - lastSize;
		assert(remainingLength >= 0);
		if(remainingLength>0) {
			read(remainingLength);
			createNode('OPTIONAL_DATA', '', 'Optional binary data appended after "regular" NEX file content - custom format');
			addDelayedDetailsParsing(() => {
				read(remainingLength);
				createMemDump();
			});
		}

	}
	catch (e) {
		// In case of an error show the rest as memdump.
		// Partly decoded data might be re-dumped.
		const remainingLength = dataBuffer.length - lastOffset;
		assert(remainingLength >= 0);
		if (remainingLength > 0) {
			read(remainingLength);
			createNode('Remaining', '', 'Remaining data after parsing error.');
			addDelayedDetailsParsing(() => {
				read(remainingLength);
				createMemDump();
			});
		}
	}
}


//---- Handle messages from vscode extension --------
window.addEventListener('message', event => {	// NOSONAR
	const message = event.data;

	switch (message.command) {
		case 'setData':
			{
				// Parse
				parseInit(message.snaData);
				// Parse
				parseRoot();
			} break;
	}
});
