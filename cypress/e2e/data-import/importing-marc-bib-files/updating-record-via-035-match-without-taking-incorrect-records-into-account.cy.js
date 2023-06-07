import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import { EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const identifier = 'ccn00999523';
  const protectedFields = {
    firstField: '020',
    secondField: '514'
  };
  const protectedFieldIds = [];
  const filePathToUpload = 'marcBibFileForC380390.mrc';
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileNameForCreate = `C380390 autotest file.${getRandomPostfix()}.mrc`;
  const fileNameForMatch = `C380390 autotest file.${getRandomPostfix()}.mrc`;
  const fileNameForUpdate = `C380390 autotest file.${getRandomPostfix()}.mrc`;
  const matchProfile = {
    profileName: `C380390 ccn MARC match ${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '035',
      subfield: 'a'
    },
    qualifierType: 'Begins with',
    qualifierValue: 'ccn',
    existingRecordFields: {
      field: '035',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C380390 Reject based on ccn.${getRandomPostfix()}`
  };
  const mappingProfile = {
    name: `C380390 New or update on ccn.${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC
  };
  const actionProfile = {
    name: `C380390 New or update on ccn.${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
  };
  const jobProfileForUpdate = {
    profileName: `C380390 New or update on ccn.${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };

  before('create user and login', () => {
    cy.getAdminToken()
      .then(() => {
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField
        })
          .then((firstResp) => { protectedFieldIds.push(firstResp.id); });
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField
        })
          .then((secondResp) =>  { protectedFieldIds.push(secondResp.id); });

        InventorySearchAndFilter.getInstancesByIdentifierViaApi(identifier)
          .then(instances => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
      });

    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after('delete test data', ()=>{
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    Users.deleteViaApi(user.userId);
    protectedFieldIds.forEach(fieldId => MarcFieldProtection.deleteMarcFieldProtectionViaApi(fieldId));
    InventorySearchAndFilter.getInstancesByIdentifierViaApi(identifier)
      .then(instances => {
        instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
        });
      });
  });

  it('C380390 Verify updating record via 035 match, without taking incorrect records into account (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // upload a marc file
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileNameForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForCreate);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfileWithQualifier(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchProfile(matchProfile.profileName);
      NewJobProfile.linkProfileForNonMatches('Default - Create instance');
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileNameForMatch);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForMatch);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForMatch);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc);
      FileDetails.checkStatusInColumn(FileDetails.status.dash, FileDetails.columnNameInResultList.instance);

      // create mapping profile
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
      NewFieldMappingProfile.markFieldForProtection(protectedFields.firstField);
      NewFieldMappingProfile.markFieldForProtection(protectedFields.secondField);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfileForUpdate);
      NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
      NewJobProfile.linkProfileForNonMatches('Default - Create instance');
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileNameForUpdate);
      JobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForUpdate);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForMatch);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance);
    });
});
