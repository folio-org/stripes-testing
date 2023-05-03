import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';



import { LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCALION_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/itemRecordView';

describe('ui-data-import', () => {
  let user;
  let firstFieldId = null;
  let secondFieldId = null;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const protectedFields = {
    firstField: '020',
    secondField: '514'
  };
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { name: `C367966 Update MARC Bib with protections ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `createInstanceActionProf${getRandomPostfix()}` }
    },
    {
      mappingProfile: { name: `C367966 Update instance 1 ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        administrativeNote: 'This note was added when the MARC Bib was updated to check field protections' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `createInstanceActionProf${getRandomPostfix()}` }
    }
  ];
  const matchProfile = {
    profileName: `C367966 001 to 001 MARC Bib ${getRandomPostfix()}`,
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
    profileName: `C367966 Update 1: MARC Bib with protections ${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });


  it('C367966 Confirm the number of updated instances in the import log does not exceed the number of records in the file (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: 'a',
        data: '*',
        source: 'USER',
        field: protectedFields.firstField
      })
        .then((resp) => {
          firstFieldId = resp.id;
        });
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '*',
        data: '*',
        source: 'USER',
        field: protectedFields.secondField
      })
        .then((resp) => {
          secondFieldId = resp.id;
        });

      // create Field mapping profiles
      FieldMappingProfiles.createMappingProfileForUpdatesMarc(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
      FieldMappingProfiles.createMappingProfileWithNotes(collectionOfMappingAndActionProfiles[1].mappingProfile,
        collectionOfMappingAndActionProfiles[1].mappingProfile.administrativeNote);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

      // create Action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create Match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create Job profiles
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchAndTwoActionProfiles(
        matchProfile.profileName,
        collectionOfMappingAndActionProfiles[0].actionProfile.name,
        collectionOfMappingAndActionProfiles[0].actionProfile.name
      );
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC17018-BeforeOverride.mrc', fileNameForCreatingInstance);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForCreatingInstance);
      Logs.checkStatusOfJobProfile('Completed');
    });
});
