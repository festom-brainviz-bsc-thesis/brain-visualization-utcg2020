const {Float16Array} = require("@petamoriken/float16");
export default (function() {
  // Adapted from "NumPy binary file parser for javascript" by Nezar Abdennur (nvictus)
  // https://gist.github.com/nvictus/88b3b5bfe587d32ac1ab519fd0009607
  function asciiDecode(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  function readUint16LE(buffer) {
    const view = new DataView(buffer);
    let val = view.getUint8(0);
    val |= view.getUint8(1) << 8;
    return val;
  }

  function fromArrayBuffer(buf) {
    // Check the magic number
    const magic = asciiDecode(buf.slice(0, 6));
    if (magic.slice(1, 6) != "NUMPY") {
      throw new Error("unknown file type");
    }

    // const version = new Uint8Array(buf.slice(6, 8));
    const headerLength = readUint16LE(buf.slice(8, 10));
    const headerStr = asciiDecode(buf.slice(10, 10+headerLength));
    const offsetBytes = 10 + headerLength;
    // eslint-disable-next-line max-len
    // rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    // Hacky conversion of dict literal string to JS Object
    let info;
    eval("info = " + headerStr.toLowerCase().replace("(", "[").replace("),", "]"));

    // Intepret the bytes according to the specified dtype
    let data;
    if (info.descr === "|u1") {
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|i1") {
      data = new Int8Array(buf, offsetBytes);
    } else if (info.descr === "<u2") {
      data = new Uint16Array(buf, offsetBytes);
    } else if (info.descr === "<i2") {
      data = new Int16Array(buf, offsetBytes);
    } else if (info.descr === "<u4") {
      data = new Uint32Array(buf, offsetBytes);
    } else if (info.descr === "<i4") {
      data = new Int32Array(buf, offsetBytes);
    } else if (info.descr === "<f2") {
      data = new Float16Array(buf, offsetBytes);
    } else if (info.descr === "<f4") {
      data = new Float32Array(buf, offsetBytes);
    } else if (info.descr === "<f8") {
      data = new Float64Array(buf, offsetBytes);
    } else if (info.descr.startsWith("|s")) {
      const size = parseInt(info.descr.substring(2));
      const enc = new TextDecoder("utf-8");
      data = enc.decode(new Uint8Array(buf, offsetBytes)).split("");
      const newArray = [];
      // chunking an array: https://stackoverflow.com/a/8495740
      for (let i=0, j=data.length; i<j; i+=size) {
        // remove ascII 0 code chars which .npy uses in its strings as padding
        const temparray = data.slice(i, i+size).join("").replace(/[\x00]/g, "");
        newArray.push(temparray);
      }
      data = newArray;
    } else {
      throw new Error(`unknown dtype ${info.descr}`);
    }

    return {
      shape: info.shape,
      fortran_order: info.fortran_order,
      data: data,
    };
  }

  function open(file, callback) {
    const reader = new FileReader();
    reader.onload = function() {
      // the file contents have been read as an array buffer
      const buf = reader.result;
      const ndarray = fromArrayBuffer(buf);
      callback(ndarray);
    };
    reader.readAsArrayBuffer(file);
  }

  function ajax(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function(e) {
      const buf = xhr.response; // not responseText
      const ndarray = fromArrayBuffer(buf);
      callback(ndarray);
    };
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
  }

  return {
    open: open,
    ajax: ajax,
  };
})();
