import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import {
  and,
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
          url: '/modes-of-issuance',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/modes-of-issuance';
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

  getIssuanceModeByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/modes-of-issuance?limit=2000&offset=0').then(
        (publicationId) => {
          cy.okapiRequest({
            method: REQUEST_METHOD.GET,
            path: `consortia/${consortiaId}/publications/${publicationId}/results`,
          }).then(({ body }) => {
            const issuanceModes = JSON.parse(
              body.publicationResults.find((publication) => publication.tenantId === tenantId)
                .response,
            ).issuanceModes;
            return issuanceModes.find((issuanceMode) => issuanceMode.name === name);
          });
        },
      );
    });
  },

  deleteIssuanceModeByNameAndTenant(name, tenantId) {
    this.getIssuanceModeByNameAndTenant(name, tenantId).then((format) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `modes-of-issuance/${format.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  verifyEditRowInList({ name, source, lastUpdated = [] }) {
    // local records share the name across tenants, so target the only row that has the name input
    const row = MultiColumnListRow({
      innerHTML: and(including(name), including('placeholder="name"')),
      isContainer: false,
    });
    const sourceCell = row.find(MultiColumnListCell({ column: 'Source' }));
    const lastUpdatedCell = row.find(MultiColumnListCell({ column: 'Last updated' }));

    cy.expect([
      row.find(TextField({ placeholder: 'name' })).has({ value: name }),
      sourceCell.has({ content: source }),
      sourceCell.find(TextField()).absent(),
      lastUpdatedCell.find(TextField()).absent(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(lastUpdatedCell.has({ content: including(text) }));
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Modes of issuance');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Modes of issuance');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
