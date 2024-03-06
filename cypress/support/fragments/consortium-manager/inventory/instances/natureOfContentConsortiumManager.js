import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { Button, MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

const id = uuid();
const newButton = Button('+ New');

export default {
  getNatureOfContentByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/nature-of-content-terms?limit=2000&offset=0').then(
        (publicationId) => {
          cy.okapiRequest({
            method: REQUEST_METHOD.GET,
            path: `consortia/${consortiaId}/publications/${publicationId}/results`,
          }).then(({ body }) => {
            const natureOfContentTerms = JSON.parse(
              body.publicationResults.find((publication) => publication.tenantId === tenantId)
                .response,
            ).natureOfContentTerms;
            return natureOfContentTerms.find(
              (natureOfContentTerm) => natureOfContentTerm.name === name,
            );
          });
        },
      );
    });
  },

  deleteNatureOfContentByNameAndTenant(name, tenantId) {
    this.getNatureOfContentByNameAndTenant(name, tenantId).then((natureOfContentTerm) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `nature-of-content-terms/${natureOfContentTerm.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Nature of content');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
