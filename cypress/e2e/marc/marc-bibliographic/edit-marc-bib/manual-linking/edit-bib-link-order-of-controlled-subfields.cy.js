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
    describe('Edit MARC bib', () => {
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
          naturalIdValuePrefix: `605915${randomDigits}${randomDigits}`,
          bibTitle: `AT_C605915_MarcBibInstance_${randomPostfix}`,
          authorityHeadingPrefix: `AT_C605915_MarcAuthority_${randomPostfix}`,
          subfieldsToAdd: {
            fifthBox: '$7 number801 $1 URI1 $7 number802',
            seventhBox: '$e Country $b States $e USA',
          },
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        };

        const authData = { prefix: randomLetters, startWithNumber: testData.naturalIdValuePrefix };

        const authorityHeadings = {
          field110: `${testData.authorityHeadingPrefix} Egypt. ${testData.authorityHeadingPrefix} Treaties, etc. 1978 September 17 (Framework for Peace in the Middle East) numbe2 2015`,
          field151_1: `${testData.authorityHeadingPrefix} United States USA History Civil War, 1861-1865 America Campaigns`,
          field151_2: `${testData.authorityHeadingPrefix} United States USA History Civil War, 1861-1865 Cavalry operations`,
          field151_3: `${testData.authorityHeadingPrefix} United States History USA Civil War, 1861-1865 Regimental histories`,
        };

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
          field651_3: `$a ${testData.authorityHeadingPrefix} United States $y Civil War, 1861-1865 $x Campaigns. $x History`,
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
            content: QuickMarcEditor.defaultValid008Values,
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
            tag: testData.tags.tag240,
            ind1: '1',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $n numbe2 $g Egypt $d 2015`,
            uncontrolledLetterSubfields: '$e Country $v sub1 $e Area',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}1`,
            uncontrolledDigitSubfields: '$8 240 $6 Link',
          },
          {
            tag: testData.tags.tag651,
            ind1: '\\',
            ind2: '0',
            controlledLetterSubfields: `$a ${testData.authorityHeadingPrefix} United States`,
            uncontrolledLetterSubfields: '$x History $y Civil War, 1861-1865',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}2`,
            uncontrolledDigitSubfields: '',
          },
          {
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C605915_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(userData.userId);
        });

        it(
          "C605915 Order of controlled subfields in MARC bib's field is the same as in linked MARC authority (spitfire)",
          { tags: ['extendedPath', 'spitfire', 'C605915'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagField(testData.bibFieldIndexes.field240);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeadings.field110);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field240,
              ...Object.values(linkedFieldsData[0]),
            );
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.clickLinkIconInTagField(testData.bibFieldIndexes.field651_1);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeadings.field151_1);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_1,
              ...Object.values(linkedFieldsData[1]),
            );
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.clickLinkIconInTagField(testData.bibFieldIndexes.field651_2);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeadings.field151_2);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_2,
              ...Object.values(linkedFieldsData[2]),
            );
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.clickLinkIconInTagField(testData.bibFieldIndexes.field651_3);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.switchToSearch();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthorities.searchBeats(authorityHeadings.field151_3);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeadings.field151_3);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_3,
              ...Object.values(linkedFieldsData[3]),
            );
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.fillLinkedFieldBox(
              testData.bibFieldIndexes.field651_3,
              5,
              `${linkedFieldsData[3].uncontrolledLetterSubfields} ${testData.subfieldsToAdd.fifthBox}`,
            );
            QuickMarcEditor.fillLinkedFieldBox(
              testData.bibFieldIndexes.field651_3,
              7,
              testData.subfieldsToAdd.seventhBox,
            );

            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field240,
              ...Object.values(linkedFieldsData[0]),
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_1,
              ...Object.values(linkedFieldsData[1]),
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.bibFieldIndexes.field651_2,
              ...Object.values(linkedFieldsData[2]),
            );
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
