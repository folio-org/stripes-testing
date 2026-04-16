import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          tag100: '100',
          tag245: '245',
          bibTitle: `AT_C422125_MarcBibInstance_${randomPostfix}`,
          authorityTitle: `AT_C422125_MarcAuthority_${randomPostfix}`,
          contributorAccordion: 'Contributor',
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          sharedLabel: 'Shared',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: `422125${randomFourDigitNumber()}`,
        };

        const authorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityTitle}`,
            indicators: ['1', '\\'],
          },
        ];

        const additionalAuthorityFields = [
          {
            tag: testData.tag100,
            content: `$a C422125 Additional MARC Authority ${randomPostfix}`,
            indicators: ['1', '\\'],
          },
        ];

        let createdInstanceId;
        let authorityId;
        let additionalAuthorityId;
        let user;

        before('Create users and data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422125');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                authorityId = createdRecordId;
              });
              // extra authority record to make sure detail view won't auto-open (it does when 1 record found)
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                +authData.startWithNumber + 1,
                additionalAuthorityFields,
              ).then((createdRecordId) => {
                additionalAuthorityId = createdRecordId;
              });
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, user.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
              ]);
            });
        });

        after('Delete users and data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          MarcAuthority.deleteViaAPI(authorityId, true);
          MarcAuthority.deleteViaAPI(additionalAuthorityId, true);
        });

        it(
          'C422125 Delete linked "MARC Authority" record in Member tenant while "MARC Bib" record being created in Central tenant (NOT saved link) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422125'] },
          () => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Steps 1-4: Create new shared MARC bib in Central, fill LDR and 245
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.bibTitle}`);
            QuickMarcEditor.updateLDR06And07Positions();

            // Steps 5-6: Add 100 field
            MarcAuthority.addNewField(4, testData.tag100, `$a ${testData.authorityTitle}`);
            QuickMarcEditor.updateIndicatorValue(testData.tag100, '1', 0);
            QuickMarcEditor.updateIndicatorValue(testData.tag100, '1', 1);

            // Step 7: Click link icon on 100 field
            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);

            // Step 8-9: Find and link shared authority
            MarcAuthorities.checkRow(`${testData.sharedLabel}${testData.authorityTitle}`);
            MarcAuthorities.selectIncludingTitle(testData.authorityTitle);
            MarcAuthority.waitLoading();
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);

            // Steps 10-12 (Via API): Delete the shared authority record
            MarcAuthority.deleteViaAPI(authorityId);
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `keyword="${testData.authorityTitle}" and authRefType=="Authorized"`,
              }),
              (foundAuthorities) => foundAuthorities.length === 0,
              { limit: 10, timeout: 12000, delay: 1000 },
            );

            // Step 13: Save & close the MARC bib in Central
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();

            // Step 13 expected: MARC Authority icon NOT shown in detail view (Contributor)
            InventoryInstance.verifyRecordAndMarcAuthIconAbsence(
              testData.contributorAccordion,
              `Linked to MARC authority\n${testData.authorityTitle}`,
            );

            // Step 14: View source - 100 field has original value, no MARC auth icon
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
            InventoryViewSource.contains(testData.authorityTitle);
            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            // Steps 15-16: Switch to Member 2 affiliation
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();

            // Steps 17-18: Find the shared Instance in Member 2 and verify source
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(testData.bibTitle);
            InventoryInstances.selectInstanceByTitle(testData.bibTitle);
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
            InventoryViewSource.contains(testData.authorityTitle);
          },
        );
      });
    });
  });
});
