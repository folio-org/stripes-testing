import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const { user, memberTenant } = parseSanityParameters();
      const testData = {};
      const OCLCAuthentication = '100481406/PAOLF';

      beforeEach(() => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false })
          .then(() => {
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);
            InventoryInstances.importWithOclcViaApi(InventoryInstance.validOCLC.id).then(
              ({ body: { internalIdentifier } }) => {
                testData.instanceID = internalIdentifier;
              },
            );
          })
          .then(() => {
            cy.allure().logCommandSteps(false);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.allure().logCommandSteps(true);
            InventoryInstances.searchByTitle(testData.instanceID);
          });
      });

      afterEach(() => {
        cy.getUserToken(user.username, user.password, { log: false });
        InventoryInstance.deleteInstanceViaApi(testData.instanceID, true);
      });

      it(
        'C345388 Derive a MARC bib record (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C345388'] },
        () => {
          InventoryInstance.getAssignedHRID().then((instanceHRID) => {
            InventoryInstance.deriveNewMarcBib();
            const expectedCreatedValue = QuickMarcEditor.addNewField();

            QuickMarcEditor.deletePenaltField().then((deletedTag) => {
              const expectedUpdatedValue = QuickMarcEditor.updateExistingField();
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.deleteConfirmationPresented();
              QuickMarcEditor.confirmDelete();

              InventoryInstance.checkUpdatedHRID(instanceHRID);
              InventoryInstance.checkExpectedMARCSource();
              InventoryInstance.checkPresentedText(expectedUpdatedValue);

              // Wait for the content to be loaded.
              cy.wait(4000);
              InventoryInstance.viewSource();
              InventoryViewSource.contains(expectedCreatedValue);
              InventoryViewSource.contains(expectedUpdatedValue);
              InventoryViewSource.notContains(deletedTag);
            });
          });
        },
      );
    });
  });
});
