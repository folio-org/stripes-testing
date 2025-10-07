import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

export const typeActions = {
  edit: 'edit',
  trash: 'trash',
};

const Actions = {
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Call number types');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};

const Assertions = {};

const API = {
  createViaApiShared(type) {
    const id = uuid();
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/call-number-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            source: 'local',
          },
        },
      }).then(() => {
        type.url = '/call-number-types';
        type.settingId = id;
        return type;
      });
    });
  },

  createViaApiLocal(type, tenants) {
    const id = uuid();
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/publications`,
        body: {
          method: REQUEST_METHOD.POST,
          tenants,
          payload: {
            id,
            name: type.payload.name,
            source: 'local',
          },
          url: '/call-number-types',
        },
      }).then(() => {
        type.url = '/call-number-types';
        type.tenants = tenants;
        type.id = id;
        return type;
      });
    });
  },

  deleteViaApi(type, allowFailure = true) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${type.settingId}`,
        body: type,
        failOnStatusCode: allowFailure,
      });
    });
  },
  deleteViaApiLocal(id, allowFailure = true) {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `call-number-types/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: allowFailure,
    });
  },
};

export default {
  ...Actions,
  ...Assertions,
  ...API,
};
