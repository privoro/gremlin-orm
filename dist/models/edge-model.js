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

var EdgeModel = function (_Model) {
  _inherits(EdgeModel, _Model);

  function EdgeModel(label, schema, gorm) {
    _classCallCheck(this, EdgeModel);

    var _this = _possibleConstructorReturn(this, (EdgeModel.__proto__ || Object.getPrototypeOf(EdgeModel)).call(this, gorm, ''));

    _this.label = label;
    _this.schema = schema;
    return _this;
  }

  /**
  * creates an index from out vertex(es) to the in vertex(es)
  * @param {object} outV object with properties to find 'out' vertex
  * @param {object} inV object with properties to find 'in' vertex
  * @param {object} props object containing key value pairs of properties to add on the new edge
  */


  _createClass(EdgeModel, [{
    key: 'create',
    value: function create(outV, inV, props, bothWays, callback) {
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
      if (!(outV && inV)) {
        cb({ 'error': 'Need both an inV and an outV.' });
        return;
      }
      var checkSchemaResponse = this.checkSchema(this.schema, props, true);
      if (this.checkSchemaFailed(checkSchemaResponse)) {
        cb(checkSchemaResponse);
        return;
      }

      var outGremlinStr = outV.getGremlinStr();
      var inGremlinStr = inV.getGremlinStr().slice(1);

      var _getRandomVariable = this.getRandomVariable(),
          _getRandomVariable2 = _slicedToArray(_getRandomVariable, 1),
          a = _getRandomVariable2[0];

      var gremlinQuery = outGremlinStr + ('.as(\'' + a + '\')') + inGremlinStr;
      gremlinQuery += '.addE(\'' + this.label + '\')' + this.actionBuilder('property', props) + '.from(\'' + a + '\')';

      if (both === true) {
        var _getRandomVariable3 = this.getRandomVariable(1, [a]),
            _getRandomVariable4 = _slicedToArray(_getRandomVariable3, 1),
            b = _getRandomVariable4[0];

        var extraGremlinQuery = inV.getGremlinStr() + '.as(\'' + b + '\')' + outV.getGremlinStr().slice(1) + ('.addE(\'' + this.label + '\')' + this.actionBuilder('property', props) + '.from(\'' + b + '\')');
        var intermediate = function intermediate(err, results) {
          var resultsSoFar = results.slice(0);
          var concater = function concater(err, results) {
            resultsSoFar = resultsSoFar.concat(results);
            cb(err, resultsSoFar);
          };
          _this2.executeQuery(extraGremlinQuery, concater);
        };
        return this.executeQuery(gremlinQuery, intermediate);
      } else {
        return this.executeQuery(gremlinQuery, cb);
      }
    }

    /**
    * finds the first edge with properties matching props object
    * @param {object} props Object containing key value pairs of properties
    * @param {function} callback Some callback function with (err, result) arguments
    */

  }, {
    key: 'find',
    value: function find(props, callback) {
      var gremlinStr = 'g.E(' + this.getIdFromProps(props) + ').hasLabel(\'' + this.label + '\')' + this.actionBuilder('has', props);
      return this.executeOrPass(gremlinStr, callback, true);
    }

    /**
    * finds the all edges with properties matching props object
    * @param {object} props Object containing key value pairs of properties
    * @param {function} callback Some callback function with (err, result) arguments
    */

  }, {
    key: 'findAll',
    value: function findAll(props, callback) {
      var gremlinStr = 'g.E(' + this.getIdFromProps(props) + ').hasLabel(\'' + this.label + '\')' + this.actionBuilder('has', props);
      return this.executeOrPass(gremlinStr, callback);
    }

    /**
    * finds the all vertices with properties matching props object connected by the relevant edge(s)
    * @param {object} vertexModel vertexModel that corresponds to the vertex
    * @param {object} properties Object containing key value pairs of properties to find on vertices
    * @param {function} callback Some callback function with (err, result) arguments
    */

  }, {
    key: 'findVertex',
    value: function findVertex(vertexModel, properties, callback) {
      var label = void 0,
          props = void 0,
          model = void 0;
      if (typeof vertexModel === 'string') {
        label = vertexModel;
        props = properties;
        model = new this.g.vertexModel(label, {}, this.g);
      } else {
        props = this.parseProps(properties, vertexModel);
        model = vertexModel;
        label = model.label;
      }
      var gremlinStr = this.getGremlinStr();
      gremlinStr += '.bothV()' + this.actionBuilder('has', props);
      return this.executeOrPass.call(model, gremlinStr, callback);
    }
  }]);

  return EdgeModel;
}(Model);

module.exports = EdgeModel;