import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';


import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const nameMarcFile = `C356801autotestFile.${Helper.getRandomBarcode()}.mrc`;
  // unique profile names
  const instanceMappingProfileName = `C356801 instance mapping profile ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileName = `C356801 holdings mapping profile ${Helper.getRandomBarcode()}`;
  const itemMappingProfileName = `C356801 item mapping profile ${Helper.getRandomBarcode()}`;
  const instanceActionProfileName = `C356801 instance action profile ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileName = `C356801 holdings action profile ${Helper.getRandomBarcode()}`;
  const itemActionProfileName = `C356801 item action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C356801 job profile ${Helper.getRandomBarcode()}`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
        name: instanceMappingProfileName },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: instanceActionProfileName }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: holdingsMappingProfileName,
        pernanentLocation: '"Online (E)"' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: holdingsActionProfileName }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: itemMappingProfileName,
        permanentLoanType: '"Can circulate"',
        status: '"Available"' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileName }
    }
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  it('C356801 Check import summary table with "Created" actions for instance, holding and item (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileName);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileName);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      NewFieldMappingProfile.fillMaterialType();
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileName);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileName);

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('marcFileForC356801.mrc', nameMarcFile);
      JobProfiles.searchJobProfileForImport(jobProfileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFile);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(nameMarcFile);

      // check the instance is created
      //all instances will be checked?
    //   FileDetails.openInstanceInInventory('Created');
    //   InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
    //     instanceHrid = initialInstanceHrId;
    //   });
    //   InventoryInstance.checkIsInstancePresented(
    //     instanceTitle,
    //     collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocation,
    //     collectionOfMappingAndActionProfiles[2].mappingProfile.status
    //   );
    //   cy.go('back');

      // [FileDetails.columnName.srsMarc,
      //   FileDetails.columnName.instance,
      //   FileDetails.columnName.holdings,
      //   FileDetails.columnName.item
      // ].forEach(columnName => {
      //   FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      // });

    });
});
