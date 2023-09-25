import { Button, Section, HTML, including } from '../../../../../../interactors';
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
    LocationEditForm.waitLoading();

    return LocationEditForm;
  },
  checkLocationDetails(values) {
    Object.values(values).forEach((value) => {
      cy.expect(detailsContent.find(HTML(including(value))));
    });
  },
  checkActionButtonAbsent() {
    cy.expect(actionsButton.absent);
  },
};
