import getRandomPostfix from '../../utils/stringTools';

export default {
  defaultUiBatchGroup: {
    name: `000autotest_group_${getRandomPostfix()}`,
    description: 'Created by autotest',
  },
};
