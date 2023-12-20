import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Consortia', () => {
  const testData = {
    tags: {
      // tag245: '245',
      // tagLDR: 'LDR',
    },
    fieldContents: {
      // tag245Content: 'C405547 Created Shared Instance',
      // tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    // contributor: 'Dante Alighieri 1265-1321',
    instanceTitle: 'C402769 The Riviera house / Natasha Lester.',
  };

  const marcFile = {
    marc: 'marcBibFileC402769.mrc',
    fileNameImported: `testMarcFileC402769.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  const users = {};

  let createdInstanceID;

  before('Create user, data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ])
      .then((userProperties) => {
        users.userProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
        cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]);
      })
      .then(() => {
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.loginAsAdmin().then(() => {
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
            createdInstanceID = link.split('/')[5];
          });
        });

        cy.login(users.userProperties.username, users.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });
  });

  after('Delete user, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(users.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
  });

  it(
    'C402769 Derive new Local MARC bib record from Shared Instance in Member tenant (consortia) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdInstanceID);
      InventoryInstances.selectInstance();

      InventoryInstance.checkPresentedText(testData.instanceTitle);

      // InventoryInstance.newMarcBibRecord();
      // QuickMarcEditor.updateExistingField(
      //   testData.tags.tag245,
      //   `$a ${testData.fieldContents.tag245Content}`,
      // );
      // QuickMarcEditor.updateExistingField(
      //   testData.tags.tagLDR,
      //   testData.fieldContents.tagLDRContent,
      // );
      // MarcAuthority.addNewField(4, newField.tag, newField.content);
      // QuickMarcEditor.updateIndicatorValue(newField.tag, '2', 0);
      // QuickMarcEditor.updateIndicatorValue(newField.tag, '0', 1);
      // QuickMarcEditor.pressSaveAndClose();
      // QuickMarcEditor.checkAfterSaveAndClose();
      // InventoryInstance.getId().then((id) => {
      //   createdInstanceID.push(id);
      // });
      // InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
      // InventoryInstance.checkExpectedMARCSource();
      // InventoryInstance.checkContributor(testData.contributor);

      // cy.login(users.userBProperties.username, users.userBProperties.password, {
      //   path: TopMenu.inventoryPath,
      //   waiter: InventoryInstances.waitContentLoading,
      // });
      // ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      // InventoryInstance.searchByTitle(testData.fieldContents.tag245Content);
      // InventoryInstances.selectInstance();
      // InventoryInstance.verifySharedIcon();
      // InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
      // InventoryInstance.checkExpectedMARCSource();
      // InventoryInstance.checkContributor(testData.contributor);

      // InventoryInstance.viewSource();
      // InventoryViewSource.contains(
      //   `\t${testData.tags.tag245}\t   \t$a ${testData.fieldContents.tag245Content}`,
      // );
      // InventoryViewSource.contains(
      //   `\t${newField.tag}\t2 0\t$a Dante Alighieri $d 1265-1321 $e Poet, Writer, Philosopher`,
      // );
    },
  );
});
