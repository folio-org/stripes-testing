import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TestTypes from '../../support/dictionary/testTypes';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  let user = {};

  // unique file name to upload
  const fileName = `C343334autotestFile.${getRandomPostfix()}.mrc`;

  // unique profile names
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const actionProfileNameForInstance = `autotestActionInstance${getRandomPostfix()}`;
  const actionProfileNameForHoldings = `autotestActionHoldings${getRandomPostfix()}`;
  const actionProfileNameForItem = `autotestActionItem${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `autotestMappingInstance${getRandomPostfix()}`;
  const mappingProfileNameForHoldings = `autotestMappingHoldings${getRandomPostfix()}`;
  const mappingProfileNameForItem = `autotestMappingItem${getRandomPostfix()}`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem }
    }
  ];

  const specialJobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  before(() => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventoryViewInstances.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    DataImport.checkUploadState();
  });

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewMappingProfile.fillPermanentLocation('"Annex (KU/CC/DI/A)"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewMappingProfile.fillMaterialType('"book"');
    NewMappingProfile.fillPermanentLoanType('"Can circulate"');
    NewMappingProfile.fillStatus('"Available"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  after(() => {
    DataImport.checkUploadState();
    Users.deleteViaApi(user.userId);

    // delete generated profiles
    JobProfiles.deleteJobProfile(specialJobProfile.profileName);
    collectionOfProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
  });

  it('C343334 MARC file import with creating a new mapping profiles, action profiles and job profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[0].mappingProfile.name);
    createHoldingsMappingProfile(collectionOfProfiles[1].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[1].mappingProfile.name);
    createItemMappingProfile(collectionOfProfiles[2].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[2].mappingProfile.name);

    collectionOfProfiles.forEach(profile => {
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(specialJobProfile);
    collectionOfProfiles.forEach(profile => {
      NewJobProfile.linkActionProfile(profile.actionProfile);
    });
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', fileName);
    JobProfiles.searchJobProfileForImport(specialJobProfile.profileName);
    JobProfiles.runImportFile(fileName);
    Logs.checkStatusOfJobProfile();
    Logs.checkImportFile(specialJobProfile.profileName);
    Logs.openFileDetails(fileName);

    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
      FileDetails.columnName.holdings,
      FileDetails.columnName.item].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkItemsQuantityInSummaryTable(0, '1');
  });
});
