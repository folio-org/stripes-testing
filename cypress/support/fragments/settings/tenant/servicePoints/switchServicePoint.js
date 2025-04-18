/* eslint-disable cypress/no-unnecessary-waiting */
import { Button, Dropdown, including } from '../../../../../../interactors';
import SelectServicePointModal from './selectServicePointModal';

export default {
  switchServicePoint: (servicePoint) => {
    cy.wait(4000);
    cy.do([Dropdown({ id: 'profileDropdown' }).open(), Button('Switch service point').click()]);
    cy.wait(2000);
    SelectServicePointModal.selectServicePoint(servicePoint);
    // wait for data to be loaded
    cy.wait(3000);
  },

  checkIsServicePointSwitched: (name) => {
    cy.expect(
      Dropdown({ id: 'profileDropdown' })
        .find(Button(including(name)))
        .exists(),
    );
  },
};
