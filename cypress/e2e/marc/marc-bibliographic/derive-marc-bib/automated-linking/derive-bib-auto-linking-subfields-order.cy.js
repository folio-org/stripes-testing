import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomFourDigitNumber();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag008: '008',
            tag110: '110',
            tag151: '151',
            tag240: '240',
            tag245: '245',
            tag651: '651',
          },
          bibFieldIndexes: {
            field240: 5,
            field651_1: 6,
            field651_2: 7,
            field651_3: 8,
          },
          naturalIdValuePrefix: `605926${randomDigits}${randomDigits}`,
          bibTitle: `AT_C605926_MarcBibInstance_${randomPostfix}`,
          authorityHeadingPrefix: `AT_C605926_MarcAuthority_${randomPostfix}`,
          subfieldsToAdd: {
            fifthBox: '$7 number801 $1 URI1 $7 number802',
            seventhBox: '$e Country $b States $e USA',
          },
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        };
        const authData = { prefix: randomLetters, startWithNumber: testData.naturalIdValuePrefix };
        const authorityFieldContents = {
          field110: `$a ${testData.authorityHeadingPrefix} Egypt. $t ${testData.authorityHeadingPrefix} Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $n numbe2 $g Egypt $d 2015`,
          field151_1: `$a ${testData.authorityHeadingPrefix} United States $z USA $x History $y Civil War, 1861-1865 $z America $x Campaigns`,
          field151_2: `$a ${testData.authorityHeadingPrefix} United States $z USA $x History $y Civil War, 1861-1865 $x Cavalry operations`,
          field151_3: `$a ${testData.authorityHeadingPrefix} United States $x History $z USA $y Civil War, 1861-1865 $x Regimental histories`,
        };
        const bibFieldContents = {
          field240: `$a ${testData.authorityHeadingPrefix} Treaties. $e Country $v sub1 $8 240 $6 Link $g ${testData.authorityHeadingPrefix} European Economic Community, $d 1977 Jan. 18 $0 ${authData.prefix}${authData.startWithNumber}1 $e Area`,
          field651_1: `$a ${testData.authorityHeadingPrefix} United States $x History $0 ${authData.prefix}${authData.startWithNumber}2 $y Civil War, 1861-1865`,
          field651_2: `$a ${testData.authorityHeadingPrefix} United States $x History $e Country $b States $e USA $y Civil War, 1861-1865 $x Cavalry operations. $8 number801 $1 URI1 $8 number802 $0 ${authData.prefix}${authData.startWithNumber}3`,
          field651_3: `$a ${testData.authorityHeadingPrefix} United States $y Civil War, 1861-1865 $x Campaigns. $x History $0 ${authData.prefix}${authData.startWithNumber}4`,
        };
        const authorityFields = [
          [
            {
              tag: testData.tags.tag110,
              content: authorityFieldContents.field110,
              indicators: ['1', '\\'],
            },
          ],
          [
            {
              tag: testData.tags.tag151,
              content: authorityFieldContents.field151_1,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: testData.tags.tag151,
              content: authorityFieldContents.field151_2,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: testData.tags.tag151,
              content: authorityFieldContents.field151_3,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tags.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tags.tag240,
            content: bibFieldContents.field240,
            indicators: ['1', '0'],
          },
          {
            tag: testData.tags.tag651,
            content: bibFieldContents.field651_1,
            indicators: ['\\', '0'],
          },
          {
            tag: testData.tags.tag651,
            content: bibFieldContents.field651_2,
            indicators: ['\\', '0'],
          },
          {
            tag: testData.tags.tag651,
            content: bibFieldContents.field651_3,
            indicators: ['\\', '0'],
          },
        ];
        const linkedFieldsData = [
          {
            rowIndex: testData.bibFieldIndexes.field240,
            tag: testData.tags.tag240,
            ind1: '1',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $n numbe2 $g Egypt $d 2015`,
            uncontrolledLetterSubfields: '$e Country $v sub1 $e Area',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}1`,
            uncontrolledDigitSubfields: '$8 240 $6 Link',
          },
          {
            rowIndex: testData.bibFieldIndexes.field651_1,
            tag: testData.tags.tag651,
            ind1: '\\',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} United States`,
            uncontrolledLetterSubfields: '$x History $y Civil War, 1861-1865',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}2`,
            uncontrolledDigitSubfields: '',
          },
          {
            rowIndex: testData.bibFieldIndexes.field651_2,
            tag: testData.tags.tag651,
            ind1: '\\',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} United States`,
            uncontrolledLetterSubfields:
              '$x History $e Country $b States $e USA $y Civil War, 1861-1865 $x Cavalry operations.',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}3`,
            uncontrolledDigitSubfields: '$8 number801 $1 URI1 $8 number802',
          },
          {
            rowIndex: testData.bibFieldIndexes.field651_3,
            tag: testData.tags.tag651,
            ind1: '\\',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} United States`,
            uncontrolledLetterSubfields: '$y Civil War, 1861-1865 $x Campaigns. $x History',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}4`,
            uncontrolledDigitSubfields: '',
          },
        ];
        const linkedSavedThirdField651Data = {
          tag: testData.tags.tag651,
          ind1: '\\',
          ind2: '0',
          controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} United States`,
          uncontrolledLetterSubfields: `${linkedFieldsData[3].uncontrolledLetterSubfields} ${testData.subfieldsToAdd.seventhBox}`,
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}4`,
          uncontrolledDigitSubfields: testData.subfieldsToAdd.fifthBox,
        };

        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C605926');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              authorityFields.forEach((fieldsSet, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  `${authData.startWithNumber}${index + 1}`,
                  fieldsSet,
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            }).then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
          });
        });

        after(() => {
          cy.getAdminToken();
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          Users.deleteViaApi(userData.userId);
        });

        it(
          "C605926 Order of controlled subfields in MARC bib's field is the same as in automatically linked MARC authority (spitfire)",
          { tags: ['extendedPath', 'spitfire', 'C605926'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.waitLoading();

            linkedFieldsData.forEach((field, index) => {
              QuickMarcEditor.checkContent(Object.values(bibFieldContents)[index], field.rowIndex);
            });

            QuickMarcEditor.clickLinkHeadingsButton();
            linkedFieldsData.forEach((linkedField) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedField));
            });

            QuickMarcEditor.fillLinkedFieldBox(
              linkedFieldsData[3].rowIndex,
              5,
              `${linkedFieldsData[3].uncontrolledLetterSubfields} ${testData.subfieldsToAdd.fifthBox}`,
            );
            QuickMarcEditor.fillLinkedFieldBox(
              linkedFieldsData[3].rowIndex,
              7,
              testData.subfieldsToAdd.seventhBox,
            );

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.editMarcBibliographicRecord();
            linkedFieldsData.slice(0, -1).forEach((linkedField) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedField));
            });
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_3,
              ...Object.values(linkedSavedThirdField651Data),
            );
          },
        );
      });
    });
  });
});
