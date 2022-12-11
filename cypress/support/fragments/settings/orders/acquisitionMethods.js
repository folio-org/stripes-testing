import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
    defaultAcquisitionMethod: {
        id: uuid(),
        value: `AU_name_${getRandomPostfix()}`,
      },
    createNewAcquisitionMethodViaAPI: (acquisitionMethod) => cy.okapiRequest({
        method: 'POST',
        path: 'orders/acquisition-methods',
        body: acquisitionMethod,
        isDefaultSearchParamsRequired: false,
      }).then(response => response.body),
  
    deleteAcquisitionMethodViaAPI: (id) => cy.okapiRequest({
        method: 'DELETE',
        path: `orders/acquisition-methods/${id}`,
        isDefaultSearchParamsRequired: false,
      }),
  };
  