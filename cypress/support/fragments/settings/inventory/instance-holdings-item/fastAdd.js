import { Button, Select } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const calloutMessages = {
  INVENTORY_RECORDS_CREATE_SUCCESS: 'Inventory records have been created successfully',
  SETTING_UPDATE_SUCCESS: 'Setting was successfully updated.',
};

export default {
  calloutMessages,
  changeDefaultInstanceStatus: (statusCode) => {
    cy.wait(2000);
    cy.do(Select({ name: 'instanceStatusCode' }).choose(statusCode));
    cy.get('button[type="submit"]').then((element) => {
      if (!element.attr('disabled')) {
        cy.do(Button('Save').click());
        InteractorsTools.checkCalloutMessage(calloutMessages.SETTING_UPDATE_SUCCESS);
      }
    });
  },

  changeDefaultInstanceStatusViaApi: (statusCode) => {
    cy.okapiRequest({
      method: 'GET',
      path: 'configurations/entries?query=(module==FAST_ADD%20and%20configName==fastAddSettings)',
      isDefaultSearchParamsRequired: false,
    }).then((instanceStatusResp) => {
      const setInstanceStatuses = instanceStatusResp.body.configs;

      if (setInstanceStatuses.length === 0) {
        cy.okapiRequest({
          method: 'POST',
          path: 'configurations/entries',
          body: {
            value: `{"instanceStatusCode":"${statusCode}","defaultDiscoverySuppress":"true"}`,
            module: 'FAST_ADD',
            configName: 'fastAddSettings',
          },
          isDefaultSearchParamsRequired: false,
        });
      } else {
        const currentValue = JSON.parse(instanceStatusResp.body.configs[0].value);
        if (currentValue.instanceStatusCode !== statusCode) {
          const config = instanceStatusResp.body.configs[0];

          cy.okapiRequest({
            method: 'PUT',
            path: `configurations/entries/${config.id}`,
            body: {
              id: config.id,
              module: config.module,
              configName: config.configName,
              enabled: config.enabled,
              value: `{"instanceStatusCode":"${statusCode}","defaultDiscoverySuppress":"true"}`,
            },
            isDefaultSearchParamsRequired: false,
          });
        }
      }
    });
  },
};
