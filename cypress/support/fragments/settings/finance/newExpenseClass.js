import getRandomPostfix from '../../../utils/stringTools';

export default {
  defaultUiBatchGroup: {
    name: `test_class_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNumber: getRandomPostfix(),
  },
};
