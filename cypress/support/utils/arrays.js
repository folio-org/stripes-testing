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
    if (array.length === 0) return true;

    let outOfOrderCount = 0;

    for (let i = 1; i < array.length; i++) {
      // Normalize strings for comparison: replace hyphens with spaces and trim
      const prev = array[i - 1].trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
      const current = array[i].trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');

      // Compare adjacent elements
      if (prev.localeCompare(current) > 0) {
        outOfOrderCount++;

        // Early exit if the accuracy threshold is exceeded
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
