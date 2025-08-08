import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

export default {
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Statistical codes');
    [
      'Statistical codes',
      'Statistical code names',
      'Statistical code types',
      'Source',
      'Last updated',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  createViaApi(statisticalCode) {
    const id = uuid();
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/statistical-codes',
          settingId: id,
          payload: {
            id,
            name: statisticalCode.payload.name,
            code: statisticalCode.payload.code,
            statisticalCodeTypeId: statisticalCode.payload.statisticalCodeTypeId,
            source: 'local',
          },
        },
      }).then(() => {
        statisticalCode.url = '/statistical-codes';
        statisticalCode.settingId = id;
        return statisticalCode;
      });
    });
  },

  deleteViaApi(statisticalCode, allowFailure = true) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${statisticalCode.settingId}`,
        body: statisticalCode,
        failOnStatusCode: allowFailure,
      });
    });
  },
};
