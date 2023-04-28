import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TestTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';

describe('ui-data-import', () => {
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
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: mappingProfileNameForInstance },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: actionProfileNameForInstance }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: actionProfileNameForHoldings }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: mappingProfileNameForItem,
        materialType:'book',
        permanentLoanType:'Can circulate',
        status:'Available' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: actionProfileNameForItem }
    }
  ];

  const specialJobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  before('login', () => {
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
  });

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.fillPermanentLocation('"Annex (KU/CC/DI/A)"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
    NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
    NewFieldMappingProfile.fillStatus(itemMappingProfile.status);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  after('delete test data', () => {
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
      ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
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
    // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
    cy.reload();
    DataImport.uploadFile('oneMarcBib.mrc', fileName);
    JobProfiles.searchJobProfileForImport(specialJobProfile.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
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
