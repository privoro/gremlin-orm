'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Model = require('./model');

/**
* @param {string} label
* @param {object} schema
* @param {object} gorm
*/

var VertexModel = function (_Model) {
  _inherits(VertexModel, _Model);

  function VertexModel(label, schema, gorm) {
    _classCallCheck(this, VertexModel);

    var _this = _possibleConstructorReturn(this, (VertexModel.__proto__ || Object.getPrototypeOf(VertexModel)).call(this, gorm, ''));

    _this.label = label;
    _this.schema = schema;
    return _this;
  }

  /**
  * Creates a new vertex
  * Returns single vertex model object
  * @param {object} props
  */


  _createClass(VertexModel, [{
    key: 'create',
    value: function create(props, callback) {
      if (!callback) throw new Error('Callback is required');
      var checkSchemaResponse = this.checkSchema(this.schema, props, true);
      if (this.checkSchemaFailed(checkSchemaResponse)) {
        callback(checkSchemaResponse);
        return;
      }
      var gremlinStr = 'g.addV(\'' + this.label + '\')';
      if (this.g.dialect === this.g.DIALECTS.AZURE) {
        gremlinStr += '.property(\'' + this.g.partition + '\', \'' + props[Object.keys(props)[0]] + '\')';
      }
      gremlinStr += this.actionBuilder('property', props);
      return this.executeQuery(gremlinStr, callback, true);
    }

    /**
    * Creates a new edge
    * @param {string} edge
    * @param {object} props
    * @param {object} vertex
    */

  }, {
    key: 'createEdge',
    value: function createEdge(edgeModel, properties, vertex, bothWays, callback) {
      var _this2 = this;

      var both = void 0,
          cb = void 0;
      if (typeof arguments[3] === 'function' || arguments.length < 4) {
        both = false;
        cb = arguments[3];
      } else {
        both = arguments[3];
        cb = arguments[4];
      }
      if (!cb) throw new Error('Callback is required');
      var label = void 0,
          props = void 0,
          model = void 0;
      if (typeof edgeModel === 'string') {
        label = edgeModel;
        props = properties;
        model = new this.g.edgeModel(label, {}, this.g);
      } else {
        label = edgeModel.label;
        props = this.parseProps(properties, edgeModel);
        model = edgeModel;
      }

      var outGremlinStr = this.getGremlinStr();
      var inGremlinStr = vertex.getGremlinStr();

      if (outGremlinStr === '') {
        return cb({ 'error': 'Gremlin Query has not been initialised for out Vertex' });
      } else if (inGremlinStr === '') {
        return cb({ 'error': 'Gremlin Query has not been initialised for in Vertex' });
      }
      if (typeof edgeModel !== 'string') {
        var checkSchemaResponse = this.checkSchema(edgeModel.schema, props, true);
        if (this.checkSchemaFailed(checkSchemaResponse)) {
          cb(checkSchemaResponse);
          return;
        }
      }

      // Remove 'g' from 'g.V()...'
      inGremlinStr = inGremlinStr.slice(1);

      var _getRandomVariable = this.getRandomVariable(),
          _getRandomVariable2 = _slicedToArray(_getRandomVariable, 1),
          a = _getRandomVariable2[0];

      var gremlinQuery = outGremlinStr + ('.as(\'' + a + '\')') + inGremlinStr;
      gremlinQuery += '.addE(\'' + label + '\')' + this.actionBuilder('property', props) + '.from(\'' + a + '\')';

      if (both === true) {
        var _getRandomVariable3 = this.getRandomVariable(1, [a]),
            _getRandomVariable4 = _slicedToArray(_getRandomVariable3, 1),
            b = _getRandomVariable4[0];

        var extraGremlinQuery = vertex.getGremlinStr() + '.as(\'' + b + '\')' + this.getGremlinStr().slice(1) + ('.addE(\'' + label + '\')' + this.actionBuilder('property', props) + '.from(\'' + b + '\')');
        var intermediate = function intermediate(err, results) {
          if (err) return cb(err);
          var resultsSoFar = results.slice(0);
          var concater = function concater(err, results) {
            resultsSoFar = resultsSoFar.concat(results);
            cb(err, resultsSoFar);
          };
          _this2.executeOrPass.call(model, extraGremlinQuery, concater);
        };
        return this.executeOrPass.call(model, gremlinQuery, intermediate);
      } else {
        return this.executeOrPass.call(model, gremlinQuery, cb);
      }
    }

    /**
    * Finds first vertex with matching properties
    * @param {object} properties
    */

  }, {
    key: 'find',
    value: function find(properties, callback) {
      var props = this.parseProps(properties);
      var gremlinStr = 'g.V(' + this.getIdFromProps(props) + ').hasLabel(\'' + this.label + '\')' + this.actionBuilder('has', props);
      return this.executeOrPass(gremlinStr, callback, true);
    }

    /**
    * Finds all vertexes with matching properties
    * @param {object} properties
    */

  }, {
    key: 'findAll',
    value: function findAll(properties, callback) {
      var props = this.parseProps(properties);
      var gremlinStr = 'g.V(' + this.getIdFromProps(props) + ').hasLabel(\'' + this.label + '\')' + this.actionBuilder('has', props);
      return this.executeOrPass(gremlinStr, callback);
    }

    /**
    * find all vertexes connected to initial vertex(es) through a type of edge with optional properties
    * @param {string} label
    * @param {object} properties
    * @param {number} depth
    */

  }, {
    key: 'findRelated',
    value: function findRelated(edgeModel, properties, depth, inV, callback) {
      var label = void 0,
          props = void 0,
          inModel = void 0,
          inLabel = void 0,
          cb = void 0;
      if (typeof edgeModel === 'string') {
        label = edgeModel;
        props = properties;
      } else {
        label = edgeModel.label;
        props = this.parseProps(properties, edgeModel);
      }

      if (arguments.length < 4 || typeof arguments[3] === 'function') {
        inModel = this;
        inLabel = this.label;
        cb = arguments[3];
      } else {
        if (typeof arguments[3] === 'string') {
          inLabel = arguments[3];
          inModel = new this.g.vertexModel(inLabel, {}, this.g);
          cb = arguments[4];
        } else {
          inModel = arguments[3];
          inLabel = inModel.label;
          cb = arguments[4];
        }
      }

      var gremlinStr = this.getGremlinStr();
      for (var i = 0; i < depth; i += 1) {
        gremlinStr += '.outE().hasLabel(\'' + label + '\')' + this.actionBuilder('has', props) + '.inV().hasLabel(\'' + inLabel + '\')';
      }
      return this.executeOrPass.call(inModel, gremlinStr, cb);
    }

    /**
    * find all edges connected to initial vertex(es) with matching label and optional properties
    * @param {string} label
    * @param {object} props
    * @param {number} depth
    */

  }, {
    key: 'findEdge',
    value: function findEdge(edgeModel, properties, callback) {
      var label = void 0,
          props = void 0,
          model = void 0;
      if (typeof edgeModel === 'string') {
        label = edgeModel;
        props = properties;
        model = new this.g.edgeModel(label, {}, this.g);
      } else {
        label = edgeModel.label;
        props = this.parseProps(properties, edgeModel);
        model = edgeModel;
      }
      var gremlinStr = this.getGremlinStr();
      gremlinStr += '.bothE(\'' + label + '\')' + this.actionBuilder('has', props);
      return this.executeOrPass.call(model, gremlinStr, callback);
    }

    /**
    * find all vertexes which have the same edge relations in that the current vertex(es) has out to another vertex
    * @param {string} label
    * @param {object} properties
    */

  }, {
    key: 'findImplicit',
    value: function findImplicit(edgeModel, properties, callback) {
      var label = void 0,
          props = void 0,
          model = void 0;
      if (typeof edgeModel === 'string') {
        label = edgeModel;
        props = properties;
      } else {
        label = edgeModel.label;
        props = this.parseProps(properties, edgeModel);
      }
      var gremlinStr = this.getGremlinStr();
      var originalAs = this.getRandomVariable()[0];
      gremlinStr += '.as(\'' + originalAs + '\').outE(\'' + label + '\')' + this.actionBuilder('has', props) + ('inV().inE(\'' + label + '\')' + this.actionBuilder('has', props) + '.outV()') + ('.where(neq(\'' + originalAs + '\'))');
      return this.executeOrPass(gremlinStr, callback);
    }
  }]);

  return VertexModel;
}(Model);

module.exports = VertexModel;