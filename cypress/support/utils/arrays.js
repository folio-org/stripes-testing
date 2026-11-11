// Hyphens are dropped and whitespace is collapsed, so "Default - Delete" and "Default Delete"
// compare the same way (a leftover double space would sort before any letter)
const normalizeForAlphabeticalSort = (str) => str.trim().toLowerCase().replace(/-/g, '').replace(/\s+/g, ' ');

// Mirrors "sortBy <field>" of FOLIO storage modules (RMB): ORDER BY lower(f_unaccent(<field>)) in a
// Postgres locale collation, which ignores punctuation and spaces when comparing. Use it for lists
// that the backend sorts, e.g. the Data import profiles (UI sends "sortBy name")
const normalizeLikeBackendSort = (str) => str
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]/gu, '');

const getOutOfOrderPairs = ({ array = [], normalize = normalizeForAlphabeticalSort } = {}) => {
  const pairs = [];

  for (let i = 1; i < array.length; i++) {
    const previous = normalize(array[i - 1]);
    const current = normalize(array[i]);

    if (previous.localeCompare(current) > 0) {
      pairs.push({ index: i - 1, previous: array[i - 1], current: array[i] });
    }
  }

  return pairs;
};

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

  normalizeLikeBackendSort,
  getOutOfOrderPairs,

  // accuracy - allowed share (in %) of out-of-order neighbours; 0 means strictly sorted
  checkIsSortedAlphabetically({
    array = [],
    accuracy = 5,
    normalize = normalizeForAlphabeticalSort,
  } = {}) {
    const outOfOrderCount = getOutOfOrderPairs({ array, normalize }).length;

    return outOfOrderCount === 0 || (outOfOrderCount * 100) / array.length < accuracy;
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
