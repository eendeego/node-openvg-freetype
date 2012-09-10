var rendering = module.exports;

var vg = require('openvg');

// textwidth returns the width of a text string at the specified font and size.
var textWidth = rendering.textWidth = function(s, f, size) {
  var tw = 0.0;
  for (var i = 0; i < s.length; i++) {
    var character = s.charCodeAt(i);
    var glyph = f.characterMap[character];
    if (glyph == -1) {
      continue; //glyph is undefined
    }
    tw += size * f.glyphAdvances[glyph] / 65536.0;
  }
  return tw;
}

// Text renders a string of text at a specified location, size, using the specified font glyphs
// derived from http://web.archive.org/web/20070808195131/http://developer.hybrid.fi/font2openvg/renderFont.cpp.txt
var drawText = rendering.drawText = function(x, y, s, f, pointsize) {
  var size = pointsize, xx = x, mm = new Float32Array(9);

  vg.getMatrix(mm);
  for (var i = 0; i < s.length; i++) {
    var character = s.charCodeAt(i);
    var glyph = f.characterMap[character];
    if (glyph == -1) {
      continue;  //glyph is undefined
    }
    var mat = new Float32Array([
      size, 0.0, 0.0,
      0.0, size, 0.0,
      xx, y, 1.0
    ]);
    vg.loadMatrix(mm);
    vg.multMatrix(mat);
    vg.drawPath(f.glyphs[glyph],
                vg.VGPaintMode.VG_FILL_PATH | vg.VGPaintMode.VG_STROKE_PATH);
    xx += size * f.glyphAdvances[glyph] / 65536.0;
  }
  vg.loadMatrix(mm);
}

// Render center aligned text
var textMiddle = rendering.textMiddle = function(x, y, s, f, pointsize) {
  var tw = textWidth(s, f, pointsize);
  drawText(x - (tw / 2.0), y, s, f, pointsize);
}
