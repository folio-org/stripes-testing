import { Button, Icon, Warning, including } from '../../../../interactors';
import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

const optimisticLockingBanner = Warning({
  message:
    'This record cannot be saved because it is not the most recent version.View latest version',
});
const optimisticLockingLink = optimisticLockingBanner.find(Button('View latest version'));
const optimisticLockingLinkIcon = optimisticLockingBanner.find(
  Icon({ className: including('externalLink') }),
);

export default {
  addMarcHoldingRecord: () => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    cy.intercept('POST', '/records-editor/records').as('getStatus');
    QuickMarcEditor.pressSaveAndClose();
    cy.wait('@getStatus', { timeout: 5_000 }).its('response.statusCode').should('eq', 201);
  },

  verifyHiddenFieldValueIn008(recordID, fieldLabel, expectedValue) {
    cy.getRecordDataInEditorViaApi(recordID).then((recordData) => {
      cy.expect(
        recordData.fields.filter((field) => field.tag === '008')[0].content[fieldLabel],
      ).equal(expectedValue);
    });
  },

  verifyOptimisticLockingBanner({ isShown = true } = {}) {
    if (isShown) {
      cy.expect([
        optimisticLockingBanner.exists(),
        optimisticLockingLink.exists(),
        optimisticLockingLinkIcon.exists(),
      ]);
    } else cy.expect(optimisticLockingBanner.absent());
  },

  clickViewLatestVersionLink() {
    cy.do(
      optimisticLockingLink.perform((element) => {
        if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
          element.removeAttribute('target');
        }
        element.click();
      }),
    );
  },
};
