import Permissions from '../../support/dictionary/permissions';
import Affiliations, { TENANT_NAMES } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
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
    zeroSubfield: '$0 id.loc.gov/authorities/names/n2011049161397343',
    seventhBox: '',
  };

  const users = {};

  const marcFiles = [
    {
      marc: 'marcBibFileC397343.mrc',
      fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC397343.mrc',
      fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
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
        cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
        ]);
      })
      .then(() => {
        cy.setTenant(Affiliations.University);
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
          ConsortiumManager.switchActiveAffiliation(TENANT_NAMES.COLLEGE);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(TENANT_NAMES.COLLEGE);
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
    'C397343 Link Shared MARC bib with Shared MARC authority from Member tenant (consortia)(spitfire)',
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

      ConsortiumManager.switchActiveAffiliation(TENANT_NAMES.CENTRAL);
      InventoryInstances.waitContentLoading();
      ConsortiumManager.checkCurrentTenantInTopMenu(TENANT_NAMES.CENTRAL);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.waitLoading();
      MarcAuthorities.searchByParameter(
        testData.authoritySearchOption,
        linkingTagAndValues.authorityHeading,
      );
      MarcAuthorities.checkRow(`${testData.sharedLinkText}${linkingTagAndValues.authorityHeading}`);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
      InventoryInstance.checkPresentedText(testData.instanceTitle);
      InventoryInstance.viewSource();
      InventoryViewSource.waitLoading();
      InventoryViewSource.contains(testData.authorityLinkText);
      InventoryViewSource.contains(linkingTagAndValues.authorityHeading);
      InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);

      ConsortiumManager.switchActiveAffiliation(TENANT_NAMES.UNIVERSITY);
      InventoryInstances.waitContentLoading();
      ConsortiumManager.checkCurrentTenantInTopMenu(TENANT_NAMES.UNIVERSITY);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      InventorySearchAndFilter.browseSearch(linkingTagAndValues.authorityHeading);
      BrowseContributors.checkAuthorityIconAndValueDisplayed(linkingTagAndValues.authorityHeading);
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
      ConsortiumManager.checkCurrentTenantInTopMenu(TENANT_NAMES.UNIVERSITY);
    },
  );
});
