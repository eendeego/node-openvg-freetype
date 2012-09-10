var ft = module.exports = require('./build/Release/node-openvg-freetype.node');

var loading = require('./lib/loading');
var rendering = require('./lib/rendering');

ft.LOAD_DEFAULT                      = 0x0;
ft.LOAD_NO_SCALE                     = 1 <<  0;
ft.LOAD_NO_HINTING                   = 1 <<  1;
ft.LOAD_RENDER                       = 1 <<  2;
ft.LOAD_NO_BITMAP                    = 1 <<  3;
ft.LOAD_VERTICAL_LAYOUT              = 1 <<  4;
ft.LOAD_FORCE_AUTOHINT               = 1 <<  5;
ft.LOAD_CROP_BITMAP                  = 1 <<  6;
ft.LOAD_PEDANTIC                     = 1 <<  7;
ft.LOAD_IGNORE_GLOBAL_ADVANCE_WIDTH  = 1 <<  9;
ft.LOAD_NO_RECURSE                   = 1 << 10;
ft.LOAD_IGNORE_TRANSFORM             = 1 << 11;
ft.LOAD_MONOCHROME                   = 1 << 12;
ft.LOAD_LINEAR_DESIGN                = 1 << 13;
ft.LOAD_NO_AUTOHINT                  = 1 << 15;

/* used internally only by certain font drivers! */
ft.LOAD_ADVANCE_ONLY                 = 1 <<  8;
ft.LOAD_SBITS_ONLY                   = 1 << 14;

var library = ft.library = ft.initFreeType();

function done() {
  ft.doneFreeType(library);
}

process.on('exit', done);

ft.loadFontFile = loading.loadFontFile;
ft.loadFont     = loading.loadFont;
ft.loadJSONFont = loading.loadJSONFont;
ft.unloadFont   = loading.unloadFont;

ft.textWidth    = rendering.textWidth;
ft.drawText     = rendering.drawText;
ft.textMiddle   = rendering.textMiddle;
