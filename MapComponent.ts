Crafty.c('MapComponent', {

  required: '2D',
  _renderMethod: 'Canvas',

  _name: 'Unnamed',
  _source: null,

  _sprites: [],
  _tilesets: [],
  _tileLayers: [],

  _isValidSource(source: any) {

    let isValid = true;

    if (
      !source || // is not undefined
      !(source.width && source.height) || // has width and height property
      !(source.layers && source.layers.length >= 1) || // has no empty layer property
      !(source.tilesets && source.tilesets.length >= 1) // has no empty tilesets property
    ) {

      isValid = false;

    }

    return isValid;

  },

  _generateTilesets() {

    this._tilesets = this._source.tilesets.map((tileset: any) => {

      return {
        firstGid: tileset.firstgid,
        lastGid: tileset.firstgid + (tileset.tilecount - 1),
        name: tileset.name,
        image: tileset.image,
        imageWidth: tileset.imagewidth,
        imageHeight: tileset.imageheight,
        tileWidth: tileset.tilewidth,
        tileHeight: tileset.tileheight,
        tileCount: tileset.tilecount,
        spacing: tileset.spacing
      };

    });

    console.log(`${ this._name } Map => Tilesets Generated: `, this._tilesets);
    return this;

  },

  _generateSprites() {

    this._tilesets.forEach((tileset: any) => {

      const ROWS = tileset.imageHeight / tileset.tileHeight;
      const COLS = tileset.imageWidth / tileset.tileWidth;
      const SPRITE_MAP = {};

      let currentGid = tileset.firstGid;

      for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

          SPRITE_MAP[`${ this._name.trim().toLowerCase().split(' ').join('_') }_${ currentGid }`] = [
            col,
            row
          ];

          currentGid++;

        }

      }

      this._sprites[`maps/${ tileset.image }`] = {
        tile: tileset.tileWidth,
        tileh: tileset.tileHeight,
        map: SPRITE_MAP
      };

    });

    console.log(`${ this._name } Map => Sprites Generated: `, this._sprites);
    return this._sprites;

  },

  _generateTileLayers() {

    this._source.layers.filter((layer: any) => layer.type === 'tilelayer' && layer.visible).forEach((layer: any, index: number) => {

      if (layer.data && typeof layer.data === 'string') {

        if (!layer.compression) {

          layer.data = this._base64UncompressedToArray(layer.data);

        } else {

          layer.data = this._base64CompressedToArray(layer.data, layer.compression);

        }

      }

      const LAYER = {
        id: layer.id,
        name: layer.name,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        tiles: layer.data ? this._generateTilesForLayer(layer) : [],
        data: layer.data,
        x: layer.x,
        y: layer.y
      };

      this._tileLayers.push(LAYER);

    });

    console.log(`${ this._name } Map => Tile Layers Generated: `, this._tileLayers);
    return this;

  },

  _base64UncompressedToArray(base64: string) {

    return new Uint32Array(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer);

  },

  _base64CompressedToArray(compressedBase64: string, compression: string) {

    if (compression === 'zlib') {

      return new Uint32Array(pako.inflate(atob(compressedBase64)).buffer);

    }

    if (compression === 'gzip') {

      return new Uint32Array(pako.ungzip(atob(compressedBase64)).buffer);

    }

    return [];

  },

  _generateTilesForLayer(layer: any) {

    const TILES = [];

    layer.data.forEach((gid: number) => {

      const SPRITE = `${ this._name.trim().toLowerCase().split(' ').join('_') }_${ gid }`;

      const TILE_TILESET = this._tilesets.find((tileset: any) => {

        return tileset.firstGid <= gid && tileset.lastGid >= gid;

      });

      let TILE: any = {
        gid,
        required: `${ this._renderMethod }${ gid === 0 ? '' : ', ' + SPRITE  }, TileComponent`
      };

      // THE GID INCLUDES INFORMATION ABOUT TILE ROTATION
      // SO IT HAS TO BE HANDLED DIFFERENTLY
      if (!TILE_TILESET && gid > 0) {

        TILE = this._parseTileFliping(TILE);

      }

      TILES.push(TILE);

    });

    return TILES;

  },

  _parseTileFliping(tile: any) {

    const FLIPPED_H = 0x80000000;
    const FLIPPED_V = 0x40000000;
    const FLIPPED_ANTI_DIAGONALLY = 0x20000000;

    const FLIP = [];

    if (tile.gid > FLIPPED_H) {

      tile.gid -= FLIPPED_H;
      FLIP.push('H');

    }

    if (tile.gid > FLIPPED_V) {

      tile.gid -= FLIPPED_V;
      FLIP.push('V');

    }

    if (tile.gid > FLIPPED_ANTI_DIAGONALLY) {

      tile.gid -= FLIPPED_ANTI_DIAGONALLY;
      FLIP.push('D');

    }

    // APPLY THE CORRECT SPRITE FOR THE CORRECT GID
    const SPRITE = `${ this._name.trim().toLowerCase().split(' ').join('_') }_${ tile.gid }`;
    tile.required = `2D, ${ this._renderMethod }${ tile.gid === 0 ? '' : ', ' + SPRITE  }`;
    tile.flip = FLIP;

    return tile;

  },

  _renderTileLayers() {

    this._tileLayers.forEach((layer: any, index: number) => {

      const ROWS = layer.height;
      const COLS = layer.width;

      let TILE_INDEX = 0;
      let CURRENT_Y = layer.y;

      for (let row = 0; row < ROWS; row++) {

        let CURRENT_X = layer.x;

        for (let col = 0; col < COLS; col++) {

          const TILE = Crafty.e(layer.tiles[TILE_INDEX].required);

          TILE.attr({
            w: this._source.tilewidth,
            h: this._source.tileheight,
            x: CURRENT_X,
            y: CURRENT_Y,
            z: index
          });

          TILE.origin('center');

          if (layer.tiles[TILE_INDEX].flip) {

            this._flipTile(TILE, layer.tiles[TILE_INDEX].flip);

          }

          TILE_INDEX ++;
          CURRENT_X += this._source.tilewidth;

        }

        CURRENT_Y += this._source.tileheight;

      }

    });

    return this;

  },

  _flipTile(tile: any, flip: any []) {

    if ( // SINGLES
      flip.indexOf('H') >= 0 &&
      flip.indexOf('V') === -1 &&
      flip.indexOf('D') === -1
    ) {

      tile.flip('X');

    } else if (
      flip.indexOf('H') === -1 &&
      flip.indexOf('V') >= 0 &&
      flip.indexOf('D') === -1
    ) {

      tile.flip('X');
      tile.rotation = 180;

    } else if (
      flip.indexOf('H') === -1 &&
      flip.indexOf('V') === -1 &&
      flip.indexOf('D') >= 0
    ) {

      tile.flip('X');
      tile.rotation = 270;

    } else if ( // DOUBLES
      flip.indexOf('H') >= 0 &&
      flip.indexOf('V') >= 0 &&
      flip.indexOf('D') === -1
    ) {

      tile.rotation = 180;

    } else if (
      flip.indexOf('H') >= 0 &&
      flip.indexOf('V') === -1 &&
      flip.indexOf('D') >= 0
    ) {

      tile.flip('X');
      tile.flip('Y');
      tile.rotation = 270;

    } else if (
      flip.indexOf('H') === -1 &&
      flip.indexOf('V') >= 0 &&
      flip.indexOf('D') >= 0
    ) {

      tile.rotation = 270;

    } else if ( // TRIPLES
      flip.indexOf('H') >= 0 &&
      flip.indexOf('V') >= 0 &&
      flip.indexOf('D') >= 0
    ) {

      tile.flip('X');
      tile.rotation = 90;

    }

  },

  init() {

    if (!this.has('Canvas') && !this.has('DOM')) {

      this.addComponent('Canvas');

    }

    this._renderMethod = this.has('Canvas') ? 'Canvas' : 'DOM';
    return this;

  },

  render(name: string, source: any, callback?: <T>() => T) {

    if (this._isValidSource(source)) {

      this._name = name;
      this._source = source;

      console.log(`${ this._name } Map => Source: `, source);

      this._generateTilesets();

      const MAP_ASSETS = {
        sprites: this._generateSprites()
      };

      Crafty.load(MAP_ASSETS, () => {

        console.log(`${ this._name } Map => Assets Loaded`);

        this._generateTileLayers();
        this._renderTileLayers();

        if ( callback && typeof callback === 'function') {

          callback.call(this, this);

        }

      });

    }

    return this;

  }

});
