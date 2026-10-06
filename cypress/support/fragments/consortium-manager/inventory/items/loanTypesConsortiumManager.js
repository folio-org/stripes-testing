import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import { INVENTORY_SETTINGS_TABS } from '../../../settings/inventory/settingsInventory';

const id = uuid();

export const LOAN_TYPE_ENTITY_TYPE = 'loan type';

export const typeActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
  },

  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/loan-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/loan-types';
        type.settingId = id;
        return type;
      });
    });
  },

  deleteViaApi(type) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${type.settingId}`,
        body: type,
      });
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Loan types');
    ['Loan type', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
