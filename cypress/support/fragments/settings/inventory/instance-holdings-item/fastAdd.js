import { Select, Button } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const calloutMessages = {
  INVENTORY_RECORDS_CREATE_SUCCESS: 'Inventory records have been created successfully',
  SETTING_UPDATE_SUCCESS: 'Setting was successfully updated.',
};

export default {
  calloutMessages,
  changeDefaultInstanceStatus: (statusCode) => {
    cy.do(Select({ name: 'instanceStatusCode' }).choose(statusCode));
    cy.get('button[type="submit"]').then((element) => {
      if (!element.attr('disabled')) {
        cy.do(Button('Save').click());
        InteractorsTools.checkCalloutMessage(calloutMessages.SETTING_UPDATE_SUCCESS);
      }
    });
  },
};
