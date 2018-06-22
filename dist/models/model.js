'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
* @param {object} gorm
* @param {string} gremlinStr
*/
var Model = function () {
  function Model(gorm, gremlinStr) {
    _classCallCheck(this, Model);

    this.g = gorm;
    this.gremlinStr = gremlinStr;
    this.checkModels = false;
  }

  /**
  * Perform a cypher query and parse the results
  * @param {string} string
  * @param {boolean} raw
  */


  _createClass(Model, [{
    key: 'query',
    value: function query(string, raw, callback) {
      var cb = callback;
      var returnRawData = raw;
      if (arguments.length < 3) {
        cb = arguments[1];
        returnRawData = false;
      }
      this.checkModels = true;
      var gremlinStr = this.getGremlinStr();
      gremlinStr += string;
      if (returnRawData) {
        this.checkModels = false;
        return this.g.client.execute(gremlinStr, cb);
      }
      return this.executeOrPass(gremlinStr, cb);
    }

    /**
    * Updates specific props on an existing vertex or edge
    */

  }, {
    key: 'update',
    value: function update(props, callback) {
      if (!callback) throw new Error('Callback is required');
      var gremlinStr = this.getGremlinStr();
      var schema = this.schema;
      var checkSchemaResponse = this.checkSchema(schema, props);
      if (this.checkSchemaFailed(checkSchemaResponse)) return callback(checkSchemaResponse); // should it throw an error?
      gremlinStr += this.actionBuilder('property', props);
      return this.executeOrPass(gremlinStr, callback);
    }

    /**
    * Deletes an existing vertex or edge
    * @param {string} id id of the vertex or edge to be deleted
    */

  }, {
    key: 'delete',
    value: function _delete(callback) {
      if (!callback) throw new Error('Callback is required');
      var gremlinStr = this.getGremlinStr();
      gremlinStr += '.drop()';
      this.executeOrPass(gremlinStr, callback);
    }

    /**
    * Sorts query results by property in ascending/descending order
    * @param {string} propKey property to sort by.
    * @param {string} option 'ASC' or 'DESC'.
    */

  }, {
    key: 'order',
    value: function order(propKey, option, callback) {
      if (!(option === 'DESC' || option === "ASC")) {
        callback({ error: 'Order requires option to be "ASC" or "DESC"' });
        return;
      }
      var originalGremlinStr = this.getGremlinStr();
      var order = originalGremlinStr.includes('order()') ? '' : '.order()';
      var gremlinStr = '' + originalGremlinStr + order + '.by(';
      var gremlinOption = option === 'DESC' ? 'decr' : 'incr';
      gremlinStr += '\'' + propKey + '\', ' + gremlinOption + ')';
      return this.executeOrPass(gremlinStr, callback);
    }

    /**
    * Limits the number of results returned
    * @param {number} num number of results to be returned
    */

  }, {
    key: 'limit',
    value: function limit(num, callback) {
      var gremlinStr = this.getGremlinStr();
      gremlinStr += '.limit(' + parseInt(num) + ')';
      this.executeOrPass(gremlinStr, callback);
    }

    /**
    * Takes the built query string and executes it
    * @param {string} query query string to execute.
    * @param {object} singleObject
    */

  }, {
    key: 'executeQuery',
    value: function executeQuery(query, callback, singleObject) {
      var _this = this;

      this.g.client.execute(query, function (err, result) {
        if (err) {
          callback({ 'error': err });
          return;
        }
        // Create nicer Object
        var response = _this.g.familiarizeAndPrototype.call(_this, result);
        if (singleObject && response.length > 0) {
          callback(null, response[0]);
          return;
        }
        callback(null, response);
      });
    }

    /**
    * Executes or passes a string of command
    * @param {string} gremlinStr
    * @param {object} singleObject
    */

  }, {
    key: 'executeOrPass',
    value: function executeOrPass(gremlinStr, callback, singleObject) {
      if (callback) return this.executeQuery(gremlinStr, callback, singleObject);
      var response = Object.create(this);
      response.gremlinStr = gremlinStr;
      return response;
    }

    /**
    * Builds a command string to be executed or passed using props
    * @param {string} action e.g., 'has', 'property'
    * @param {object} props
    */

  }, {
    key: 'actionBuilder',
    value: function actionBuilder(action, props) {
      var _this2 = this;

      var propsStr = '';
      var ifArr = '';
      var keys = Object.keys(props);
      keys.forEach(function (key) {
        if (key !== 'id') {
          if (Array.isArray(props[key])) {
            ifArr = 'within(';
            for (var i = 0; i < props[key].length; i += 1) {
              if (i === props[key].length - 1) {
                ifArr += _this2.stringifyValue(props[key][i]) + ')';
              } else {
                ifArr += _this2.stringifyValue(props[key][i]) + ',';
              }
            }
            propsStr += '.' + action + '(\'' + key + '\',' + ifArr + ')';
          } else {
            propsStr += '.' + action + '(\'' + key + '\',' + _this2.stringifyValue(props[key]) + ')';
          }
        }
      });
      return propsStr;
    }

    /**
    * Attaches array methods for later use
    */

  }, {
    key: 'addArrayMethods',
    value: function addArrayMethods(arr) {
      if (this.constructor.name === 'VertexModel') {
        arr.createEdge = this.createEdge;
        arr.findEdge = this.findEdge;
        arr.findImplicit = this.findImplicit;
      } else if (this.constructor.name === 'EdgeModel') {
        arr.findVertex = this.findVertex;
      }
      arr.order = this.order;
      arr.limit = this.limit;
      arr.delete = this.delete;
      arr.query = this.query;
      arr.actionBuilder = this.actionBuilder;
      arr.getGremlinStr = this.getGremlinStr;
      arr.getIdFromProps = this.getIdFromProps;
      arr.parseProps = this.parseProps.bind(this);
      arr.dateGetMillis = this.dateGetMillis;
      arr.getRandomVariable = this.getRandomVariable;
      arr.stringifyValue = this.stringifyValue;
      arr.checkSchema = this.checkSchema.bind(this);
      arr.checkSchemaFailed = this.checkSchemaFailed;
      arr.executeOrPass = this.executeOrPass.bind(this);
    }

    /**
    *
    */

  }, {
    key: 'getGremlinStr',
    value: function getGremlinStr() {
      if (this.gremlinStr && this.gremlinStr !== '') return this.gremlinStr;
      if (this.constructor.name === 'Array') {
        if (this.length === 0) return 'g.V(\'nonexistent\')';
        var type = this[0].constructor.name.charAt(0);
        var ids = [];
        this.forEach(function (el) {
          return ids.push(el.id);
        });
        return 'g.' + type + '("' + ids.join('","') + '")';
      }
      if (this.hasOwnProperty('id')) return 'g.' + this.constructor.name.charAt(0) + '(\'' + this.id + '\')';
      return '';
    }

    /**
    * returns the id of the vertex or edge
    */

  }, {
    key: 'getIdFromProps',
    value: function getIdFromProps(props) {
      var idString = '';
      if (props.hasOwnProperty('id')) {
        if (Array.isArray(props.id)) {
          idString = '\'' + props.id.join(',') + '\'';
        } else {
          idString = '\'' + props.id + '\'';
        }
      }
      return idString;
    }

    /**
    * Returns an array of random variables
    * @param {number} numVars desired number of variables returned
    * @param {array} currentVarsArr array of variables that already exist
    */

  }, {
    key: 'getRandomVariable',
    value: function getRandomVariable(numVars, currentVarsArr) {
      var variables = currentVarsArr ? Array.from(currentVarsArr) : [];
      var possibleChars = 'abcdefghijklmnopqrstuvwxyz';
      var variablesRequired = numVars ? numVars : 1;
      function getRandomChars() {
        var result = possibleChars[Math.floor(Math.random() * possibleChars.length)];
        return result;
      }
      if (variables.length + variablesRequired > 26) {
        variablesRequired = 26 - variables.length;
      }
      for (var i = 0; i < variablesRequired; i += 1) {
        var newVariable = getRandomChars();
        while (variables.includes(newVariable)) {
          newVariable = getRandomChars();
        }
        variables.push(newVariable);
      }
      return variables;
    }

    /**
    * Parses properties into their known types from schema model
    * Will remove keys which do not exist in schema
    * @param {object} properties - properties object to parse
    * @param {object} model - model to check schema against
    */

  }, {
    key: 'parseProps',
    value: function parseProps(properties, model) {
      var schema = model ? model.schema : this.schema;
      var props = {};
      var that = this;

      function changeTypes(key, input) {
        var value = void 0;
        switch (schema[key].type) {
          case 'number':
            value = parseFloat(input);
            if (Number.isNaN(value)) value = null;
            break;
          case 'boolean':
            if (input.toString() === 'true' || input.toString() === 'false') {
              value = input.toString() === 'true';
            } else {
              value = null;
            }
            break;
          case 'date':
            var millis = that.dateGetMillis(input);
            if (Number.isNaN(millis)) {
              millis = null;
            }
            value = millis;
            break;
          default:
            //string
            value = input.toString();
        }
        return value;
      }

      Object.keys(schema).forEach(function (key) {
        if (properties[key]) {
          if (Array.isArray(properties[key])) {
            props[key] = [];
            properties[key].forEach(function (arrValue) {
              return props[key].push(changeTypes(key, arrValue));
            });
          } else {
            props[key] = changeTypes(key, properties[key]);
          }
        }
      });
      return props;
    }

    /**
    * Wraps '' around value if string and returns it
    */

  }, {
    key: 'stringifyValue',
    value: function stringifyValue(value) {
      if (typeof value === 'string') {
        return '\'' + value + '\'';
      } else {
        return '' + value;
      }
    }

    /**
    * Checks Date types and parses it into millis
    * @param {Date/String/Number} value - number string or date representing date
    */

  }, {
    key: 'dateGetMillis',
    value: function dateGetMillis(value) {
      var millis = NaN;
      if (value instanceof Date) {
        millis = value.getTime();
      } else {
        var strValue = value.toString();
        var isNum = /^\d+$/.test(strValue);
        if (isNum) {
          millis = parseInt(strValue);
        } else {
          millis = Date.parse(strValue);
        }
      }
      return millis;
    }

    /**
    * Checks whether the props object adheres to the schema model specifications
    * @param {object} schema
    * @param {object} props
    * @param {boolean} checkRequired should be true for create and update methods
    */

  }, {
    key: 'checkSchema',
    value: function checkSchema(schema, props, checkRequired) {
      var schemaKeys = Object.keys(schema);
      var propsKeys = Object.keys(props);
      var response = {};

      function addErrorToResponse(key, message) {
        if (!response[key]) response[key] = [];
        response[key].push(message);
      }

      if (checkRequired) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = schemaKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var sKey = _step.value;

            if (schema[sKey].required) {
              if (!props[sKey]) {
                addErrorToResponse(sKey, 'A valid value for \'' + sKey + '\' is required');
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = propsKeys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var pKey = _step2.value;

          if (schemaKeys.includes(pKey)) {
            if (schema[pKey].type === this.g.DATE) {
              var millis = this.dateGetMillis(props[pKey]);
              if (Number.isNaN(millis)) {
                addErrorToResponse(pKey, '\'' + pKey + '\' should be a Date');
              } else {
                props[pKey] = millis; //known side-effect
              }
            } else {
              if (!(_typeof(props[pKey]) === schema[pKey].type)) {
                addErrorToResponse(pKey, '\'' + pKey + '\' should be a ' + schema[pKey].type);
              }
            }
          } else {
            addErrorToResponse(pKey, '\'' + pKey + '\' is not part of the schema model');
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return response;
    }

    /**
     * returns true if response is an empty object and false if it contains any error message
     * @param {object} response return value from checkSchema
    */

  }, {
    key: 'checkSchemaFailed',
    value: function checkSchemaFailed(response) {
      if (Object.keys(response).length === 0) return false;
      return true;
    }
  }]);

  return Model;
}();

module.exports = Model;