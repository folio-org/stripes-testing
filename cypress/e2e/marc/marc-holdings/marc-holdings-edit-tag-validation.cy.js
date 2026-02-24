import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag004: '004',
        tag008: '008',
        tag001: '001',
        tag555: '555',
        tag852: '852',
        tag866: '866',
        tag866Value: 'Field866',
        tag001Value: 'Field001',
        marcBibTitle: `AT_C360102_MarcBibInstance_${getRandomPostfix()}`,
        tag852Index: 5,
        tag866Index: 6,
        invalidTagValues: ['', '45', '45e'],
        duplicate852ErrorText: 'Record cannot be saved. Can only have one MARC 852.',
        absent852ErrorText: 'Record cannot be saved. An 852 is required.',
      };

      let recordId;
      let user;
      let location;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (loc) => {
              location = loc;
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                recordId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  cy.createMarcHoldingsViaAPI(instanceData.id, [
                    {
                      content: instanceData.hrid,
                      tag: testData.tag004,
                    },
                    {
                      content: QuickMarcEditor.defaultValid008HoldingsValues,
                      tag: testData.tag008,
                    },
                    {
                      content: `$b ${location.code}`,
                      indicators: ['\\', '\\'],
                      tag: testData.tag852,
                    },
                    {
                      content: `$a ${testData.tag866Value}`,
                      indicators: ['\\', '\\'],
                      tag: testData.tag866,
                    },
                  ]);
                });
              });
            },
          );
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C360102 MARC Holdings | MARC tag validation checks when clicks on the "Save & keep editing" button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360102'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          testData.invalidTagValues.forEach((tagValue) => {
            QuickMarcEditor.updateExistingTagValue(testData.tag866Index, tagValue);
            QuickMarcEditor.verifyTagValue(testData.tag866Index, tagValue);
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.verifyValidationCallout(0, 1);
            QuickMarcEditor.closeAllCallouts();
            if (tagValue.length < 3) {
              QuickMarcEditor.checkErrorMessage(
                testData.tag866Index,
                QuickMarcEditor.tagLengthInlineErrorText,
              );
            } else {
              QuickMarcEditor.checkErrorMessage(
                testData.tag866Index,
                QuickMarcEditor.invalidTagInlineErrorText,
              );
            }
            QuickMarcEditor.verifyTagValue(testData.tag866Index, tagValue);
          });

          QuickMarcEditor.updateExistingTagValue(testData.tag866Index, testData.tag852);
          QuickMarcEditor.verifyTagValue(testData.tag866Index, testData.tag852);
          QuickMarcEditor.updateExistingFieldContent(testData.tag866Index, `$b ${location.code}`);
          QuickMarcEditor.checkContent(`$b ${location.code}`, testData.tag866Index);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.focusOnContentBox(testData.tag852Index);
          QuickMarcEditor.focusOnContentBox(testData.tag866Index);
          QuickMarcEditor.checkErrorMessage(testData.tag866Index, testData.duplicate852ErrorText);
          QuickMarcEditor.verifyTagValue(testData.tag866Index, testData.tag852);
          QuickMarcEditor.checkContent(`$b ${location.code}`, testData.tag866Index);

          QuickMarcEditor.updateExistingTagValue(testData.tag866Index, testData.tag866);
          QuickMarcEditor.verifyTagValue(testData.tag866Index, testData.tag866);
          QuickMarcEditor.updateExistingTagValue(testData.tag852Index, testData.tag555);
          QuickMarcEditor.verifyTagValue(testData.tag852Index, testData.tag555);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.checkCallout(testData.absent852ErrorText);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.updateExistingTagValue(testData.tag852Index, testData.tag852);
          QuickMarcEditor.verifyTagValue(testData.tag852Index, testData.tag852);
          QuickMarcEditor.addEmptyFields(testData.tag866Index);
          QuickMarcEditor.checkEmptyFieldAdded(testData.tag866Index + 1);
          QuickMarcEditor.updateTagNameToLockedTag(testData.tag866Index + 1, testData.tag001);
          QuickMarcEditor.verifyTagValue(testData.tag866Index + 1, testData.tag001);
          QuickMarcEditor.checkFourthBoxEditable(testData.tag866Index + 1, false);

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tag001);
        },
      );
    });
  });
});
