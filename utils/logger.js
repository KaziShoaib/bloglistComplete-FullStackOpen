const info = (...params) => {  //putting all paramaters together
  if(process.env.NODE_ENV !== 'test'){
    console.log(...params);
  }
};


const error = (...params) => {  //putting all paramaters together
  if(process.env.NODE_ENV !== 'test'){
    console.error(...params);
  }
};


module.exports ={
  info, error
};
