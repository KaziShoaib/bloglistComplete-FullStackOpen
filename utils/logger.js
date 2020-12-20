const info = (...params) => {  //putting all paramaters together
  console.log(...params);
};


const error = (...params) => {  //putting all paramaters together
  console.error(...params);
};


module.exports ={
  info, error
};
