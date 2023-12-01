import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
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

describe('MARC Bibliographic -> Create new MARC bib -> Consortia', () => {
  const testData = {
    sharedPaneheaderCreateText: 'Create a new shared MARC bib record',
    sharedPaneheaderEditText: 'Edit shared MARC record',
    tag245: '245',
    tag700: '700',
    tag504: '504',
    tagLDR: 'LDR',
    validLDRValue: '00000naa\\a2200000uu\\4500',
    instanceTitle: `C405547 Created Shared Instance ${getRandomPostfix()}`,
    tag700Content: '$a Dante Alighieri C422123 $d 1265-1321 $e Poet, Writer, Philosopher',
  };

  let createdInstanceID;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ])
      .then((userProperties) => {
        testData.userProperties = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    // InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C422123 Create new Shared MARC bib in Central tenant (consortia)(spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderCreateText);
      QuickMarcEditor.updateExistingField(testData.tagLDR, testData.validLDRValue);
      QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.instanceTitle}`);
      QuickMarcEditor.addEmptyFields(4);
      QuickMarcEditor.checkContent('$a ', 5);
      QuickMarcEditor.addValuesToExistingField(
        5,
        testData.tag700,
        testData.tag700Content,
        '0',
        '2',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkDetailViewShared();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.verifyContributor();
      cy.wait(5000);
      // InventoryInstance.searchByTitle(createdInstanceID);
      // InventoryInstances.selectInstance();
      // InventoryInstance.editMarcBibliographicRecord();
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
