import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const randomDigits = randomNDigitNumber(8);
      const testData = {
        authorityHeadingPrefix: `AT_C375955_MarcAuthority_${randomPostfix}`,
        authoritySubfieldT: `Alt. title C375955 ${randomPostfix}`,
        authoritySubfieldB: 'debating',
        instanceTitle: `AT_C375955_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag150: '150',
        tag240: '240',
        tag245: '245',
        tag650: '650',
        bibField240Index: 5,
        controlledSubfieldsErrorTxt:
          'Fail: A subfield(s) cannot be updated because it is controlled by an authority heading.',
        nonRepeatableSubfieldsErrorTxt: "Fail: Subfield 'b' is non-repeatable.",
      };
      const authData = {
        prefix: randomLetters,
        startWithNumber: `375955${randomDigits}${randomDigits}`,
      };
      const authorityFields1 = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeadingPrefix}_1 $t ${testData.authoritySubfieldT}`,
          indicators: ['1', '\\'],
        },
      ];
      const authorityFields2 = [
        {
          tag: testData.tag150,
          content: `$a ${testData.authorityHeadingPrefix}_2 $b ${testData.authoritySubfieldB}`,
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
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag240,
          content: 'Field240',
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag650,
          content: 'Field650',
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag650,
          content: 'Field650_2',
          indicators: ['1', '\\'],
        },
      ];
      const fieldEditData = [
        { row: testData.bibField240Index, boxNumber: 5, value: '$m test' },
        { row: testData.bibField240Index + 1, boxNumber: 5, value: '$b 123' },
        { row: testData.bibField240Index + 2, boxNumber: 7, value: '$b 123' },
      ];

      let user;
      const createdAuthorityIds = [];
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375955');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.then(() => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );

            [authorityFields1, authorityFields2].forEach((authorityFields, index) => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber + index,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: [
                  createdAuthorityIds[0],
                  createdAuthorityIds[1],
                  createdAuthorityIds[1],
                ],
                bibFieldTags: [testData.tag240, testData.tag650, testData.tag650],
                authorityFieldTags: [testData.tag100, testData.tag150, testData.tag150],
                finalBibFieldContents: [
                  `$a ${testData.authoritySubfieldT}`,
                  `$a ${testData.authorityHeadingPrefix}_2 $b ${testData.authoritySubfieldB}`,
                  `$a ${testData.authorityHeadingPrefix}_2 $b ${testData.authoritySubfieldB}`,
                ],
                bibFieldIndexes: [
                  testData.bibField240Index,
                  testData.bibField240Index + 1,
                  testData.bibField240Index + 2,
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
        createdAuthorityIds.forEach((authorityId) => MarcAuthority.deleteViaAPI(authorityId, true));
        InventoryInstances.deleteInstanceByTitleViaApi(createdInstanceId);
      });

      it(
        'C375955 Add controllable subfields to multiple linked fields in "MARC bib" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375955'] },
        () => {
          function checkAfterSaveAttempt() {
            QuickMarcEditor.verifyValidationCallout(0, 5);
            [
              testData.bibField240Index,
              testData.bibField240Index + 1,
              testData.bibField240Index + 2,
            ].forEach((fieldIndex) => {
              QuickMarcEditor.checkErrorMessage(fieldIndex, testData.controlledSubfieldsErrorTxt);
            });
            [testData.bibField240Index + 1, testData.bibField240Index + 2].forEach((fieldIndex) => {
              QuickMarcEditor.checkErrorMessage(
                fieldIndex,
                testData.nonRepeatableSubfieldsErrorTxt,
              );
            });
            QuickMarcEditor.waitLoading();
          }

          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();

          [
            testData.bibField240Index,
            testData.bibField240Index + 1,
            testData.bibField240Index + 2,
          ].forEach((fieldIndex) => {
            QuickMarcEditor.verifyRowLinked(fieldIndex);
          });

          fieldEditData.forEach(({ row, boxNumber, value }) => {
            QuickMarcEditor.fillLinkedFieldBox(row, boxNumber, value);
          });

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          checkAfterSaveAttempt();

          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.pressSaveAndCloseButton();
          checkAfterSaveAttempt();
        },
      );
    });
  });
});
