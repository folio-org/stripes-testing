import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryHotkeys from '../../../../../support/fragments/inventory/inventoryHotkeys';
import InventoryKeyboardShortcuts from '../../../../../support/fragments/inventory/inventoryKeyboardShortcuts';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tag008: '008',
          tag100: '100',
          tag245: '245',
          tag600: '600',
          tag600RowIndex: 5,
        };
        const instanceTitle = `AT_C380400_MarcBibInstance_${randomPostfix}`;
        const authorityHeadingSubA = `AT_C380400_MarcAuthority_${randomPostfix},`;
        const authorityHeadingSubD = '1883-1924';
        const authData = { prefix: randomLetters, startWithNumber: 1 };
        const authorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${authorityHeadingSubA} $d ${authorityHeadingSubD}`,
            indicators: ['1', '\\'],
          },
        ];
        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${instanceTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag600,
            content: `$a ${authorityHeadingSubA} $d ${authorityHeadingSubD}. $i 600 field $e Author $v Form Sub $x general $y 1923 $z Berlin $1 not valid URI $2 fast $4 with 600 field $5 1924 $6 linkage test + hotkey $0 http://id.worldcat.org/fast/fst00073986000111`,
            indicators: ['1', '7'],
          },
        ];
        const fieldAfterLinking = {
          tag: testData.tag600,
          indicator1: '1',
          indicator2: '7',
          controlledAlpha: `$a ${authorityHeadingSubA} $d ${authorityHeadingSubD}`,
          notControlledAlpha: '$i 600 field $e Author $v Form Sub $x general $y 1923 $z Berlin',
          controlledNumeric: `$0 ${authData.prefix}${authData.startWithNumber}`,
          notControlledNumeric:
            '$1 not valid URI $2 fast $4 with 600 field $5 1924 $6 linkage test + hotkey',
        };

        let user;
        let createdAuthorityId;
        let createdInstanceId;

        before('Create test data', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityId = createdRecordId;
              });
            })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityId],
                  bibFieldTags: [testData.tag600],
                  authorityFieldTags: [testData.tag100],
                  finalBibFieldContents: [
                    `${fieldAfterLinking.controlledAlpha} ${fieldAfterLinking.notControlledAlpha} ${fieldAfterLinking.notControlledNumeric}`,
                  ],
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
              });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        });

        it(
          'C380400 Navigation shortcut-keys are supported in editable boxes of linked field when derive "MARC bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C380400'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldAfterLinking));

            QuickMarcEditor.focusOnBoxInLinkedField(testData.tag600, 5);
            QuickMarcEditor.setCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 5, 3);

            InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.moveToNextSubfield);
            QuickMarcEditor.verifyCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 5, 16);

            InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.moveToPreviousSubfield);
            QuickMarcEditor.verifyCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 5, 3);

            QuickMarcEditor.focusOnBoxInLinkedField(testData.tag600, 7);
            QuickMarcEditor.verifyCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 7, 75);

            InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.moveToPreviousSubfield);
            QuickMarcEditor.verifyCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 7, 46);

            InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.moveToNextSubfield);
            QuickMarcEditor.verifyCursorPositionInBoxOfLinkedField(testData.tag600RowIndex, 7, 54);
          },
        );
      });
    });
  });
});
