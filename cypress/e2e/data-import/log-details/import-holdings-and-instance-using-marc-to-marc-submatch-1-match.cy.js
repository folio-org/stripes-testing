import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import { INSTANCE_STATUS_TERM_NAMES,
  HOLDINGS_TYPE_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES } from '../../../support/constants';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const testData = {
    protectedField: '856',
    protectedFieldId: null,
    fileName: 'marcFileForSubmatch.mrc',
    newUri: 'http://jbjjhhjj:3000/Test'
  };
  const fileNameForCreate = `C397984 autotestFileForCreate.${getRandomPostfix()}.mrc`;
  const fileNameForUpdate = `C397984 autotestFileForUpdate.${getRandomPostfix()}.mrc`;
  const editedMarcFileNameForCreate = `C397984 editedAutotestFileForCreate.${getRandomPostfix()}.mrc`;
  const editedMarcFileNameForUpdate = `C397984 editedAutotestFileForUpdate.${getRandomPostfix()}.mrc`;
  const uniq001Field = Helper.getRandomBarcode();
  const collectionOfMappingAndActionProfilesForCreate = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C397984 Create ER Instance ${getRandomPostfix()}`,
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C397984 Create ER Instance ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C397984 Create ER Holdings ${getRandomPostfix()}`,
        holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
        permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
        relationship: 'Resource',
        uri: '856$u',
        linkText: '856$y',
        materialsSpecified: '856$3',
        urlPublicNote: '856$z' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C397984 Create ER Holdings ${getRandomPostfix()}` }
    }
  ];
  const jobProfileForCreate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C397984 Create ER Instance and Holdings ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };
  // profiles for update
  const collectionOfMappingAndActionProfilesForUpdate = [
    {
      mappingProfile: { name: `C397984 Override 856 protection ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C397984 Update srs override 856 protection ${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];
  const matchProfile = {
    profileName: `C397984 035$a to 035$a match ${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '035',
      subfield: 'a'
    },
    existingRecordFields: {
      field: '035',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC
  };
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C397984 035$a to 035$a match with instance status type submatch ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };

  before('create test data and login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: testData.protectedField
        })
          .then((resp) => {
            testData.protectedFieldId = resp.id;
          });
        NewInstanceStatusType.createViaApi()
          .then((initialInstanceStatusType) => {
            testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
          });
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    MarcFieldProtection.deleteMarcFieldProtectionViaApi(testData.protectedFieldId);
    InstanceStatusTypes.deleteViaApi(testData.instanceStatusTypeId);
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
    JobProfiles.deleteJobProfile(jobProfileForCreate.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    collectionOfMappingAndActionProfilesForCreate.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    collectionOfMappingAndActionProfilesForUpdate.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C397984 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 1 match (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // change file for creating uniq 035 field
      DataImport.editMarcFile(testData.fileName, editedMarcFileNameForCreate, ['9000098'], [uniq001Field]);

      // create Field mapping profiles for creating
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForCreate[0].mappingProfile);
      NewFieldMappingProfile.fillInstanceStatusTerm(collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.instanceStatusTerm);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile);
      NewFieldMappingProfile.fillHoldingsType(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.holdingsType);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocation);
      NewFieldMappingProfile.addElectronicAccess(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.relationship,
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.uri,
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.linkText,
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.materialsSpecified,
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.urlPublicNote
      );
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.name);

      // create action profiles for creating
      collectionOfMappingAndActionProfilesForCreate.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile for creating
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfileForCreate);
      NewJobProfile.linkActionProfileByName(collectionOfMappingAndActionProfilesForCreate[0].actionProfile.name);
      NewJobProfile.linkActionProfileByName(collectionOfMappingAndActionProfilesForCreate[1].actionProfile.name);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileForCreate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForCreate);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForCreate);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });

      // change file for changing content of 856 field
      DataImport.editMarcFile(testData.fileName, editedMarcFileNameForUpdate, ['9000098', 'http://jbjjhhjj:3000/'],
        [uniq001Field, 'http://jbjjhhjj:3000/Test']);

      // create Field mapping profiles for updating
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile);
      NewFieldMappingProfile.markFieldForProtection(testData.protectedField);

      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name);

      // create action profiles for updating
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(
        collectionOfMappingAndActionProfilesForUpdate[0].actionProfile,
        collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name
      );
      ActionProfiles.checkActionProfilePresented(collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name);

      // create match profiles
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create job profile for updating
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfileWithLinkingProfiles(
        jobProfileForUpdate,
        collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
        matchProfile.profileName
      );
      JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdate);
      JobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForUpdate);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForUpdate);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
      });
      FileDetails.openInstanceInInventory('Updated');
      InventoryInstance.getAssignedHRID().then(hrId => { instanceHrid = hrId; });
      InstanceRecordView.verifyElectronicAccess(testData.newUri);
      InstanceRecordView.viewSource();
      InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, testData.newUri);
    });
});
