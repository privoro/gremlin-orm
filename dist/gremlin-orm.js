'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Gremlin = require('gremlin');
var VertexModel = require('./models/vertex-model');
var EdgeModel = require('./models/edge-model');

var Gorm = function () {
  function Gorm(dialect, port, url, options) {
    _classCallCheck(this, Gorm);

    // Constants
    this.DIALECTS = { AZURE: 'azure' };
    this.STRING = 'string';
    this.NUMBER = 'number';
    this.BOOLEAN = 'boolean';
    this.DATE = 'date';

    var argLength = arguments.length;
    if (argLength === 0) {
      this.client = null;
    } else if (argLength === 1) {
      this.client = Gremlin.createClient();
    } else if (argLength === 3) {
      this.client = Gremlin.createClient(port, url);
    } else {
      this.client = Gremlin.createClient(port, url, options);
    }
    if (Array.isArray(dialect)) {
      this.dialect = dialect[0];
      this.partition = dialect[1];
    } else {
      this.dialect = dialect;
    }
    this.definedVertices = {};
    this.definedEdges = {};
    this.vertexModel = VertexModel;
    this.edgeModel = EdgeModel;
  }

  /**
  * an alias for defineVertex
  * @param {string} label
  * @param {object} schema
  */


  _createClass(Gorm, [{
    key: 'define',
    value: function define(label, schema) {
      return this.defineVertex(label, schema);
    }

    /**
    * defines a new instance of the VertexModel class - see generic and vertex model methods
    * @param {string} label label to be used on all vertices of this model
    * @param {object} schema a schema object which defines allowed property keys and allowed values/types for each key
    */

  }, {
    key: 'defineVertex',
    value: function defineVertex(label, schema) {
      this.definedVertices[label] = schema;
      return new VertexModel(label, schema, this);
    }

    /**
    * defines a new instance of the EdgeModel class - see generic and edge model methods
    * @param {string} label label to be used on all edges of this model
    * @param {object} schema a schema object which defines allowed property keys and allowed values/types for each key
    */

  }, {
    key: 'defineEdge',
    value: function defineEdge(label, schema) {
      this.definedEdges[label] = schema;
      return new EdgeModel(label, schema, this);
    }

    /**
    * performs a raw query on the gremlin-orm root and return raw data
    * @param {string} string Gremlin query as a string
    * @param {function} callback Some callback function with (err, result) arguments.
    */

  }, {
    key: 'queryRaw',
    value: function queryRaw(string, callback) {
      this.client.execute(string, function (err, result) {
        callback(err, result);
      });
    }
  }, {
    key: '__graphSONToGremlinWireFormat',
    value: function __graphSONToGremlinWireFormat(resp) {
      var obj = {};
      obj.type = resp['@type'].split(':')[1].toLowerCase();
      obj.id = resp['@value'].id;
      obj.label = resp['@value'].label;
      if (obj.type === 'vertex') {
        obj.properties = {};
        var properties = resp['@value'].properties;

        var _loop = function _loop(key) {
          obj.properties[key] = [];
          properties[key].forEach(function (propObj) {
            var value = propObj['@value'].value;
            value = (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' ? value['@value'] : value;
            obj.properties[key].push({ value: value });
          });
        };

        for (var key in properties) {
          _loop(key);
        }
      }
      return obj;
    }

    /**
    * Converts raw gremlin data into familiar JavaScript objects
    * Adds prototype methods onto objects for further queries - each object is an instance of its Model class
    * @param {array} gremlinResponse
    */

  }, {
    key: 'familiarizeAndPrototype',
    value: function familiarizeAndPrototype(gremlinResponse) {
      var _this = this;

      var data = [];
      var VERTEX = void 0,
          EDGE = void 0;
      if (this.checkModels) {
        data = [[], []];
        VERTEX = new VertexModel('null', {}, this.g);
        EDGE = new EdgeModel('null', {}, this.g);
      }

      gremlinResponse.forEach(function (grem) {
        if (_this.g.dialect === 'neptune') {
          grem = _this.g.__graphSONToGremlinWireFormat(grem);
        }
        var object = void 0;
        if (_this.checkModels) {
          // if checkModels is true (running .query with raw set to false), this may refer to a VertexModel objects
          // but data returned could be EdgeModel
          if (grem.type === 'vertex') object = Object.create(VERTEX);else if (grem.type === 'edge') object = Object.create(EDGE);
        } else {
          object = Object.create(_this);
        }
        object.id = grem.id;
        object.label = grem.label;
        if (grem.type === 'edge') {
          object.inV = grem.inV;
          object.outV = grem.outV;
          if (grem.inVLabel) object.inVLabel = grem.inVLabel;
          if (grem.outVLabel) object.outVLabel = grem.outVLabel;
        }

        var currentPartition = _this.g.partition ? _this.g.partition : '';
        if (grem.properties) {
          Object.keys(grem.properties).forEach(function (propKey) {
            if (propKey !== currentPartition) {
              var property = void 0;
              if (grem.type === 'edge') {
                property = grem.properties[propKey];
              } else {
                property = grem.properties[propKey][0].value;
              }

              // If property is defined in schema as a Date type, convert it from
              // integer date into a JavaScript Date object.
              // Otherwise, no conversion necessary for strings, numbers, or booleans
              if (_this.g.definedVertices[grem.label]) {
                if (_this.g.definedVertices[grem.label][propKey] && _this.g.definedVertices[grem.label][propKey].type === _this.g.DATE) {
                  object[propKey] = new Date(property);
                } else {
                  object[propKey] = property;
                }
              } else if (_this.g.definedEdges[grem.label]) {
                if (_this.g.definedEdges[grem.label][propKey] && _this.g.definedEdges[grem.label][propKey].type === _this.g.DATE) {
                  object[propKey] = new Date(property);
                } else {
                  object[propKey] = property;
                }
              } else {
                object[propKey] = property;
              }
            }
          });
        }
        if (_this.checkModels) {
          if (grem.type === 'vertex') data[0].push(object);else data[1].push(object);
        } else data.push(object);
      });
      if (this.checkModels) {
        VERTEX.addArrayMethods(data[0]);
        EDGE.addArrayMethods(data[1]);
      } else this.addArrayMethods(data);
      this.checkModels = false;
      return data;
    }
  }]);

  return Gorm;
}();

module.exports = Gorm;