import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomFourDigitNumber();
        const testData = {
          tag008: '008',
          tag100: '100',
          tag130: '130',
          tag245: '245',
          tag630: '630',
          bibTitle: `AT_C451566_MarcBibInstance_${randomPostfix}`,
          authorityHeading1: `AT_C451566_MarcAuthority_${randomPostfix} A$AP Rocky (Rapper), 1988-`,
          authorityHeading2: `AT_C451566_MarcAuthority_${randomPostfix} $6 story`,
          authorityField100Content: `$a AT_C451566_MarcAuthority_${randomPostfix} A{dollar}AP Rocky $c (Rapper), $d 1988-`,
          authorityField130Content: `$a AT_C451566_MarcAuthority_${randomPostfix} {dollar}6 story`,
          bibField100UncontrolledAlpha: '$x dollar{dollar} sign test',
          naturalIdPrefix: `451566${randomDigits}${randomDigits}`,
          marcAuthIcon: 'Linked to MARC authority',
        };

        const bibField630Content = `$a AT_C451566_Field630_${randomPostfix} $0 ${testData.naturalIdPrefix}2`;
        const sourceViewContents = [
          `${testData.authorityField100Content.replace('{dollar}', '$')} ${testData.bibField100UncontrolledAlpha.replace('{dollar}', '$')} $0 ${testData.naturalIdPrefix}1 $9`,
          `${testData.authorityField130Content.replace('{dollar}', '$')} $0 ${testData.naturalIdPrefix}2 $9`,
        ];
        const authorityFields = [
          [
            {
              tag: testData.tag100,
              content: testData.authorityField100Content,
              indicators: ['0', '\\'],
            },
          ],
          [
            {
              tag: testData.tag130,
              content: testData.authorityField130Content,
              indicators: ['\\', '0'],
            },
          ],
        ];
        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag100,
            content: testData.authorityField100Content,
            indicators: ['0', '\\'],
          },
        ];
        const linkedField100Data = {
          tag: testData.tag100,
          ind1: '0',
          ind2: '\\',
          controlledLetterSubfields: testData.authorityField100Content,
          uncontrolledLetterSubfields: testData.bibField100UncontrolledAlpha,
          controlledDigitSubfields: `$0 ${testData.naturalIdPrefix}1`,
          uncontrolledDigitSubfields: '',
        };
        const linkedField630Data = {
          tag: testData.tag630,
          ind1: '\\',
          ind2: '\\',
          controlledLetterSubfields: testData.authorityField130Content,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${testData.naturalIdPrefix}2`,
          uncontrolledDigitSubfields: '',
        };

        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C451566_MarcAuthority');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C451566_MarcBibInstance');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
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

              authorityFields.forEach((fields, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  '',
                  `${testData.naturalIdPrefix}${index + 1}`,
                  fields,
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            }).then(() => {
              cy.waitForAuthRefresh(() => {
                cy.login(userData.username, userData.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
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
          'C451566 Manual linking of "MARC bib" field with "MARC authority" record which has "$" sign ("{dollar}" code) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C451566'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `${testData.authorityField100Content} ${testData.bibField100UncontrolledAlpha}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `${testData.authorityField100Content} ${testData.bibField100UncontrolledAlpha}`,
            );

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag100);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.verifyRecordFound(testData.authorityHeading1);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading1);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedField100Data));
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.addNewField(testData.tag630, bibField630Content, 5);
            QuickMarcEditor.checkContentByTag(testData.tag630, bibField630Content);

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag630);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading2);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedField630Data));
            QuickMarcEditor.closeAllCallouts();

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            sourceViewContents.forEach((content) => {
              InventoryViewSource.contains(content);
            });

            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            BrowseContributors.select();
            BrowseContributors.waitForContributorToAppear(testData.authorityHeading1, true, true);
            BrowseContributors.browse(testData.authorityHeading1);
            BrowseSubjects.checkValueIsBold(testData.authorityHeading1);

            BrowseSubjects.select();
            BrowseSubjects.waitForSubjectToAppear(testData.authorityHeading2, true, true);
            BrowseContributors.browse(testData.authorityHeading2);
            BrowseSubjects.checkValueIsBold(testData.authorityHeading2);
          },
        );
      });
    });
  });
});
