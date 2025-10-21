import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../../support/constants';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          authorityHeading: `AT_C605894_MarcAuthority_${randomPostfix}`,
          bibTitle: `AT_C605894_MarcBibInstance_${randomPostfix}`,
          tagLdr: 'LDR',
          tag008: '008',
          tag082: '082',
          tag100: '100',
          tag245: '245',
          tag250: '250',
          tag300: '300',
          updatedDate1Value: '2025',
          tag082Content: '$a C605894 Field082',
          tag250Content: '$a C605894 Field250',
          tag100Index: 4,
        };

        const tag245UpdatedValues = {
          update1: `$a ${testData.bibTitle} $e test focus`,
          update2: `$a Check focus ${testData.bibTitle} $e test focus`,
          update3: `$a Check focus ${testData.bibTitle} $e focus-pocus`,
        };

        const linkedFieldUpdatedValues = {
          fifthBox: '$e test focus',
          seventhBox: '$1 test focus',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const pauseAfterEdit = () => cy.wait(1000);

        const authorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tag082,
            content: testData.tag082Content,
            indicators: ['0', '4'],
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag250,
            content: testData.tag250Content,
            indicators: ['\\', '\\'],
          },
        ];

        let createdAuthorityId;
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C605894_MarcAuthority');
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.then(() => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityId = createdRecordId;
              });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            }).then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: [createdAuthorityId],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.authorityHeading}`],
              });

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(testData.userProperties.userId);
        });

        it(
          'C605894 Keep user\'s focus on last edited (selected) field when user clicks on the "Save & keep editing" on "Edit MARC record" pane (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C605894'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();
            QuickMarcEditor.verifyRowLinked(testData.tag100Index, true);

            QuickMarcEditor.fillLinkedFieldBox(
              testData.tag100Index,
              7,
              linkedFieldUpdatedValues.seventhBox,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyBoxIsFocusedInLinkedField(testData.tag100, 7);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.fillLinkedFieldBox(
              testData.tag100Index,
              5,
              linkedFieldUpdatedValues.fifthBox,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyBoxIsFocusedInLinkedField(testData.tag100, 5);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.updateExistingField(testData.tag245, tag245UpdatedValues.update1);
            QuickMarcEditor.checkContentByTag(testData.tag245, tag245UpdatedValues.update1);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyContentBoxIsFocused(testData.tag245);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.updateExistingField(testData.tag245, tag245UpdatedValues.update2);
            QuickMarcEditor.checkContentByTag(testData.tag245, tag245UpdatedValues.update2);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyContentBoxIsFocused(testData.tag245);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.updateExistingTagName(testData.tag250, testData.tag300);
            QuickMarcEditor.checkContentByTag(testData.tag300, testData.tag250Content);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyTagBoxIsFocused(7);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.updateIndicatorValue(testData.tag245, '0', 0);
            QuickMarcEditor.verifyIndicatorValue(testData.tag245, '0', 0);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyIndicatorBoxIsFocused(testData.tag245, 0);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.fillInTextBoxInField(
              testData.tag008,
              INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
              testData.updatedDate1Value,
            );
            QuickMarcEditor.verifyTextBoxValueInField(
              testData.tag008,
              INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
              testData.updatedDate1Value,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyFieldTextBoxFocused(
              testData.tag008,
              INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            );
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.focusOnFieldsDropdown(
              testData.tagLdr,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            );
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tagLdr,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
              INVENTORY_LDR_FIELD_STATUS_DROPDOWN.A,
            );
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tagLdr,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
              INVENTORY_LDR_FIELD_STATUS_DROPDOWN.A,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyFieldDropdownFocused(
              testData.tagLdr,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            );
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.moveFieldUp(7);
            QuickMarcEditor.verifyAfterMovingFieldUp(6, testData.tag300, testData.tag250Content);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyAfterMovingFieldUp(6, testData.tag300, testData.tag250Content);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.moveFieldDown(6);
            QuickMarcEditor.verifyAfterMovingFieldDown(7, testData.tag300, testData.tag250Content);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyAfterMovingFieldDown(7, testData.tag300, testData.tag250Content);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag082);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.confirmDelete();
            QuickMarcEditor.verifyAfterMovingFieldUp(
              5,
              testData.tag245,
              tag245UpdatedValues.update2,
            );
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkNoDeletePlaceholder();
            QuickMarcEditor.checkButtonsDisabled();

            pauseAfterEdit();
            QuickMarcEditor.updateExistingField(testData.tag245, tag245UpdatedValues.update3);
            QuickMarcEditor.updateExistingField(testData.tag300, testData.tag250Content);
            QuickMarcEditor.checkContentByTag(testData.tag245, tag245UpdatedValues.update3);
            QuickMarcEditor.checkContentByTag(testData.tag300, testData.tag250Content);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyContentBoxIsFocused(testData.tag300);
            QuickMarcEditor.checkButtonsDisabled();
          },
        );
      });
    });
  });
});
