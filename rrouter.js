(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(__browserify__,module,exports){
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  
  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

},{}],2:[function(__browserify__,module,exports){
// Generated by CoffeeScript 1.7.1
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

module.exports = {
  PatternPrototype: {
    match: function(url) {
      var bound, captured, i, match, name, value, _i, _len;
      match = this.regex.exec(url);
      if (match == null) {
        return null;
      }
      captured = match.slice(1);
      if (this.isRegex) {
        return captured;
      }
      bound = {};
      for (i = _i = 0, _len = captured.length; _i < _len; i = ++_i) {
        value = captured[i];
        name = this.names[i];
        if (value == null) {
          continue;
        }
        if (name === '_') {
          if (bound._ == null) {
            bound._ = [];
          }
          bound._.push(value);
        } else {
          bound[name] = value;
        }
      }
      return bound;
    }
  },
  newPattern: function(arg, separator) {
    var isRegex, pattern, regexString;
    if (separator == null) {
      separator = '/';
    }
    isRegex = arg instanceof RegExp;
    if (!(('string' === typeof arg) || isRegex)) {
      throw new TypeError('argument must be a regex or a string');
    }
    [':', '*'].forEach(function(forbidden) {
      if (separator === forbidden) {
        throw new Error("separator can't be " + forbidden);
      }
    });
    pattern = Object.create(module.exports.PatternPrototype);
    pattern.isRegex = isRegex;
    pattern.regex = isRegex ? arg : (regexString = module.exports.toRegexString(arg, separator), new RegExp(regexString));
    if (!isRegex) {
      pattern.names = module.exports.getNames(arg, separator);
    }
    return pattern;
  },
  escapeForRegex: function(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },
  getNames: function(arg, separator) {
    var escapedSeparator, name, names, regex, results;
    if (separator == null) {
      separator = '/';
    }
    if (arg instanceof RegExp) {
      return [];
    }
    escapedSeparator = module.exports.escapeForRegex(separator);
    regex = new RegExp("((:?:[^" + escapedSeparator + "\(\)]+)|(?:[\*]))", 'g');
    names = [];
    results = regex.exec(arg);
    while (results != null) {
      name = results[1].slice(1);
      if (name === '_') {
        throw new TypeError(":_ can't be used as a pattern name in pattern " + arg);
      }
      if (__indexOf.call(names, name) >= 0) {
        throw new TypeError("duplicate pattern name :" + name + " in pattern " + arg);
      }
      names.push(name || '_');
      results = regex.exec(arg);
    }
    return names;
  },
  escapeSeparators: function(string, separator) {
    var escapedSeparator, regex;
    if (separator == null) {
      separator = '/';
    }
    escapedSeparator = module.exports.escapeForRegex(separator);
    regex = new RegExp(escapedSeparator, 'g');
    return string.replace(regex, escapedSeparator);
  },
  toRegexString: function(string, separator) {
    var escapedSeparator, stringWithEscapedSeparators;
    if (separator == null) {
      separator = '/';
    }
    stringWithEscapedSeparators = module.exports.escapeSeparators(string, separator);
    stringWithEscapedSeparators = stringWithEscapedSeparators.replace(/\((.*?)\)/g, '(?:$1)?').replace(/\*/g, '(.*?)');
    escapedSeparator = module.exports.escapeForRegex(separator);
    module.exports.getNames(string, separator).forEach(function(name) {
      return stringWithEscapedSeparators = stringWithEscapedSeparators.replace(':' + name, "([^\\" + separator + "]+)");
    });
    return "^" + stringWithEscapedSeparators + "$";
  }
};

},{}],3:[function(__browserify__,module,exports){
;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['react', 'bluebird'], factory);
  } else {
    root.RRouter = factory(root.React, root.Promise);
  }
})(window, function(React, Promise) {
  return __browserify__('./lib/');
});

},{"./lib/":13}],4:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var React     = (window.React);
var LinkMixin = __browserify__('./LinkMixin');

var Link = React.createClass({displayName: 'Link',
  mixins: [LinkMixin],

  onClick: function(e) {
    e.preventDefault();
    this.activate();
  },

  render: function() {
    return this.transferPropsTo(
      React.DOM.a( {href:this.href(), onClick:this.onClick}, 
        this.props.children
      )
    );
  }
});

module.exports = Link;

},{"./LinkMixin":5}],5:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var React               = (window.React);
var invariant           = __browserify__('./invariant');
var RoutingContextMixin = __browserify__('./RoutingContextMixin');

var LinkMixin = {
  mixins: [RoutingContextMixin],

  propTypes: {
    to: React.PropTypes.string,
    href: React.PropTypes.string,
    query: React.PropTypes.object
  },

  activate: function() {
    var routing = this.getRouting();
    if (this.props.href) {
      routing.navigate(this.props.href);
    } else if (this.props.to) {
      routing.navigateTo(this.props.to, this.props);
    } else {
      invariant(
        false,
        'provide either "to" or "href" prop to Link component'
      );
    }
  },

  href: function() {
    if (this.props.href) {
      return this.props.href;
    } else if (this.props.to) {
      return this.getRouting().makeHref(this.props.to, this.props);
    } else {
      invariant(
        false,
        'provide either "to" or "href" prop to Link component'
      );
    }
  }
};

module.exports = LinkMixin;

},{"./RoutingContextMixin":6,"./invariant":14}],6:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var React     = (window.React);
var invariant = __browserify__('./invariant');

var contextTypes = {
  routing: React.PropTypes.object,
  routes: React.PropTypes.object,
  match: React.PropTypes.object
};

var RoutingContextMixin = {
  contextTypes: contextTypes,

  navigate: function(path, navigation) {
    invariant(
      this.context.routing,
      'no routing found in context'
    );
    this.context.routing.navigate(path, navigation);
  },

  navigateTo: function(routeRef, props, navigation) {
    invariant(
      this.context.routing,
      'no routing found in context'
    );
    this.context.routing.navigateTo(routeRef, props, navigation);
  },

  getMatch: function() {
    invariant(
      this.context.match,
      'no match found in context'
    );
    return this.context.match;
  },

  getRoutes: function() {
    invariant(
      this.context.routes,
      'no routes found in context'
    );
    return this.context.routes;
  },

  getRouting: function() {
    invariant(
      this.context.routing,
      'no routing found in context'
    );
    return this.context.routing;
  }
};

module.exports = RoutingContextMixin;

},{"./invariant":14}],7:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule copyProperties
 */
'use strict';

/**
 * Copy properties from one or more objects (up to 5) into the first object.
 * This is a shallow copy. It mutates the first object and also returns it.
 *
 * NOTE: `arguments` has a very significant performance penalty, which is why
 * we don't support unlimited arguments.
 */
function copyProperties(obj, a, b, c, d, e, f) {
  obj = obj || {};

  if ("development" !== 'production') {
    if (f) {
      throw new Error('Too many arguments passed to copyProperties');
    }
  }

  var args = [a, b, c, d, e];
  var ii = 0, v;
  while (args[ii]) {
    v = args[ii++];
    for (var k in v) {
      obj[k] = v[k];
    }

    // IE ignores toString in object iteration.. See:
    // webreflection.blogspot.com/2007/07/quick-fix-internet-explorer-and.html
    if (v.hasOwnProperty && v.hasOwnProperty('toString') &&
        (typeof v.toString !== 'undefined') && (obj.toString !== v.toString)) {
      obj.toString = v.toString;
    }
  }

  return obj;
}

module.exports = copyProperties;

},{}],8:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var invariant    = __browserify__('./invariant');
var merge        = __browserify__('./merge');
var getStepProps = __browserify__('./getStepProps');

var isViewPropRe = /([a-zA-Z0-9]+)View$/;

function getViewProps(allProps) {
  var views = {};
  var props = {};

  for (var name in allProps) {
    var m = isViewPropRe.exec(name);
    if (m) {
      var prop = m[1];

      invariant(
        !allProps.hasOwnProperty(prop),
        'view property "' + name + '" would overwrite regular property "' + prop + '"'
      );

      views[prop] = allProps[name];
    } else {
      props[name] = allProps[name];
    }
  }

  return {views:views, props:props};
}

function makeViewFactory(viewClass, viewProps) {
  return function viewFactory(props) {
    props = props !== null && props !== undefined ?
      merge(viewProps, props) :
      viewProps;
    return viewClass(props);
  };
}

function collectSubViews(props, subViews) {
  var r = getViewProps(props);
  var views = {};

  for (var name in r.views) {
    views[name] = makeViewFactory(r.views[name], merge(r.props, subViews));
  }

  return views;
}

/**
 * Create a view for which matches for a path with the provided routes
 *
 * @param {Route} routes
 * @returns {Promise<ReactComponent>}
 */
function createView(match) {
  var views = {};

  for (var i = match.activeTrace.length - 1; i >= 0; i--) {
    var step = match.activeTrace[i];
    var stepProps = getStepProps(step);

    views = merge(views, collectSubViews(stepProps, views));

    if (step.route.view !== undefined) {
      return step.route.view(merge(stepProps, views));
    }
  }
}

module.exports = createView;
module.exports.getViewProps = getViewProps;

},{"./getStepProps":12,"./invariant":14,"./merge":18}],9:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var Promise       = (window.Promise);
var merge         = __browserify__('./merge');
var emptyFunction = __browserify__('./emptyFunction');
var getStepProps  = __browserify__('./getStepProps');

/**
 * Make task
 *
 * @param {String} name
 * @param {Function} fetch
 * @returns {Function}
 */
function makeTask(fetch, deferred) {
  return function start(props, promises) {
    var promise = fetch(props, promises);

    if (promise.isFulfilled()) {
      deferred.resolve(promise.value());
      return promise;
    } else {
      return promise.then(
        function(result)  {
          deferred.resolve(result);
          return result;
        },
        function(err)  {
          deferred.reject(err);
          throw err;
        }
      );
    }
  };
}

var isPromisePropRe = /([a-zA-Z0-9]+)Promise$/;

/**
 * Fetch all promises defined in props
 *
 * @param {Object} props
 * @returns {Promise<Object>}
 */
function fetchProps(props) {
  var newProps = {};

  var deferreds = {};
  var promises = {};
  var tasks = {};

  var name;

  for (name in props) {
    var m = isPromisePropRe.exec(name);
    if (m) {
      var promiseName = m[1];
      var deferred = Promise.defer();
      tasks[promiseName] = makeTask(props[name], deferred);
      deferreds[promiseName] = deferred.promise;
    } else {
      newProps[name] = props[name];
    }
  }

  // not *Promise props, shortcircuit!
  if (Object.keys(deferreds).length === 0) {
    return Promise.resolve(props);
  }

  var isFulfilled = true;

  for (name in tasks) {
    var promise = tasks[name](newProps, deferreds);
    isFulfilled = isFulfilled && promise.isFulfilled();
    promises[name] = promise.isFulfilled() ? promise.value() : promise;
  }

  // every promise is resolved (probably from some DB cache?), shortcircuit!
  if (isFulfilled) {
    return Promise.resolve(merge(newProps, promises));
  }

  return Promise.props(promises)
    .then(function(props)  {return merge(newProps, props);})
    .finally(function()  {
      for (var name in deferreds) {
        deferreds[name].catch(emptyFunction);
      }
    });
}

function fetchStep(step) {
  var props = fetchProps(getStepProps(step));
  // step is resolved, shortcircuit!
  if (props.isFulfilled()) {
    return Promise.resolve(
      merge(step, {props: merge(step.props, props.value())}));
  } else {
    return Promise.props(props).then(function(props) 
      {return merge(step, {props: merge(step.props, props)});});
  }
}

function fetchProgressively(match, onProgress, onError) {
  var activeTrace = match.activeTrace;
  var latch = activeTrace.length;

  activeTrace.forEach(function(step, idx)  {
    var promise = fetchStep(step);

    if (promise.isFulfilled()) {
      latch = latch - 1;
      activeTrace = activeTrace.slice(0);
      activeTrace[idx] = promise.value();
    } else {
      promise.then(function(step)  {
        activeTrace = activeTrace.slice(0);
        activeTrace[idx] = step;
        onProgress(merge(match, {activeTrace:activeTrace}));
      }).catch(onError);
    }
  });

  return merge(match, {activeTrace:activeTrace});
}

function fetch(match) {
  return Promise.all(match.activeTrace.map(fetchStep))
    .then(function(activeTrace)  {return merge(match, {activeTrace:activeTrace});});
}

module.exports = {
  fetch:fetch,
  fetchProgressively:fetchProgressively,
  fetchProps:fetchProps
};

},{"./emptyFunction":10,"./getStepProps":12,"./merge":18}],10:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule emptyFunction
 */
'use strict';

var copyProperties = __browserify__('./copyProperties');

function makeEmptyFunction(arg) {
  return function() {
    return arg;
  };
}

/**
 * This function accepts and discards inputs; it has no side effects. This is
 * primarily useful idiomatically for overridable function endpoints which
 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
 */
function emptyFunction() {}

copyProperties(emptyFunction, {
  thatReturns: makeEmptyFunction,
  thatReturnsFalse: makeEmptyFunction(false),
  thatReturnsTrue: makeEmptyFunction(true),
  thatReturnsNull: makeEmptyFunction(null),
  thatReturnsThis: function() { return this; },
  thatReturnsArgument: function(arg) { return arg; }
});

module.exports = emptyFunction;

},{"./copyProperties":7}],11:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var merge   = __browserify__('./merge');
var Promise = (window.Promise);

function fetchViewsStep(step) {
  var props = merge(step.match, step.route.props);
  return step.route.viewPromise ?
    step.route.viewPromise(props).then(function(view)  {return merge(step, {view:view});}) :
    step;
}

/**
 * Fetch views for match
 *
 * @param {Match} match
 * @returns {Match}
 */
function fetchViews(match) {
  var activeTrace = match.activeTrace.map(fetchViewsStep);

  return activeTrace.some(Promise.is) ?
    Promise.all(activeTrace).then(function(activeTrace)  {return merge(match, {activeTrace:activeTrace});}) :
    Promise.resolve(merge(match, {activeTrace:activeTrace}));
}

module.exports = fetchViews;

},{"./merge":18}],12:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var mergeInto = __browserify__('./mergeInto');

function getStepProps(step) {
  var props = {};
  mergeInto(props, step.match);
  mergeInto(props, step.route.props);
  mergeInto(props, step.props);
  return props;
}

module.exports = getStepProps;

},{"./mergeInto":20}],13:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var matchRoutes         = __browserify__('./matchRoutes');
var createView          = __browserify__('./createView');
var PathnameRouting     = __browserify__('./routing/PathnameRouting');
var HashRouting         = __browserify__('./routing/HashRouting');
var Link                = __browserify__('./Link');
var LinkMixin           = __browserify__('./LinkMixin');
var route               = __browserify__('./route');
var RoutingContextMixin = __browserify__('./RoutingContextMixin');

function isRoutes(routes) {
  var keys = Object.keys(routes);
  return (
    keys.indexOf('path') > -1
    && keys.indexOf('view') > -1
    && keys.indexOf('props') > -1
    && keys.indexOf('children') > -1
  );
}

module.exports = {
  isRoutes:isRoutes,
  Routes: route.Routes,
  Route: route.Route,
  Link:Link,
  LinkMixin:LinkMixin,
  matchRoutes:matchRoutes,
  createView:createView,
  start: PathnameRouting.start.bind(PathnameRouting),
  PathnameRouting:PathnameRouting,
  HashRouting:HashRouting,
  RoutingContextMixin:RoutingContextMixin
};

},{"./Link":4,"./LinkMixin":5,"./RoutingContextMixin":6,"./createView":8,"./matchRoutes":17,"./route":21,"./routing/HashRouting":22,"./routing/PathnameRouting":23}],14:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition) {
  if (!condition) {
    var error = new Error(
      'Minified exception occured; use the non-minified dev environment for ' +
      'the full error message and additional helpful warnings.'
    );
    error.framesToPop = 1;
    throw error;
  }
};

if ("development" !== 'production') {
  invariant = function(condition, format, a, b, c, d, e, f) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }

    if (!condition) {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      var error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.framesToPop = 1; // we don't care about invariant's own frame
      throw error;
    }
  };
}

module.exports = invariant;

},{}],15:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule keyMirror
 * @typechecks static-only
 */

"use strict";

var invariant = __browserify__('./invariant');

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  invariant(
    obj instanceof Object && !Array.isArray(obj),
    'keyMirror(...): Argument must be an object.'
  );
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

},{"./invariant":14}],16:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var invariant       = __browserify__('./invariant');
var getTraceByName  = __browserify__('./route').getTraceByName;

function makeHref(routes, name, match, params) {
  params = params || {};
  var pattern = getPattern(routes, name, match);
  // TODO: handle optional and splat params
  return pattern.replace(
    /:[a-zA-Z0-9_]+/g,
    function(name)  {return params[name.slice(1)];}
  );
}

function getPattern(routes, name, match) {
  var trace = getScopedTrace(routes, name, match);

  invariant(
    trace !== undefined && trace.length > 0,
    'cannot resolve "%s" route reference', name
  );

  var href = '';
  for (var i = 0, len = trace.length; i < len; i++) {
    var route = trace[i];
    if (route.path && route.path.length > 0) {
      href = href + '/' + route.path;
    }
  }

  return href === '' ? '/' : href;
}

function getScopedTrace(routes, name, match) {
  if (name[0] === '/') {
    return getTraceByName(routes, name.slice(1));
  } else {
    var trace = match.trace.map(function(step)  {return step.route;});
    var scope = trace[0];

    for (var i = trace.length - 1; i >= 0; i--) {
      if (trace[i].__scope) {
        scope = trace[i];
        break;
      }
    }

    return trace
      .slice(0, i)
      .concat(getTraceByName(scope, name));
  }
}

module.exports = makeHref;
module.exports.getPattern = getPattern;

},{"./invariant":14,"./route":21}],17:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var pattern = __browserify__('url-pattern');
var qs      = __browserify__('qs');
var hasView = __browserify__('./route').hasView;

/**
 * Normalize path
 *
 * @param {String} path
 * @returns {String}
 */
function normalize(path) {
  if (!path) {
    return '/';
  }
  if (path[0] !== '/') {
    path = '/' + path;
  }
  if (path[path.length - 1] !== '/') {
    path = path + '/';
  }
  return path;
}

/**
 * Match route against path
 *
 * @param {Route} route
 * @param {String} path
 * @returns {Match|Null}
 */
function matchRoute(route, path) {

  if (route.pattern === undefined && route.path !== undefined) {
    var routePath = normalize(route.path);

    Object.defineProperty(route, 'pattern', {
      enumerable: false,
      value: pattern.newPattern(route.children.length > 0 ?
        routePath + '*' :
        routePath)
    });
  }

  if (route.pattern) {
    var match = route.pattern.match(path);

    if (match
        && (!match._ || match._[0] === '/' || match._[0] === '')) {
      delete match._;
    }

    return match;

  } else {
    return path === '/' || path === '' ? {} : {_: [path]};
  }
}

function matchRoutesImpl(routes, path, query, trace, activeTrace, originalPath) {
  routes = Array.isArray(routes) ? routes : [routes];
  trace = trace || [];
  activeTrace = activeTrace || [];
  originalPath = originalPath === undefined ? path : originalPath;

  for (var i = 0, len = routes.length; i < len; i++) {
    var route = routes[i];
    var match = matchRoute(route, normalize(path));

    if (!match) {
      continue;
    }

    var step = {route:route, match:match, props: {query:query}};

    trace = trace.concat(step);

    activeTrace = route.view !== undefined ?
      [step] : activeTrace.concat(step);

    if ((match._ || !hasView(route)) && route.children.length > 0) {
      return matchRoutesImpl(
        route.children, match._ ? match._[0] : '/', query,
        trace, activeTrace, originalPath);
    } else {
      return {path: originalPath, route:route, trace:trace, activeTrace:activeTrace};
    }
  }

  return {
    path: originalPath,
    query: query,
    route: undefined,
    trace: [],
    activeTrace: []
  };
}

/**
 * Match routes against path
 *
 * @param {Route} routes
 * @param {String} path
 * @returns {Match}
 */
function matchRoutes(routes, path, query) {
  return matchRoutesImpl(routes, path, qs.parse(query));
}

module.exports = matchRoutes;

},{"./route":21,"qs":1,"url-pattern":2}],18:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule merge
 */

"use strict";

var mergeInto = __browserify__('./mergeInto');

/**
 * Shallow merges two structures into a return value, without mutating either.
 *
 * @param {?object} one Optional object with properties to merge from.
 * @param {?object} two Optional object with properties to merge from.
 * @return {object} The shallow extension of one by two.
 */
var merge = function(one, two) {
  var result = {};
  mergeInto(result, one);
  mergeInto(result, two);
  return result;
};

module.exports = merge;

},{"./mergeInto":20}],19:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeHelpers
 *
 * requiresPolyfills: Array.isArray
 */

"use strict";

var invariant = __browserify__('./invariant');
var keyMirror = __browserify__('./keyMirror');

/**
 * Maximum number of levels to traverse. Will catch circular structures.
 * @const
 */
var MAX_MERGE_DEPTH = 36;

/**
 * We won't worry about edge cases like new String('x') or new Boolean(true).
 * Functions are considered terminals, and arrays are not.
 * @param {*} o The item/object/value to test.
 * @return {boolean} true iff the argument is a terminal.
 */
var isTerminal = function(o) {
  return typeof o !== 'object' || o === null;
};

var mergeHelpers = {

  MAX_MERGE_DEPTH: MAX_MERGE_DEPTH,

  isTerminal: isTerminal,

  /**
   * Converts null/undefined values into empty object.
   *
   * @param {?Object=} arg Argument to be normalized (nullable optional)
   * @return {!Object}
   */
  normalizeMergeArg: function(arg) {
    return arg === undefined || arg === null ? {} : arg;
  },

  /**
   * If merging Arrays, a merge strategy *must* be supplied. If not, it is
   * likely the caller's fault. If this function is ever called with anything
   * but `one` and `two` being `Array`s, it is the fault of the merge utilities.
   *
   * @param {*} one Array to merge into.
   * @param {*} two Array to merge from.
   */
  checkMergeArrayArgs: function(one, two) {
    invariant(
      Array.isArray(one) && Array.isArray(two),
      'Tried to merge arrays, instead got %s and %s.',
      one,
      two
    );
  },

  /**
   * @param {*} one Object to merge into.
   * @param {*} two Object to merge from.
   */
  checkMergeObjectArgs: function(one, two) {
    mergeHelpers.checkMergeObjectArg(one);
    mergeHelpers.checkMergeObjectArg(two);
  },

  /**
   * @param {*} arg
   */
  checkMergeObjectArg: function(arg) {
    invariant(
      !isTerminal(arg) && !Array.isArray(arg),
      'Tried to merge an object, instead got %s.',
      arg
    );
  },

  /**
   * Checks that a merge was not given a circular object or an object that had
   * too great of depth.
   *
   * @param {number} Level of recursion to validate against maximum.
   */
  checkMergeLevel: function(level) {
    invariant(
      level < MAX_MERGE_DEPTH,
      'Maximum deep merge depth exceeded. You may be attempting to merge ' +
      'circular structures in an unsupported way.'
    );
  },

  /**
   * Checks that the supplied merge strategy is valid.
   *
   * @param {string} Array merge strategy.
   */
  checkArrayStrategy: function(strategy) {
    invariant(
      strategy === undefined || strategy in mergeHelpers.ArrayStrategies,
      'You must provide an array strategy to deep merge functions to ' +
      'instruct the deep merge how to resolve merging two arrays.'
    );
  },

  /**
   * Set of possible behaviors of merge algorithms when encountering two Arrays
   * that must be merged together.
   * - `clobber`: The left `Array` is ignored.
   * - `indexByIndex`: The result is achieved by recursively deep merging at
   *   each index. (not yet supported.)
   */
  ArrayStrategies: keyMirror({
    Clobber: true,
    IndexByIndex: true
  })

};

module.exports = mergeHelpers;

},{"./invariant":14,"./keyMirror":15}],20:[function(__browserify__,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeInto
 * @typechecks static-only
 */

"use strict";

var mergeHelpers = __browserify__('./mergeHelpers');

var checkMergeObjectArg = mergeHelpers.checkMergeObjectArg;

/**
 * Shallow merges two structures by mutating the first parameter.
 *
 * @param {object} one Object to be merged into.
 * @param {?object} two Optional object with properties to merge from.
 */
function mergeInto(one, two) {
  checkMergeObjectArg(one);
  if (two != null) {
    checkMergeObjectArg(two);
    for (var key in two) {
      if (!two.hasOwnProperty(key)) {
        continue;
      }
      one[key] = two[key];
    }
  }
}

module.exports = mergeInto;

},{"./mergeHelpers":19}],21:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var merge = __browserify__('./merge');

var slashes = /(^\/)|(\/$)/g;

/**
 * Route desriptor constructor
 *
 * @param {Object} props
 * @param {Object...} children
 * @returns {Route}
 */
function Route(props) {
  props = props || {};

  var path = props.path ?
    props.path.replace(slashes, '') :
    undefined;

  delete props.path;

  var view = props.view;
  delete props.view;

  var viewPromise = props.viewPromise;
  delete props.viewPromise;

  var name = props.name;
  delete props.name;

  var __scope = props.__scope;
  delete props.__scope;

  var args = Array.prototype.slice.call(arguments, 1);

  var children = [];

  // so we support passing routes as arguments and arrays
  for (var i = 0, len = args.length; i < len; i++) {
    if (Array.isArray(args[i])) {
      children = children.concat(args[i]);
    } else {
      children.push(args[i]);
    }
  }

  var route = {path:path, name:name, view:view, viewPromise:viewPromise, props:props, children:children, __scope:__scope};
  buildNameIndex(route);
  return route;
}

function Routes(props) {
  props = merge(props, {__scope: true});
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(props);
  return Route.apply(null, args);
}

function buildNameIndex(route) {
  if (route.__nameIndex !== undefined) {
    return;
  }

  var index = {};
  var prefix = route.name ? route.name + '/' : '';

  if (route.children && route.children.length > 0) {
    for (var i = 0, len = route.children.length; i < len; i++) {
      var r = route.children[i];
      buildNameIndex(r);
      for (var name in r.__nameIndex) {
        index[prefix + name] = [route].concat(r.__nameIndex[name]);
      }
    }
  }
  
  if (route.name !== undefined) {
    index[route.name] = [route];
  }

  Object.defineProperty(route, '__nameIndex', {
    enumerable: false,
    value: index
  });
}

function getTraceByName(route, name) {
  return route.__nameIndex[name];
}

function hasView(route) {
  return route.view !== undefined || route.viewPromise !== undefined;
}

module.exports = {
  Route:Route,
  Routes:Routes,
  getTraceByName:getTraceByName,
  hasView:hasView
};

},{"./merge":18}],22:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var Routing = __browserify__('./Routing');

for(var Routing____Key in Routing){if(Routing.hasOwnProperty(Routing____Key)){HashRouting[Routing____Key]=Routing[Routing____Key];}}var ____SuperProtoOfRouting=Routing===null?null:Routing.prototype;HashRouting.prototype=Object.create(____SuperProtoOfRouting);HashRouting.prototype.constructor=HashRouting;HashRouting.__superConstructor__=Routing;function HashRouting(){if(Routing!==null){Routing.apply(this,arguments);}}

  HashRouting.prototype.getPath=function() {
    return this.getParsedPath().path;
  };

  HashRouting.prototype.getQuery=function() {
    return this.getParsedPath().query;
  };

  HashRouting.prototype.getParsedPath=function() {
    var path = window.location.hash.slice(1) || '/';
    var idx = path.indexOf('?');
    if (idx > -1) {
      return {path: path.substring(0, idx), query: path.substring(idx + 1)};
    } else {
      return {path:path, query: ''};
    }
  };

  HashRouting.prototype.pushPath=function(path) {
    window.location.hash = path;
  };

  HashRouting.prototype.replacePath=function(path) {
    var href = window.location.href.replace(/(javascript:|#).*$/, '');
    window.location.replace(href + '#' + path);
  };

  HashRouting.prototype.makeHref=function(name, params) {
    return '#' + ____SuperProtoOfRouting.makeHref.call(this,name, params);
  };

  HashRouting.prototype.doStart=function() {
    window.addEventListener('hashchange', this.onChange);
  };

  HashRouting.prototype.doStop=function() {
    window.removeEventListener('hashchange', this.onChange);
  };


module.exports = HashRouting;

},{"./Routing":24}],23:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var Routing = __browserify__('./Routing');

for(var Routing____Key in Routing){if(Routing.hasOwnProperty(Routing____Key)){PathnameRouting[Routing____Key]=Routing[Routing____Key];}}var ____SuperProtoOfRouting=Routing===null?null:Routing.prototype;PathnameRouting.prototype=Object.create(____SuperProtoOfRouting);PathnameRouting.prototype.constructor=PathnameRouting;PathnameRouting.__superConstructor__=Routing;function PathnameRouting(){if(Routing!==null){Routing.apply(this,arguments);}}

  PathnameRouting.prototype.getPath=function() {
    return window.location.pathname;
  };

  PathnameRouting.prototype.getQuery=function() {
    return window.location.search.substr(1);
  };

  PathnameRouting.prototype.pushPath=function(path) {
    window.history.pushState({}, '', path);
  };

  PathnameRouting.prototype.replacePath=function(path) {
    window.history.replaceState({}, '', path);
  };

  PathnameRouting.prototype.doStart=function() {
    window.addEventListener('popstate', this.onChange);
  };

  PathnameRouting.prototype.doStop=function() {
    window.removeEventListener('popstate', this.onChange);
  };


module.exports = PathnameRouting;

},{"./Routing":24}],24:[function(__browserify__,module,exports){
/**
 * @jsx React.DOM
 */
'use strict';

var qs                    = __browserify__('qs');
var React                 = (window.React);
var createView            = __browserify__('../createView');
var matchRoutes           = __browserify__('../matchRoutes');
var data                  = __browserify__('../data');
var fetchViews            = __browserify__('../fetchViews');
var makeHref              = __browserify__('../makeHref');

function throwError(err) {
  throw err;
}



  function Routing(routes, onRoute, onError) {
    this.routes = routes;
    this.onRoute = onRoute;
    this.onError = onError || throwError;
    this.onChange = this.onChange.bind(this);
    this.path = undefined;
    this.match = undefined;
    this.started = false;
  }

  Routing.prototype.onChange=function() {
    var path = this.getPath();
    var query = this.getQuery();
    if (this.path !== path || this.query !== query) {
      this.path = path;
      this.query = query;
      this.match = matchRoutes(this.routes, path, query);

      var expectedMatch = this.match;

      var render = function(match)  {
        if (this.match === expectedMatch) {
          this.renderView(match);
        }
      }.bind(this);

      var promise = fetchViews(this.match);

      if (promise.isFulfilled()) {
        render(data.fetchProgressively(promise.value(), render, this.onError));
      } else {
        promise.then(function(match)  {
          render(data.fetchProgressively(match, render, this.onError));
        }.bind(this), this.onError);
      }

      return this.match;
    }
  };

  Routing.prototype.renderView=function(match) {
    var context = {match:match, routing: this, routes: this.routes};
    React.withContext(context, function()  {
      var view = createView(match);
      this.onRoute(view, match);
    }.bind(this));
  };

  Routing.prototype.navigate=function(path, navigation) {
    navigation = navigation || {};
    if (navigation.replace) {
      this.replacePath(path, navigation);
    } else {
      this.pushPath(path, navigation);
    }
    return this.onChange();
  };

  Routing.prototype.navigateTo=function(routeRef, props, navigation) {
    var path = this.makeHref(routeRef, props);
    this.navigate(path, navigation);
  };

  Routing.prototype.makeHref=function(name, params) {
    var href = makeHref(this.routes, name, this.match, params);
    if (params && params.query) {
      href = href + '?' + qs.stringify(params.query);
    }
    return href;
  };

  Routing.prototype.start=function() {
    if (!this.started) {
      this.doStart();
      this.onChange();
      this.started = true;
    }
    return this;
  };

  Routing.prototype.stop=function() {
    if (this.started) {
      this.doStop();
      this.started = false;
    }
    return this;
  };

  Routing.start=function(routes, onRoute, onError) {
    return new this(routes, onRoute, onError).start();
  };


module.exports = Routing;

},{"../createView":8,"../data":9,"../fetchViews":11,"../makeHref":16,"../matchRoutes":17,"qs":1}]},{},[3])
