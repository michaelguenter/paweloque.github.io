/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "_" }] */
/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
/* global Vue */

(function() {

    function tokenize(text) {
        return text
            .replace(/\(/g, " ( ")
            .replace(/\)/g, " ) ")
            .replace(/;.*$/gm, "")
            .replace(/\n/g, " ")
            .split(" ")
            .filter(Boolean);
    }

    function parse(tokens) {
        if (tokens.length === 0) {
            throw SyntaxError("Unexpected EOF while reading");
        }
        var token = tokens.shift();
        if (token === "(") {
            var list = [];
            while (tokens[0] !== ")") {
                list.push(parse(tokens));
            }
            tokens.shift();
            return list;
        } else if (token === ")") {
            throw SyntaxError("Unexpected )");
        } else {
            return atom(token);
        }
    }

    function atom(token) {
        var number = parseFloat(token);
        if (isNaN(number)) {
            return token;
        } else {
            return number;
        }
    }

    const global_env = {
        "+": (a, b) => a + b,
        "-": (a, b) => a - b,
        "*": (a, b) => a * b,
        "/": (a, b) => a / b,
        "=": (a, b) => a === b,
        "!=": (a, b) => a !== b,
        ">": (a, b) => a > b,
        ">=": (a, b) => a >= b,
        "<": (a, b) => a < b,
        "<=": (a, b) => a <= b,
        "begin": (...args) => args[args.length - 1]
    };

    function evaluate(x, env) {
        if (typeof x === "string") {
            return env[x];
        } else if (typeof x === "number") {
            return x;
        } else if (x[0] === "if") {
            const [_, test, conseq, alt] = x;
            const exp = evaluate(test, env) ? conseq : alt;
            return evaluate(exp, env);
        } else if (x[0] === "define") {
            const [_, name, exp] = x;
            env[name] = evaluate(exp, env);
        } else if (x[0] === "lambda") {
            const [_, arg_names, body] = x;
            // Do nothing for now, except store the current environment
            // together with the function definition.
            return ["lambda", arg_names, body, env];
        } else {
            // Function call (no special form)
            const func_name = x[0];
            const [func, ...args] = x.map(exp => evaluate(exp, env));
            if (typeof func === "undefined") {
                throw Error("Unknown function name: " + func_name);
            } else if (typeof func === "function") {
                // Native JavaScript function call
                return func(...args);
            } else {
                // MiniScheme function call
                const [_, arg_names, body, definition_env] = func;

                // Create a new function calling environment with the supplied
                // argument names and values. Link to the environment at
                // function definition as outer environment.
                const call_env = arg_names.reduce(function(env, name, i) {
                    env[name] = args[i];
                    return env;
                }, Object.create(definition_env));

                // Evaluate the function body with the newly created environment
                return evaluate(body, call_env);
            }
        }
    }

    Vue.component("item", {
        template: "#item-template",
        props: ["model"],
        computed: {
            isList: function() {
                return this.model instanceof Array;
            }
        },
    });

    const vm = new Vue({
        el: "#app",
        data: {
            input: "",
            tokens: [],
            ast: [],
            env: {},
            global_env: global_env,
            result: undefined,
            error: false,
            debug: true
        },
        computed: {
            parenBalance: function() {
                return this.input.split("(").length -
                       this.input.split(")").length;
            }
        },
        watch: {
            input: function(val) {
                this.ast = [];
                this.result = undefined;
                this.error = false;
                try {
                    this.tokens = tokenize(val);
                    this.ast = parse(this.tokens.slice());
                    this.env = Object.create(this.global_env);
                    this.result = evaluate(this.ast, this.env);
                } catch (error) {
                    this.error = error.message;
                }
            }
        },
    });

    // Example input:
    vm.input = `(begin
    (define sqrt (lambda (x) (begin
        (define abs (lambda (a) (if (> a 0) x (- 0 a))))
        (define good_enough? (lambda (guess)
            (<= (abs (- x (* guess guess))) 0.000001)
        ))
        (define avg  (lambda (a b) (/ (+ a b) 2) ))
        (define sqrt_iter (lambda (guess)
            (if (good_enough? guess) guess (sqrt_iter (avg guess (/ x guess))))
        ))
        (sqrt_iter 1))))
    (sqrt 2))`;
}());
