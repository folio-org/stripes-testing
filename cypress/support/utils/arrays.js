export default {
  getRandomElement(arr) {
    const rand = Math.floor(Math.random() * arr.length);
    return arr[rand];
  },

  genCharArray(charA, charZ) {
    const a = [];
    let i = charA.charCodeAt(0);
    const j = charZ.charCodeAt(0);
    for (; i <= j; ++i) {
      a.push(String.fromCharCode(i));
    }
    return a;
  },
};

export const randomizeArray = (array) => {
  let currentIndex = array.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};
