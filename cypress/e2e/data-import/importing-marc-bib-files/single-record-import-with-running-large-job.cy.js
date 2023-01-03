/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import: Inventory single record import is not delayed when large data import jobs are running', () => {
  let user = {};
  const authentication = '100473910/PAOLF';
  const fileName = `C356824autotestFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const oclcForImport = '912958093';
  const oclcForUpdating = '698820890';
  const updatedInstanceData = {
    title: 'Dictionary of Louisiana French : as spoken in Cajun, Creole, and American Indian communities / Albert Valdman, editor ; Kevin J. Rottet, associate editor.',
    language: 'English, French',
    publisher: 'University Press of Mississippi',
    placeOfPublication: 'Jackson',
    publicationDate: '2010',
    physicalDescription: 'XL, 892 S',
    subject: 'French language--Dialects--Louisiana--Dictionaries',
    notes: { noteType: 'Bibliography note', noteContent: 'Includes bibliographical references and index' }
  };

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.remoteStorageView.gui
    ]).then(userProperties => {
      user = userProperties;

      cy.login(user.username, user.password);
      Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
    });
  });

  after(() => {
    Logs.cancelImportJob();
    Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
    Users.deleteViaApi(user.userId);
  });

  it('C356824 Inventory single record import is not delayed when large data import jobs are running (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      cy.visit(SettingsMenu.targetProfilesPath);
      Z3950TargetProfiles.openOclcWorldCat();
      Z3950TargetProfiles.editOclcWorldCat(authentication);
      Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

      // import a file
      cy.visit(TopMenu.dataImportPath);
      DataImport.checkIsLandingPageOpened();
      DataImport.uploadFile('marcFileForC356824.mrc', fileName);
      // need to wait untill file is uploaded
      cy.wait(2500);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkFileIsRunning(fileName);

      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.importWithOclc(oclcForImport);
      InventoryInstance.startOverlaySourceBibRecord();
      InventoryInstance.singleRecordImportModalIsPresented();
      InventoryInstance.importWithOclc(oclcForUpdating);
      InventoryInstance.checkCalloutMessage(`Updated record ${oclcForUpdating}`);

      // check instance is updated
      InventoryInstance.verifyInstanceTitle(updatedInstanceData.title);
      InventoryInstance.verifyInstanceLanguage(updatedInstanceData.language);
      InventoryInstance.verifyInstancePublisher(0, 0, updatedInstanceData.publisher);
      InventoryInstance.verifyInstancePublisher(0, 2, updatedInstanceData.placeOfPublication);
      InventoryInstance.verifyInstancePublisher(0, 3, updatedInstanceData.publicationDate);
      InventoryInstance.verifyInstancePhisicalcyDescription(updatedInstanceData.physicalDescription);
      InventoryInstance.verifyInstanceSubject(0, 0, updatedInstanceData.subject);
      InventoryInstance.checkInstanceNotes(updatedInstanceData.notes.noteType, updatedInstanceData.notes.noteContent);

      cy.visit(TopMenu.dataImportPath);
      Logs.checkFileIsRunning(fileName);
    });
});
