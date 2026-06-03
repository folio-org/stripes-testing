import { Button, MetaSection, Section, HTML, including } from '../../../../../../interactors';
import LocationEditForm from './locationEditForm';

const detailsRoot = Section({ id: 'location-details' });
const detailsContent = detailsRoot.find(Section({ id: 'location-details-content' }));

const actionsButton = Button('Actions');
const editButton = Button('Edit');

export default {
  waitLoading() {
    cy.expect(detailsRoot.exists());
  },
  openEditLocationForm() {
    cy.do([actionsButton.click(), editButton.click()]);
    cy.wait(500);
    LocationEditForm.waitLoading();

    return LocationEditForm;
  },
  checkLocationDetails(values) {
    Object.values(values).forEach((value) => {
      cy.expect(detailsContent.find(HTML(including(value))));
    });
  },
  checkMetadata() {
    cy.expect(detailsRoot.find(MetaSection()).exists());
  },
  checkActionButtonAbsent() {
    cy.expect(actionsButton.absent);
  },
};
