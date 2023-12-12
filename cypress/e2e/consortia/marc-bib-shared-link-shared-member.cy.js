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

describe('MARC Bibliographic -> Manual linking -> Consortia', () => {
  const testData = {
    sharedPaneheaderText: 'Edit shared MARC record',
    // tag245: '245',
    // tag500: '500',
    // tag504: '504',
    // tag245UpdatedValue: '$a C405520 Auto Instance Shared Central Updated',
    // tag500UpdatedValue: '$a Proceedings. Updated',
    instanceTitle:
      'C397343 Murder in Mérida, 1792 : violence, factions, and the law / Mark W. Lentz.',
  };

  const linkingTagAndValues = {
    authorityHeading: 'Lentz, Mark C397343',
    rowIndex: 15,
    tag: '100',
    secondBox: '1',
    thirdBox: '\\',
    content: '$a Lentz, Mark C397343',
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
      InventoryInstance.searchResults(linkingTagAndValues.value);
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

      // QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
      // QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245UpdatedValue);
      // QuickMarcEditor.updateExistingField(testData.tag500, testData.tag500UpdatedValue);
      // QuickMarcEditor.moveFieldUp(17);
      // QuickMarcEditor.pressSaveAndClose();
      // QuickMarcEditor.checkAfterSaveAndClose();
      // InventoryInstance.checkInstanceTitle(testData.updatedTitle);
      // InventoryInstance.verifyLastUpdatedSource(
      //   users.userAProperties.firstName,
      //   users.userAProperties.lastName,
      // );
      // cy.login(users.userBProperties.username, users.userBProperties.password, {
      //   path: TopMenu.inventoryPath,
      //   waiter: InventoryInstances.waitContentLoading,
      // });
      // ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      // InventoryInstance.searchByTitle(createdInstanceID);
      // InventoryInstances.selectInstance();
      // InventoryInstance.checkInstanceTitle(testData.updatedTitle);
      // // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
      // // InventoryInstance.verifyLastUpdatedSource(users.userAProperties.firstName, users.userAProperties.lastName);
      // InventoryInstance.viewSource();
      // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245UpdatedValue);
      // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500UpdatedValue);
      // InventoryViewSource.close();
      // InventoryInstance.editMarcBibliographicRecord();
      // QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245UpdatedValue);
      // QuickMarcEditor.checkContentByTag(testData.tag500, testData.tag500UpdatedValue);
      // QuickMarcEditor.checkUserNameInHeader(
      //   users.userAProperties.firstName,
      //   users.userAProperties.lastName,
      // );
      // QuickMarcEditor.verifyTagValue(16, testData.tag504);
      // QuickMarcEditor.verifyTagValue(17, testData.tag500);
    },
  );
});
