import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe(
      'Edit MARC bib',
      {
        retries: {
          runMode: 1,
        },
      },
      () => {
        const testData = {};
        const OCLCAuthentication = '100481406/PAOLF';

        beforeEach(() => {
          cy.getAdminToken().then(() => {
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);
          });

          cy.createTempUser([
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiInventorySingleRecordImport.gui,
            Permissions.converterStorageAll.gui,
          ])
            .then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;
              cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
              InventoryInstances.importWithOclcViaApi(InventoryInstance.validOCLC.id).then(
                ({ body: { internalIdentifier } }) => {
                  testData.instanceID = internalIdentifier;
                },
              );
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.waitForAuthRefresh(() => {
                cy.reload();
                InventoryInstances.waitContentLoading();
              });
              InventoryInstances.searchByTitle(testData.instanceID);
            });
        });

        afterEach(() => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.instanceID);
        });

        it(
          'C10950 Edit and save a MARC record in quickMARC (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeft', 'C10950'] },
          () => {
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            const expectedInSourceRow = QuickMarcEditor.addNewField(
              QuickMarcEditor.getFreeTags()[0],
            );
            QuickMarcEditor.deletePenaltField().then((deletedTag) => {
              const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField(
                QuickMarcEditor.getFreeTags()[1],
              );
              QuickMarcEditor.saveAndCloseWithValidationWarnings({ acceptDeleteModal: true });
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.viewSource();
              InventoryViewSource.contains(expectedInSourceRow);
              InventoryViewSource.contains(expectedInSourceRowWithSubfield);
              InventoryViewSource.notContains(deletedTag);
            });
          },
        );

        it(
          'C10924 Add a field to a record using quickMARC (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C10924'] },
          () => {
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.addRow();
            QuickMarcEditor.checkInitialContent();
            const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues();
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
            // Wait for the content to be loaded.
            cy.wait(4000);
            InventoryInstance.viewSource();
            InventoryViewSource.contains(expectedInSourceRow);
            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkContent();
          },
        );

        it(
          'C10928 Delete a field(s) from a record in quickMARC (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeft', 'C10928'] },
          () => {
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            cy.reload();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.deletePenaltField().then((deletedTag) => {
              QuickMarcEditor.saveAndCloseWithValidationWarnings({ acceptDeleteModal: true });
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.viewSource();
              InventoryViewSource.notContains(deletedTag);
            });
          },
        );

        it(
          'C10957 Attempt to delete a required field (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeft', 'C10957'] },
          () => {
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkRequiredFields();
          },
        );

        it(
          'C10951 Add a 5XX field to a marc record in quickMARC (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C10951'] },
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

        it(
          'C345388 Derive a MARC bib record (spitfire)',
          { tags: ['smokeBroken', 'spitfire', 'C345388'] },
          () => {
            InventoryInstance.getAssignedHRID().then((instanceHRID) => {
              InventoryInstance.deriveNewMarcBib();
              const expectedCreatedValue = QuickMarcEditor.addNewField();

              QuickMarcEditor.deletePenaltField().then((deletedTag) => {
                const expectedUpdatedValue = QuickMarcEditor.updateExistingField();
                QuickMarcEditor.pressSaveAndClose();
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
      },
    );
  });
});
