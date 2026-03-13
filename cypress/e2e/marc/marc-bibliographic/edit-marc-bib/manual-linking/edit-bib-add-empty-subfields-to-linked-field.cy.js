import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const randomDigits = randomNDigitNumber(8);
        const testData = {
          authoritySubfieldA: `AT_C435910_MarcAuthority_${randomPostfix}`,
          authoritySubfieldD: '1960-',
          instanceTitle: `AT_C435910_MarcBibInstance_${randomPostfix}`,
          instanceSubfieldE: 'author',
          tag008: '008',
          tag100: '100',
          tag245: '245',
          tag600: '600',
          bibField600Index: 5,
          emptySubfieldForFifthBox: '$w',
          emptySubfieldForSeventhBox: '$2 ',
        };
        const authData = {
          prefix: randomLetters,
          startWithNumber: `435910${randomDigits}${randomDigits}`,
        };
        const authorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authoritySubfieldA} $d ${testData.authoritySubfieldD}`,
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
            tag: testData.tag600,
            content: 'Field600',
            indicators: ['1', '\\'],
          },
        ];
        const fieldAfterLinking = {
          tag: marcBibFields[2].tag,
          indicator1: marcBibFields[2].indicators[0],
          indicator2: marcBibFields[2].indicators[1],
          controlledAlpha: `$a ${testData.authoritySubfieldA} $d ${testData.authoritySubfieldD}`,
          notControlledAlpha: `$e ${testData.instanceSubfieldE}`,
          controlledNumeric: `$0 ${authData.prefix}${authData.startWithNumber}`,
          notControlledNumeric: '',
        };
        const fieldEditData = [
          {
            row: testData.bibField600Index,
            boxNumber: 5,
            value: `$e ${testData.instanceSubfieldE} ${testData.emptySubfieldForFifthBox}`,
          },
          {
            row: testData.bibField600Index,
            boxNumber: 7,
            value: `${testData.emptySubfieldForSeventhBox}`,
          },
        ];

        let user;
        let createdAuthorityId;
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C435910');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
                  bibFieldTags: [fieldAfterLinking.tag],
                  authorityFieldTags: [authorityFields[0].tag],
                  finalBibFieldContents: [
                    `${fieldAfterLinking.controlledAlpha} ${fieldAfterLinking.notControlledAlpha}`,
                  ],
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
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
          'C435910 Verify that MARC bib record could be successfully saved with empty subfield code in linked field (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C435910'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldAfterLinking));

            fieldEditData.forEach(({ row, boxNumber, value }) => {
              QuickMarcEditor.fillLinkedFieldBox(row, boxNumber, value);
            });

            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldAfterLinking));

            QuickMarcEditor.close();
            InventoryInstance.waitLoading();

            InventoryInstance.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(
              fieldAfterLinking.tag,
              testData.emptySubfieldForFifthBox.trim(),
              false,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              fieldAfterLinking.tag,
              testData.emptySubfieldForSeventhBox.trim(),
              false,
            );
          },
        );
      });
    });
  });
});
