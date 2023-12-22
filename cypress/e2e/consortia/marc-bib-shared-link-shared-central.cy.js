import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../support/fragments/inventory/search/browseContributors';

describe('MARC Bibliographic -> Manual linking -> Consortia', () => {
  const testData = {
    sharedPaneheaderText: 'Edit shared MARC record',
    authoritySearchOption: 'Keyword',
    instanceTitle:
      'C397392 Murder in Mérida, 1792 : violence, factions, and the law / Mark W. Lentz.',
    sharedLinkText: 'Shared',
  };

  const linkingTagAndValues = {
    authorityHeading: 'C397392 Lentz, Mark Auto',
    rowIndex: 16,
    tag: '100',
    secondBox: '1',
    thirdBox: '\\',
    content: '$a C397392 Lentz, Mark Auto',
    eSubfield: '$e author.',
    zeroSubfield: '$0 id.loc.gov/authorities/names/n9031219397392',
    seventhBox: '',
  };

  const users = {};

  const marcFiles = [
    {
      marc: 'marcBibFileC397392.mrc',
      fileNameImported: `testMarcFileC397392.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC397392.mrc',
      fileNameImported: `testMarcFileC397392.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
    ])
      .then((userProperties) => {
        users.userProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.loginAsAdmin().then(() => {
          marcFiles.forEach((marcFile) => {
            cy.visit(TopMenu.dataImportPath);
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileNameImported);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileNameImported);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          });
        });

        cy.login(users.userProperties.username, users.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
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
    'C397392 Link Shared MARC bib with Shared MARC auth on Central tenant (consortia)(spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
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

      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      InventoryInstances.waitContentLoading();
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.waitLoading();
      MarcAuthorities.searchByParameter(
        testData.authoritySearchOption,
        linkingTagAndValues.authorityHeading,
      );
      MarcAuthorities.checkRow(`${testData.sharedLinkText}${linkingTagAndValues.authorityHeading}`);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventoryInstances.waitLoading();
      InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
      InventoryInstance.checkPresentedText(testData.instanceTitle);
      InventoryInstance.checkContributor(linkingTagAndValues.authorityHeading);
      InventoryInstance.checkMarcAppIconExist(0);

      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      InventorySearchAndFilter.browseSearch(linkingTagAndValues.authorityHeading);
      BrowseContributors.checkAuthorityIconAndValueDisplayed(linkingTagAndValues.authorityHeading);
    },
  );
});
