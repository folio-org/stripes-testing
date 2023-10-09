import getRandomPostfix from '../../../utils/stringTools';

export default {
  defaultUiBatchGroups: {
    description: 'BG_discription_',
    name: `BG_name_${getRandomPostfix()}`,
  },
};
