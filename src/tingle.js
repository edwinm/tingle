/**
 tingle 1.0.0
 @copyright 2016 Edwin Martin <edwin@bitstorm.org>
 @license MIT
 */

function webgl(canvas, vertexShaderCode, pixelShaderCode) {
    var buffer;
    var timeStart;
    var mouse = {};

    var gl = canvas.getContext('experimental-webgl');

    var attributes = getAttributes(vertexShaderCode);
    var uniforms = getUniforms(vertexShaderCode + pixelShaderCode);

    var attribLocations;
    var uniformLocations;
    var buffers = {};
    var bufferType;

    obj = Object.create(Object.prototype, {
        buffer: {
            value: function (arg, type) {
                bufferType = type;
                buffer = gl.createBuffer();
                if (type == gl.TRIANGLES) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arg), gl.STATIC_DRAW);
                } else {
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arg), gl.STATIC_DRAW);
                }
            }
        },

        value: {
            value: function (prop, val) {
                if (!(prop in uniforms)) {
                    throw new Error("Uniform " + prop + " not found.");
                }

                switch (uniforms[prop]) {
                    case 'mat4':
                        gl.uniformMatrix4fv(uniformLocations[prop], false, val);
                        break;
                    case 'sampler2D':
                        var texture = gl.createTexture();
                        texture.image = new Image();
                        texture.image.onload = function () {
                            var samplerUniform = gl.getUniformLocation(program, prop);
                            gl.bindTexture(gl.TEXTURE_2D, texture);
                            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                            gl.bindTexture(gl.TEXTURE_2D, null);

                            gl.activeTexture(gl.TEXTURE0);
                            gl.bindTexture(gl.TEXTURE_2D, texture);
                            gl.uniform1i(samplerUniform, 0);
                        };
                        texture.image.onerror = function () {
                            throw new Error("Could not load image " + val + " for " + prop + ".");
                        };
                        texture.image.src = val;
                        break;
                }
            }
        },

        setBuffer: {
            value: function (prop, val) {
                if (!(prop in attributes)) {
                    throw new Error("Attribute " + prop + " not found.");
                }

                buffers[prop] = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers[prop]);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(val), gl.STATIC_DRAW);
            }
        },

        render: {
            value: function (userRender) {
                window.requestAnimationFrame(function() {
                    obj.render(userRender);
                });

                if (userRender) {
                    userRender();
                }

                gl.uniform1f(uniformLocations.time, new Date() / 1000 - timeStart);
                gl.uniform2f(uniformLocations.mouse, mouse.x, mouse.y);

                for (var buf in buffers) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[buf]);
                    gl.vertexAttribPointer(program[buf], 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(attribLocations[buf]);
                }

                if (bufferType == gl.TRIANGLES) {
                    var positionLocation = gl.getAttribLocation(program, "a_position");
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                } else {
                    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneIndexBuffer);
                    // gl.drawElements(gl.LINE_LOOP, cube.indices.length, gl.UNSIGNED_SHORT, 0);
                }
            }
        },

        gl: {
            get: function() {
                return gl;
            }
        },
        canvas: {
            get: function() {
                return canvas;
            }
        }
    });

    // TODO: skip commented code
    function getAttributes(code) {
        var match = code.match(/attribute\s+([a-z0-9]+)\s+([a-z0-9]+)\s*;/gi);
        if (!match) {
            return [];
        }
        var attributes = [];
        match.forEach(function (m) {
            var match = m.match(/attribute\s+([a-z0-9]+)\s+([a-z0-9]+)/i);
            attributes[match[2]] = match[1];
        });

        console.log('attributes', attributes);

        return attributes;
    }

    // TODO: skip commented code
    function getUniforms(code) {
        var match = code.match(/uniform\s+([a-z0-9]+)\s+([a-z0-9]+)\s*;/gi);
        var uniforms = [];
        match.forEach(function (m) {
            var match = m.match(/uniform\s+([a-z0-9]+)\s+([a-z0-9]+)/i);
            uniforms[match[2]] = match[1];
        });

        return uniforms;
    }

    function getAttribLocations(attributes) {
        var attribLocations = {};
        for (var attr in attributes) {
            attribLocations[attr] = gl.getAttribLocation(program, attr);
        }
        return attribLocations;
    }

    function getUniformLocations(uniforms) {
        var uniformLocations = {};
        for (var unif in uniforms) {
            uniformLocations[unif] = gl.getUniformLocation(program, unif);
        }
        return uniformLocations;
    }

    function init() {
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        // DRY
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderCode);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader) + " (vertex shader)");
        }

        // DRY
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, pixelShaderCode);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader) + " (fragment shader)" );
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Could not initialise shaders.');
        }

        gl.useProgram(program);

        attribLocations = getAttribLocations(attributes);
        uniformLocations = getUniformLocations(uniforms);

        gl.uniform2f(uniformLocations.resolution, canvas.width, canvas.height);

        timeStart = new Date() / 1000;

        document.body.addEventListener('mousemove',
            function mouseMove(evt) {
                var canvasOffset = canvas.getBoundingClientRect();
                mouse = {x: evt.x - canvasOffset.left, y: canvas.height - (evt.y - canvasOffset.top)};
            }
        );
    }

    init();

    return obj;
}
