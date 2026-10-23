import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader, NavListItem, Spinner } from '../../../../../../interactors';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import { ConsortiumUtils } from '../../../../utils';

const paneTitle = 'Instance status type';
const optionName = 'Instance status types';
const id = uuid();

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/instance-statuses',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/instance-statuses';
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

  getInstanceStatusTypeByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/instance-statuses?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const alternativeTitleTypes = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.instanceStatuses;
            return alternativeTitleTypes.find(
              (alternativeTitleType) => alternativeTitleType.name === name,
            );
          },
        );
      });
  },

  deleteInstanceStatusTypeByNameAndTenant(name, tenantId) {
    this.getInstanceStatusTypeByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `instance-statuses/${alternativeTitleType.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading(paneTitle);
  },

  choose() {
    cy.expect(Spinner().absent());
    cy.do(NavListItem(optionName).click());
    this.waitLoading();
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
