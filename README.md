# Craftyjs-TiledMap-Renderer
Render a json exported tile map from Tiled using craftyjs

***

### Dependencies
[Pako](https://github.com/nodeca/pako) used for base64 compression handling
```
npm install pako
```
```
// Require pako somewhere in your game before the craftyjs component definition
var pako = require('pako');
```

### Usage
Load the exported map's json file, this is a possible example of how:
```
let mapSource = null;

fetch('path_to_json_file.json').then((response) => {

  return response.json();

}).then((source) => {

   mapSource = source;

});
```

Create the new crafty entity:
```
Crafty.e('MapComponent')
  .render('map_name', mapSource, (mapComponent) => {

    // OPTIONAL CALLBACK WITH
    // THE CREATED ENTITY
    // AS THE PARAMETER

  });
```

### Notes
- Make sure that the sprites are located somewhere reachable from the [craftyjs defined paths](http://craftyjs.com/api/Crafty-paths.html) 
- Make sure that each of the map source's tileset image has a relative reference those defined paths.

### ToDo
- Render Object Layers
