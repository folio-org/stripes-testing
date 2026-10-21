import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import {
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  TextField,
} from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';

const id = uuid();

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/instance-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/instance-types';
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

  getResourceTypesByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/instance-types?limit=2000&offset=0').then(
        (publicationId) => {
          cy.okapiRequest({
            method: REQUEST_METHOD.GET,
            path: `consortia/${consortiaId}/publications/${publicationId}/results`,
          }).then(({ body }) => {
            const alternativeTitleTypes = JSON.parse(
              body.publicationResults.find((publication) => publication.tenantId === tenantId)
                .response,
            ).alternativeTitleTypes;
            return alternativeTitleTypes.find(
              (alternativeTitleType) => alternativeTitleType.name === name,
            );
          });
        },
      );
    });
  },

  deleteResourceTypesByNameAndTenant(name, tenantId) {
    this.getResourceTypesByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `contributor-types/${alternativeTitleType.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  verifyEditRowInList({ name, code, source, lastUpdated = [] }) {
    // in edit mode the name is an input value, so it is only present in the row's innerHTML
    const row = MultiColumnListRow({ innerHTML: including(name), isContainer: false });
    const sourceCell = row.find(MultiColumnListCell({ column: 'Source' }));
    const lastUpdatedCell = row.find(MultiColumnListCell({ column: 'Last updated' }));

    cy.expect([
      row.find(TextField({ placeholder: 'name' })).has({ value: name }),
      row.find(TextField({ placeholder: 'code' })).has({ value: code }),
      sourceCell.has({ content: source }),
      sourceCell.find(TextField()).absent(),
      lastUpdatedCell.find(TextField()).absent(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(lastUpdatedCell.has({ content: including(text) }));
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Resource types');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Resource types');
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
