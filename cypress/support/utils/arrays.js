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

  arrayContainsArray(array1, array2) {
    return array2.every((value) => array1.includes(value));
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

  checkIsSortedAlphabetically({ array = [], accuracy = 5 } = {}) {
    if (array.length === 0) return true;

    let outOfOrderCount = 0;

    for (let i = 1; i < array.length; i++) {
      const normalize = (str) => str.trim().toLowerCase().replace(/-/g, '');

      const prev = normalize(array[i - 1]);
      const current = normalize(array[i]);

      if (prev.localeCompare(current) > 0) {
        outOfOrderCount++;
        if ((outOfOrderCount * 100) / array.length >= accuracy) {
          return false;
        }
      }
    }

    return true;
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
