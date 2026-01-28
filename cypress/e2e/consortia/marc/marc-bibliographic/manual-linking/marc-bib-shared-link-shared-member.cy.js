import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Manual linking', () => {
      const testData = {
        sharedPaneheaderText: 'Edit shared MARC record',
        authoritySearchOption: 'Keyword',
        sharedBibSourcePaheheaderText: 'Shared MARC bibliographic record',
        contributorAccordion: 'Contributor',
        sharedAuthorityDetailsText: 'Shared MARC authority record',
        instanceTitle:
          'C397343 Murder in Mérida, 1792 : violence, factions, and the law / Mark W. Lentz.',
        authorityLinkText: 'Linked to MARC authority',
        sharedLinkText: 'Shared',
      };

      const linkingTagAndValues = {
        authorityHeading: 'Lentz, Mark Auto C397343',
        rowIndex: 15,
        tag: '100',
        secondBox: '1',
        thirdBox: '\\',
        content: '$a Lentz, Mark Auto C397343',
        eSubfield: '$e author.',
        zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011049161397343',
        seventhBox: '',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileC397343.mrc',
          fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileC397343.mrc',
          fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(linkingTagAndValues.authorityHeading);
        InventoryInstances.deleteInstanceByTitleViaApi('C397343');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: users.userProperties.userId,
              permissions: [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ],
            });
          })
          .then(() => {
            cy.affiliateUserToTenant({
              tenantId: Affiliations.University,
              userId: users.userProperties.userId,
              permissions: [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              ],
            });
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C397343 Link Shared MARC bib with Shared MARC authority from Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C397343'] },
        () => {
          cy.wait(15_000);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
          QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues.rowIndex,
            linkingTagAndValues.tag,
            linkingTagAndValues.secondBox,
            linkingTagAndValues.thirdBox,
            linkingTagAndValues.content,
            linkingTagAndValues.eSubfield,
            linkingTagAndValues.zeroSubfield,
            linkingTagAndValues.seventhBox,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchByParameter(
            testData.authoritySearchOption,
            linkingTagAndValues.authorityHeading,
          );
          MarcAuthorities.checkRow(
            `${testData.sharedLinkText}${linkingTagAndValues.authorityHeading}`,
          );
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
          InventoryInstance.checkPresentedText(testData.instanceTitle);
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.contains(testData.authorityLinkText);
          InventoryViewSource.contains(linkingTagAndValues.authorityHeading);
          InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseContributors.select();
          cy.setTenant(Affiliations.University);
          BrowseContributors.waitForContributorToAppear(
            linkingTagAndValues.authorityHeading,
            true,
            true,
          );
          InventorySearchAndFilter.browseSearch(linkingTagAndValues.authorityHeading);
          BrowseContributors.checkAuthorityIconAndValueDisplayed(
            linkingTagAndValues.authorityHeading,
          );
          BrowseContributors.openRecord(linkingTagAndValues.authorityHeading);
          InventoryInstance.waitLoading();
          InventoryInstance.checkPresentedText(testData.instanceTitle);
          InventoryInstance.checkContributor(linkingTagAndValues.authorityHeading);
          InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
            testData.contributorAccordion,
          );
          MarcAuthority.waitLoading();
          MarcAuthority.verifySharedAuthorityDetailsHeading(linkingTagAndValues.authorityHeading);
          MarcAuthority.contains(testData.sharedAuthorityDetailsText);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        },
      );
    });
  });
});
