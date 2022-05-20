import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

const getDefaultMaterialType = () => {
  const defaultMaterialType = {
    id: uuid(),
    name: `autotest_material_type_${getRandomPostfix()}`,
    source: 'local'
  };
  return defaultMaterialType;
};

export default {
  defaultMaterialType: {
    id: uuid(),
    name: '',
    source: 'local'
  },

  getDefaultMaterialType,
};
