#!/usr/bin/env node

// This script is based on http://web.archive.org/web/20070808195154/http://developer.hybrid.fi/font2openvg/font2openvg.cpp.txt

/*
* Copyright (c) 2006, Hybrid Graphics, Ltd.
* All rights reserved.
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
*     * Redistributions of source code must retain the above copyright
*       notice, this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above copyright
*       notice, this list of conditions and the following disclaimer in the
*       documentation and/or other materials provided with the distribution.
*     * The name of Hybrid Graphics may not be used to endorse or promote products
*       derived from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY HYBRID GRAPHICS ``AS IS'' AND ANY
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL HYBRID GRAPHICS BE LIABLE FOR ANY
* DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

"use strict";

var fs = require('fs');
var util = require('util');
var ft = require('../freetype');

var OUTPUT_INTS = true;
var maxCharacter = 255;

var debugOutput = false;

var TAG_ON_CURVE    = 1 << 0;
var TAG_THIRD_ORDER = 1 << 1;
var TAG_DROP_OUT    = 1 << 2;
var TAG_RESERVED_1  = 1 << 3;
var TAG_RESERVED_2  = 1 << 4;
var TAG_DROPOUT_MODE_MASK = 0x07 << 5;

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mult(a, b) {
  return { x: a.x * b, y: a.y * b };
}
function convFTFixed(x) {
  return x / 4096.0;
}

function convFTVector(v) {
  return { x: convFTFixed(v.x), y: convFTFixed(v.y) };
}

function toVector(array, index) {
  return { x: array[index*2], y: array[index*2 + 1] };
}

function isOn(b) {
  return b & 1;
}

function dumpArray(a) {
  if(a === undefined) return "undefined";
  if(a === null) return "null";
  if(a.length === 0) return "[]";

  var result = "[ " + a[0];
  for(var i = 1; i < a.length; i++) {
    result += ", " + a[i];
  }
  return result + "]";
}

if(process.argv.length < 3) {
  console.log("usage: font2openvg.js input_font_file output.json [max char]\n");
  process.exit(-1);
}

var source = process.argv[2];
var dest   = process.argv[3];

if (process.argv[4] && process.argv[4]-0 > 0) {
  maxCharacter = process.argv[4]-0;
}

console.log("Reading : " + source);
console.log("Creating: " + dest);

var fontBuffer = new Buffer(fs.readFileSync(source, 'binary'), 'binary');

var library = ft.library;

var faceIndex = 0;
var face = ft.newMemoryFace(library, fontBuffer, faceIndex);

console.log("Font read successfully.");

ft.setCharSize(face,   /* handle to face object           */
               0,      /* char_width in 1/64th of points  */
               64*64,  /* char_height in 1/64th of points */
               96,     /* horizontal device resolution    */
               96);    /* vertical device resolution      */

var gpvecindices = [];
var givecindices = [];
var gpvecsizes = [];
var givecsizes = [];
var gpvec = [];
var givec = [];
var gbbox = [];
var advances = [];

var characterMap = new Array(maxCharacter + 1);
var glyphs = 0;
for(var cc = 0; cc <= maxCharacter; cc++) {
  characterMap[cc] = -1; // initially nonexistent

  if (cc < 32) continue; // discard the first 32 characters

  var glyphIndex = ft.getCharIndex(face, cc);

  ft.loadGlyph(face,
               glyphIndex,
               ft.LOAD_NO_BITMAP | ft.LOAD_NO_HINTING | ft.LOAD_IGNORE_TRANSFORM);

  if (debugOutput) {
    console.log("Character: " + cc);
    console.log("  advance: " + util.inspect(face.glyph.advance));
    console.log("    (output): " + face.glyph.advance.x + " -> " + convFTFixed(face.glyph.advance.x));
    console.log("  outline:");
    console.log("    points(" + face.glyph.outline.nPoints + "):");
    console.log("      " + dumpArray(face.glyph.outline.points));
    console.log("    tags(" + face.glyph.outline.tags.length + "):");
    console.log("      " + dumpArray(face.glyph.outline.tags));
    console.log("    contours(" + face.glyph.outline.nContours + "):");
    console.log("      " + dumpArray(face.glyph.outline.contours));
    console.log("    flags: 0x" + face.glyph.outline.flags.toString(16));
  }

  var advance = convFTFixed(face.glyph.advance.x);
  if (cc == 32) { // space doesn't contain any data
    gpvecindices.push(gpvec.length);
    givecindices.push(givec.length);

    gpvecsizes.push(0);
    givecsizes.push(0);

    gbbox.push(0);
    gbbox.push(0);
    gbbox.push(0);
    gbbox.push(0);

    advances.push(advance);

    // write glyph index to character map
    characterMap[cc] = glyphs++;
    continue;
  }

  var outline = face.glyph.outline;
  var pvec = [];
  var ivec = [];
  var minx = 10000000.0, miny = 100000000.0, maxx = -10000000.0, maxy = -10000000.0;
  var s = 0, e;
  var on;
  var last, v, nv;
  for(var con=0; con < outline.nContours; ++con) {
    var pnts = 1;
    e = outline.contours[con]+1;
    last = convFTVector(toVector(outline.points,s));

    // read the contour start point
    ivec.push(2);
    pvec.push(last);

    var i = s + 1;
    while (i <= e) {
      var c = (i == e) ? s : i;
      var n = (i == e - 1) ? s : (i + 1);
      v = convFTVector(toVector(outline.points,c));
      on = isOn(outline.tags[c]);
      if (on) { // line
        ++i;
        ivec.push(4);
        pvec.push(v);
        pnts += 1;
      } else { // spline
        if (isOn(outline.tags[n])) { // next on
          nv = convFTVector(toVector(outline.points, n));
          i += 2;
        } else { // next off, use middle point
          nv = mult(add(v, convFTVector(toVector(outline.points, n))), 0.5);
          ++i;
        }
        ivec.push(10);
        pvec.push(v);
        pvec.push(nv);
        pnts += 2;
      }
      last = nv;
    }
    ivec.push(0);
    s = e;
  }

  for(var i=0; i < pvec.length; ++i) {
     if (pvec[i].x < minx) minx = pvec[i].x;
     if (pvec[i].x > maxx) maxx = pvec[i].x;
     if (pvec[i].y < miny) miny = pvec[i].y;
     if (pvec[i].y > maxy) maxy = pvec[i].y;
  }
  if(!pvec.length) {
     minx = 0.0;
     miny = 0.0;
     maxx = 0.0;
     maxy = 0.0;
  }

  gpvecindices.push(gpvec.length);
  givecindices.push(givec.length);

  gpvecsizes.push(pvec.length);
  givecsizes.push(ivec.length);

  gbbox.push(minx);
  gbbox.push(miny);
  gbbox.push(maxx);
  gbbox.push(maxy);
  advances.push(advance);

  gpvec = gpvec.concat(pvec);

  givec = givec.concat(ivec);

  // write glyph index to character map
  characterMap[cc] = glyphs++;
}

if(!glyphs)
  console.log("warning: no glyphs found");
else
  console.log("finished reading");

var out = new Buffer(128*1024);
var pos = 0;

var f = fs.openSync(dest, "w");

function print(str) {
  out.write(str, pos);
  pos += Buffer.byteLength(str);
  if(str.indexOf('\n') != -1) {
    fs.writeSync(f, out, 0, pos);
    pos = 0;
  }
}

function close() {
  fs.writeSync(f, out);
  fs.close(f);
}

console.log("openned file for writing");

var legalese = "/* Generated by font2openvg. See http://developer.hybrid.fi for more information. */";

// print legalese
print("{\n");
// print the name of the font file
print("  \"_comments\" : [\n    \"" + legalese + "\",\n");
print("    \"/* converted from font file " + source + " */\",\n");
print("    \"/* font family name: " + face.family_name + " */\",\n");
print("    \"/* font style name: " + face.style_name + " */\"");
print("\n  ],\n\n");

console.log("written comments");

// print instructions
print("  \"glyphInstructions\" : [");
for(var i = 0; i < givec.length; i++) {
  if ((i % 20) == 0)
    print("\n    ");
  print("" + givec[i]);
  print((i == (givec.length - 1)) ? ' ' : ',');
}
print("\n  ],\n");

console.log("written glyphInstructions");

print("  \"glyphInstructionIndices\" : [");
for(var i = 0; i < givecindices.length; i++) {
  if ((i % 20) == 0)
    print("\n    ");
  print("" + givecindices[i]);
  print((i == (givecindices.length - 1)) ? ' ' : ',');
}
print("\n  ],\n");

console.log("written glyphInstructionIndices");

print("  \"glyphInstructionCounts\" : [");
for(var i = 0; i < givecsizes.length; i++) {
  if ((i % 20) == 0)
    print("\n    ");
  print("" + givecsizes[i]);
  print((i == (givecsizes.length - 1)) ? ' ' : ',');
}
print("\n  ],\n");

console.log("written glyphInstructionCounts");

print("\n  \"glyphPointIndices\" : [");
for(var i = 0; i < gpvecindices.length; i++) {
  if ((i % 20) == 0)
    print("\n    ");
  print("" + gpvecindices[i]);
  print((i == (gpvecindices.length - 1)) ? ' ' : ',');
}
print("\n  ],\n");

console.log("written glyphPointIndices");

if(OUTPUT_INTS) {
  // print points
  print("  \"glyphPoints\" : [");
  for(var i = 0; i < gpvec.length; i++) {
    if ((i % 10) == 0)
      print("\n    ");
    print("" + Math.floor(65536.0 * gpvec[i].x));
    print("," + Math.floor(65536.0 * gpvec[i].y));
    print((i == (gpvec.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n");

  console.log("written glyphPoints");

  // print the advances
  print("  \"glyphAdvances\" : [");
  for(var i = 0; i < advances.length; i++) {
    if ((i % 20) == 0)
      print("\n    ");
    print("" + Math.floor(65536.0 * advances[i]));
    print((i == (advances.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n");

  console.log("written glyphAdvances");

  // print the bounding boxes
  print("  \"glyphBBoxes\" : [");
  for(var i = 0; i < gbbox.length; i++) {
    if ((i % 20) == 0)
      print("\n    ");
    print("" + Math.floor(65536.0 * gbbox[i]));
    print((i == (gbbox.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n\n");

  console.log("written glyphBBoxes");
} else {
  // print points
  print("  \"glyphPoints\" : [");
  for(var i = 0; i < gpvec.length; i++) {
    if ((i % 10) == 0)
      print("\n    ");
    print("" + gpvec[i].x);
    print("," + gpvec[i].y);
    print((i == (gpvec.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n");

  console.log("written glyphPoints");

  // print the advances
  print("  \"glyphAdvances\" : [");
  for(var i = 0; i < advances.length; i++) {
    if ((i % 20) == 0)
      print("\n    ");
    print("" + advances[i]);
    print((i == (advances.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n");

  console.log("written glyphAdvances");

  // print the bounding boxes
  print("  \"glyphBBoxes\" : [");
  for(var i = 0; i < gbbox.length; i++) {
    if ((i % 20) == 0)
      print("\n    ");
    print("" + gbbox[i]);
    print((i == (gbbox.length - 1)) ? ' ' : ',');
  }
  print("\n  ],\n\n");

  console.log("written glyphBBoxes");
}

// print the number of glyphs and the character map
print("  \"glyphCount\" : " + glyphs + ",\n");
print("  \"characterMap\" : [");
for(var i = 0; i <= maxCharacter; i++) {
  if ((i % 20) == 0)
    print("\n    ");
  print("" + characterMap[i]);
  print((i == maxCharacter) ? ' ' : ',');
}
print("\n  ]\n}\n");

console.log("written characterMap");

if(glyphs)
  console.log("" + glyphs + " glyphs written");

close();

ft.doneFace(face);
