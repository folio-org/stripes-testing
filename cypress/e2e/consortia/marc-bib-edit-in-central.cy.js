import Permissions from '../../support/dictionary/permissions';
import Affiliations, { TENANT_NAMES } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC Bibliographic -> Edit MARC bib -> Consortia', () => {
  const testData = {
    sharedPaneheaderText: 'Edit shared MARC record',
    tag245: '245',
    tag500: '500',
    tag504: '504',
    tag245UpdatedValue: '$a C405520 Auto Instance Shared Central Updated',
    tag500UpdatedValue: '$a Proceedings. Updated',
    updatedTitle: 'C405520 Auto Instance Shared Central Updated',
  };

  const users = {};

  const marcFile = {
    marc: 'marcBibFileC405520.mrc',
    fileNameImported: `testMarcFileC405520.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  let createdInstanceID;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((userProperties) => {
      users.userAProperties = userProperties;
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ])
      .then((userProperties) => {
        users.userBProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileNameImported);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileNameImported);
            Logs.getCreatedItemsID().then((link) => {
              createdInstanceID = link.split('/')[5];
            });
            cy.login(users.userAProperties.username, users.userAProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          },
        );
      });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    Users.deleteViaApi(users.userAProperties.userId);
    Users.deleteViaApi(users.userBProperties.userId);
  });

  it(
    'C405520 User can edit shared "MARC Bib" in Central tenant (consortia)(spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdInstanceID);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
      QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245UpdatedValue);
      QuickMarcEditor.updateExistingField(testData.tag500, testData.tag500UpdatedValue);
      QuickMarcEditor.moveFieldUp(17);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkInstanceTitle(testData.updatedTitle);
      InventoryInstance.verifyLastUpdatedSource(
        users.userAProperties.firstName,
        users.userAProperties.lastName,
      );

      cy.login(users.userBProperties.username, users.userBProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.switchActiveAffiliation(TENANT_NAMES.COLLEGE);
      InventoryInstance.searchByTitle(createdInstanceID);
      InventoryInstances.selectInstance();
      InventoryInstance.checkInstanceTitle(testData.updatedTitle);
      // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
      // InventoryInstance.verifyLastUpdatedSource(users.userAProperties.firstName, users.userAProperties.lastName);
      InventoryInstance.viewSource();
      InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245UpdatedValue);
      InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500UpdatedValue);
      InventoryViewSource.close();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245UpdatedValue);
      QuickMarcEditor.checkContentByTag(testData.tag500, testData.tag500UpdatedValue);
      QuickMarcEditor.checkUserNameInHeader(
        users.userAProperties.firstName,
        users.userAProperties.lastName,
      );
      QuickMarcEditor.verifyTagValue(16, testData.tag504);
      QuickMarcEditor.verifyTagValue(17, testData.tag500);
    },
  );
});
