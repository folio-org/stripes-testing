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

  compareArrays(arr1, arr2) {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    if (set1.size !== set2.size) {
      return false;
    }

    for (const value of set1) {
      if (!set2.has(value)) {
        return false;
      }
    }

    return true;
  },

  checkIsSortedAlphabetically({ array = [], direction = 'ascending' } = {}) {
    const nonWordCharRegExp = new RegExp(/\W/);
    const result = [];

    for (let i = 1; i < array.length; i++) {
      const prev = array[i - 1].replace(/\s+/gi, '').toLowerCase();
      const current = array[i].replace(/\s+/gi, '').toLowerCase();

      if (!nonWordCharRegExp.test(current)) {
        result.push(prev.localeCompare(current));
      }
    }

    return direction === 'ascending' ? result.every((n) => n <= 0) : result.every((n) => n >= 0);
  },
};

export const randomizeArray = (array) => {
  let currentIndex = array.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};
