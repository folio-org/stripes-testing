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

  checkIsSortedAlphabetically({ array = [], accuracy = 1 } = {}) {
    const result = array.reduce((acc, it) => {
      if (acc.length) {
        const prev = acc[acc.length - 1].value;
        const current = it.toLowerCase();

        return [...acc, { value: current, order: prev.localeCompare(current) }];
      } else {
        return [{ value: it.toLowerCase(), order: 0 }];
      }
    }, []);

    const invalidOrder = result.filter(({ order }) => order > 0);
    return (invalidOrder.length * 100) / array.length < accuracy;
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
