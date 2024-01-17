import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../../support/constants';
import JobProfiles from '../../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking -> Consortia', () => {
  const testData = {
    instanceTitle: 'C405560 Instance Local M1',
    authoritySearchOption: 'Keyword',
    instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  };

  const linkingTagAndValues = {
    authorityHeading: 'C405560 Lentz Local M1',
    rowIndex: 16,
    tag: '100',
    secondBox: '1',
    thirdBox: '\\',
    content: '$a C405560 Lentz Local M1',
    eSubfield: '',
    zeroSubfield: '$0 id.loc.gov/authorities/names/n2011049161405560',
    seventhBox: '',
  };

  const users = {};

  const marcFilesFor = [
    {
      marc: 'marcBibFileForC405560.mrc',
      fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC405560.mrc',
      fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ])
      .then((userProperties) => {
        users.userProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
        cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]);
      })
      .then(() => {
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.loginAsAdmin().then(() => {
          marcFilesFor.forEach((marcFile) => {
            cy.visit(TopMenu.dataImportPath);
            ConsortiumManager.switchActiveAffiliation(tenantNames.university);
            DataImport.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileNameImported);
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
          ConsortiumManager.switchActiveAffiliation(tenantNames.university);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        });
      });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(users.userProperties.userId);
    cy.resetTenant();
    cy.setTenant(Affiliations.University);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C405560 Link Local MARC bib with Local MARC Authority in Member tenant (consortia) (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventorySearchAndFilter.searchByParameter(
        testData.instanceSearchOption,
        createdRecordIDs[0],
      );
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
        linkingTagAndValues.tag,
        linkingTagAndValues.rowIndex,
      );
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
      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.openLinkingAuthorityByIndex(16);
      MarcAuthorities.checkFieldAndContentExistence(
        linkingTagAndValues.tag,
        linkingTagAndValues.authorityHeading,
      );
      cy.go('back');
      QuickMarcEditor.closeEditorPane();

      InventoryInstance.verifyRecordAndMarcAuthIcon(
        'Contributor',
        `Linked to MARC authority\n${linkingTagAndValues.authorityHeading}`,
      );

      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(linkingTagAndValues.authorityHeading);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(linkingTagAndValues.authorityHeading);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy(
        testData.authoritySearchOption,
        linkingTagAndValues.authorityHeading,
      );
      MarcAuthorities.selectTitle(linkingTagAndValues.authorityHeading);
      MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);

      cy.visit(TopMenu.inventoryPath);
      ConsortiumManager.switchActiveAffiliation(tenantNames.central);
      InventoryInstances.waitContentLoading();
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy(
        testData.authoritySearchOption,
        linkingTagAndValues.authorityHeading,
      );
      MarcAuthorities.checkNoResultsMessage(
        `No results found for "${linkingTagAndValues.authorityHeading}". Please check your spelling and filters.`,
      );
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchByParameter(
        testData.instanceSearchOption,
        testData.instanceTitle,
      );
      InventoryInstance.verifyNoResultFoundMessage(
        `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
      );

      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      InventoryInstances.waitContentLoading();
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy(
        testData.authoritySearchOption,
        linkingTagAndValues.authorityHeading,
      );
      MarcAuthorities.checkNoResultsMessage(
        `No results found for "${linkingTagAndValues.authorityHeading}". Please check your spelling and filters.`,
      );
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchByParameter(
        testData.instanceSearchOption,
        testData.instanceTitle,
      );
      InventoryInstance.verifyNoResultFoundMessage(
        `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
      );
    },
  );
});
