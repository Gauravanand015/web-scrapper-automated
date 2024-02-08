const fun = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = Math.random();
      if (data > 0.5) {
        resolve("data: " + data);
      } else {
        reject("data is too low : " + data);
      }
    }, 1000);
  });
};

fun()
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });
