import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

export default {
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Statistical code types');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  createViaApi(statisticalCodeType) {
    const id = uuid();
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/statistical-code-types',
          settingId: id,
          payload: {
            id,
            name: statisticalCodeType.payload.name,
            source: 'local',
          },
        },
      }).then(() => {
        statisticalCodeType.url = '/statistical-code-types';
        statisticalCodeType.settingId = id;
        return statisticalCodeType;
      });
    });
  },

  deleteViaApi(statisticalCodeType) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${statisticalCodeType.settingId}`,
        body: statisticalCodeType,
      });
    });
  },
};
