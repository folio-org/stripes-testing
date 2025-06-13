/* eslint-disable cypress/no-unnecessary-waiting */
import {
  Button,
  Dropdown,
  including,
  Link,
  MultiColumnList,
  PaneContent,
} from '../../../../../../interactors';
import TopMenuNavigation from '../../../topMenuNavigation';
import UserEdit from '../../../users/userEdit';
import usersSearchPane from '../../../users/usersSearchPane';

const usersResult = PaneContent({ id: 'users-search-results-pane-content' });
const usersList = MultiColumnList({ id: 'list-users' });

export default {
  switchServicePoint: (servicePoint) => {
    TopMenuNavigation.openAppFromDropdown('Users');
    usersSearchPane.searchByKeywords('admin');
    cy.wait(4000);
    cy.expect(usersResult.is({ empty: false }));
    cy.do(usersList.find(Link('ADMINISTRATOR, Diku_admin')).click()); // need to paramrtrize
    cy.wait(4000);
    UserEdit.openEdit();
    cy.wait(4000);
    UserEdit.openServicePointsAccordion();

    cy.get('section#servicePoints').then(($section) => {
      const pointIsPresent =
        $section.find(`li[data-test-service-point="${servicePoint.id}"]`).length > 0;
      if (!pointIsPresent) {
        UserEdit.addServicePoints(servicePoint.name);
      }
      UserEdit.selectPreferableServicePoint(servicePoint.name);
      UserEdit.checkServicePoints(servicePoint.name);
    });

    cy.contains('button', 'Save & close', { timeout: 5000 }).then(($btn) => {
      const isDisabled = $btn.prop('disabled');
      UserEdit.verifySaveAndCloseIsDisabled(isDisabled);
      if (isDisabled) {
        UserEdit.cancelEdit();
      } else {
        UserEdit.saveAndClose();
      }
    });
  },

  checkIsServicePointSwitched: (name) => {
    cy.expect(
      Dropdown({ id: 'profileDropdown' })
        .find(Button(including(name)))
        .exists(),
    );
  },
};
