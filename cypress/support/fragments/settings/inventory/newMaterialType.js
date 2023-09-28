import uuid from 'uuid';

import { Button, TextField } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const getDefaultMaterialType = () => ({
  source: 'local',
  name: `autotest_material_type_${getRandomPostfix()}`,
  id: uuid(),
});

export default {
  getDefaultMaterialType,

  create: (materialTypeName) => {
    cy.do(Button('+ New').click());
    cy.do(TextField({ placeholder: 'name' }).fillIn(materialTypeName));
    cy.do(Button('Save').click());
  },

  createViaApi(materialTypeProperties) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'material-types',
        body: materialTypeProperties,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
};
