import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  APPLICATION_NAMES,
} from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const testData = {
            sharedPaneheaderText: 'Derive a new shared MARC bib record',
            authorityBrowseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            sharedLinkText: 'Shared',
            contributorSectionId: 'list-contributors',
            subjectSectionId: 'list-subject',
          };
          const bibTitle = `AT_C410711_MarcBibInstance_${randomPostfix}`;
          const authorityHeading1 = `AT_C410711_MarcAuthority_${randomPostfix}_1`;
          const authorityHeading2 = `AT_C410711_MarcAuthority_${randomPostfix}_2, 1739-1792`;
          const bibNotControllableSubfield1 = '$e author.';
          const bibNotControllableSubfield2 = '$x Assassination';
          const updatedBibTitle = `${bibTitle}_upd`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFields1 = [
            {
              tag: '100',
              content: `$a ${authorityHeading1}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFields2 = [
            {
              tag: '100',
              content: `$a AT_C410711_MarcAuthority_${randomPostfix}_2, $d 1739-1792`,
              indicators: ['1', '\\'],
            },
          ];
          const bibFields = [
            {
              tag: '008',
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: '245',
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '100',
              content: `${authorityFields1[0].content} ${bibNotControllableSubfield1}`,
              indicators: ['1', '\\'],
            },
            {
              tag: '600',
              content: `${authorityFields2[0].content} ${bibNotControllableSubfield2}`,
              indicators: ['1', '0'],
            },
          ];
          const linkedFieldData100 = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeading1}`,
            uncontrolledLetterSubfields: bibNotControllableSubfield1,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData600 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: authorityFields2[0].content,
            uncontrolledLetterSubfields: bibNotControllableSubfield2,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: '',
          };
          const contributorValue = authorityHeading1;
          const subjectValue = `${authorityHeading2}--${bibNotControllableSubfield2.split(' ')[1]}`;

          let user;
          let createdInstanceId;
          const createdAuthorityIds = [];

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410711');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C410711');

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]).then((createdUserProperties) => {
              user = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.then(() => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                  (instanceId) => {
                    createdInstanceId = instanceId;
                  },
                );

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber,
                  authorityFields1,
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFields2,
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              })
                .then(() => {
                  QuickMarcEditor.linkMarcRecordsViaApi({
                    bibId: createdInstanceId,
                    authorityIds: [createdAuthorityIds[0]],
                    bibFieldTags: ['100'],
                    authorityFieldTags: ['100'],
                    finalBibFieldContents: [
                      `${authorityFields1[0].content} ${bibNotControllableSubfield1}`,
                    ],
                  });
                })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(user.userId, [
                    Permissions.inventoryAll.gui,
                    Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  ]);
                })
                .then(() => {
                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                });
            });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C410711');
            Users.deleteViaApi(user.userId);
          });

          it(
            'C410711 Link Shared MARC bib with Shared MARC auth on Central tenant in Derive screen (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C410711'] },
            () => {
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
              QuickMarcEditor.verifyRemoveLinkingModal();

              QuickMarcEditor.clickKeepLinkingButton();
              QuickMarcEditor.verifyRemoveLinkingModalAbsence();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));

              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkedFieldData600.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(testData.authorityBrowseOption);
              MarcAuthorities.selectIncludingTitle(authorityHeading2);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData600));

              QuickMarcEditor.updateExistingField(bibFields[1].tag, updatedBibTitle);
              QuickMarcEditor.checkContentByTag(bibFields[1].tag, updatedBibTitle);

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.verifyInstanceTitle(updatedBibTitle);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                contributorValue,
                true,
              );
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.subjectSectionId,
                subjectValue,
                true,
              );

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeading2);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading2, '1');
              MarcAuthorities.clickNumberOfTitlesByHeading(authorityHeading2);
              InventoryInstances.waitLoading();
              InventoryInstance.verifyInstanceTitle(updatedBibTitle);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                contributorValue,
                true,
              );
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.subjectSectionId,
                subjectValue,
                true,
              );

              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();

              BrowseSubjects.select();
              BrowseSubjects.waitForSubjectToAppear(subjectValue, true, true);

              InventorySearchAndFilter.browseSearch(subjectValue);
              BrowseSubjects.checkValueIsBold(subjectValue);
              BrowseSubjects.checkRowWithValueAndAuthorityIconExists(subjectValue);
            },
          );
        });
      });
    });
  });
});
