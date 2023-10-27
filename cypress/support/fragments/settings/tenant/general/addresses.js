import { HTML, including, Link } from '@interactors/html';

import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
} from '../../../../../../interactors';
import SettingsPane, { rootPane } from '../../settingsPane';
import LocationDetails from '../locations/locationDetails';
import { randomFourDigitNumber } from '../../../../utils/stringTools';

const addButton = Button('New');

export default {
  ...SettingsPane,
  rootPane,
  waitLoading() {
    cy.expect(Pane('Addresses').exists());
  },
  openLastUpdated(name) {
    cy.do(
      MultiColumnListRow(including(name))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Link({ href: including('/users/view') }))
        .click(),
    );
  },
  checkNoActionButtons() {
    cy.expect(addButton.absent());
    LocationDetails.checkActionButtonAbsent();
  },
  verifyNoPermissionWarning() {
    cy.expect(HTML("You don't have permission to view this app/record").exists());
  },
  setAddress(body) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: {
          module: `TENANT_${randomFourDigitNumber()}`,
          configName: 'tenant.addresses',
          value: JSON.stringify(body),
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteAddress(addressId) {
    return cy.okapiRequest({
      path: `configurations/entries/${addressId}`,
      method: 'DELETE',
    });
  },
};
