import Permissions from '../../support/dictionary/permissions';
import Affiliations from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC Bibliographic -> Edit MARC bib -> Consortia', () => {
  const users = {};
  const fileNamePrefix = `testMarcFileC405520.${getRandomPostfix()}`;

  const marcFile = {
    marc: 'marcBibFileC405520.mrc',
    fileName: `${fileNamePrefix}.mrc`,
    fileNameImported: `${fileNamePrefix}_1.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  let createdInstanceID;

  before('Create users, data', () => {
    cy.getAdminToken();

    // create a new user + set of permissions for default tenant (consortia)
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
        cy.wait(2000);
      })
      .then(() => {
        // assign the second affiliation to just created user (university)
        cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
        // switch tenant (to the university)
        cy.setTenant(Affiliations.College);
        // assign teh second set of permission to already created user for another affiliation (university)
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
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
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
    // .then(() => {
    //   // reset tenant to default (consortia), if you want to work with API calls
    //   // or just switch to Affiliations.Consortia
    //   cy.resetTenant();
    //   // cy.setTenant(Affiliations.Consortia);
    //   cy.getAdminToken();
    //   Users.deleteViaApi(user.userId);
    // });
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
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdInstanceID);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
    },
  );
});
