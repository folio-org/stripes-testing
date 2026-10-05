import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
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

      before('Setup', () => {
        cy.getAdminToken().then(() => {
          Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);
        });

        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false })
          .then(() => {
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
            cy.allure().logCommandSteps();
            InventoryInstances.searchByTitle(testData.instanceID);
          });
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false });
        if (testData.instanceID) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceID);
        }
      });

      it(
        'C10957 Attempt to delete a required field (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C10957'] },
        () => {
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkRequiredFields();
        },
      );
    });
  });
});
