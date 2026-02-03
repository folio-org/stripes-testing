import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
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
            cy.getUserDetailsByUsername(user.username).then((details) => {
              user.id = details.id;
              user.personal = details.personal;
              user.barcode = details.barcode;
            });
          })
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
        'C10951 Add a 5XX field to a marc record in quickMARC (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C10951'] },
        () => {
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryActions.fillImportFields(InventoryInstance.validOCLC.id);
          InventoryActions.pressImportInModal(undefined, true);

          InventoryInstance.checkExpectedOCLCPresence();
          InventoryInstance.checkExpectedMARCSource();

          InventoryInstance.editInstance();
          InstanceRecordEdit.checkReadOnlyFields();
          InstanceRecordEdit.close();

          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.addRow();
          QuickMarcEditor.checkInitialContent();

          const testRecord = {
            content: 'testContent',
            tag: '505',
            tagMeaning: 'Formatted Contents Note',
          };
          const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(
            testRecord.content,
            testRecord.tag,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.viewSource();
          InventoryViewSource.contains(expectedInSourceRow);
          InventoryViewSource.close();

          InventoryInstance.checkInstanceNotes(testRecord.tagMeaning, testRecord.content);
        },
      );
    });
  });
});
