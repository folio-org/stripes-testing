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
  getDefaultMaterialType,

  createViaApi: (materialTypeProperties) => {
    return cy
      .okapiRequest({
        path: 'material-types',
        body: materialTypeProperties,
        method: 'POST'
      })
      .then((response) => {
        return response;
      });
  },

  defaultMaterialType: {
    id: uuid(),
    name: '',
    source: 'local'
  },
};
