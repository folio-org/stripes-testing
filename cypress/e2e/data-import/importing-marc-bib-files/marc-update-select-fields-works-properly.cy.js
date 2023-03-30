import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('ui-data-import', () => {
  let instanceHrid;
  const quantityOfItems = '1';
  // unique file names
  const marcFileForCreate = `C17019 oneMarcBib.mrc${Helper.getRandomBarcode()}`;
  const editedMarcFileName = `C17019 editedMarcFile.${Helper.getRandomBarcode()}.mrc`;
  const fileNameForUpdate = `C17019 marcFile.${Helper.getRandomBarcode()}.mrc`;
  // unique profile names
  const instanceMappingProfileName = `C17019 autotest instance mapping profile.${Helper.getRandomBarcode()}`;
  const marcBibMappingProfileName = `C17019 autotest marc bib mapping profile.${Helper.getRandomBarcode()}`;
  const instanceActionProfileName = `C17019 autotest instance action profile.${Helper.getRandomBarcode()}`;
  const marcBibActionProfileName = `C17019 autotest marc bib action profile.${Helper.getRandomBarcode()}`;
  const matchProfileName = `C17019 autotest match profile.${Helper.getRandomBarcode()}`;
  const jobProfileName = `C17019 autotest job profile.${Helper.getRandomBarcode()}`;
  // profiles for updating instance
  const instanceMappingProfile = {
    name: instanceMappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    statisticalCodeUI: 'Book, print (books)',
    instanceStatus: 'Batch Loaded'
  };
  const marcBibMappingProfile = {
    name: marcBibMappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib
  };
  const instanceActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: instanceActionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const marcBibActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
    name: marcBibActionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    existingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'MARC_BIBLIOGRAPHIC'
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('login', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });

    DataImport.uploadFileViaApi('oneMarcBib.mrc', marcFileForCreate);
    JobProfiles.waitFileIsImported(marcFileForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(marcFileForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
    FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

    // get instance hrid
    FileDetails.openInstanceInInventory('Created');
    InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
      instanceHrid = initialInstanceHrId;
    });
  });

  it('C17019 Check that MARC Update select fields works properly (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // change Instance HRID in .mrc file
    DataImport.editMarcFile('oneMarcBib.mrc', editedMarcFileName, ['ocn962073864'], [instanceHrid]);

    // create field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.addStatisticalCode(instanceMappingProfile.statisticalCode, 8);
    NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfile.statusTerm);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileName);

    FieldMappingProfileView.checkUpdatesSectionOfMappingProfile(marcBibMappingProfile);
    FieldMappingProfileView.checkOverrideProtectedSection(marcBibMappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfileName);

    // added protection for field
    

    // // create action profiles
    // cy.visit(SettingsMenu.actionProfilePath);
    // ActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
    // ActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

    // ActionProfiles.create(marcBibActionProfile, marcBibMappingProfile.name);
    // ActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

    // // create match profile
    // cy.visit(SettingsMenu.matchProfilePath);
    // MatchProfiles.createMatchProfile(matchProfile);
    // MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // // create job profiles
    // cy.visit(SettingsMenu.jobProfilePath);
    // JobProfiles.createJobProfile(jobProfile);
    // NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, marcBibActionProfile.name, instanceActionProfile.name);
    // NewJobProfile.saveAndClose();
    // JobProfiles.checkJobProfilePresented(jobProfileName);

    // // upload a marc file
    // cy.visit(TopMenu.dataImportPath);
    // // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
    // cy.reload();
    // DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
    // JobProfiles.searchJobProfileForImport(jobProfileName);
    // JobProfiles.runImportFile();
    // JobProfiles.waitFileIsImported(fileNameForUpdate);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(fileNameForUpdate);
    // [FileDetails.columnName.srsMarc,
    //   FileDetails.columnName.instance].forEach(columnName => {
    //   FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
    // });
    // FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
    // FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

    // // check updated instance in Inventory
    // FileDetails.openInstanceInInventory('Updated');
    // InstanceRecordView.verifyStatisticalCode(instanceMappingProfile.statisticalCodeUI);
    // InstanceRecordView.verifyInstanceStatusTerm(instanceMappingProfile.instanceStatus);
    
    // // step 13
  });
});
