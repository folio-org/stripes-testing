import { Button, Modal, HTML, Section, Select, including, or } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const proxySelect = Select('Proxy');
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const closeIconButton = Button({ icon: 'times' });
const unsavedChangesModal = Modal({ id: 'navigation-modal' });
const unsavedChangesText = Modal().find(
  HTML('Your changes have not been saved. Are you sure you want to leave this page?'),
);
const keepEditingButton = Modal().find(Button('Keep editing'));
const continueWithoutSavingButton = Modal().find(Button('Continue without saving'));

const API = {
  getProxyTypesByApi() {
    return cy
      .okapiRequest({
        path: 'eholdings/proxy-types',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.data);
  },
};

export default {
  waitLoading: (providerName) => {
    cy.intercept('eholdings/providers/*').as('getProviderProperties');
    cy.wait('@getProviderProperties', getLongDelay()).then((request) => {
      cy.expect(Section({ id: providerName.replaceAll(' ', '-').toLowerCase() }).exists());
      cy.expect(
        proxySelect.has({ value: request.response.body.data.attributes.proxy.id.toLowerCase() }),
      );
    });
  },

  changeProxy: () => {
    return cy
      .then(() => proxySelect.value())
      .then((selectedProxy) => {
        API.getProxyTypesByApi().then((proxyTypes) => {
          const availableProxies = proxyTypes.map((proxyType) => proxyType.attributes.name);
          const notSelectedProxy = availableProxies.filter(
            (availableProxy) => ![selectedProxy, `inherited - ${selectedProxy}`].includes(
              availableProxy.toLowerCase(),
            ),
          )[1];
          cy.do(proxySelect.choose(or(notSelectedProxy, `Inherited - ${notSelectedProxy}`)));
          cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
          return cy.wrap(notSelectedProxy);
        });
      });
  },

  verifyButtonsDisabled: () => {
    cy.expect(cancelButton.has({ disabled: true }));
    cy.expect(saveAndCloseButton.has({ disabled: true }));
  },

  verifyButtonsEnabled: () => {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  cancelChanges: () => {
    cy.expect(cancelButton.exists());
    cy.do(cancelButton.click());
  },

  verifyUnsavedChangesModalExists: () => {
    cy.expect(unsavedChangesModal.exists());
    cy.expect(unsavedChangesText.exists());
  },

  clickKeepEditing: () => {
    cy.expect(keepEditingButton.exists());
    cy.do(keepEditingButton.click());
  },

  clickContinueWithoutSaving: () => {
    cy.expect(continueWithoutSavingButton.exists());
    cy.do(continueWithoutSavingButton.click());
  },

  closeEditingWindow: () => {
    cy.expect(closeIconButton.exists());
    cy.do(closeIconButton.click());
  },

  saveAndClose: () => {
    cy.expect(saveAndCloseButton.exists());
    cy.do(saveAndCloseButton.click());
  },
  ...API,
};
