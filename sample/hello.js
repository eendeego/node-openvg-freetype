#!/usr/bin/env ./node_modules/openvg/bin/node-pi

var util = require('util');

var vg = require('openvg');
var vu = require('../node_modules/openvg/sample/modules/util');
var ft = require('../freetype');

var countdown = 5;
(function terminator() {
  countdown--;
  setTimeout(countdown === 1 ? vu.finish : terminator, 1000);
})();

var fontPath = '/usr/share/fonts/truetype/ttf-dejavu/DejaVuSerif.ttf';
var width, height;
vu.init({ loadFonts : false });

width  = vg.screen.width;
height = vg.screen.height;

function hello(f) {
  vu.start();                             // Start the picture
  vu.background(0, 0, 0);                 // Black background
  vu.fill(44, 77, 232, 1);                // Big blue marble
  vu.circle(width/2, 0, width);           // The "world"
  vu.fill(255, 255, 255, 1);              // White text
  ft.textMiddle(width/2, height/2,
                "hello, world",
                f, width/10); // Greetings
  vu.end();                               // End the picture
}

if (process.argv.length > 2) {
  fontPath = process.argv[2];
}

var font = ft.loadFontFile(fontPath, function(err, f) {
  hello(f);
});
