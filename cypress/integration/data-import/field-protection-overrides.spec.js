import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import SettingsMenu from '../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import MappingProfileDetails from '../../support/fragments/data_import/mapping_profiles/mappingProfileDetails';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../support/fragments/data_import/logs/logs';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import ExportFile from '../../support/fragments/data-export/exportFile';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';

describe('ui-data-import: Check that field protection overrides work properly during data import', () => {
  // unique name for profiles
  const marcBibMapProfileNameForUpdate = `C17018 Update MARC Bib with protections.${getRandomPostfix()}`;
  const instanceMapProfileNameForUpdate = `C17018 Update instance 1.${getRandomPostfix()}`;
  const marcBibMapProfileNameForUpdateAndOverride = `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`;
  const instanceMapProfileNameForUpdateAndOverride = `C17018 Update instance 2.${getRandomPostfix()}`;
  const marcBibActionProfileNameForUpdate = `C17018 Update MARC Bib with protections.${getRandomPostfix()}`;
  const instanceActionProfileNameForUpdate = `C17018 Update instance 1.${getRandomPostfix()}`;
  const marcBibActionProfileNameForUpdateAndOverride = `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`;
  const instanceActionProfileNameForUpdateAndOverride = `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`;
  const matchProfileName = `C17018 001 to 001 MARC Bib.${getRandomPostfix()}`;
  const jobProfileNameForUpdate = `C17018 Update 1: MARC Bib with protections.${getRandomPostfix()}`;
  const jobProfileNameForOverride = `C17018 Update 2: MARC Bib with protections.${getRandomPostfix()}`;

  // unique file name to upload
  const fileNameForCreatingInstance = `C17018autotestFileCreteInstance.${getRandomPostfix()}.mrc`;
  const editedFileName = `oneMarcBib-Rev1-Protect_${getRandomPostfix()}.mrc`

  const protectedFields = {
    firstField: '020',
    secondField: '514'
  };
  const note = '"This note was added when the MARC Bib was updated to check field protections"';
  const overrideNote = '"This note was added when the MARC Bib was updated to check field protection OVERRIDES"';
  let instanceHrid = '';
  const fileForEdit = 'oneMarcBib-Rev1-Protect.mrc';
  const instanceHridFromFile = 'ocn962073864';

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    /* .then(() => {
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField
        });
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField
        });
      }); */
  });


  afterEach(() => {

  });

  it('C17018 Check that field protection overrides work properly during data import (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    const marcBibMappingProfile = {
      name: marcBibMapProfileNameForUpdate,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib
    };

    const instanceMappingProfile = {
      name: instanceMapProfileNameForUpdate,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
    };

    const marcBibMappingProfileOverride = {
      name: marcBibMapProfileNameForUpdateAndOverride,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib
    };

    const instanceMappingProfileOverride = {
      name: instanceMapProfileNameForUpdateAndOverride,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
    };

    const marcBibActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
      name: marcBibActionProfileNameForUpdate,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const instanceActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.instance,
      name: instanceActionProfileNameForUpdate,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const marcBibActionProfileOverride = {
      typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
      name: marcBibActionProfileNameForUpdateAndOverride,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const instanceActionProfileOverride = {
      typeValue: NewActionProfile.folioRecordTypeValue.instance,
      name: instanceActionProfileNameForUpdateAndOverride,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const matchProfile = { profileName: matchProfileName,
      incomingRecordFields: {
        field: '001'
      },
      existingRecordFields: {
        field: '001'
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: 'MARC_BIBLIOGRAPHIC' };

    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileNameForUpdate,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    const jobProfileForOverride = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileNameForOverride,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfileForUpdatesMarc(marcBibMappingProfile);
    MappingProfileDetails.checkCreatedMappingProfile(marcBibMappingProfile.name, protectedFields.firstField, protectedFields.secondField);
    FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfile.name);

    FieldMappingProfiles.createMappingProfileWithNotes(instanceMappingProfile, note);
    FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfile.name);

    FieldMappingProfiles.createMappingProfileForUpdatesAndOverrideMarc(marcBibMappingProfileOverride, protectedFields.firstField, protectedFields.secondField);
    MappingProfileDetails.checkCreatedMappingProfile(marcBibMappingProfileOverride.name, protectedFields.firstField, protectedFields.secondField);
    FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfileOverride.name);

    FieldMappingProfiles.createMappingProfileWithNotes(instanceMappingProfileOverride, overrideNote);
    FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileOverride.name);

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(marcBibActionProfile, marcBibMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

    ActionProfiles.createActionProfile(instanceActionProfile, instanceMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

    ActionProfiles.createActionProfile(marcBibActionProfileOverride, marcBibMappingProfileOverride.name);
    ActionProfiles.checkActionProfilePresented(marcBibActionProfileOverride.name);

    ActionProfiles.createActionProfile(instanceActionProfileOverride, marcBibMappingProfileOverride.name);
    ActionProfiles.checkActionProfilePresented(instanceActionProfileOverride.name);

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create Job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileForUpdate);
    NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, marcBibActionProfile.name, instanceActionProfile.name);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

    JobProfiles.createJobProfile(jobProfileForOverride);
    NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, marcBibActionProfileOverride.name, instanceActionProfileOverride.name);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileForOverride.profileName);

    cy.visit(TopMenu.dataImportPath);
    // upload a marc file for export
    DataImport.uploadFile('oneMarcBib-BeforeOverride.mrc', fileNameForCreatingInstance);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(fileNameForCreatingInstance);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForCreatingInstance);
    [FileDetails.columnName.srsMarc, FileDetails.columnName.instance].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });

    // get Instance HRID through API
    SearchInventory.getInstanceHRID()
      .then((hrId) => {
        instanceHrid = hrId[0];
      });

    DataImport.editMarcFile(fileForEdit, editedFileName, instanceHridFromFile, instanceHrid);
  });
});

