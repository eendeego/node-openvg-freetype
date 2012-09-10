# node-openvg-freetype (Freetype bindings for node-openvg)

This module implemenents bindings for Freetype and the necessary functions to load fonts into OpenVG.

Parts of it are based on [Hybrid Graphics font2openvg.cpp](http://web.archive.org/web/20070808195154/http://developer.hybrid.fi/font2openvg/font2openvg.cpp.txt).

## 0. Installation

This library depends on freetype. To install freetype:

    apt-get install -y libfreetype6 libfreetype6-dev

To run samples, the dejavu font set is also expected to be installed:

    apt-get install -y ttf-dejavu-core

To install node-openvg-freetype, fetch the source:

    git clone https://github.com/luismreis/node-openvg-freetype.git

Build the package:

    cd node-openvg-freetype
    node-waf configure build

To test:

    node-pi sample/hello.js
