const nj = require("numjs");

const preprocessNpy = (matrix) => {
  const {shape, data} = matrix;
  return nj.array(Object.values(data)).reshape(shape);
};

export {preprocessNpy};
