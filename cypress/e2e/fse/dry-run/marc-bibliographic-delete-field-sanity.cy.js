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

      before('Setup', () => {
        cy.getAdminToken().then(() => {
          Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);
        });

        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password)
          .then(() => {
            InventoryInstances.importWithOclcViaApi(InventoryInstance.validOCLC.id).then(
              ({ body: { internalIdentifier } }) => {
                testData.instanceID = internalIdentifier;
              },
            );
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.instanceID);
          });
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password);
        if (testData.instanceID) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceID);
        }
      });

      it(
        'C10928 Delete a field(s) from a record in quickMARC (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C10928'] },
        () => {
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.deletePenaltField().then((deletedTag) => {
            QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.viewSource();
            InventoryViewSource.notContains(deletedTag);
          });
        },
      );
    });
  });
});
