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
            tag008: '008',
            tag100: '100',
            tag245: '245',
            tag600: '600',
            tag700: '700',
            localPaneheaderText: 'Derive a new local MARC bib record',
            authorityBrowseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            contributorSectionId: 'list-contributors',
            subjectSectionId: 'list-subject',
            heldbyAccordionName: 'Held by',
          };
          const bibTitle = `AT_C410749_MarcBibInstance_${randomPostfix}`;
          const authorityHeadingShared1 = `AT_C410749_MarcAuthority_${randomPostfix}_Shared1`;
          const authorityHeadingShared2 = `AT_C410749_MarcAuthority_${randomPostfix}_Shared2`;
          const authorityHeadingLocal = `AT_C410749_MarcAuthority_${randomPostfix}_Local`;
          const updatedBibTitle = `${bibTitle} upd`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFieldsShared1 = [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadingShared1}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsShared2 = [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadingShared2}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsLocal = [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadingLocal}`,
              indicators: ['1', '\\'],
            },
          ];
          const bibFields = [
            {
              tag: testData.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: testData.tag245,
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: testData.tag100,
              content: `$a AT_C410749_MarcAuthority_${randomPostfix} Field100 $e author`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag600,
              content: `$a AT_C410749_MarcAuthority_${randomPostfix} Field600 $d 1739-1792 $x Assassination`,
              indicators: ['1', '0'],
            },
            {
              tag: testData.tag700,
              content: `$a AT_C410749_MarcAuthority_${randomPostfix} Field700`,
              indicators: ['\\', '\\'],
            },
          ];
          const linkedFieldData100 = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared1}`,
            uncontrolledLetterSubfields: '$e author',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData600 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared2}`,
            uncontrolledLetterSubfields: '$x Assassination',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData700 = {
            tag: bibFields[4].tag,
            ind1: bibFields[4].indicators[0],
            ind2: bibFields[4].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingLocal}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 2}`,
            uncontrolledDigitSubfields: '',
          };
          const contributorValues = [authorityHeadingShared1, authorityHeadingLocal];
          const subjectValue = `${authorityHeadingShared2}--Assassination`;
          const userPremissionsCollege = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ];
          const userPremissionsCentral = [
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ];

          let user;
          let createdInstanceId;
          const createdAuthorityIdsShared = [];
          let createdAuthorityIdLocal;

          before('Create test data', () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410749');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410749');

              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410749');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410749');
            })
              .then(() => {
                cy.resetTenant();
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber,
                  authorityFieldsShared1,
                ).then((createdRecordId) => {
                  createdAuthorityIdsShared.push(createdRecordId);
                });

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFieldsShared2,
                ).then((createdRecordId) => {
                  createdAuthorityIdsShared.push(createdRecordId);
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                  (instanceId) => {
                    createdInstanceId = instanceId;
                  },
                );

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 2,
                  authorityFieldsLocal,
                ).then((createdRecordId) => {
                  createdAuthorityIdLocal = createdRecordId;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityIdsShared[0]],
                  bibFieldTags: [linkedFieldData100.tag],
                  authorityFieldTags: [testData.tag100],
                  finalBibFieldContents: [
                    `${linkedFieldData100.controlledLetterSubfields} ${linkedFieldData100.uncontrolledLetterSubfields}`,
                  ],
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.createTempUser(userPremissionsCollege)
                  .then((createdUserProperties) => {
                    user = createdUserProperties;

                    cy.resetTenant();
                    cy.assignPermissionsToExistingUser(user.userId, userPremissionsCentral);
                  })
                  .then(() => {
                    cy.setTenant(Affiliations.College);
                    cy.login(user.username, user.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventoryInstances.waitContentLoading,
                    });
                    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  });
              });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            createdAuthorityIdsShared.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);

            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdLocal, true);
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C410749 Link Local MARC bib with Shared/Local MARC auth on Member tenant in Derive screen (derived from Local) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C410749'] },
            () => {
              InventorySearchAndFilter.clearDefaultFilter(testData.heldbyAccordionName);
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.localPaneheaderText);
              QuickMarcEditor.verifyRemoveLinkingModal();

              QuickMarcEditor.clickKeepLinkingButton();
              QuickMarcEditor.verifyRemoveLinkingModalAbsence();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));

              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkedFieldData600.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(testData.authorityBrowseOption);
              MarcAuthorities.selectIncludingTitle(authorityHeadingShared2);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData600));

              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkedFieldData700.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(testData.authorityBrowseOption);
              MarcAuthorities.selectIncludingTitle(authorityHeadingLocal);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData700));

              QuickMarcEditor.updateExistingField(bibFields[1].tag, updatedBibTitle);
              QuickMarcEditor.checkContentByTag(bibFields[1].tag, updatedBibTitle);

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.verifyInstanceTitle(updatedBibTitle);
              contributorValues.forEach((contributorValue) => {
                InventoryInstance.checkAuthorityAppIconInSection(
                  testData.contributorSectionId,
                  contributorValue,
                  true,
                );
              });
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.subjectSectionId,
                subjectValue,
                true,
              );

              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.localPaneheaderText);
              QuickMarcEditor.verifyRemoveLinkingModal();
              QuickMarcEditor.closeModalWithEscapeKey();
              QuickMarcEditor.verifyRemoveLinkingModalAbsence();

              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              InventoryInstances.waitContentLoading();

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingShared2);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared2, '');

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();
              BrowseSubjects.select();

              InventorySearchAndFilter.browseSearch(subjectValue);
              BrowseSubjects.verifyNonExistentSearchResult(subjectValue);
            },
          );
        });
      });
    });
  });
});
