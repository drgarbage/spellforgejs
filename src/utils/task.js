export const waitForResult = (checker, options) => {
  const { timeout = 20000, interval = 1000} = options || {};
  return new Promise((resolve, reject) => {
    const begin = new Date().getTime();
    const hdl = setInterval(async () => {
      const rs = await checker();

      if(rs === false && new Date().getTime() - begin > timeout) {
        reject("Operation Timeout");
        clearInterval(hdl);
      }

      if(rs !== false){
        resolve(rs);
        clearInterval(hdl);
      }
    }, interval);
  });
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));